import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = '';

const DEFAULT_STATE = {
    running: false,
    finished: false,
    elapsed: 0,
    remaining: 0,
    duration: 300,
    difficulty: 'trader',
    starting_capital: 10000,
    leader: 'TIE',
    user_win_pct: 50,
    sage_win_pct: 50,
    lead_amount: 0,
    user: {
        agent: 'user',
        cash: 10000,
        total_value: 10000,
        starting_capital: 10000,
        pnl: 0,
        pnl_pct: 0,
        num_trades: 0,
        holdings: [],
        value_history: [],
        best_trade: null,
        worst_trade: null,
    },
    sage: {
        agent: 'sage',
        cash: 10000,
        total_value: 10000,
        starting_capital: 10000,
        pnl: 0,
        pnl_pct: 0,
        num_trades: 0,
        holdings: [],
        value_history: [],
        best_trade: null,
        worst_trade: null,
    },
    trades: [],
    prices: {},
    price_changes: {},
    price_stale: false,
    price_stale_age: 0,
    watchlist: [],
    winner: null,
    post_game_analysis: '',
    ai_strategy_state: {},
};

export function useGameState(pollInterval = 3000) {
    const [gameState, setGameState] = useState(DEFAULT_STATE);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const intervalRef = useRef(null);

    const fetchState = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/state`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setGameState(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchState();
        intervalRef.current = setInterval(fetchState, pollInterval);
        return () => clearInterval(intervalRef.current);
    }, [fetchState, pollInterval]);

    const startSession = useCallback(async (startingCapital = 10000, durationSeconds = 300, difficulty = 'trader') => {
        try {
            const res = await fetch(`${API_BASE}/api/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    starting_capital: startingCapital,
                    duration_seconds: durationSeconds,
                    difficulty,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Failed to start');
            }
            const data = await res.json();
            await fetchState();
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, [fetchState]);

    const executeUserTrade = useCallback(async (action, crypto, amountUsd) => {
        try {
            const res = await fetch(`${API_BASE}/api/trade/user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    crypto,
                    amount_usd: amountUsd,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Trade failed');
            }
            const data = await res.json();
            await fetchState();
            return data;
        } catch (err) {
            throw err;
        }
    }, [fetchState]);

    const resetSession = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
            const data = await res.json();
            await fetchState();
            return data;
        } catch (err) {
            setError(err.message);
        }
    }, [fetchState]);

    const fetchAIReasoning = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/ai/reasoning`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            return { reasonings: [] };
        }
    }, []);

    return {
        gameState,
        loading,
        error,
        startSession,
        executeUserTrade,
        resetSession,
        fetchAIReasoning,
        refresh: fetchState,
    };
}
