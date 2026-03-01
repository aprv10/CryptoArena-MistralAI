"""Portfolio state management, trade execution, and P&L calculation.

Supports USD-based trading with fractional crypto amounts.
"""

from __future__ import annotations
import time
from dataclasses import dataclass, field
from config import DEFAULT_STARTING_CAPITAL


@dataclass
class Trade:
    """A single executed trade."""
    timestamp: float
    agent: str          # "user" or "sage"
    action: str         # "BUY" or "SELL"
    crypto: str         # e.g. "BTC"
    amount_usd: float   # USD value of the trade
    quantity: float     # crypto quantity (computed)
    price: float        # price at time of trade
    reasoning: str = ""
    success: bool = True
    error: str | None = None


class Portfolio:
    """Manages an agent's portfolio: cash, holdings, trade history, value snapshots."""

    def __init__(self, agent_name: str, starting_capital: float = DEFAULT_STARTING_CAPITAL):
        self.agent_name = agent_name
        self.starting_capital = starting_capital
        self.cash: float = starting_capital
        self.holdings: dict[str, dict] = {}
        # holdings = { "BTC": { "quantity": 0.5, "avg_price": 60000, "total_cost": 30000 }, ... }
        self.trades: list[Trade] = []
        self.value_history: list[dict] = [
            {"time": time.time(), "value": starting_capital}
        ]
        self.best_trade: dict | None = None   # { crypto, pnl, pct }
        self.worst_trade: dict | None = None  # { crypto, pnl, pct }

    def execute_trade(
        self,
        action: str,
        crypto: str,
        amount_usd: float,
        price: float,
        reasoning: str = "",
    ) -> Trade:
        """Validate and execute a trade. Returns the Trade object.

        Args:
            action: "BUY" or "SELL"
            crypto: ticker symbol (e.g. "BTC")
            amount_usd: dollar amount to trade
            price: current price of the crypto
            reasoning: AI reasoning string
        """
        action = action.upper().strip()
        crypto = crypto.upper().strip()
        amount_usd = abs(amount_usd)

        # ── Validation ────────────────────────────────────────────────────
        if action not in ("BUY", "SELL"):
            return self._failed_trade(
                action, crypto, amount_usd, price, reasoning,
                f"Invalid action: {action}. Must be BUY or SELL."
            )

        if price <= 0:
            return self._failed_trade(
                action, crypto, amount_usd, price, reasoning,
                f"Invalid price: {price}"
            )

        if amount_usd <= 0:
            return self._failed_trade(
                action, crypto, amount_usd, price, reasoning,
                "Trade amount must be greater than 0."
            )

        quantity = amount_usd / price

        if action == "BUY":
            if amount_usd > self.cash:
                return self._failed_trade(
                    action, crypto, amount_usd, price, reasoning,
                    f"Insufficient cash. Have ${self.cash:,.2f}, need ${amount_usd:,.2f}."
                )

            # Execute buy
            self.cash -= amount_usd

            if crypto in self.holdings:
                h = self.holdings[crypto]
                new_total_cost = h["total_cost"] + amount_usd
                new_quantity = h["quantity"] + quantity
                h["avg_price"] = new_total_cost / new_quantity if new_quantity > 0 else 0
                h["quantity"] = new_quantity
                h["total_cost"] = new_total_cost
            else:
                self.holdings[crypto] = {
                    "quantity": quantity,
                    "avg_price": price,
                    "total_cost": amount_usd,
                }

        elif action == "SELL":
            if crypto not in self.holdings or self.holdings[crypto]["quantity"] <= 0:
                return self._failed_trade(
                    action, crypto, amount_usd, price, reasoning,
                    f"No {crypto} holdings to sell."
                )

            h = self.holdings[crypto]
            max_sell_value = h["quantity"] * price
            if amount_usd > max_sell_value * 1.01:  # small tolerance
                return self._failed_trade(
                    action, crypto, amount_usd, price, reasoning,
                    f"Insufficient {crypto}. Have {h['quantity']:.6f} units "
                    f"(worth ${max_sell_value:,.2f}), tried to sell ${amount_usd:,.2f}."
                )

            # Cap sell to max holdings
            actual_sell_qty = min(quantity, h["quantity"])
            actual_sell_usd = actual_sell_qty * price

            # Track P&L for this trade
            cost_basis = actual_sell_qty * h["avg_price"]
            trade_pnl = actual_sell_usd - cost_basis
            trade_pct = (trade_pnl / cost_basis * 100) if cost_basis > 0 else 0

            self._update_best_worst(crypto, trade_pnl, trade_pct)

            # Execute sell
            self.cash += actual_sell_usd
            h["quantity"] -= actual_sell_qty
            h["total_cost"] = h["quantity"] * h["avg_price"]

            if h["quantity"] < 1e-10:
                del self.holdings[crypto]

            amount_usd = actual_sell_usd
            quantity = actual_sell_qty

        # Record trade
        trade = Trade(
            timestamp=time.time(),
            agent=self.agent_name,
            action=action,
            crypto=crypto,
            amount_usd=round(amount_usd, 2),
            quantity=round(quantity, 8),
            price=price,
            reasoning=reasoning,
            success=True,
        )
        self.trades.append(trade)
        return trade

    def _failed_trade(
        self, action: str, crypto: str, amount_usd: float,
        price: float, reasoning: str, error: str,
    ) -> Trade:
        """Record a failed trade attempt."""
        trade = Trade(
            timestamp=time.time(),
            agent=self.agent_name,
            action=action,
            crypto=crypto,
            amount_usd=amount_usd,
            quantity=0,
            price=price,
            reasoning=reasoning,
            success=False,
            error=error,
        )
        print(f"[portfolio] {self.agent_name} trade FAILED: {error}")
        return trade

    def _update_best_worst(self, crypto: str, pnl: float, pct: float) -> None:
        """Track best and worst individual trades by P&L."""
        entry = {"crypto": crypto, "pnl": round(pnl, 2), "pct": round(pct, 2)}
        if self.best_trade is None or pnl > self.best_trade["pnl"]:
            self.best_trade = entry
        if self.worst_trade is None or pnl < self.worst_trade["pnl"]:
            self.worst_trade = entry

    def record_snapshot(self, current_prices: dict[str, float]) -> None:
        """Record a portfolio value snapshot for charting."""
        total = self.get_total_value(current_prices)
        self.value_history.append({
            "time": time.time(),
            "value": round(total, 2),
        })

    def get_total_value(self, current_prices: dict[str, float]) -> float:
        """Calculate total portfolio value = cash + holdings market value."""
        holdings_value = sum(
            h["quantity"] * current_prices.get(crypto, 0)
            for crypto, h in self.holdings.items()
        )
        return round(self.cash + holdings_value, 2)

    def get_holdings_detail(self, current_prices: dict[str, float]) -> list[dict]:
        """Get holdings with unrealized P&L for display."""
        details = []
        for crypto, h in self.holdings.items():
            current_price = current_prices.get(crypto, 0)
            market_value = h["quantity"] * current_price
            cost_basis = h["total_cost"]
            pnl = market_value - cost_basis
            pnl_pct = (pnl / cost_basis * 100) if cost_basis > 0 else 0

            details.append({
                "crypto": crypto,
                "quantity": round(h["quantity"], 8),
                "avg_price": round(h["avg_price"], 2),
                "current_price": round(current_price, 2),
                "market_value": round(market_value, 2),
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl_pct, 2),
            })
        return details

    def to_dict(self, current_prices: dict[str, float]) -> dict:
        """Serialize portfolio state for API response."""
        total = self.get_total_value(current_prices)
        pnl = total - self.starting_capital
        pnl_pct = (pnl / self.starting_capital * 100) if self.starting_capital > 0 else 0

        return {
            "agent": self.agent_name,
            "cash": round(self.cash, 2),
            "total_value": round(total, 2),
            "starting_capital": round(self.starting_capital, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "num_trades": len(self.trades),
            "holdings": self.get_holdings_detail(current_prices),
            "value_history": self.value_history[-500:],  # cap for API response size
            "best_trade": self.best_trade,
            "worst_trade": self.worst_trade,
        }

    def get_summary_for_prompt(self, current_prices: dict[str, float]) -> str:
        """Generate a text summary of portfolio for the AI prompt."""
        total = self.get_total_value(current_prices)
        lines = [
            f"Cash: ${self.cash:,.2f}",
            f"Total Value: ${total:,.2f}",
            f"Starting Capital: ${self.starting_capital:,.2f}",
            f"P&L: ${total - self.starting_capital:,.2f} "
            f"({((total - self.starting_capital) / self.starting_capital * 100):.1f}%)",
            f"Number of trades: {len(self.trades)}",
            "",
            "Holdings:",
        ]

        if not self.holdings:
            lines.append("  (no positions)")
        else:
            for crypto, h in self.holdings.items():
                price = current_prices.get(crypto, 0)
                value = h["quantity"] * price
                pnl = value - h["total_cost"]
                lines.append(
                    f"  {crypto}: {h['quantity']:.6f} units @ avg ${h['avg_price']:,.2f} "
                    f"| current ${price:,.2f} | value ${value:,.2f} | P&L ${pnl:,.2f}"
                )

        return "\n".join(lines)

    def reset(self, starting_capital: float | None = None) -> None:
        """Reset portfolio to starting state."""
        cap = starting_capital if starting_capital is not None else self.starting_capital
        self.starting_capital = cap
        self.cash = cap
        self.holdings = {}
        self.trades = []
        self.value_history = [{"time": time.time(), "value": cap}]
        self.best_trade = None
        self.worst_trade = None
