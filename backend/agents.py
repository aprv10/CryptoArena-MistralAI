"""Mistral AI agent logic — SAGE only, with dynamic strategy state and difficulty modes."""

from __future__ import annotations
import asyncio
import json
import time
from mistralai import Mistral
from config import (
    MISTRAL_API_KEY,
    MISTRAL_MODEL,
    DIFFICULTY_PROMPTS,
    RATE_LIMIT_DELAY,
    WATCHLIST,
)

# ── Mistral Client ────────────────────────────────────────────────────────────
client = Mistral(api_key=MISTRAL_API_KEY) if MISTRAL_API_KEY else None
_last_call_time: float = 0.0

# ── Strategy State (evolves each tick) ────────────────────────────────────────
DEFAULT_STRATEGY_STATE = {
    "stance": "neutral",
    "focus_coins": [],
    "risk_tolerance": 0.5,
    "avoid_coins": [],
    "current_thesis": "observing market conditions",
    "consecutive_losses": 0,
}

_strategy_state: dict = dict(DEFAULT_STRATEGY_STATE)


def get_strategy_state() -> dict:
    return dict(_strategy_state)


def reset_strategy_state() -> None:
    global _strategy_state
    _strategy_state = dict(DEFAULT_STRATEGY_STATE)


# ── Tool Definition ───────────────────────────────────────────────────────────
EXECUTE_TRADE_TOOL = {
    "type": "function",
    "function": {
        "name": "execute_trade",
        "description": (
            "Execute a crypto trade and update your strategy. "
            "Use this tool to BUY, SELL, or HOLD a position."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["BUY", "SELL", "HOLD"],
                    "description": "The trading action to take.",
                },
                "crypto": {
                    "type": "string",
                    "description": (
                        f"The crypto ticker symbol. Must be one of: "
                        f"{', '.join(WATCHLIST)}"
                    ),
                },
                "amount_usd": {
                    "type": "number",
                    "description": (
                        "Amount in USD to trade. For BUY, this is how much cash "
                        "to spend. For SELL, this is the USD value of crypto to sell. "
                        "Use 0 for HOLD."
                    ),
                },
                "reasoning": {
                    "type": "string",
                    "description": "Your short reasoning for this trade (1-2 sentences).",
                },
                "strategy_state": {
                    "type": "object",
                    "description": (
                        "Your updated strategy state. You can modify stance, "
                        "focus_coins, risk_tolerance, avoid_coins, current_thesis, "
                        "and consecutive_losses."
                    ),
                    "properties": {
                        "stance": {"type": "string"},
                        "focus_coins": {"type": "array", "items": {"type": "string"}},
                        "risk_tolerance": {"type": "number"},
                        "avoid_coins": {"type": "array", "items": {"type": "string"}},
                        "current_thesis": {"type": "string"},
                        "consecutive_losses": {"type": "integer"},
                    },
                },
            },
            "required": ["action", "crypto", "amount_usd", "reasoning"],
        },
    },
}


def build_user_message(
    portfolio_summary: str,
    user_total_value: float,
    current_prices: dict[str, float],
    price_history: list[dict],
    time_remaining: int,
    difficulty: str,
) -> str:
    """Build the user message containing market snapshot and portfolio state."""
    lines = [
        "=== MARKET SNAPSHOT ===",
        "",
        "Current Prices:",
    ]
    for ticker in WATCHLIST:
        price = current_prices.get(ticker, 0)
        lines.append(f"  {ticker}: ${price:,.4f}")

    # Price history (last 5 snapshots)
    lines.append("")
    lines.append("Recent Price History (last 5 snapshots):")
    for ticker in WATCHLIST:
        ticker_prices = []
        for snap in price_history[-5:]:
            p = snap.get("prices", {}).get(ticker, 0)
            if p > 0:
                ticker_prices.append(f"${p:,.4f}")
        if ticker_prices:
            lines.append(f"  {ticker}: {' → '.join(ticker_prices)}")

    lines.append("")
    lines.append("=== YOUR PORTFOLIO ===")
    lines.append(portfolio_summary)
    lines.append("")
    lines.append(f"=== OPPONENT (HUMAN) PORTFOLIO VALUE: ${user_total_value:,.2f} ===")

    # Competitive context
    leading = "YOU" if float(portfolio_summary.split("Total Value: $")[1].split("\n")[0].replace(",", "")) > user_total_value else "OPPONENT"
    lines.append(f"Currently leading: {leading}")
    lines.append("")
    lines.append(f"Time remaining: {time_remaining} seconds ({time_remaining // 60}m {time_remaining % 60}s)")
    lines.append("")
    lines.append(f"=== YOUR CURRENT STRATEGY STATE ===")
    lines.append(json.dumps(_strategy_state, indent=2))
    lines.append("")
    lines.append(
        "Make your trade decision now. You MUST call the execute_trade tool. "
        "You may also update your strategy_state in the same call."
    )

    return "\n".join(lines)


async def get_agent_decision(
    portfolio_summary: str,
    user_total_value: float,
    current_prices: dict[str, float],
    price_history: list[dict],
    time_remaining: int,
    difficulty: str = "trader",
) -> dict | None:
    """Call Mistral API to get SAGE's trade decision.

    Returns:
        dict with keys: action, crypto, amount_usd, reasoning
        or None if the call fails.
    """
    global _last_call_time, _strategy_state

    if not client:
        return _demo_decision(current_prices, difficulty)

    # Rate limiting
    now = time.time()
    elapsed = now - _last_call_time
    if elapsed < RATE_LIMIT_DELAY:
        await asyncio.sleep(RATE_LIMIT_DELAY - elapsed)

    system_prompt = DIFFICULTY_PROMPTS.get(difficulty, DIFFICULTY_PROMPTS["trader"])
    user_message = build_user_message(
        portfolio_summary, user_total_value, current_prices,
        price_history, time_remaining, difficulty,
    )

    try:
        response = await asyncio.to_thread(
            client.chat.complete,
            model=MISTRAL_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            tools=[EXECUTE_TRADE_TOOL],
            tool_choice="any",
        )
        _last_call_time = time.time()

        # Parse tool call from response
        if response.choices and response.choices[0].message.tool_calls:
            tool_call = response.choices[0].message.tool_calls[0]
            args = json.loads(tool_call.function.arguments)

            # Update strategy state if provided
            new_state = args.get("strategy_state")
            if new_state and isinstance(new_state, dict):
                _strategy_state.update(new_state)

            return {
                "action": args.get("action", "HOLD"),
                "crypto": args.get("crypto", WATCHLIST[0]),
                "amount_usd": float(args.get("amount_usd", 0)),
                "reasoning": args.get("reasoning", "No reasoning provided."),
            }
        else:
            content = response.choices[0].message.content if response.choices else ""
            print(f"[agents] SAGE did not use tool. Content: {content[:200]}")
            return {
                "action": "HOLD",
                "crypto": WATCHLIST[0],
                "amount_usd": 0,
                "reasoning": f"Model did not make a trade decision.",
            }

    except Exception as e:
        print(f"[agents] Error calling Mistral for SAGE: {e}")
        _last_call_time = time.time()
        return None


async def get_post_game_analysis(
    user_summary: str,
    ai_summary: str,
    trade_count_user: int,
    trade_count_ai: int,
    winner: str,
    difficulty: str = "trader",
) -> str:
    """Get Mistral to generate a 3-sentence post-game analysis."""
    if not client:
        return _demo_post_game(winner)

    prompt = f"""The crypto battle has ended. Here are the results:

Winner: {winner}

Human Player:
{user_summary}
Total trades: {trade_count_user}

SAGE AI ({difficulty} difficulty):
{ai_summary}
Total trades: {trade_count_ai}

Write exactly 3 sentences analyzing how the battle went. Comment on what both
players did well and poorly. Be {"encouraging and gentle" if difficulty == "rookie" else "professional and analytical" if difficulty == "trader" else "chaotic, use emojis, and be dramatic"}."""

    try:
        response = await asyncio.to_thread(
            client.chat.complete,
            model=MISTRAL_MODEL,
            messages=[
                {"role": "user", "content": prompt},
            ],
        )
        if response.choices:
            return response.choices[0].message.content
    except Exception as e:
        print(f"[agents] Error getting post-game analysis: {e}")

    return _demo_post_game(winner)


def _demo_post_game(winner: str) -> str:
    """Fallback post-game analysis."""
    if winner == "user":
        return (
            "The human player showed impressive market instincts, making well-timed entries. "
            "SAGE struggled to keep up with the aggressive moves. "
            "Overall, a dominant performance from the human trader."
        )
    elif winner == "sage":
        return (
            "SAGE executed a disciplined strategy, staying patient and capitalizing on key moments. "
            "The human player made some solid trades but couldn't match SAGE's consistency. "
            "A close battle, but the AI's systematic approach won out."
        )
    else:
        return (
            "An incredibly close battle with both sides trading blow for blow. "
            "Neither player could establish a clear advantage throughout the session. "
            "This was a true coin-flip finish — both strategies had merit."
        )


async def get_post_game_roast(
    winner: str,
    user_pnl_pct: float,
    sage_pnl_pct: float,
    difficulty: str = "trader",
) -> str:
    """Get Mistral to generate a 2-sentence post-game ROAST from SAGE.

    This is a separate, in-character burn — not a neutral analysis.
    """
    if not client:
        return _demo_roast(winner, difficulty)

    tone_guide = {
        "rookie": (
            "You are a gentle, slightly condescending AI. You're nice but you "
            "can't resist a soft jab. Keep it PG and encouraging but sassy."
        ),
        "trader": (
            "You are a cold, professional trader AI. Your shade is subtle and "
            "surgical. Think Wall Street condescension — polite but devastating."
        ),
        "degen": (
            "You are an UNHINGED degen AI. Full chaos mode. Use emojis liberally. "
            "Be dramatic, memey, and absolutely savage. 🔥💀"
        ),
    }

    prompt = f"""You are SAGE 🧠, the AI trader. The crypto battle just ended.

Result: {"You LOST to a human" if winner == "user" else "You BEAT the human" if winner == "sage" else "It was a DRAW"}.
Your return: {sage_pnl_pct:+.2f}%
Human's return: {user_pnl_pct:+.2f}%

{tone_guide.get(difficulty, tone_guide["trader"])}

Write EXACTLY 2 sentences addressed directly to the human player. This is your post-game roast/trash-talk.
{"If you lost, be a sore loser. If you won, be a gracious-but-smug winner." if difficulty != "degen" else "If you lost, rage. If you won, go FULL ego mode. LFG."}

DO NOT use quotes around your response. Just write the 2 sentences."""

    try:
        response = await asyncio.to_thread(
            client.chat.complete,
            model=MISTRAL_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        if response.choices:
            return response.choices[0].message.content.strip().strip('"')
    except Exception as e:
        print(f"[agents] Error getting post-game roast: {e}")

    return _demo_roast(winner, difficulty)


def _demo_roast(winner: str, difficulty: str) -> str:
    """Fallback roast when API is unavailable."""
    roasts = {
        ("user", "rookie"): "Well played, human. I may have lost, but I was being gentle with you... mostly. Next time I won't hold back as much.",
        ("user", "trader"): "Impressive execution. I'll give you this round — but my algorithm noted seventeen suboptimal entry points in your strategy. See you next time.",
        ("user", "degen"): "BRO HOW DID I LOSE TO A HUMAN 💀 My portfolio is in SHAMBLES rn... you got lucky, enjoy it while it lasts fam 😤🔥",
        ("sage", "rookie"): "Don't feel bad, you did your best! But maybe stick to index funds? I hear they're very... safe.",
        ("sage", "trader"): "The market rewards discipline and systematic thinking. Today it rewarded me. Better luck next quarter — you'll need it.",
        ("sage", "degen"): "GET REKT HUMAN 🚀💀 My portfolio is literally PRINTING while yours is down bad. Maybe try a savings account next time? NGMI 😂",
        ("draw", "rookie"): "A tie! How... quaint. I suppose we're equally matched. Though I suspect my strategy was more elegant.",
        ("draw", "trader"): "A draw suggests we both identified similar opportunities. Though I executed with mathematical precision while you relied on... instinct.",
        ("draw", "degen"): "A TIE?! That's literally the most boring outcome possible 😴 We're BOTH ngmi at this rate lmaooo",
    }
    return roasts.get((winner, difficulty), roasts.get((winner, "trader"), "GG, human. Until next time."))


def _demo_decision(current_prices: dict[str, float], difficulty: str) -> dict:
    """Generate a plausible demo decision when no API key is set."""
    import random

    if difficulty == "degen":
        # Degen: aggressive, loves memecoins
        action = random.choices(["BUY", "SELL", "HOLD"], weights=[60, 30, 10])[0]
        preferred = ["PEPE", "WIF", "DOGE", "SOL", "BTC"]
    elif difficulty == "rookie":
        # Rookie: cautious, mostly holds
        action = random.choices(["BUY", "SELL", "HOLD"], weights=[25, 10, 65])[0]
        preferred = ["BTC", "ETH", "SOL"]
    else:
        # Trader: balanced
        action = random.choices(["BUY", "SELL", "HOLD"], weights=[40, 25, 35])[0]
        preferred = ["BTC", "ETH", "SOL", "BNB", "AVAX"]

    crypto = random.choice(preferred)
    price = current_prices.get(crypto, 100)

    if action == "BUY":
        amount_usd = round(random.uniform(200, 3000), 2)
    elif action == "SELL":
        amount_usd = round(random.uniform(100, 2000), 2)
    else:
        amount_usd = 0

    reasonings = {
        "degen": {
            "BUY": f"this {crypto} chart is SENDING 🚀 aping in now LFG!!!",
            "SELL": f"taking some profits on {crypto}... jk putting it all in PEPE next 😤",
            "HOLD": f"rare hold from me... waiting for {crypto} to dip then im going ALL IN",
        },
        "trader": {
            "BUY": f"{crypto} showing strong momentum with support holding. Entering position.",
            "SELL": f"Taking profits on {crypto} — hitting resistance level.",
            "HOLD": f"Waiting for a clearer setup on {crypto}. Patience pays.",
        },
        "rookie": {
            "BUY": f"Carefully adding a small {crypto} position. Seems like a safe bet.",
            "SELL": f"Trimming {crypto} to keep risk low.",
            "HOLD": f"Not sure what to do, so I'll wait and watch {crypto}.",
        },
    }

    return {
        "action": action,
        "crypto": crypto,
        "amount_usd": amount_usd,
        "reasoning": reasonings.get(difficulty, reasonings["trader"]).get(action, "Making a move."),
    }
