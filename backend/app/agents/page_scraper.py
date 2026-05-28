"""
Lightweight page scrapers — called only when Google snippet doesn't have price.

Strategy (per platform):
  Amazon  → httpx GET → parse .a-price or __NEXT_DATA__ JSON
  Noon    → httpx GET → parse __NEXT_DATA__ (pure JSON, no login needed)
  Namshi  → httpx GET → parse ld+json
  Temu    → httpx GET → parse window.__DATA__ JSON
  Generic → httpx GET → regex price scan

All requests pretend to be an iPhone Safari browser from Dubai.
No accounts. No Playwright. No cookies.
If a page fails, we simply use the snippet price from Google.
"""
import re
import json
import asyncio
from typing import Optional
import httpx
import structlog
from bs4 import BeautifulSoup

log = structlog.get_logger()

TIMEOUT = httpx.Timeout(12.0, connect=5.0)
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ar-AE,ar;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

_PRICE_RE = re.compile(
    r"(?:AED|درهم|SAR)\s*([\d,]+(?:\.\d{1,2})?)"
    r"|(?:[\d,]+(?:\.\d{1,2})?)\s*(?:AED|درهم|SAR)",
    re.IGNORECASE,
)


def _clean_price(raw: str) -> Optional[float]:
    clean = re.sub(r"[^\d.]", "", raw.replace(",", ""))
    try:
        v = float(clean)
        return v if 1 < v < 200_000 else None
    except ValueError:
        return None


# ── Amazon ────────────────────────────────────────────────────────────────────
async def scrape_amazon(url: str) -> Optional[float]:
    """Extract price from an Amazon.ae product page — no login needed."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, headers=HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return None

        soup = BeautifulSoup(resp.text, "lxml")

        # Method 1: standard price element
        whole = soup.select_one(".a-price-whole, #priceblock_ourprice, #priceblock_dealprice")
        if whole:
            frac_el = soup.select_one(".a-price-fraction")
            raw = whole.get_text(strip=True).replace(",", "")
            if frac_el:
                raw += f".{frac_el.get_text(strip=True)}"
            price = _clean_price(raw)
            if price:
                return price

        # Method 2: JSON-LD
        for tag in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(tag.string or "")
                offers = data.get("offers", {})
                if isinstance(offers, list):
                    offers = offers[0]
                p = offers.get("price")
                if p:
                    return float(p)
            except Exception:
                continue

        # Method 3: regex scan on page text
        m = _PRICE_RE.search(resp.text[:30_000])
        if m:
            return _clean_price(m.group(1) or m.group(0))

    except Exception as exc:
        log.warning("scrape_amazon_error", url=url, error=str(exc))
    return None


# ── Noon ──────────────────────────────────────────────────────────────────────
async def scrape_noon(url: str) -> Optional[float]:
    """Extract price from Noon.com product page via __NEXT_DATA__ JSON."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, headers=HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return None

        soup = BeautifulSoup(resp.text, "lxml")

        # Method 1: __NEXT_DATA__
        tag = soup.find("script", id="__NEXT_DATA__")
        if tag and tag.string:
            try:
                data = json.loads(tag.string)
                # Navigate to product price in Noon's data structure
                page_props = data.get("props", {}).get("pageProps", {})
                product = page_props.get("product", {})
                price = (
                    product.get("price")
                    or product.get("sale_price")
                    or product.get("salePrice")
                )
                if price:
                    return float(price)
                # Try nested: catalog
                catalog = page_props.get("catalog", {})
                p = catalog.get("price") or catalog.get("sale_price")
                if p:
                    return float(p)
            except Exception:
                pass

        # Method 2: ld+json
        for tag in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(tag.string or "")
                offers = data.get("offers", {})
                if isinstance(offers, list):
                    offers = offers[0]
                p = offers.get("price")
                if p:
                    return float(p)
            except Exception:
                continue

    except Exception as exc:
        log.warning("scrape_noon_error", url=url, error=str(exc))
    return None


# ── Namshi ────────────────────────────────────────────────────────────────────
async def scrape_namshi(url: str) -> Optional[float]:
    """Extract price from Namshi.com via JSON-LD or regex."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, headers=HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return None

        soup = BeautifulSoup(resp.text, "lxml")
        for tag in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(tag.string or "")
                offers = data.get("offers", {})
                if isinstance(offers, list):
                    offers = offers[0]
                p = offers.get("price")
                if p:
                    return float(p)
            except Exception:
                continue

        # Regex fallback
        m = _PRICE_RE.search(resp.text[:50_000])
        if m:
            return _clean_price(m.group(1) or m.group(0))

    except Exception as exc:
        log.warning("scrape_namshi_error", url=url, error=str(exc))
    return None


# ── Temu ──────────────────────────────────────────────────────────────────────
async def scrape_temu(url: str) -> Optional[float]:
    """Extract price from Temu — page is JSON-heavy, try ld+json or regex."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, headers=HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return None

        soup = BeautifulSoup(resp.text, "lxml")
        for tag in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(tag.string or "")
                offers = data.get("offers", {})
                if isinstance(offers, list):
                    offers = offers[0]
                p = offers.get("price")
                if p:
                    # Temu prices in USD → convert to AED (~3.67)
                    usd = float(p)
                    return round(usd * 3.67, 2)
            except Exception:
                continue

    except Exception as exc:
        log.warning("scrape_temu_error", url=url, error=str(exc))
    return None


# ── Dispatcher ────────────────────────────────────────────────────────────────
_SCRAPERS = {
    "amazon":  scrape_amazon,
    "noon":    scrape_noon,
    "namshi":  scrape_namshi,
    "temu":    scrape_temu,
}


async def scrape_price(platform_id: str, url: str) -> Optional[float]:
    """Scrape price from a product URL. Returns None on failure."""
    fn = _SCRAPERS.get(platform_id)
    if not fn or not url:
        return None
    try:
        return await asyncio.wait_for(fn(url), timeout=10.0)
    except asyncio.TimeoutError:
        log.warning("scrape_timeout", platform=platform_id, url=url)
        return None
