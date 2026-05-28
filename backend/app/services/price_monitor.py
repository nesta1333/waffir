"""
Price monitor service.

Called by the /api/monitor/check endpoint, which the mobile app can hit
on backgroundFetch wake-ups OR when the app is brought to the foreground
after a period of inactivity.

Flow:
  1. Client sends the list of active alerts (product name + target price + currency).
  2. We search the current best price for each alert via the agent pool.
  3. We return which alerts have been triggered (current price ≤ target).
  4. The mobile client then fires a local push notification for each hit.
"""
import asyncio
import structlog

from app.models.product import PlatformPrice
from app.agents.amazon_agent import AmazonAgent
from app.agents.noon_agent import NoonAgent
from app.agents.aliexpress_agent import AliexpressAgent
from app.agents.temu_agent import TemuAgent
from app.agents.namshi_agent import NamshiAgent
from app.cache.redis_client import cache_get, cache_set, search_cache_key

log = structlog.get_logger()

AGENT_MAP = {
    "amazon":     AmazonAgent,
    "noon":       NoonAgent,
    "aliexpress": AliexpressAgent,
    "temu":       TemuAgent,
    "namshi":     NamshiAgent,
}


async def _best_price_for(query: str, currency: str) -> float | None:
    """Return the best (lowest total) price found across all agents, or None."""
    # Try cache first to avoid hammering platforms
    key = search_cache_key(query, currency)
    cached = await cache_get(key)
    if cached:
        prices = [p.get("total", float("inf")) for p in cached]
        return min(prices) if prices else None

    tasks = [
        _run_agent(platform, query)
        for platform in AGENT_MAP
    ]
    results: list[list[PlatformPrice]] = await asyncio.gather(*tasks)
    all_prices: list[PlatformPrice] = []
    for batch in results:
        all_prices.extend(batch)

    if not all_prices:
        return None

    sorted_prices = sorted(all_prices, key=lambda p: p.total)
    # Cache so subsequent calls within TTL are instant
    await cache_set(key, [p.model_dump() for p in sorted_prices])
    return sorted_prices[0].total


async def _run_agent(platform: str, query: str) -> list[PlatformPrice]:
    AgentCls = AGENT_MAP.get(platform)
    if not AgentCls:
        return []
    try:
        async with AgentCls() as agent:
            return await agent.search(query)
    except Exception as e:
        log.warning("monitor_agent_failed", platform=platform, error=str(e))
        return []


async def check_alerts(alerts: list[dict]) -> list[dict]:
    """
    Check each alert and return those whose current price ≤ target price.

    Input alert dict:
        { product_name_ar, target_price, currency }

    Returns triggered alerts with added `current_price` field.
    """
    triggered: list[dict] = []

    for alert in alerts:
        query     = alert.get("product_name_ar", "")
        target    = float(alert.get("target_price", 0))
        currency  = alert.get("currency", "AED")

        if not query or target <= 0:
            continue

        try:
            current = await _best_price_for(query, currency)
            if current is not None and current <= target:
                triggered.append({**alert, "current_price": current})
                log.info("alert_triggered",
                         query=query, target=target, current=current)
        except Exception as e:
            log.error("alert_check_error", query=query, error=str(e))

    return triggered
