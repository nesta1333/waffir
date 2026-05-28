"""
BaseAgent — shared Playwright browser lifecycle + account rotation + caching.
All platform agents inherit from this.
"""
import os
import hashlib
from abc import ABC, abstractmethod
from typing import Optional
try:
    from playwright.async_api import async_playwright, Browser, BrowserContext, Page
    _PLAYWRIGHT_OK = True
except ImportError:
    _PLAYWRIGHT_OK = False
    async_playwright = Browser = BrowserContext = Page = None  # type: ignore

import structlog

from app.agents.account_rotator import get_rotator, Account
from app.agents.human_behavior import HumanBehavior
from app.models.product import PlatformPrice
from app.cache.redis_client import cache_get, cache_set

log = structlog.get_logger()

PROFILE_DIR = os.getenv("BROWSER_PROFILE_DIR", "./browser_profiles")


class BaseAgent(HumanBehavior, ABC):
    platform_id: str = "base"

    def __init__(self):
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None
        self._account: Optional[Account] = None
        self._pw = None

    @property
    def rotator(self):
        return get_rotator(self.platform_id)

    def _cache_key(self, query: str) -> str:
        h = hashlib.md5(query.lower().encode()).hexdigest()[:12]
        return f"agent:{self.platform_id}:{h}"

    async def __aenter__(self):
        if not _PLAYWRIGHT_OK:
            raise RuntimeError("Playwright is not installed. Run: pip install playwright && playwright install chromium")
        self._pw = await async_playwright().start()
        self._account = self.rotator.next()
        profile_path = None
        if self._account:
            profile_path = f"{PROFILE_DIR}/{self.platform_id}_{self._account.index}"

        self._browser = await self._pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
            ],
        )
        ctx_opts: dict = {
            "locale": "ar-AE",
            "timezone_id": "Asia/Dubai",
            "user_agent": (
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            ),
            "viewport": {"width": 390, "height": 844},
            "geolocation": {"longitude": 55.2708, "latitude": 25.2048},
            "permissions": ["geolocation"],
        }
        if profile_path:
            ctx_opts["storage_state"] = self._load_storage_state(profile_path)

        self._context = await self._browser.new_context(**ctx_opts)
        await self._context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        self._page = await self._context.new_page()
        return self

    async def __aexit__(self, *_):
        if self._page:
            await self._page.close()
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._pw:
            await self._pw.stop()

    def _load_storage_state(self, path: str) -> Optional[str]:
        try:
            if os.path.exists(f"{path}.json"):
                return f"{path}.json"
        except Exception:
            pass
        return None

    async def search(self, query: str) -> list[PlatformPrice]:
        key = self._cache_key(query)
        cached = await cache_get(key)
        if cached:
            log.info("cache_hit", platform=self.platform_id, query=query)
            return [PlatformPrice(**p) for p in cached]

        try:
            results = await self._search_impl(query)
            if results:
                await cache_set(key, [r.model_dump() for r in results])
                if self._account:
                    self.rotator.mark_success(self._account)
            return results
        except Exception as e:
            log.error("agent_error", platform=self.platform_id, error=str(e))
            if self._account:
                self.rotator.mark_failure(self._account)
            return []

    @abstractmethod
    async def _search_impl(self, query: str) -> list[PlatformPrice]:
        """Platform-specific scraping logic."""
        ...
