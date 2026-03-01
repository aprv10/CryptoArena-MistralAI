"""Market data — reads prices from loaded scenario candle arrays.

Replaces the old CoinGecko live-fetching module. All price data now comes
from the pre-downloaded scenario JSON files, indexed by current_candle.
"""

from __future__ import annotations

import json
import os
import random
from config import WATCHLIST, DATA_DIR, SCENARIO_META, TOTAL_CANDLES


# ── Scenario Loader ──────────────────────────────────────────────────────────

def load_scenario(scenario_id: str) -> dict:
    """Load a scenario JSON from disk. Resolves 'random' to a real pick."""
    real_ids = [s["id"] for s in SCENARIO_META if s["id"] != "random"]

    if scenario_id == "random":
        scenario_id = random.choice(real_ids)

    filepath = os.path.join(DATA_DIR, f"{scenario_id}.json")
    if not os.path.exists(filepath):
        raise FileNotFoundError(
            f"Scenario file not found: {filepath}\n"
            f"Run 'python download_scenarios.py' first to generate data."
        )

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"[market] Loaded scenario: {data['name']} ({len(data['candles'].get('BTC', []))} BTC candles)")
    return data


def list_scenarios() -> list[dict]:
    """Return metadata for all available scenarios (no candle data)."""
    result = []
    for meta in SCENARIO_META:
        entry = dict(meta)
        # Check if the file exists (skip 'random' which has no file)
        if meta["id"] != "random":
            filepath = os.path.join(DATA_DIR, f"{meta['id']}.json")
            entry["available"] = os.path.exists(filepath)
        else:
            entry["available"] = True
        result.append(entry)
    return result


def validate_scenarios_exist() -> None:
    """Called at server startup — fail loudly if any scenario file is missing."""
    real_ids = [s["id"] for s in SCENARIO_META if s["id"] != "random"]
    missing = []
    for sid in real_ids:
        filepath = os.path.join(DATA_DIR, f"{sid}.json")
        if not os.path.exists(filepath):
            missing.append(sid)

    if missing:
        raise RuntimeError(
            f"\n{'='*60}\n"
            f"❌ MISSING SCENARIO FILES: {', '.join(missing)}\n"
            f"   Run: python download_scenarios.py\n"
            f"   Expected location: {os.path.abspath(DATA_DIR)}\n"
            f"{'='*60}\n"
        )
    print(f"[market] All {len(real_ids)} scenario files present ✅")


# ── Price Reading from Candle Array ──────────────────────────────────────────

def get_prices_at_candle(scenario_data: dict, candle_index: int) -> dict[str, float]:
    """Read close prices for all coins at a given candle index.

    Each candle: [timestamp_ms, open, high, low, close, volume]
    Index 4 = close price.
    """
    assert candle_index >= 0, f"candle_index must be >= 0, got {candle_index}"

    prices = {}
    candles = scenario_data.get("candles", {})
    for coin in WATCHLIST:
        coin_candles = candles.get(coin, [])
        if candle_index < len(coin_candles):
            prices[coin] = coin_candles[candle_index][4]  # close price
        else:
            # Coin might have fewer candles (e.g., SOL in 2020)
            # Use last available price
            if coin_candles:
                prices[coin] = coin_candles[-1][4]
            else:
                prices[coin] = 0.0
    return prices


def get_candles_so_far(scenario_data: dict, current_candle: int) -> dict[str, list]:
    """Return all candles up to and including current_candle for each coin.

    HARD RULE: Never return candles beyond current_candle.
    """
    assert current_candle >= 0, f"current_candle must be >= 0, got {current_candle}"

    result = {}
    candles = scenario_data.get("candles", {})
    for coin in WATCHLIST:
        coin_candles = candles.get(coin, [])
        # Clip to current_candle (inclusive), never beyond
        end = min(current_candle + 1, len(coin_candles))
        result[coin] = coin_candles[:end]
    return result


def get_price_changes_from_candles(scenario_data: dict, current_candle: int) -> dict[str, float]:
    """Compute % change for each coin from candle 0 to current_candle."""
    candles = scenario_data.get("candles", {})
    changes = {}
    for coin in WATCHLIST:
        coin_candles = candles.get(coin, [])
        if len(coin_candles) < 2 or current_candle < 1:
            changes[coin] = 0.0
            continue
        open_price = coin_candles[0][1]  # open of first candle
        idx = min(current_candle, len(coin_candles) - 1)
        close_price = coin_candles[idx][4]  # close of current candle
        if open_price > 0:
            changes[coin] = round(((close_price - open_price) / open_price) * 100, 2)
        else:
            changes[coin] = 0.0
    return changes


def get_price_history_from_candles(
    scenario_data: dict, current_candle: int, count: int = 5
) -> list[dict]:
    """Build price history snapshots from candle data (last `count` candles).

    Returns in the same format the SAGE agent expects:
    [{"time": ..., "prices": {"BTC": ..., "ETH": ..., ...}}, ...]
    """
    candles = scenario_data.get("candles", {})
    start = max(0, current_candle - count + 1)
    end = current_candle + 1

    history = []
    for i in range(start, end):
        snapshot = {"prices": {}}
        for coin in WATCHLIST:
            coin_candles = candles.get(coin, [])
            if i < len(coin_candles):
                snapshot["time"] = coin_candles[i][0] / 1000  # ms → seconds
                snapshot["prices"][coin] = coin_candles[i][4]
            elif coin_candles:
                snapshot["prices"][coin] = coin_candles[-1][4]
        if "time" not in snapshot and candles:
            snapshot["time"] = 0
        history.append(snapshot)

    return history


def check_news_event(scenario_data: dict, candle_index: int) -> dict | None:
    """Check if current candle triggers a news event."""
    for event in scenario_data.get("news_events", []):
        if event["candle_index"] == candle_index:
            return event
    return None
