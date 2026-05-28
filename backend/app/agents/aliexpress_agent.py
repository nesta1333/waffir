"""
AliExpress agent — uses the official AliExpress Affiliate API (free tier).
Always adds shipping cost to final price and labels as "Ships from China".
"""
import os
import hashlib
import time
import json
import httpx
import structlog

from app.agents.base import BaseAgent
from app.models.product import PlatformPrice

log = structlog.get_logger()

API_URL = "https://api.aliexpress.com/sync"
USD_TO_AED = 3.67


class AliexpressAgent(BaseAgent):
    """Uses official API — no Playwright needed for this platform."""
    platform_id = "aliexpress"

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        pass

    def __init__(self):
        super().__init__()
        self._app_key = os.getenv("ALIEXPRESS_APP_KEY", "")
        self._app_secret = os.getenv("ALIEXPRESS_APP_SECRET", "")
        self._tracking_id = os.getenv("ALIEXPRESS_TRACKING_ID", "waffir")

    def _sign(self, params: dict) -> str:
        """AliExpress API signature — plain MD5 (not HMAC)."""
        sorted_params = sorted(params.items())
        str_to_sign = self._app_secret + "".join(f"{k}{v}" for k, v in sorted_params) + self._app_secret
        return hashlib.md5(str_to_sign.encode()).hexdigest().upper()

    async def _search_impl(self, query: str) -> list[PlatformPrice]:
        if not self._app_key or not self._app_secret:
            log.warning("aliexpress_no_api_key")
            return []

        params = {
            "method": "aliexpress.affiliate.product.query",
            "app_key": self._app_key,
            "sign_method": "md5",
            "timestamp": str(int(time.time() * 1000)),
            "format": "json",
            "v": "2.0",
            "keywords": query,
            "target_currency": "USD",
            "target_language": "AR",
            "tracking_id": self._tracking_id,
            "page_no": "1",
            "page_size": "5",
            "ship_to_country": "AE",
        }
        params["sign"] = self._sign(params)

        async with httpx.AsyncClient(timeout=15) as client:
            try:
                resp = await client.post(API_URL, data=params)
                data = resp.json()
            except Exception as e:
                log.error("aliexpress_api_error", error=str(e))
                return []

        results: list[PlatformPrice] = []
        try:
            products = (
                data.get("aliexpress_affiliate_product_query_response", {})
                .get("resp_result", {})
                .get("result", {})
                .get("products", {})
                .get("product", [])
            )
            for p in products:
                price_usd = float(p.get("target_sale_price", p.get("target_original_price", 0)))
                if price_usd <= 0:
                    continue
                price_aed = round(price_usd * USD_TO_AED)
                shipping_aed = 35 if int(p.get("ship_to_days", 0) or 0) > 0 else 0
                results.append(
                    PlatformPrice(
                        platform_id="aliexpress",
                        price=price_aed,
                        shipping=shipping_aed,
                        total=price_aed + shipping_aed,
                        currency="AED",
                        url=p.get("product_detail_url", "https://aliexpress.com"),
                        in_stock=True,
                        delivery_days=int(p.get("ship_to_days", 14)),
                        ships_from_china=True,
                        trust_score=78,
                    )
                )
        except Exception as e:
            log.error("aliexpress_parse_error", error=str(e))

        log.info("aliexpress_results", count=len(results), query=query)
        return results
