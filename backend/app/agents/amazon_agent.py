"""
Amazon.ae agent — searches product listings and extracts price + shipping.
Uses account rotation + human behavior simulation.
"""
import re
from typing import Optional
from bs4 import BeautifulSoup
import structlog

from app.agents.base import BaseAgent
from app.models.product import PlatformPrice

log = structlog.get_logger()

AMAZON_BASE = "https://www.amazon.ae"
AMAZON_SEARCH = f"{AMAZON_BASE}/s?k={{query}}&ref=nb_sb_noss"


def _clean_price(raw: str) -> Optional[float]:
    """Extract numeric price from strings like 'AED 1,299.00'."""
    nums = re.sub(r"[^\d.]", "", raw.replace(",", ""))
    try:
        return float(nums)
    except ValueError:
        return None


class AmazonAgent(BaseAgent):
    platform_id = "amazon"

    async def _search_impl(self, query: str) -> list[PlatformPrice]:
        page = self._page
        url = AMAZON_SEARCH.format(query=query.replace(" ", "+"))

        await page.goto(url, wait_until="domcontentloaded", timeout=20_000)
        await self.random_delay(2, 4)
        await self.human_scroll(page, steps=2)

        html = await page.content()
        soup = BeautifulSoup(html, "lxml")

        results: list[PlatformPrice] = []
        items = soup.select("[data-component-type='s-search-result']")[:5]

        for item in items:
            try:
                price_whole = item.select_one(".a-price-whole")
                price_frac = item.select_one(".a-price-fraction")
                if not price_whole:
                    continue

                raw = price_whole.get_text(strip=True).replace(",", "")
                if price_frac:
                    raw += f".{price_frac.get_text(strip=True)}"
                price = _clean_price(raw)
                if not price:
                    continue

                link_el = item.select_one("h2 a")
                href = link_el["href"] if link_el else ""
                product_url = f"{AMAZON_BASE}{href}" if href.startswith("/") else href

                # Check for free shipping
                prime = item.select_one(".a-icon-prime")
                shipping = 0.0 if prime else 15.0  # estimate AED 15 if no prime

                results.append(
                    PlatformPrice(
                        platform_id="amazon",
                        price=price,
                        shipping=shipping,
                        total=price + shipping,
                        currency="AED",
                        url=product_url,
                        in_stock=True,
                        delivery_days=1 if prime else 3,
                        trust_score=96,
                    )
                )
            except Exception as e:
                log.warning("amazon_parse_error", error=str(e))
                continue

        log.info("amazon_results", count=len(results), query=query)
        return results
