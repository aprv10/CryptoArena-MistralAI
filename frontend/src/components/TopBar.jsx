import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const CRYPTO_ICONS = {
    BTC: '₿', ETH: 'Ξ', SOL: '◎', BNB: '⬡', DOGE: '🐕',
    PEPE: '🐸', WIF: '🐶', ARB: '🔵', MATIC: '🟣', AVAX: '🔺',
};

/* ── Ticker Tape ──────────────────────────────────────────────────────────── */
function TickerTape({ prices, changes }) {
    if (!prices || Object.keys(prices).length === 0) return null;

    const items = Object.entries(prices).map(([sym, price]) => {
        const change = changes?.[sym] || 0;
        const isUp = change >= 0;
        return { sym, price, change, isUp };
    });

    const doubled = [...items, ...items];

    return (
        <div className="ticker-tape-container">
            <div className="ticker-tape-inner">
                {doubled.map((item, i) => (
                    <div key={`${item.sym}-${i}`} className="ticker-item">
                        <span style={{ fontSize: '1rem' }}>{CRYPTO_ICONS[item.sym] || ''}</span>
                        <span style={{ color: 'var(--text)', fontWeight: 700, letterSpacing: '0.05em' }}>{item.sym}</span>
                        <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                            ${item.price >= 1 ? item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : item.price.toFixed(item.price < 0.001 ? 8 : 4)}
                        </span>
                        <span style={{
                            color: item.isUp ? 'var(--success)' : 'var(--danger)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                        }}>
                            {item.isUp ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Top Bar Component ────────────────────────────────────────────────────── */
export default function TopBar({ currentCandle, totalCandles, prices, changes }) {
    const candle = currentCandle || 0;
    const total = totalCandles || 1440;
    const pct = (candle / total) * 100;
    const isUrgent = pct >= 80;
    const isCritical = pct >= 95;

    return (
        <div style={{ position: 'sticky', top: 0, zIndex: 40 }}>
            {/* Main Top Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                background: 'rgba(12, 12, 30, 0.95)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--border)',
            }}>
                {/* Logo */}
                <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.4rem',
                    letterSpacing: '0.12em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexShrink: 0,
                }}>
                    <span style={{ fontSize: '1.3rem' }}>⚔</span>
                    <span style={{
                        background: 'linear-gradient(135deg, var(--user-color), var(--gold), var(--ai-color))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'brightness(1.1)',
                    }}>
                        CRYPTOARENA
                    </span>
                </div>

                {/* Candle Counter (replaces countdown timer) */}
                <motion.div
                    animate={isCritical ? {
                        x: [0, -3, 3, -3, 3, 0],
                        scale: [1, 1.02, 1, 1.02, 1],
                    } : {}}
                    transition={isCritical ? { repeat: Infinity, duration: 0.5 } : {}}
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: isCritical ? 'var(--danger)' : isUrgent ? 'var(--gold)' : 'var(--text)',
                        textShadow: isCritical
                            ? '0 0 30px var(--danger), 0 0 60px rgba(255,51,85,0.3)'
                            : isUrgent
                                ? '0 0 20px rgba(255,215,0,0.4)'
                                : '0 0 10px rgba(238,238,255,0.1)',
                        letterSpacing: '0.06em',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'color 0.3s, text-shadow 0.3s',
                    }}
                    className={isUrgent && !isCritical ? 'animate-pulse' : ''}
                >
                    <span style={{ fontSize: '1rem' }}>🕯</span>
                    {candle}
                    <span style={{
                        color: 'var(--muted)',
                        fontWeight: 400,
                        fontSize: '0.85rem',
                    }}>
                        / {total}
                    </span>
                </motion.div>
            </div>

            {/* Ticker Tape */}
            <TickerTape prices={prices} changes={changes} />
        </div>
    );
}
