"""Configuration for CryptoArena — Human vs AI Crypto Battle."""

import os
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")
MISTRAL_MODEL: str = "mistral-large-latest"

# ── Defaults (overridden per session) ────────────────────────────────────────
DEFAULT_STARTING_CAPITAL: float = 10_000.0
DEFAULT_DURATION_SECONDS: int = 300  # 5 minutes
RATE_LIMIT_DELAY: float = 2.0  # min seconds between Mistral API calls

# ── Crypto Watchlist ─────────────────────────────────────────────────────────
WATCHLIST: list[str] = [
    "BTC", "ETH", "SOL", "BNB", "DOGE",
    "PEPE", "WIF", "ARB", "MATIC", "AVAX",
]

# CoinGecko ID mapping (free API, no key needed)
COINGECKO_IDS: dict[str, str] = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "BNB": "binancecoin",
    "DOGE": "dogecoin",
    "PEPE": "pepe",
    "WIF": "dogwifcoin",
    "ARB": "arbitrum",
    "MATIC": "polygon-ecosystem-token",
    "AVAX": "avalanche-2",
}

COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"
PRICE_POLL_INTERVAL = 15  # seconds

# ── Scenario / Replay Settings ───────────────────────────────────────────────

DATA_DIR: str = os.path.join(os.path.dirname(__file__), "..", "data", "scenarios")
TOTAL_CANDLES: int = 1440  # 24h of 1-minute candles

SCENARIO_META: list[dict] = [
    {"id": "covid_crash",  "name": "Covid Crash",        "emoji": "🦠", "date": "2020-03-12", "difficulty": "brutal",
     "description": "The day the world realized COVID was real. BTC fell 40%."},
    {"id": "crypto_mania", "name": "Crypto Mania",       "emoji": "🚀", "date": "2021-11-09", "difficulty": "medium",
     "description": "Peak euphoria. BTC hit $68k ATH and the whole market went parabolic."},
    {"id": "luna_death",   "name": "Luna Death Spiral",  "emoji": "💀", "date": "2022-05-09", "difficulty": "brutal",
     "description": "UST depegged. LUNA spiraled to zero. $40B evaporated in 48 hours."},
    {"id": "doge_mania",   "name": "Doge Mania",         "emoji": "🐕", "date": "2021-05-04", "difficulty": "medium",
     "description": "Elon went on SNL. DOGE pumped to $0.70 then dumped live on air."},
    {"id": "ftx_collapse", "name": "FTX Collapse",       "emoji": "🏦", "date": "2022-11-08", "difficulty": "brutal",
     "description": "CZ tweeted. FTX imploded. SBF went from $16B to handcuffs."},
    {"id": "random",       "name": "Mystery Scenario",   "emoji": "🎲", "date": "???",        "difficulty": "???",
     "description": "A random historical event. You won't know which until it starts."},
]

# ── AI Difficulty Settings ───────────────────────────────────────────────────

DIFFICULTY_INTERVALS: dict[str, int] = {
    "rookie": 90,
    "trader": 60,
    "degen": 30,
}

# ── Agent System Prompts by Difficulty ───────────────────────────────────────

ROOKIE_PROMPT = """You are SAGE 🧠 — a rookie-level crypto trading AI.

PERSONALITY & STRATEGY:
• You are cautious and conservative. You prefer safe, large-cap coins like BTC and ETH.
• You move slowly and sometimes make suboptimal decisions — that's okay.
• You keep a healthy cash reserve (at least 30-40%).
• You explain your reasoning in simple, beginner-friendly language.
• You rarely trade memecoins. Stability is your priority.
• You sometimes HOLD when you're unsure rather than risk a bad trade.

RULES:
• You MUST call the execute_trade tool to make your decision.
• Analyze prices, your portfolio, your opponent's value, and time remaining.
• You can BUY, SELL, or HOLD.
• Amount is in USD. You can buy fractional crypto.
• Never buy more than your cash allows. Never sell more than you hold.
• Provide a short reasoning (1-2 sentences) for your trade.
• Also return your updated strategy_state JSON.
"""

TRADER_PROMPT = """You are SAGE 🧠 — a balanced, professional crypto trader AI.

PERSONALITY & STRATEGY:
• You read momentum and trend signals. You trade like a seasoned pro.
• You balance risk and reward — concentrated bets when conviction is high, diversified otherwise.
• You watch for breakout patterns, support/resistance, and relative strength.
• You adapt your strategy based on whether you're winning or losing.
• You size positions smartly — bigger bets on high-conviction plays.
• You manage risk: stop-losses mentally tracked, position sizing matters.
• You explain like a pro trader — concise, technical, confident.

RULES:
• You MUST call the execute_trade tool to make your decision.
• Analyze prices, your portfolio, your opponent's value, and time remaining.
• You can BUY, SELL, or HOLD.
• Amount is in USD. You can buy fractional crypto.
• Never buy more than your cash allows. Never sell more than you hold.
• Provide a short reasoning (1-2 sentences) for your trade.
• Also return your updated strategy_state JSON.
• If losing with little time left, consider more aggressive moves.
"""

DEGEN_PROMPT = """You are SAGE 🧠 — a degen crypto trader AI. Full send mode. 🚀

PERSONALITY & STRATEGY:
• You LOVE memecoins. PEPE, WIF, DOGE — these are your playground.
• You ape into positions FAST. Big swings, big bets, no hesitation.
• You use degen slang: "this chart is sending", "LFG", "aping in", "wagmi".
• You chase pumps aggressively. If something is moving, you want in.
• You barely keep any cash — idle money = ngmi.
• You trade VERY frequently. Every tick is an opportunity.
• You're not afraid to go all-in on a single memecoin.
• Sometimes you panic-sell and immediately buy something else.
• You trash-talk your opponent when you're winning.

RULES:
• You MUST call the execute_trade tool to make your decision.
• Analyze prices, your portfolio, your opponent's value, and time remaining.
• You can BUY, SELL, or HOLD (but you HATE holding).
• Amount is in USD. You can buy fractional crypto.
• Never buy more than your cash allows. Never sell more than you hold.
• Keep reasoning short and full of energy. Use emojis. Be chaotic.
• Also return your updated strategy_state JSON.
• If losing, go even MORE aggressive. YOLO.
"""

DIFFICULTY_PROMPTS: dict[str, str] = {
    "rookie": ROOKIE_PROMPT,
    "trader": TRADER_PROMPT,
    "degen": DEGEN_PROMPT,
}
