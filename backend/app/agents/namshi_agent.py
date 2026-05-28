"""
Namshi.com agent — UAE fashion/lifestyle platform.
Shows original + sale price side by side. Fashion focus means size availability matters.
"""
import re
from typing import Optional
from bs4 import BeautifulSoup
import structlog

from app.agents.base import BaseAgent
from app.models.product import PlatformPrice

log = structlog.get_logger()

NAMSHI_BASE = "https://www.namshi.com"
NAMSHI_SEARCH = f"{NAMSHI_BASE}/uae-en/search/?q={{query}}"


def _namshi_price(raw: str) -> Optional[float]:
    nums = re.sub(r"[^\d.]", "", raw)
    try:
        return float(nums)
    except ValueError:
        return None


class NamshiAgent(BaseAgent):
    platform_id = "namshi"

    async def _search_impl(self, query: str) -> list[PlatformPrice]:
        page = self._page
        url = NAMSHI_SEARCH.format(query=query.replace(" ", "+"))

        await page.goto(url, wait_until="networkidle", timeout=25_000)
        await self.random_delay(2, 4)
        await self.human_scroll(page, steps=2)

        html = await page.content()
        soup = BeautifulSoup(html, "lxml")
        results: list[PlatformPrice] = []

        items = soup.select("[class*='product-card'], [class*='productCard']")[:5]
        for item in items:
            try:
                # Sale price
                sale_el = item.select_one("[class*='price-current'], [class*='salePrice'], [class*='finalPrice']")
                # Original price
                orig_el = item.select_one("[class*='price-original'], [class*='originalPrice'], s")

                if not sale_el:
                    continue

                sale_price = _namshi_price(sale_el.get_text(strip=True))
                if not sale_price:
                    continue

                orig_price = _namshi_price(orig_el.get_text(strip=True)) if orig_el else None
                discount_pct = None
                if orig_price and orig_price > sale_price:
                    discount_pct = round((orig_price - sale_price) / orig_price * 100)

                link_el = item.select_one("a[href]")
                href = link_el["href"] if link_el else ""
                product_url = f"{NAMSHI_BASE}{href}" if href.startswith("/") else href

                results.append(
                    PlatformPrice(
                        platform_id="namshi",
                        price=sale_price,
                        shipping=0.0,
                        total=sale_price,
                        currency="AED",
                        url=product_url,
                        in_stock=True,
                        delivery_days=2,
                        original_price=orig_price,
                        discount_pct=discount_pct,
                        trust_score=92,
                    )
                )
            except Exception as e:
                log.warning("namshi_parse_error", error=str(e))
                continue

        log.info("namshi_results", count=len(results), query=query)
        return results
