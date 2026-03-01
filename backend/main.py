"""FastAPI application — routes, game session, background task orchestration.

CryptoArena: Human vs AI crypto trading battle — Historical Replay Mode.
Prices come from pre-downloaded scenario candle arrays, not live CoinGecko.
"""

from __future__ import annotations
import asyncio
import time
import random
from dataclasses import dataclass, field
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from portfolio import Portfolio, Trade
from market import (
    load_scenario,
    list_scenarios,
    validate_scenarios_exist,
    get_prices_at_candle,
    get_candles_so_far,
    get_price_changes_from_candles,
    get_price_history_from_candles,
    check_news_event,
)
from agents import (
    get_agent_decision,
    get_post_game_analysis,
    get_post_game_roast,
    get_strategy_state,
    reset_strategy_state,
)
from config import (
    WATCHLIST,
    DEFAULT_STARTING_CAPITAL,
    DIFFICULTY_INTERVALS,
    TOTAL_CANDLES,
)


# ── Game Session ──────────────────────────────────────────────────────────────

class GameSession:
    """Manages the 1v1 Human vs AI trading competition session (replay mode)."""

    def __init__(self):
        self.user = Portfolio("user")
        self.sage = Portfolio("sage")
        self.running = False
        self.finished = False
        self.starting_capital: float = DEFAULT_STARTING_CAPITAL
        self.difficulty: str = "trader"
        self.all_trades: list[dict] = []
        self.ai_reasonings: list[dict] = []
        self._tasks: list[asyncio.Task] = []
        self.winner: str | None = None
        self.post_game_analysis: str = ""

        # ── Replay-specific state ──
        self.scenario_id: str | None = None
        self.scenario_data: dict | None = None
        self.current_candle: int = 0
        self.total_candles: int = TOTAL_CANDLES
        self.active_news_event: dict | None = None
        self.speed: int = 1  # 1=200ms, 2=100ms, 4=50ms per tick
        self._last_sage_candle: int = -999  # track when SAGE last acted

    def get_current_prices(self) -> dict[str, float]:
        """Read prices from scenario data at current candle index."""
        if not self.scenario_data:
            return {coin: 0.0 for coin in WATCHLIST}
        return get_prices_at_candle(self.scenario_data, self.current_candle)

    @property
    def candles_remaining(self) -> int:
        return max(0, self.total_candles - self.current_candle)

    @property
    def is_finished(self) -> bool:
        if self.finished:
            return True
        if self.running and self.current_candle >= self.total_candles:
            return True
        return False

    def reset(self):
        """Reset to pre-game state."""
        for task in self._tasks:
            task.cancel()
        self._tasks = []
        self.running = False
        self.finished = False
        self.winner = None
        self.post_game_analysis = ""
        self.all_trades = []
        self.ai_reasonings = []
        self.user.reset(self.starting_capital)
        self.sage.reset(self.starting_capital)
        reset_strategy_state()

        # Replay state
        self.scenario_id = None
        self.scenario_data = None
        self.current_candle = 0
        self.active_news_event = None
        self.speed = 1
        self._last_sage_candle = -999

    def stop(self):
        """Stop the session."""
        for task in self._tasks:
            task.cancel()
        self._tasks = []
        self.running = False

    def get_state(self) -> dict:
        """Build the full game state for the API response."""
        prices = self.get_current_prices()
        user_total = self.user.get_total_value(prices)
        sage_total = self.sage.get_total_value(prices)
        total_combined = user_total + sage_total

        # Determine leader
        if abs(user_total - sage_total) < 0.01:
            leader = "TIE"
        elif user_total > sage_total:
            leader = "user"
        else:
            leader = "sage"

        # Win probability as percentage
        user_pct = (user_total / total_combined * 100) if total_combined > 0 else 50
        sage_pct = 100 - user_pct

        # Candles so far (never beyond current_candle — server-side assertion)
        candles_so_far = {}
        if self.scenario_data:
            candles_so_far = get_candles_so_far(self.scenario_data, self.current_candle)

        return {
            "running": self.running,
            "finished": self.finished or self.is_finished,
            "difficulty": self.difficulty,
            "starting_capital": self.starting_capital,
            "leader": leader,
            "user_win_pct": round(user_pct, 1),
            "sage_win_pct": round(sage_pct, 1),
            "lead_amount": round(abs(user_total - sage_total), 2),
            "user": self.user.to_dict(prices),
            "sage": self.sage.to_dict(prices),
            "trades": self.all_trades[-100:],
            "prices": prices,
            "price_changes": get_price_changes_from_candles(
                self.scenario_data, self.current_candle
            ) if self.scenario_data else {},
            "watchlist": WATCHLIST,
            "winner": self.winner,
            "post_game_analysis": self.post_game_analysis,
            "ai_strategy_state": get_strategy_state(),
            # ── Replay-specific fields ──
            "scenario_id": self.scenario_id,
            "current_candle": self.current_candle,
            "total_candles": self.total_candles,
            "candles_so_far": candles_so_far,
            "active_news_event": self.active_news_event,
            "speed": self.speed,
        }


# Game session singleton
session = GameSession()


# ── Demo Data ─────────────────────────────────────────────────────────────────

def seed_demo_data(prices: dict[str, float]):
    """Seed demo trades so the UI looks alive on first load (?demo=true)."""
    if not prices:
        return

    now = time.time()
    demo_trades = [
        {"agent": "sage", "action": "BUY", "crypto": "BTC", "amount_usd": 2000,
         "reasoning": "Bitcoin looking strong here, entering a starter position.", "offset": -150},
        {"agent": "user", "action": "BUY", "crypto": "ETH", "amount_usd": 1500,
         "reasoning": "", "offset": -130},
        {"agent": "sage", "action": "BUY", "crypto": "SOL", "amount_usd": 1000,
         "reasoning": "SOL showing relative strength vs the market.", "offset": -110},
        {"agent": "user", "action": "BUY", "crypto": "BTC", "amount_usd": 3000,
         "reasoning": "", "offset": -90},
        {"agent": "sage", "action": "BUY", "crypto": "ETH", "amount_usd": 1500,
         "reasoning": "ETH bouncing off support, adding to position.", "offset": -70},
        {"agent": "user", "action": "BUY", "crypto": "SOL", "amount_usd": 500,
         "reasoning": "", "offset": -50},
        {"agent": "sage", "action": "SELL", "crypto": "BTC", "amount_usd": 500,
         "reasoning": "Taking small profits on BTC to rebalance.", "offset": -30},
        {"agent": "user", "action": "BUY", "crypto": "DOGE", "amount_usd": 200,
         "reasoning": "", "offset": -10},
    ]

    for dt in demo_trades:
        crypto = dt["crypto"]
        price = prices.get(crypto, 0)
        if price <= 0:
            continue

        portfolio = session.sage if dt["agent"] == "sage" else session.user
        trade = portfolio.execute_trade(
            action=dt["action"],
            crypto=crypto,
            amount_usd=dt["amount_usd"],
            price=price,
            reasoning=dt["reasoning"],
        )
        if trade.success:
            trade.timestamp = now + dt["offset"]
            session.all_trades.append({
                "timestamp": trade.timestamp,
                "agent": trade.agent,
                "action": trade.action,
                "crypto": trade.crypto,
                "amount_usd": trade.amount_usd,
                "quantity": trade.quantity,
                "price": trade.price,
                "reasoning": trade.reasoning,
                "success": True,
            })

    # Also seed some value history
    for i in range(10):
        t = now - (150 - i * 15)
        user_val = session.starting_capital + random.uniform(-200, 400)
        sage_val = session.starting_capital + random.uniform(-200, 400)
        session.user.value_history.append({"time": t, "value": round(user_val, 2)})
        session.sage.value_history.append({"time": t, "value": round(sage_val, 2)})


# ── Background Loops ──────────────────────────────────────────────────────────

async def replay_ticker_loop():
    """Advance candle index at the configured speed. This is the main game clock.

    Every tick:
    1. Advance current_candle += 1
    2. Read prices from candle array (replaces CoinGecko)
    3. Record portfolio snapshots
    4. Check for news events
    5. If candle exhausted → end session
    """
    while True:
        try:
            if not session.running or session.is_finished:
                await asyncio.sleep(0.1)
                continue

            # Compute tick interval: 200ms / speed
            interval = 0.2 / session.speed
            await asyncio.sleep(interval)

            if not session.running or session.is_finished:
                continue

            # Advance candle
            session.current_candle += 1

            # Get current prices from candle array
            prices = session.get_current_prices()

            # Record portfolio snapshots
            session.user.record_snapshot(prices)
            session.sage.record_snapshot(prices)

            # Check for news events
            if session.scenario_data:
                event = check_news_event(session.scenario_data, session.current_candle)
                if event:
                    session.active_news_event = event
                    print(f"[replay] 📰 News at candle {session.current_candle}: {event['headline']}")

            # Check if session has ended (candle exhaustion)
            if session.current_candle >= session.total_candles:
                print(f"[replay] Candles exhausted ({session.current_candle}/{session.total_candles})")
                await _handle_session_end(prices)
                break

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[replay] Error in ticker loop: {e}")
            await asyncio.sleep(0.5)


async def sage_loop():
    """Run the SAGE AI's decision loop — triggered by candle count, not time.

    Difficulty intervals (in candles):
    - Rookie: every 90 candles
    - Trader: every 60 candles
    - Degen: every 30 candles
    """
    while True:
        try:
            if not session.running or session.is_finished:
                await asyncio.sleep(0.5)
                continue

            # Check if it's time for SAGE to act (candle-count-based)
            interval = DIFFICULTY_INTERVALS.get(session.difficulty, 60)
            candles_since_last = session.current_candle - session._last_sage_candle

            if candles_since_last < interval:
                await asyncio.sleep(0.3)  # Check again shortly
                continue

            # Mark this decision point
            session._last_sage_candle = session.current_candle

            # Get current prices from replay
            prices = session.get_current_prices()

            # Check if session just ended
            if session.is_finished:
                break

            # Get AI decision — same Mistral call, just different price source
            portfolio_summary = session.sage.get_summary_for_prompt(prices)
            user_total = session.user.get_total_value(prices)

            # Build price history from candle array (same format SAGE expects)
            price_history = get_price_history_from_candles(
                session.scenario_data, session.current_candle, count=5
            ) if session.scenario_data else []

            # Convert candles remaining to "time remaining" for SAGE's prompt
            # (SAGE thinks in seconds; we give it candles as seconds equivalent)
            candles_left = session.total_candles - session.current_candle

            decision = await get_agent_decision(
                portfolio_summary=portfolio_summary,
                user_total_value=user_total,
                current_prices=prices,
                price_history=price_history,
                time_remaining=candles_left,
                difficulty=session.difficulty,
            )

            if decision:
                action = decision["action"]
                crypto = decision["crypto"]
                amount_usd = decision.get("amount_usd", 0)
                reasoning = decision.get("reasoning", "")

                # Add reasoning to history
                session.ai_reasonings.append({
                    "time": time.time(),
                    "candle": session.current_candle,
                    "action": action,
                    "crypto": crypto,
                    "reasoning": reasoning,
                })
                if len(session.ai_reasonings) > 20:
                    session.ai_reasonings = session.ai_reasonings[-20:]

                if action in ("BUY", "SELL") and amount_usd > 0:
                    price = prices.get(crypto, 0)
                    if price > 0:
                        trade = session.sage.execute_trade(
                            action=action,
                            crypto=crypto,
                            amount_usd=amount_usd,
                            price=price,
                            reasoning=reasoning,
                        )
                        if trade.success:
                            session.all_trades.append({
                                "timestamp": trade.timestamp,
                                "agent": "sage",
                                "action": trade.action,
                                "crypto": trade.crypto,
                                "amount_usd": trade.amount_usd,
                                "quantity": trade.quantity,
                                "price": trade.price,
                                "reasoning": trade.reasoning,
                                "success": True,
                            })
                            print(
                                f"[SAGE] candle {session.current_candle}: "
                                f"{action} ${amount_usd:,.2f} of {crypto} "
                                f"@ ${price:,.4f} — {reasoning[:80]}"
                            )
                elif action == "HOLD":
                    print(f"[SAGE] candle {session.current_candle}: HOLD — {reasoning[:80]}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[sage] Error in sage loop: {e}")
            await asyncio.sleep(2)


async def _handle_session_end(prices: dict[str, float]):
    """Handle end of session — determine winner, get analysis."""
    session.finished = True
    session.running = False

    user_total = session.user.get_total_value(prices)
    sage_total = session.sage.get_total_value(prices)

    # Determine winner
    diff_pct = abs(user_total - sage_total) / session.starting_capital * 100
    if diff_pct < 1:
        session.winner = "draw"
    elif user_total > sage_total:
        session.winner = "user"
    else:
        session.winner = "sage"

    # Get post-game analysis from Mistral
    try:
        session.post_game_analysis = await get_post_game_analysis(
            user_summary=session.user.get_summary_for_prompt(prices),
            ai_summary=session.sage.get_summary_for_prompt(prices),
            trade_count_user=len(session.user.trades),
            trade_count_ai=len(session.sage.trades),
            winner=session.winner,
            difficulty=session.difficulty,
        )
    except Exception as e:
        print(f"[main] Error getting post-game analysis: {e}")
        session.post_game_analysis = "The battle has ended. Check the stats to see who came out on top!"

    # Cancel background tasks
    session.stop()
    print(f"[main] Session ended! Winner: {session.winner}")


# ── FastAPI App ───────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Validate all scenario files exist at startup
    validate_scenarios_exist()
    print(f"[main] CryptoArena Historical Replay ready")
    yield
    session.stop()


app = FastAPI(title="CryptoArena — Human vs AI (Historical Replay)", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request Models ────────────────────────────────────────────────────────────

class StartRequest(BaseModel):
    starting_capital: float = 10_000.0
    scenario_id: str = "covid_crash"
    difficulty: str = "trader"
    speed: int = 1


class UserTradeRequest(BaseModel):
    action: str
    crypto: str
    amount_usd: float


class SpeedRequest(BaseModel):
    speed: int  # 1, 2, or 4


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/scenarios")
async def get_scenarios():
    """List all available scenarios (metadata only, no candle data)."""
    return {"scenarios": list_scenarios()}


@app.get("/api/state")
async def get_state():
    """Full game state — both portfolios, trades, prices, candle data."""
    return session.get_state()


@app.post("/api/start")
async def start_session_route(
    req: StartRequest | None = None,
    demo: bool = Query(False),
):
    """Start a new trading battle with a historical scenario."""
    if session.running:
        raise HTTPException(status_code=400, detail="Session already running.")

    scenario_id = req.scenario_id if req else "covid_crash"
    speed = req.speed if req else 1

    if req:
        session.starting_capital = max(1000, min(1_000_000, req.starting_capital))
        session.difficulty = req.difficulty if req.difficulty in ("rookie", "trader", "degen") else "trader"
    
    # Validate speed
    if speed not in (1, 2, 4):
        speed = 1
    session.speed = speed

    # Reset portfolios
    session.user.reset(session.starting_capital)
    session.sage.reset(session.starting_capital)
    session.all_trades = []
    session.ai_reasonings = []
    session.winner = None
    session.post_game_analysis = ""
    session.finished = False
    session.current_candle = 0
    session.active_news_event = None
    session._last_sage_candle = -999
    reset_strategy_state()

    # Load scenario
    try:
        session.scenario_data = load_scenario(scenario_id)
        session.scenario_id = session.scenario_data["id"]  # resolved if 'random'
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Determine actual total candles from data
    btc_candles = len(session.scenario_data.get("candles", {}).get("BTC", []))
    session.total_candles = min(TOTAL_CANDLES, btc_candles) if btc_candles > 0 else TOTAL_CANDLES

    # Demo mode: pre-seed at candle 400 with holdings
    if demo:
        session.current_candle = 400
        session._last_sage_candle = 360
        prices = session.get_current_prices()
        seed_demo_data(prices)
        print(f"[main] Demo mode: pre-seeded at candle 400 of {session.scenario_id}")
    else:
        # Record initial snapshot at candle 0
        prices = session.get_current_prices()
        session.user.record_snapshot(prices)
        session.sage.record_snapshot(prices)

    # Start session
    session.running = True

    # Launch background tasks
    session._tasks = [
        asyncio.create_task(replay_ticker_loop()),
        asyncio.create_task(sage_loop()),
    ]

    print(
        f"[main] Battle started! Scenario: {session.scenario_id}, "
        f"Capital: ${session.starting_capital:,.0f}, "
        f"Difficulty: {session.difficulty}, Speed: {session.speed}x"
    )
    return {
        "status": "started",
        "scenario_id": session.scenario_id,
        "starting_capital": session.starting_capital,
        "total_candles": session.total_candles,
        "difficulty": session.difficulty,
        "speed": session.speed,
    }


@app.post("/api/trade/user")
async def user_trade(req: UserTradeRequest):
    """Execute a manual trade for the human player."""
    if not session.running:
        raise HTTPException(status_code=400, detail="No active session.")

    if session.is_finished or session.finished:
        raise HTTPException(status_code=400, detail="Session has ended.")

    action = req.action.upper().strip()
    crypto = req.crypto.upper().strip()
    amount_usd = abs(req.amount_usd)

    if crypto not in WATCHLIST:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid crypto: {crypto}. Must be one of: {', '.join(WATCHLIST)}"
        )

    if action not in ("BUY", "SELL"):
        raise HTTPException(status_code=400, detail="Action must be BUY or SELL.")

    if amount_usd <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0.")

    prices = session.get_current_prices()
    price = prices.get(crypto, 0)
    if price <= 0:
        raise HTTPException(status_code=400, detail=f"Price unavailable for {crypto}.")

    trade = session.user.execute_trade(
        action=action,
        crypto=crypto,
        amount_usd=amount_usd,
        price=price,
    )

    if not trade.success:
        raise HTTPException(status_code=400, detail=trade.error or "Trade failed.")

    # Add to global trade log
    session.all_trades.append({
        "timestamp": trade.timestamp,
        "agent": "user",
        "action": trade.action,
        "crypto": trade.crypto,
        "amount_usd": trade.amount_usd,
        "quantity": trade.quantity,
        "price": trade.price,
        "reasoning": "",
        "success": True,
    })

    print(
        f"[USER] candle {session.current_candle}: "
        f"{action} ${amount_usd:,.2f} of {crypto} "
        f"@ ${price:,.4f} ({trade.quantity:.6f} units)"
    )

    return {
        "status": "executed",
        "trade": {
            "action": trade.action,
            "crypto": trade.crypto,
            "amount_usd": trade.amount_usd,
            "quantity": trade.quantity,
            "price": trade.price,
        },
        "portfolio": session.user.to_dict(prices),
    }


@app.post("/api/session/speed")
async def set_speed(req: SpeedRequest):
    """Change replay speed mid-game."""
    if req.speed not in (1, 2, 4):
        raise HTTPException(status_code=400, detail="Speed must be 1, 2, or 4.")
    session.speed = req.speed
    print(f"[main] Speed changed to {req.speed}x")
    return {"status": "ok", "speed": session.speed}


@app.post("/api/reset")
async def reset_session_route():
    """Reset everything to pre-game state."""
    session.stop()
    session.reset()
    return {"status": "reset"}


@app.get("/api/prices")
async def get_prices():
    """Latest prices from current candle."""
    prices = session.get_current_prices()
    return {
        "prices": prices,
        "changes": get_price_changes_from_candles(
            session.scenario_data, session.current_candle
        ) if session.scenario_data else {},
        "current_candle": session.current_candle,
        "total_candles": session.total_candles,
    }


@app.get("/api/trades")
async def get_trades():
    """Full trade log."""
    return {"trades": session.all_trades}


@app.get("/api/ai/reasoning")
async def get_ai_reasoning():
    """Last 5 AI reasoning strings."""
    return {"reasonings": session.ai_reasonings[-5:]}


@app.get("/api/session/end-analysis")
async def get_end_analysis():
    """Post-game analysis + SAGE's in-character roast."""
    if not session.finished:
        raise HTTPException(status_code=400, detail="Session has not ended yet.")

    # Compute P&L percentages
    prices = session.get_current_prices()
    user_total = session.user.get_total_value(prices)
    sage_total = session.sage.get_total_value(prices)
    cap = session.starting_capital or 10000
    user_pnl_pct = ((user_total - cap) / cap) * 100
    sage_pnl_pct = ((sage_total - cap) / cap) * 100

    # Get the roast (separate from the neutral analysis)
    try:
        roast = await get_post_game_roast(
            winner=session.winner or "draw",
            user_pnl_pct=user_pnl_pct,
            sage_pnl_pct=sage_pnl_pct,
            difficulty=session.difficulty,
        )
    except Exception as e:
        print(f"[main] Error getting roast: {e}")
        roast = "GG, human. Until next time."

    return {
        "post_game_analysis": session.post_game_analysis,
        "roast": roast,
        "winner": session.winner,
        "difficulty": session.difficulty,
    }


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
