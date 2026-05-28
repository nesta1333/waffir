"""
Noon.com agent — UAE/KSA marketplace scraper.
"""
import re
import json
from typing import Optional
from bs4 import BeautifulSoup
import structlog

from app.agents.base import BaseAgent
from app.models.product import PlatformPrice

log = structlog.get_logger()

NOON_BASE = "https://www.noon.com"
NOON_SEARCH = f"{NOON_BASE}/uae-en/search/?q={{query}}"


def _noon_price(raw: str) -> Optional[float]:
    nums = re.sub(r"[^\d.]", "", raw)
    try:
        return float(nums)
    except ValueError:
        return None


class NoonAgent(BaseAgent):
    platform_id = "noon"

    async def _search_impl(self, query: str) -> list[PlatformPrice]:
        page = self._page
        url = NOON_SEARCH.format(query=query.replace(" ", "+"))

        await page.goto(url, wait_until="networkidle", timeout=25_000)
        await self.random_delay(2, 5)
        await self.human_scroll(page, steps=3)

        # Noon renders via React — try JSON state first
        json_price = await self._try_extract_json(page)
        if json_price:
            return json_price

        html = await page.content()
        soup = BeautifulSoup(html, "lxml")
        results: list[PlatformPrice] = []

        product_cards = soup.select("[class*='productContainer']")[:5]
        for card in product_cards:
            try:
                price_el = card.select_one("[class*='priceNow'], [class*='price']")
                if not price_el:
                    continue
                price = _noon_price(price_el.get_text(strip=True))
                if not price:
                    continue

                link_el = card.select_one("a[href]")
                href = link_el["href"] if link_el else ""
                product_url = f"{NOON_BASE}{href}" if href.startswith("/") else href

                results.append(
                    PlatformPrice(
                        platform_id="noon",
                        price=price,
                        shipping=0.0,
                        total=price,
                        currency="AED",
                        url=product_url,
                        in_stock=True,
                        delivery_days=1,
                        trust_score=94,
                    )
                )
            except Exception as e:
                log.warning("noon_parse_error", error=str(e))
                continue

        log.info("noon_results", count=len(results), query=query)
        return results

    async def _try_extract_json(self, page) -> list[PlatformPrice]:
        """Attempt to pull prices from Noon's embedded __NEXT_DATA__ JSON."""
        try:
            data = await page.evaluate(
                "() => JSON.stringify(window.__NEXT_DATA__?.props?.pageProps?.hits ?? [])"
            )
            hits = json.loads(data or "[]")
            results = []
            for hit in hits[:5]:
                price = hit.get("price", {}).get("value")
                if not price:
                    continue
                results.append(
                    PlatformPrice(
                        platform_id="noon",
                        price=float(price),
                        shipping=0.0,
                        total=float(price),
                        currency="AED",
                        url=f"{NOON_BASE}/uae-en/{hit.get('sku', '')}",
                        in_stock=hit.get("inStock", True),
                        delivery_days=1,
                        trust_score=94,
                    )
                )
            return results
        except Exception:
            return []
