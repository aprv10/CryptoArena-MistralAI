import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DURATION_PRESETS = [
    { label: '5 min', value: 300 },
    { label: '15 min', value: 900 },
    { label: '30 min', value: 1800 },
    { label: '1 hour', value: 3600 },
];

const DIFFICULTIES = [
    { id: 'rookie', label: '🟢 Rookie', desc: 'Slower, conservative' },
    { id: 'trader', label: '🟡 Trader', desc: 'Balanced, reads momentum' },
    { id: 'degen', label: '🔴 Degen', desc: 'Fast, aggressive, apes in' },
];

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    return `${m}m`;
}

export default function LobbyScreen({ onStart }) {
    const [capital, setCapital] = useState(10000);
    const [duration, setDuration] = useState(300);
    const [customDuration, setCustomDuration] = useState(false);
    const [difficulty, setDifficulty] = useState('trader');
    const [countdown, setCountdown] = useState(null);
    const [capitalInput, setCapitalInput] = useState('10000');

    const handleCapitalChange = (val) => {
        setCapitalInput(val);
        const num = parseInt(val.replace(/,/g, ''));
        if (!isNaN(num) && num >= 1000 && num <= 1000000) {
            setCapital(num);
        }
    };

    const handleStart = () => {
        setCountdown(3);
    };

    useEffect(() => {
        if (countdown === null) return;
        if (countdown === 0) {
            onStart(capital, duration, difficulty);
            return;
        }
        const t = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown, capital, duration, difficulty, onStart]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
        }}>
            <AnimatePresence mode="wait">
                {countdown !== null && countdown > 0 ? (
                    <motion.div
                        key="countdown"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 2, opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(5,5,15,0.95)', zIndex: 100,
                        }}
                    >
                        <motion.div
                            key={countdown}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 3, opacity: 0 }}
                            transition={{ duration: 0.6 }}
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '12rem',
                                color: countdown === 1 ? 'var(--danger)' : countdown === 2 ? 'var(--gold)' : 'var(--user-color)',
                                textShadow: `0 0 60px currentColor, 0 0 120px currentColor`,
                            }}
                        >
                            {countdown}
                        </motion.div>
                    </motion.div>
                ) : countdown === 0 ? (
                    <motion.div
                        key="go"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 3, opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(5,5,15,0.95)', zIndex: 100,
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.3, 1] }}
                            transition={{ duration: 0.5 }}
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '8rem',
                                color: 'var(--success)',
                                textShadow: '0 0 60px var(--success)',
                                letterSpacing: '0.2em',
                            }}
                        >
                            TRADE!
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                    maxWidth: '560px', width: '100%',
                }}
            >
                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(2rem, 5vw, 3.2rem)',
                        textAlign: 'center',
                        marginBottom: '0.5rem',
                        background: 'linear-gradient(135deg, var(--user-color), var(--gold), var(--ai-color))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '0.08em',
                    }}
                >
                    ⚔ HUMAN VS AI
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        textAlign: 'center',
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.4rem',
                        color: 'var(--text-secondary)',
                        letterSpacing: '0.15em',
                        marginBottom: '2.5rem',
                    }}
                >
                    CRYPTO BATTLE
                </motion.p>

                {/* Capital */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card"
                    style={{ marginBottom: '1rem' }}
                >
                    <label style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1rem',
                        letterSpacing: '0.1em',
                        color: 'var(--text-secondary)',
                        display: 'block',
                        marginBottom: '0.5rem',
                    }}>
                        💰 STARTING CAPITAL
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', color: 'var(--success)' }}>$</span>
                        <input
                            className="input"
                            type="text"
                            value={capitalInput}
                            onChange={(e) => handleCapitalChange(e.target.value)}
                            style={{ fontSize: '1.3rem', fontWeight: '600' }}
                            placeholder="10000"
                        />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                        Min $1,000 — Max $1,000,000
                    </p>
                </motion.div>

                {/* Duration */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="card"
                    style={{ marginBottom: '1rem' }}
                >
                    <label style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1rem',
                        letterSpacing: '0.1em',
                        color: 'var(--text-secondary)',
                        display: 'block',
                        marginBottom: '0.75rem',
                    }}>
                        ⏱ SESSION DURATION
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        {DURATION_PRESETS.map((preset) => (
                            <button
                                key={preset.value}
                                className={`btn ${duration === preset.value && !customDuration ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => { setDuration(preset.value); setCustomDuration(false); }}
                                style={{ flex: 1, minWidth: '70px', fontSize: '0.9rem', padding: '0.5rem' }}
                            >
                                {preset.label}
                            </button>
                        ))}
                        <button
                            className={`btn ${customDuration ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setCustomDuration(true)}
                            style={{ flex: 1, minWidth: '70px', fontSize: '0.9rem', padding: '0.5rem' }}
                        >
                            Custom
                        </button>
                    </div>
                    {customDuration && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                            <input
                                type="range"
                                min={60}
                                max={10800}
                                step={60}
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value))}
                                style={{ width: '100%', marginBottom: '0.5rem' }}
                            />
                            <p style={{
                                textAlign: 'center',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '1.2rem',
                                color: 'var(--gold)',
                            }}>
                                {formatTime(duration)}
                            </p>
                        </motion.div>
                    )}
                </motion.div>

                {/* Difficulty */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="card"
                    style={{ marginBottom: '2rem' }}
                >
                    <label style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1rem',
                        letterSpacing: '0.1em',
                        color: 'var(--text-secondary)',
                        display: 'block',
                        marginBottom: '0.75rem',
                    }}>
                        🤖 AI DIFFICULTY
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {DIFFICULTIES.map((d) => (
                            <button
                                key={d.id}
                                onClick={() => setDifficulty(d.id)}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem 0.5rem',
                                    background: difficulty === d.id ? 'var(--elevated)' : 'transparent',
                                    border: `1px solid ${difficulty === d.id ? 'var(--gold)' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    transition: 'all 0.2s',
                                    color: difficulty === d.id ? 'var(--text)' : 'var(--muted)',
                                }}
                            >
                                <div style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{d.label}</div>
                                <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{d.desc}</div>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Start Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    style={{ textAlign: 'center' }}
                >
                    <button
                        className="btn btn-gold"
                        onClick={handleStart}
                        style={{ width: '100%', fontSize: '1.5rem' }}
                    >
                        ⚔ READY TO BATTLE
                    </button>
                    <p style={{
                        marginTop: '1rem',
                        fontSize: '0.75rem',
                        color: 'var(--muted)',
                        fontFamily: 'var(--font-mono)',
                    }}>
                        ${capital.toLocaleString()} • {formatTime(duration)} • {difficulty.toUpperCase()}
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
}
