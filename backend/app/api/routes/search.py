"""
Search endpoint — Google-first product discovery.

Flow:
  1. Check Redis cache (30 min TTL)
  2. Fan out: search all platforms via Google simultaneously
     → Google returns URL + price from snippet (often enough)
  3. For results without snippet price: scrape product page via httpx
     → No login, no accounts, just one HTTP request per product
  4. AliExpress: uses official Affiliate API (unchanged)
  5. Merge, sort by total price, cache, return

Speed targets:
  • With Google API + cached snippet prices: 1–3 seconds
  • With page scraping fallback: 3–8 seconds
  • Full Playwright fallback (emergency only): 10–20 seconds
"""
import asyncio
import time
import uuid
from fastapi import APIRouter, HTTPException
import structlog

from app.models.product import SearchRequest, SearchResponse, Product, PlatformPrice
from app.agents.google_search import search_all_platforms, search_all_platforms_shopping, SearchResult
from typing import Optional
from app.agents.page_scraper import scrape_price
from app.agents.aliexpress_agent import AliexpressAgent
from app.cache.redis_client import cache_get, cache_set, search_cache_key

log = structlog.get_logger()
router = APIRouter()

# ── Platform registry ──────────────────────────────────────────────────────────
# Each entry: (platform_id, google_domain, display_name, shipping_est, delivery_days, trust_score)
PLATFORMS = [
    ("amazon",  "amazon.ae",   "أمازون الإمارات", 0.0,  1, 97),
    ("noon",    "noon.com",    "نون",              0.0,  1, 95),
    ("namshi",  "namshi.com",  "نمشي",            0.0,  2, 90),
    ("temu",    "temu.com",    "تيمو",            35.0, 14, 70),
]

# URLs that match the domain but belong to wrong country/sub-service
_URL_BLOCKLIST = [
    "minutes.noon.com",   # Noon Minutes — groceries, not electronics
    "noon.com/saudi-en",  # Saudi store — UAE app should show UAE prices
    "noon.com/egypt-en",  # Egypt store
]


def _is_valid_url(url: str, platform_id: str) -> bool:
    """Return False if the URL is from a blocked subdomain or wrong country store."""
    if not url:
        return False
    for blocked in _URL_BLOCKLIST:
        if blocked in url:
            return False
    return True


# ── Convert Google result to PlatformPrice ────────────────────────────────────
def _make_price(
    platform_id: str,
    display_name: str,
    result: SearchResult,
    price: float,
    shipping: float,
    delivery_days: int,
    trust_score: int,
    currency: str,
) -> PlatformPrice:
    ships_from_china = platform_id == "temu"
    return PlatformPrice(
        platform_id=platform_id,
        price=price,
        shipping=shipping,
        total=round(price + shipping, 2),
        currency=currency,
        url=result.url,
        in_stock=True,
        delivery_days=delivery_days,
        trust_score=trust_score,
        ships_from_china=ships_from_china,
        warning="يشحن من الصين — قد يستغرق 10–20 يوم عمل" if ships_from_china else None,
    )


# ── Process one platform's results ────────────────────────────────────────────
async def _process_platform(
    platform_id: str,
    display_name: str,
    organic_results: list[SearchResult],
    shopping_results: list[SearchResult],   # pre-fetched prices from shopping API
    shipping: float,
    delivery_days: int,
    trust_score: int,
    currency: str,
) -> list[PlatformPrice]:
    prices: list[PlatformPrice] = []

    # Best shopping price for this platform (used when organic snippet has no price)
    shopping_price: Optional[float] = shopping_results[0].price if shopping_results else None

    for result in organic_results[:2]:
        if not _is_valid_url(result.url, platform_id):
            continue

        # Priority: snippet price > shopping price > page scraper
        price = result.price or shopping_price
        if not price:
            price = await scrape_price(platform_id, result.url)

        if not price or price <= 0:
            log.info("no_price_found", platform=platform_id, url=result.url)
            continue

        prices.append(_make_price(
            platform_id, display_name, result,
            price, shipping, delivery_days, trust_score, currency,
        ))

    # If organic search found no URLs but shopping has a price+url, use it
    if not prices and shopping_results:
        best = shopping_results[0]
        if best.price and best.url:
            prices.append(_make_price(
                platform_id, display_name, best,
                best.price, shipping, delivery_days, trust_score, currency,
            ))

    return prices


# ── AliExpress via official API ───────────────────────────────────────────────
async def _run_aliexpress(query: str, currency: str) -> list[PlatformPrice]:
    try:
        async with AliexpressAgent() as agent:
            return await agent.search(query)
    except Exception as e:
        log.error("aliexpress_failed", error=str(e))
        return []


# ── Main search endpoint ──────────────────────────────────────────────────────
@router.post("/", response_model=SearchResponse)
async def search_products(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(400, "query لا يمكن أن يكون فارغاً")

    # ── Cache check ────────────────────────────────────────────────────────────
    cache_key = search_cache_key(req.query, req.currency)
    cached = await cache_get(cache_key)
    if cached:
        log.info("cache_hit", query=req.query)
        return SearchResponse(
            query=req.query,
            results=[Product(**p) for p in cached],
            total=len(cached),
            cached=True,
            search_time_ms=0,
        )

    start = time.time()

    platform_domains = [(pid, domain) for pid, domain, *_ in PLATFORMS]

    # ── Step 1: Shopping (prices) + organic (URLs) in parallel ─────────────────
    # Shopping: 1 API call covers all platforms via source-name matching
    # Organic: 4 API calls (one per platform) give us real product page URLs
    shopping_results, google_results = await asyncio.gather(
        search_all_platforms_shopping(req.query, platform_domains),
        search_all_platforms(req.query, platform_domains, num_per_platform=2),
    )

    # ── Step 2: Process each platform with merged data ─────────────────────────
    platform_tasks = []
    for pid, domain, name, shipping, days, trust in PLATFORMS:
        platform_tasks.append(
            _process_platform(
                pid, name,
                google_results.get(pid, []),
                shopping_results.get(pid, []),
                shipping, days, trust, req.currency,
            )
        )

    # AliExpress via official API (runs in parallel too)
    platform_tasks.append(_run_aliexpress(req.query, req.currency))

    all_results = await asyncio.gather(*platform_tasks, return_exceptions=True)

    # ── Step 3: Merge all prices ───────────────────────────────────────────────
    all_prices: list[PlatformPrice] = []
    for result in all_results:
        if isinstance(result, list):
            all_prices.extend(result)

    all_prices.sort(key=lambda p: p.total)

    elapsed_ms = int((time.time() - start) * 1000)
    log.info("search_complete", query=req.query, prices=len(all_prices), ms=elapsed_ms)

    if not all_prices:
        return SearchResponse(
            query=req.query, results=[], total=0,
            cached=False, search_time_ms=elapsed_ms,
        )

    # ── Step 4: Build Product object and cache ─────────────────────────────────
    product = Product(
        id=str(uuid.uuid4()),
        name=req.query,
        name_ar=req.query,
        brand="",
        category="general",
        prices=all_prices,
    )

    await cache_set(cache_key, [product.model_dump()])

    return SearchResponse(
        query=req.query,
        results=[product],
        total=1,
        cached=False,
        search_time_ms=elapsed_ms,
    )
