"""
HumanBehavior mixin — randomised delays, scroll patterns, and mouse movement
to reduce bot-detection risk on scraped platforms.
"""
import asyncio
import random
import math
try:
    from playwright.async_api import Page
except ImportError:
    Page = None  # type: ignore


class HumanBehavior:
    """Mix into agent classes that use Playwright."""

    async def random_delay(self, min_s: float = 1.5, max_s: float = 4.5) -> None:
        delay = random.uniform(min_s, max_s)
        await asyncio.sleep(delay)

    async def human_type(self, page: Page, selector: str, text: str) -> None:
        """Type text character-by-character with randomised timing."""
        await page.click(selector)
        await self.random_delay(0.3, 0.8)
        for char in text:
            await page.keyboard.type(char, delay=random.randint(60, 180))
        await self.random_delay(0.3, 0.6)

    async def human_scroll(
        self,
        page: Page,
        direction: str = "down",
        steps: int = 3,
    ) -> None:
        """Simulate natural scroll in multiple small increments."""
        for _ in range(steps):
            delta = random.randint(280, 520) * (1 if direction == "down" else -1)
            await page.mouse.wheel(0, delta)
            await asyncio.sleep(random.uniform(0.15, 0.45))

    async def bezier_mouse_move(
        self,
        page: Page,
        target_x: int,
        target_y: int,
        steps: int = 25,
    ) -> None:
        """Move mouse along a bezier curve to the target."""
        pos = await page.evaluate("() => ({x: window.innerWidth/2, y: window.innerHeight/2})")
        sx, sy = pos["x"], pos["y"]
        # Control points for quadratic bezier
        cx = random.randint(min(sx, target_x), max(sx, target_x))
        cy = random.randint(min(sy, target_y), max(sy, target_y))
        for i in range(steps + 1):
            t = i / steps
            x = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t ** 2 * target_x
            y = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t ** 2 * target_y
            await page.mouse.move(x, y)
            await asyncio.sleep(random.uniform(0.008, 0.025))

    async def random_viewport_jitter(self, page: Page) -> None:
        """Tiny viewport resize to vary fingerprint."""
        w = random.randint(375, 430)
        h = random.randint(780, 932)
        await page.set_viewport_size({"width": w, "height": h})
