"""
Round-robin account rotator with per-account cooldown tracking.
Prevents rate-limiting by distributing requests across 5 accounts per platform.
"""
import os
import time
from dataclasses import dataclass, field
from typing import Optional
import structlog

log = structlog.get_logger()

COOLDOWN_SECONDS = 120  # 2 min cooldown after each use


@dataclass
class Account:
    email: str
    password: str
    platform: str
    index: int
    last_used: float = 0.0
    failure_count: int = 0
    is_blocked: bool = False


class AccountRotator:
    def __init__(self, platform: str, count: int = 5):
        self.platform = platform
        self.accounts: list[Account] = []
        self._cursor = 0
        self._load_accounts(count)

    def _load_accounts(self, count: int) -> None:
        prefix = self.platform.upper()
        for i in range(1, count + 1):
            email = os.getenv(f"{prefix}_EMAIL_{i}", "")
            password = os.getenv(f"{prefix}_PASS_{i}", "")
            if email and password:
                self.accounts.append(
                    Account(email=email, password=password, platform=self.platform, index=i)
                )
        if not self.accounts:
            log.warning("no_accounts_configured", platform=self.platform)

    def next(self) -> Optional[Account]:
        """Return the next available (not on cooldown, not blocked) account."""
        now = time.time()
        for _ in range(len(self.accounts)):
            idx = self._cursor % len(self.accounts)
            self._cursor += 1
            acc = self.accounts[idx]
            if acc.is_blocked:
                continue
            if now - acc.last_used >= COOLDOWN_SECONDS:
                acc.last_used = now
                log.info("account_selected", platform=self.platform, index=acc.index)
                return acc
        log.warning("all_accounts_on_cooldown", platform=self.platform)
        return None

    def mark_failure(self, account: Account) -> None:
        account.failure_count += 1
        if account.failure_count >= 3:
            account.is_blocked = True
            log.error("account_blocked", platform=self.platform, index=account.index)

    def mark_success(self, account: Account) -> None:
        account.failure_count = 0


# Global rotators — one per platform
_rotators: dict[str, AccountRotator] = {}


def get_rotator(platform: str) -> AccountRotator:
    if platform not in _rotators:
        _rotators[platform] = AccountRotator(platform)
    return _rotators[platform]
