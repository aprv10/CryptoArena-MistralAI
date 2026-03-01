import { useState, useCallback } from 'react';
import { useGameState } from './hooks/useGameState';
import LobbyScreen from './components/LobbyScreen';
import TopBar from './components/TopBar';
import BattleCards from './components/BattleCards';
import PortfolioChart from './components/PortfolioChart';
import TradingPanel from './components/TradingPanel';
import TradeFeed from './components/TradeFeed';
import HoldingsTable from './components/HoldingsTable';
import EndScreen from './components/EndScreen';
import BreakingNewsBanner from './components/BreakingNewsBanner';
import './index.css';

export default function App() {
  // phase: 'lobby' | 'battle' | 'end'
  const [phase, setPhase] = useState('lobby');
  const [sessionSettings, setSessionSettings] = useState(null);

  const {
    gameState,
    loading,
    error,
    startSession,
    executeUserTrade,
    resetSession,
  } = useGameState(phase === 'battle' ? 3000 : 10000);

  // Handle start from lobby
  const handleStart = useCallback(async (capital, duration, difficulty) => {
    try {
      setSessionSettings({ capital, duration, difficulty });
      await startSession(capital, duration, difficulty);
      setPhase('battle');
    } catch (err) {
      console.error('Failed to start:', err);
    }
  }, [startSession]);

  // Handle user trade
  const handleTrade = useCallback(async (action, crypto, amountUsd) => {
    return await executeUserTrade(action, crypto, amountUsd);
  }, [executeUserTrade]);

  // Handle rematch — same settings
  const handleRematch = useCallback(async () => {
    await resetSession();
    if (sessionSettings) {
      try {
        await startSession(sessionSettings.capital, sessionSettings.duration, sessionSettings.difficulty);
        setPhase('battle');
      } catch (err) {
        setPhase('lobby');
      }
    } else {
      setPhase('lobby');
    }
  }, [resetSession, startSession, sessionSettings]);

  // Handle back to lobby
  const handleChangeSettings = useCallback(async () => {
    await resetSession();
    setPhase('lobby');
  }, [resetSession]);

  // Auto-detect session end
  if (phase === 'battle' && gameState.finished && gameState.winner) {
    // Transition to end screen (use setTimeout to avoid render-time setState)
    setTimeout(() => setPhase('end'), 0);
  }

  // ── LOBBY SCREEN ──────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <>
        <BreakingNewsBanner activeNewsEvent={gameState.active_news_event} />
        <LobbyScreen onStart={handleStart} />
      </>
    );
  }

  // ── END SCREEN ────────────────────────────────────────────────────────
  if (phase === 'end') {
    return (
      <>
        <BreakingNewsBanner activeNewsEvent={gameState.active_news_event} />
        <EndScreen
          gameState={gameState}
          onRematch={handleRematch}
          onChangeSettings={handleChangeSettings}
        />
      </>
    );
  }

  // ── BATTLE SCREEN ─────────────────────────────────────────────────────
  const isFinished = gameState.finished;

  return (
    <div style={{ minHeight: '100vh' }}>
      <BreakingNewsBanner activeNewsEvent={gameState.active_news_event} />

      {/* Top Bar */}
      <TopBar
        currentCandle={gameState.current_candle}
        totalCandles={gameState.total_candles}
        prices={gameState.prices}
        changes={gameState.price_changes}
      />

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1rem',
      }}>
        {/* Battle Cards */}
        <BattleCards
          user={gameState.user}
          sage={gameState.sage}
          userWinPct={gameState.user_win_pct}
          leader={gameState.leader}
          leadAmount={gameState.lead_amount}
          trades={gameState.trades}
        />

        {/* Two-column layout: Chart + Trading Panel */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: '1rem',
          alignItems: 'start',
        }}>
          {/* Left: Chart + Trade Feed + Holdings */}
          <div>
            <PortfolioChart
              userHistory={gameState.user?.value_history}
              sageHistory={gameState.sage?.value_history}
              startingCapital={gameState.starting_capital}
              candlesSoFar={gameState.candles_so_far}
              currentCandle={gameState.current_candle}
              totalCandles={gameState.total_candles}
            />

            <TradeFeed trades={gameState.trades} />

            <HoldingsTable
              userHoldings={gameState.user?.holdings}
              sageHoldings={gameState.sage?.holdings}
            />
          </div>

          {/* Right: Trading Panel */}
          <div style={{ position: 'sticky', top: '1rem' }}>
            <TradingPanel
              prices={gameState.prices}
              userHoldings={gameState.user?.holdings}
              userCash={gameState.user?.cash}
              watchlist={gameState.watchlist}
              onTrade={handleTrade}
              disabled={isFinished}
            />
          </div>
        </div>
      </div>

      {/* Mobile responsiveness */}
      <style>{`
        @media (max-width: 768px) {
          [style*="grid-template-columns: minmax"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
