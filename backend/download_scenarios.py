"""
download_scenarios.py  —  One-time data download script.

Run ONCE before the hackathon to fetch 1-minute OHLCV candles from Binance
for 5 coins × 5 historic scenario dates, then save as JSON files.

Usage:
    cd backend
    pip install httpx          # if not already installed
    python download_scenarios.py

Output:
    data/scenarios/covid_crash.json
    data/scenarios/crypto_mania.json
    data/scenarios/luna_death.json
    data/scenarios/doge_mania.json
    data/scenarios/ftx_collapse.json
"""

from __future__ import annotations

import json
import os
import sys
import time
import httpx

# ── Constants ────────────────────────────────────────────────────────────────

BINANCE_KLINE_URL = "https://api.binance.com/api/v3/klines"
COINS = ["BTC", "ETH", "BNB", "DOGE", "SOL"]
BINANCE_SYMBOLS = {
    "BTC": "BTCUSDT",
    "ETH": "ETHUSDT",
    "BNB": "BNBUSDT",
    "DOGE": "DOGEUSDT",
    "SOL": "SOLUSDT",
}
CANDLES_PER_DAY = 1440  # 24h × 60 = 1440 one-minute candles
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "scenarios")

# ── Scenario Definitions ────────────────────────────────────────────────────

SCENARIOS = [
    {
        "id": "covid_crash",
        "name": "Covid Crash",
        "emoji": "🦠",
        "date": "2020-03-12",
        "start_ms": 1584057600000,
        "description": "The day the world realized COVID was real. BTC fell 40%.",
        "difficulty": "brutal",
        "news_events": [
            {"candle_index": 120, "headline": "⚡ BREAKING: WHO declares COVID-19 a global pandemic"},
            {"candle_index": 380, "headline": "⚡ MARKETS: BitMEX liquidations cascade, $700M wiped"},
            {"candle_index": 890, "headline": "⚡ UPDATE: BTC down 35% — worst day since 2013"},
        ],
    },
    {
        "id": "crypto_mania",
        "name": "Crypto Mania",
        "emoji": "🚀",
        "date": "2021-11-09",
        "start_ms": 1636416000000,
        "description": "Peak euphoria. BTC hit $68k ATH and the whole market went parabolic.",
        "difficulty": "medium",
        "news_events": [
            {"candle_index": 200, "headline": "⚡ MILESTONE: Bitcoin hits $68,000 — new all-time high!"},
            {"candle_index": 500, "headline": "⚡ BREAKING: Ethereum surges past $4,800 ATH"},
            {"candle_index": 900, "headline": "⚡ HISTORIC: Total crypto market cap breaches $3 TRILLION"},
        ],
    },
    {
        "id": "luna_death",
        "name": "Luna Death Spiral",
        "emoji": "💀",
        "date": "2022-05-09",
        "start_ms": 1652054400000,
        "description": "UST depegged. LUNA spiraled to zero. $40B evaporated in 48 hours.",
        "difficulty": "brutal",
        "news_events": [
            {"candle_index": 100, "headline": "⚡ WARNING: UST loses $1 peg, trading at $0.98"},
            {"candle_index": 300, "headline": "⚡ CRASH: LUNA down 50% as death spiral accelerates"},
            {"candle_index": 700, "headline": "⚡ BREAKING: Binance halts LUNA withdrawals"},
            {"candle_index": 1200, "headline": "⚡ CATASTROPHE: LUNA down 96% — ecosystem in freefall"},
        ],
    },
    {
        "id": "doge_mania",
        "name": "Doge Mania",
        "emoji": "🐕",
        "date": "2021-05-04",
        "start_ms": 1620086400000,
        "description": "Elon went on SNL. DOGE pumped to $0.70 then dumped live on air.",
        "difficulty": "medium",
        "news_events": [
            {"candle_index": 150, "headline": "⚡ HYPE: Elon Musk tweets 'The Dogefather' ahead of SNL appearance"},
            {"candle_index": 400, "headline": "⚡ RECORD: Dogecoin hits $0.70 — new all-time high! 🐕🚀"},
            {"candle_index": 900, "headline": "⚡ LIVE: Saturday Night Live starts — Elon on stage"},
            {"candle_index": 1000, "headline": "⚡ DUMP: DOGE crashes 30% as 'sell the news' hits hard"},
        ],
    },
    {
        "id": "ftx_collapse",
        "name": "FTX Collapse",
        "emoji": "🏦",
        "date": "2022-11-08",
        "start_ms": 1667865600000,
        "description": "CZ tweeted. FTX imploded. SBF went from $16B to handcuffs.",
        "difficulty": "brutal",
        "news_events": [
            {"candle_index": 80, "headline": "⚡ LEAK: CoinDesk reports Alameda balance sheet is mostly FTT"},
            {"candle_index": 300, "headline": "⚡ BOMBSHELL: CZ announces Binance liquidating all FTT holdings"},
            {"candle_index": 700, "headline": "⚡ CRISIS: FTX halts all withdrawals — users locked out"},
            {"candle_index": 800, "headline": "⚡ CAP: SBF tweets 'FTX is fine. Assets are fine.' 🤡"},
        ],
    },
]


# ── Binance Fetcher ──────────────────────────────────────────────────────────

def fetch_klines(symbol: str, start_ms: int, total: int = CANDLES_PER_DAY) -> list:
    """
    Fetch `total` 1-minute klines from Binance starting at `start_ms`.

    Binance returns max 1000 per request, so we paginate.
    Each kline: [open_time, open, high, low, close, volume, close_time, ...]
    We keep only: [timestamp, open, high, low, close, volume]
    """
    all_candles = []
    current_start = start_ms
    limit = min(1000, total)

    while len(all_candles) < total:
        remaining = total - len(all_candles)
        batch_limit = min(1000, remaining)

        params = {
            "symbol": symbol,
            "interval": "1m",
            "startTime": current_start,
            "limit": batch_limit,
        }

        with httpx.Client(timeout=30) as client:
            resp = client.get(BINANCE_KLINE_URL, params=params)

        if resp.status_code == 429:
            # Rate limited — wait and retry
            print(f"    ⏳ Rate limited, sleeping 30s...")
            time.sleep(30)
            continue

        if resp.status_code != 200:
            print(f"    ❌ Binance returned {resp.status_code}: {resp.text[:200]}")
            break

        data = resp.json()
        if not data:
            print(f"    ⚠️  No more data returned (got {len(all_candles)}/{total})")
            break

        for k in data:
            # [timestamp_ms, open, high, low, close, volume]
            all_candles.append([
                int(k[0]),           # open_time (ms)
                float(k[1]),         # open
                float(k[2]),         # high
                float(k[3]),         # low
                float(k[4]),         # close
                float(k[5]),         # volume
            ])

        # Next batch starts after the last candle's open_time
        current_start = int(data[-1][0]) + 60_000  # +1 minute
        time.sleep(0.3)  # Be respectful to Binance

    return all_candles[:total]


# ── Main ─────────────────────────────────────────────────────────────────────

def download_all():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("=" * 60)
    print("📦  CryptoArena — Historical Scenario Downloader")
    print("=" * 60)
    print(f"Coins   : {', '.join(COINS)}")
    print(f"Candles : {CANDLES_PER_DAY} per coin (24h of 1-min data)")
    print(f"Output  : {os.path.abspath(OUTPUT_DIR)}")
    print("=" * 60)

    for scenario in SCENARIOS:
        sid = scenario["id"]
        date = scenario["date"]
        start_ms = scenario["start_ms"]

        print(f"\n{scenario['emoji']}  Downloading: {scenario['name']} ({date})")
        print(f"   Start timestamp: {start_ms}")

        candles = {}
        for coin in COINS:
            symbol = BINANCE_SYMBOLS[coin]
            print(f"   📊 {coin} ({symbol})...", end=" ", flush=True)
            klines = fetch_klines(symbol, start_ms, CANDLES_PER_DAY)
            candles[coin] = klines
            print(f"✅ {len(klines)} candles")

        # Build output JSON
        output = {
            "id": scenario["id"],
            "name": scenario["name"],
            "emoji": scenario["emoji"],
            "date": scenario["date"],
            "description": scenario["description"],
            "difficulty": scenario["difficulty"],
            "candles": candles,
            "news_events": scenario["news_events"],
        }

        filepath = os.path.join(OUTPUT_DIR, f"{sid}.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(output, f, separators=(",", ":"))  # compact JSON

        size_mb = os.path.getsize(filepath) / (1024 * 1024)
        print(f"   💾 Saved: {filepath} ({size_mb:.1f} MB)")

    # ── Verification ─────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("✅  VERIFICATION — Candle Counts")
    print("=" * 60)
    print(f"{'Scenario':<20} ", end="")
    for coin in COINS:
        print(f"{coin:>8}", end="")
    print(f"  {'Status':>8}")
    print("-" * 68)

    all_ok = True
    for scenario in SCENARIOS:
        sid = scenario["id"]
        filepath = os.path.join(OUTPUT_DIR, f"{sid}.json")

        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        print(f"{sid:<20} ", end="")
        scenario_ok = True
        for coin in COINS:
            count = len(data["candles"].get(coin, []))
            print(f"{count:>8}", end="")
            if count < CANDLES_PER_DAY:
                scenario_ok = False

        status = "✅ OK" if scenario_ok else "⚠️ SHORT"
        print(f"  {status:>8}")
        if not scenario_ok:
            all_ok = False

    print("-" * 68)
    if all_ok:
        print("🎉  All scenarios downloaded successfully with full candle data!")
    else:
        print("⚠️   Some scenarios have fewer than 1440 candles.")
        print("    This may happen for coins that didn't exist on older dates (e.g. SOL in 2020).")
        print("    The replay engine will handle shorter arrays gracefully.")

    print(f"\nFiles saved to: {os.path.abspath(OUTPUT_DIR)}")
    print("You can now start the backend server. 🚀\n")


if __name__ == "__main__":
    download_all()
