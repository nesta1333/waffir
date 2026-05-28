"""
Google Search integration — the backbone of Waffir's product discovery.

Why Google instead of scraping stores directly?
  • Google already indexes all prices — we get them in <1 second
  • No bot detection — we're calling an official API
  • Works even if Amazon/Noon change their HTML
  • One call covers all platforms simultaneously

Supported providers (priority order):
  1. Serper.dev          (SERPER_API_KEY)      — 2500 free/month, best value
  2. Google Custom Search (GOOGLE_API_KEY +     — 100 free/day
                          GOOGLE_CSE_ID)
  3. httpx fallback      (no key needed)        — scrapes google.com, unreliable

Configure in .env — at least one provider recommended for production.
In dev (no keys set): falls back to option 3 with low rate limit.
"""
import os
import re
import asyncio
import httpx
import structlog
from dataclasses import dataclass
from typing import Optional

log = structlog.get_logger()

# ── Config (read lazily so .env is loaded first) ──────────────────────────────
def _serper_key():  return os.getenv("SERPER_API_KEY", "")
def _google_key():  return os.getenv("GOOGLE_API_KEY", "")
def _google_cse():  return os.getenv("GOOGLE_CSE_ID", "")

TIMEOUT     = httpx.Timeout(10.0, connect=5.0)
HEADERS     = {
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    ),
    "Accept-Language": "ar-AE,ar;q=0.9,en;q=0.8",
}


@dataclass
class SearchResult:
    url:     str
    title:   str
    snippet: str
    price:   Optional[float] = None   # extracted from snippet if available
    currency: str = "AED"
    source:  str = ""                  # store name from shopping results


# ── Price extraction from snippet text ───────────────────────────────────────
_PRICE_RE = re.compile(
    r"(?:AED|درهم|SAR|ر\.س)\s*([\d,]+(?:\.\d{1,2})?)"
    r"|(?:[\d,]+(?:\.\d{1,2})?)\s*(?:AED|درهم|SAR|ر\.س)",
    re.IGNORECASE,
)


def _extract_price(text: str) -> Optional[float]:
    m = _PRICE_RE.search(text)
    if not m:
        return None
    raw = (m.group(1) or m.group(0)).replace(",", "").strip()
    raw = re.sub(r"[^\d.]", "", raw)
    try:
        v = float(raw)
        return v if 1 < v < 100_000 else None
    except ValueError:
        return None


def _currency_from_text(text: str) -> str:
    if "SAR" in text or "ر.س" in text:
        return "SAR"
    return "AED"


# ── Provider 1: Serper.dev ─────────────────────────────────────────────────────
async def _serper_search(query: str, num: int = 5) -> list[SearchResult]:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": _serper_key(), "Content-Type": "application/json"},
            json={
                "q":   query,
                "gl":  "ae",    # UAE results
                "hl":  "ar",
                "num": num,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("organic", []):
        snippet = item.get("snippet", "")
        results.append(SearchResult(
            url=item.get("link", ""),
            title=item.get("title", ""),
            snippet=snippet,
            price=_extract_price(snippet + " " + item.get("title", "")),
            currency=_currency_from_text(snippet),
        ))
    return results


# ── Provider 2: Google Custom Search API ──────────────────────────────────────
async def _google_cse_search(query: str, num: int = 5) -> list[SearchResult]:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(
            "https://www.googleapis.com/customsearch/v1",
            params={
                "key": _google_key(),
                "cx":  _google_cse(),
                "q":   query,
                "gl":  "ae",
                "hl":  "ar",
                "num": min(num, 10),
            },
        )
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("items", []):
        snippet = item.get("snippet", "")
        results.append(SearchResult(
            url=item.get("link", ""),
            title=item.get("title", ""),
            snippet=snippet,
            price=_extract_price(snippet + " " + item.get("title", "")),
            currency=_currency_from_text(snippet),
        ))
    return results


# ── Public interface ───────────────────────────────────────────────────────────
async def google_search(query: str, num: int = 5) -> list[SearchResult]:
    """
    Search Google for `query` and return structured results.
    Automatically picks the best available provider.
    """
    if _serper_key():
        try:
            results = await _serper_search(query, num)
            log.info("google_search.serper", query=query, count=len(results))
            return results
        except Exception as exc:
            log.warning("serper_failed", error=str(exc))

    if _google_key() and _google_cse():
        try:
            results = await _google_cse_search(query, num)
            log.info("google_search.cse", query=query, count=len(results))
            return results
        except Exception as exc:
            log.warning("google_cse_failed", error=str(exc))

    log.warning("google_search.no_provider", query=query,
                hint="Set SERPER_API_KEY or GOOGLE_API_KEY+GOOGLE_CSE_ID in .env")
    return []


async def search_platform(query: str, platform_domain: str, num: int = 3) -> list[SearchResult]:
    """
    Search for a product on a specific platform via Google.
    e.g. search_platform("iPhone 16", "amazon.ae")
    """
    google_query = f"{query} site:{platform_domain}"
    return await google_search(google_query, num=num)


async def search_all_platforms(
    query: str,
    platforms: list[tuple[str, str]],  # [(platform_id, domain), ...]
    num_per_platform: int = 3,
) -> dict[str, list[SearchResult]]:
    """
    Search all platforms in parallel via Google.
    Returns { platform_id: [results] }
    """
    tasks = {
        pid: search_platform(query, domain, num_per_platform)
        for pid, domain in platforms
    }
    results_list = await asyncio.gather(*tasks.values(), return_exceptions=True)
    return {
        pid: (r if isinstance(r, list) else [])
        for pid, r in zip(tasks.keys(), results_list)
    }


# ── Shopping Search — returns real prices from Google Shopping ────────────────

# Source name → platform_id: covers common variations Serper returns
_SOURCE_TO_PLATFORM = {
    "amazon.ae": "amazon",
    "amazon":    "amazon",
    "noon.com":  "noon",
    "noon":      "noon",
    "namshi":    "namshi",
    "namshi.com": "namshi",
    "temu":      "temu",
    "temu.com":  "temu",
}


def _source_to_platform(source: str) -> Optional[str]:
    """Map a Serper shopping 'source' name to our internal platform_id."""
    key = source.lower().split(" - ")[0].strip()   # strip "- Retail", "- Seller" etc.
    for pattern, pid in _SOURCE_TO_PLATFORM.items():
        if pattern in key:
            return pid
    return None


def _parse_shopping_price(price_str: str) -> Optional[float]:
    """
    Parse Serper shopping price strings.
    Handles Arabic RTL marks and 'د.إ' (AED in Arabic), SAR, plain digits.
    Examples: '‏827.99 د.إ.‏', 'AED 1,099', 'SAR 799.00'
    """
    if not price_str:
        return None
    # Strip Arabic bidirectional / zero-width marks
    clean = re.sub(r"[‎‏‪-‮]", "", price_str).strip()
    # Try standard regex first
    p = _extract_price(clean)
    if p:
        return p
    # Fallback: extract any number from the string
    nums = re.findall(r"[\d,]+(?:\.\d{1,2})?", clean)
    for n in nums:
        raw = n.replace(",", "")
        try:
            v = float(raw)
            if 1 < v < 200_000:
                return v
        except ValueError:
            continue
    return None


async def _serper_shopping_search(query: str, num: int = 20) -> list[SearchResult]:
    """One call to Serper /shopping — returns up to `num` results across all stores."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(
            "https://google.serper.dev/shopping",
            headers={"X-API-KEY": _serper_key(), "Content-Type": "application/json"},
            json={"q": query, "gl": "ae", "hl": "ar", "num": num},
        )
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("shopping", []):
        price_str = item.get("price", "")
        source    = item.get("source", "")
        results.append(SearchResult(
            url=item.get("link", ""),
            title=item.get("title", ""),
            snippet=price_str,
            price=_parse_shopping_price(price_str),
            currency=_currency_from_text(price_str),
            source=source,
        ))
    return results


def _filter_shopping_anomalies(items: list[SearchResult]) -> list[SearchResult]:
    """
    Remove obvious accessories / pricing anomalies from shopping results.
    Keeps only results within 25%–500% of the median price for that platform.
    Prevents a phone case (169 AED) from appearing alongside AirPods (1099 AED).
    """
    priced = [r for r in items if r.price]
    if len(priced) < 2:
        return priced
    prices = sorted(r.price for r in priced)   # type: ignore[misc]
    n = len(prices)
    median = prices[n // 2] if n % 2 else (prices[n // 2 - 1] + prices[n // 2]) / 2
    lo, hi = median * 0.25, median * 5.0
    return [r for r in priced if lo <= r.price <= hi]   # type: ignore[operator]


async def search_all_platforms_shopping(
    query: str,
    platforms: list[tuple[str, str]],
) -> dict[str, list[SearchResult]]:
    """
    Single shopping search → group results by platform_id using source name matching.
    Returns { platform_id: [priced_results] }
    Much cheaper than site-filtered searches (1 API call instead of N).
    """
    if not _serper_key():
        return {pid: [] for pid, _ in platforms}

    target_pids = {pid for pid, _ in platforms}
    results: dict[str, list[SearchResult]] = {pid: [] for pid in target_pids}

    try:
        items = await _serper_shopping_search(query, num=20)
        for item in items:
            if not item.price:
                continue
            pid = _source_to_platform(item.source)
            if pid and pid in results:
                results[pid].append(item)
        # Remove accessories / anomalous prices per platform
        for pid in list(results.keys()):
            results[pid] = _filter_shopping_anomalies(results[pid])
        for pid, items_list in results.items():
            log.info("shopping_matched", platform=pid, hits=len(items_list))
    except Exception as exc:
        log.warning("shopping_search_failed", error=str(exc))

    return results
