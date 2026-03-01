# ⚔ CryptoArena — Human vs AI Crypto Battle

A real-time **Human vs AI** crypto trading competition powered by **Mistral AI**. Players go head-to-head against SAGE 🧠, an autonomous AI trader, replaying historical market scenarios across 1,440 one-minute candles. Trade BTC, ETH, BNB, DOGE, and SOL — and see who comes out on top.

## 🎯 Goal

Build a production-ready demo where a human player competes against a Mistral-powered AI agent in a simulated crypto trading environment. The game replays real historical market data (COVID crash, crypto mania, LUNA collapse, etc.) and lets both sides trade simultaneously. At the end, SAGE delivers a Mistral-generated post-game analysis — and a personalized roast.

### Key Features

- **Historical Replay Engine** — 5 real market scenarios with 1-minute OHLCV candles from Binance
- **SAGE AI Agent** — Autonomous trader using Mistral's function-calling API with adaptive difficulty (Rookie / Trader / Degen)
- **Live Candlestick Chart** — Pure SVG rendering with crosshair tooltips, coin selector tabs, and 120-candle sliding window
- **Breaking News Banner** — Timed news events that mirror real headlines from each scenario
- **Post-Game Roast** — SAGE delivers a 2-sentence in-character burn via Mistral after the battle ends
- **Portfolio Tracking** — Real-time P&L, holdings, trade feed, and combined portfolio chart

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 7, Framer Motion, Recharts |
| **Backend** | Python, FastAPI, Uvicorn |
| **AI** | Mistral AI API (function calling) |
| **Data** | Binance public OHLCV API (pre-downloaded) |
| **Styling** | CSS variables, inline styles, dark theme |

## 🚀 Quick Start

```bash
# 1. Download scenario data (one-time)
cd backend
pip install -r requirements.txt
python download_scenarios.py

# 2. Start backend
python main.py

# 3. Start frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** and start trading.

## 📁 Project Structure

```
├── backend/
│   ├── main.py            # FastAPI app, game loop, endpoints
│   ├── agents.py          # Mistral AI agent (SAGE) + roast
│   ├── market.py          # Scenario loader, candle reader
│   ├── portfolio.py       # Portfolio & trade execution
│   ├── config.py          # Constants & scenario metadata
│   └── download_scenarios.py
├── frontend/
│   └── src/
│       ├── App.jsx         # Main app, phase routing
│       ├── components/     # UI components
│       └── hooks/          # Game state polling
└── data/
    └── scenarios/          # Pre-downloaded OHLCV JSON files
```
