"""
Temu agent — Playwright scraper with full human-behavior simulation.
Auto-converts USD → AED. Shows "Ships from China" warning.
"""
import re
from typing import Optional
from bs4 import BeautifulSoup
import structlog

from app.agents.base import BaseAgent
from app.models.product import PlatformPrice

log = structlog.get_logger()

TEMU_SEARCH = "https://www.temu.com/search_result.html?search_key={query}"
USD_TO_AED = 3.67
SHIPPING_AED = 150  # Fixed estimate for UAE shipping from Temu


def _temu_price(raw: str) -> Optional[float]:
    nums = re.sub(r"[^\d.]", "", raw)
    try:
        return float(nums)
    except ValueError:
        return None


class TemuAgent(BaseAgent):
    platform_id = "temu"

    async def _search_impl(self, query: str) -> list[PlatformPrice]:
        page = self._page
        url = TEMU_SEARCH.format(query=query.replace(" ", "+"))

        await page.goto(url, wait_until="domcontentloaded", timeout=25_000)
        await self.random_delay(3, 6)
        await self.human_scroll(page, steps=4)
        await self.random_delay(1, 2)

        html = await page.content()
        soup = BeautifulSoup(html, "lxml")
        results: list[PlatformPrice] = []

        # Temu varies selectors — try multiple patterns
        items = (
            soup.select("[class*='search-item']")
            or soup.select("[data-type='goods']")
            or soup.select("._2DSlP")  # fallback class
        )[:5]

        for item in items:
            try:
                price_el = (
                    item.select_one("[class*='price-current']")
                    or item.select_one("[class*='goods-price']")
                    or item.select_one("strong")
                )
                if not price_el:
                    continue
                price_usd = _temu_price(price_el.get_text(strip=True))
                if not price_usd:
                    continue

                price_aed = round(price_usd * USD_TO_AED)
                total_aed = price_aed + SHIPPING_AED

                link_el = item.select_one("a[href]")
                href = link_el["href"] if link_el else ""
                product_url = f"https://www.temu.com{href}" if href.startswith("/") else href

                results.append(
                    PlatformPrice(
                        platform_id="temu",
                        price=price_aed,
                        shipping=SHIPPING_AED,
                        total=total_aed,
                        currency="AED",
                        url=product_url,
                        in_stock=True,
                        delivery_days=18,
                        ships_from_china=True,
                        warning="تحقق من الجودة والضمان قبل الشراء",
                        trust_score=70,
                    )
                )
            except Exception as e:
                log.warning("temu_parse_error", error=str(e))
                continue

        log.info("temu_results", count=len(results), query=query)
        return results
