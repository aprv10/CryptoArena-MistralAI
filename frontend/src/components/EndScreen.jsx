import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

function formatMoney(val) {
    return '$' + Math.abs(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatRow({ label, userVal, sageVal, highlight }) {
    return (
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{
                padding: '0.6rem 0.75rem',
                color: 'var(--text-secondary)',
                fontWeight: 500,
            }}>{label}</td>
            <td style={{
                textAlign: 'right',
                padding: '0.6rem 0.75rem',
                color: highlight === 'user' ? 'var(--success)' : highlight === 'return-user'
                    ? ((parseFloat(userVal) >= 0) ? 'var(--success)' : 'var(--danger)')
                    : 'var(--text)',
                fontWeight: highlight ? 600 : 400,
            }}>{userVal}</td>
            <td style={{
                textAlign: 'right',
                padding: '0.6rem 0.75rem',
                color: highlight === 'sage' ? 'var(--success)' : highlight === 'return-sage'
                    ? ((parseFloat(sageVal) >= 0) ? 'var(--success)' : 'var(--danger)')
                    : 'var(--text)',
                fontWeight: highlight ? 600 : 400,
            }}>{sageVal}</td>
        </tr>
    );
}

export default function EndScreen({ gameState, onRematch, onChangeSettings }) {
    const { user, sage, winner, post_game_analysis, starting_capital } = gameState;

    const isUserWin = winner === 'user';
    const isAiWin = winner === 'sage';
    const isDraw = winner === 'draw';

    // Fetch the post-game roast
    const [roast, setRoast] = useState(null);
    const [roastLoading, setRoastLoading] = useState(false);

    // Fire confetti if user wins
    useEffect(() => {
        if (!isUserWin) return;
        const duration = 4000;
        const end = Date.now() + duration;
        const colors = ['#ffd700', '#00c2ff', '#00ff87', '#ff8c00'];

        const frame = () => {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.65 },
                colors,
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.65 },
                colors,
            });
            if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
    }, [isUserWin]);

    // Fetch roast from the end-analysis endpoint
    useEffect(() => {
        if (!winner) return;
        setRoastLoading(true);
        fetch('/api/session/end-analysis')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.roast) setRoast(data.roast);
            })
            .catch(() => { })
            .finally(() => setRoastLoading(false));
    }, [winner]);

    const accentColor = isUserWin ? 'var(--gold)' : isAiWin ? 'var(--ai-color)' : 'var(--text-secondary)';

    return (
        <div className="end-screen-overlay">
            {/* Dynamic glow behind content */}
            <div style={{
                position: 'fixed',
                inset: 0,
                background: isUserWin
                    ? 'radial-gradient(circle at 50% 30%, rgba(255,215,0,0.1) 0%, rgba(0,194,255,0.05) 40%, transparent 70%)'
                    : isAiWin
                        ? 'radial-gradient(circle at 50% 30%, rgba(255,140,0,0.12) 0%, transparent 60%)'
                        : 'radial-gradient(circle at 50% 30%, rgba(200,200,255,0.05) 0%, transparent 60%)',
                pointerEvents: 'none',
                zIndex: -1,
            }} />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{ maxWidth: '620px', width: '100%' }}
            >
                {/* Winner Banner */}
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', bounce: 0.4, delay: 0.2 }}
                    style={{ textAlign: 'center', marginBottom: '2rem' }}
                >
                    {/* Trophy / Robot / Scales icon */}
                    <motion.div
                        initial={{ y: -30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1, type: 'spring' }}
                        style={{ fontSize: '4rem', marginBottom: '0.5rem' }}
                    >
                        {isUserWin && '🏆'}
                        {isAiWin && '🤖'}
                        {isDraw && '⚖️'}
                    </motion.div>

                    <div style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
                        letterSpacing: '0.08em',
                        color: accentColor,
                        textShadow: `0 0 40px ${isUserWin ? 'rgba(255,215,0,0.4)' : isAiWin ? 'rgba(255,140,0,0.4)' : 'transparent'}, 0 0 80px ${isUserWin ? 'rgba(255,215,0,0.2)' : 'transparent'}`,
                        lineHeight: 1,
                    }}>
                        {isUserWin && 'YOU WIN!'}
                        {isAiWin && 'SAGE WINS'}
                        {isDraw && 'DRAW'}
                    </div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        style={{
                            fontFamily: 'var(--font-body)',
                            color: isAiWin ? 'var(--ai-color)' : isUserWin ? 'var(--success)' : 'var(--muted)',
                            fontSize: '1rem',
                            marginTop: '0.75rem',
                            fontStyle: 'italic',
                            opacity: 0.9,
                        }}
                    >
                        {isUserWin && 'Human superiority confirmed. For now.'}
                        {isAiWin && 'Better luck next time, human. 🧠'}
                        {isDraw && 'Too close to call — a tie within 1%.'}
                    </motion.p>
                </motion.div>

                {/* Stats Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="card"
                    style={{ marginBottom: '1.5rem' }}
                >
                    <h3 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1rem',
                        letterSpacing: '0.1em',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.75rem',
                    }}>
                        MATCH RESULTS
                    </h3>

                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.82rem',
                    }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--muted)', fontWeight: 400, width: '35%' }}></th>
                                <th style={{
                                    textAlign: 'right', padding: '0.5rem 0.75rem',
                                    color: 'var(--user-color)',
                                    fontFamily: 'var(--font-display)',
                                    letterSpacing: '0.1em',
                                    fontSize: '0.9rem',
                                }}>YOU</th>
                                <th style={{
                                    textAlign: 'right', padding: '0.5rem 0.75rem',
                                    color: 'var(--ai-color)',
                                    fontFamily: 'var(--font-display)',
                                    letterSpacing: '0.1em',
                                    fontSize: '0.9rem',
                                }}>SAGE</th>
                            </tr>
                        </thead>
                        <tbody>
                            <StatRow label="Starting" userVal={formatMoney(starting_capital)} sageVal={formatMoney(starting_capital)} />
                            <StatRow
                                label="Ending"
                                userVal={formatMoney(user?.total_value)}
                                sageVal={formatMoney(sage?.total_value)}
                                highlight={isUserWin ? 'user' : isAiWin ? 'sage' : null}
                            />
                            <StatRow
                                label="Return"
                                userVal={`${(user?.pnl_pct || 0) >= 0 ? '+' : ''}${(user?.pnl_pct || 0).toFixed(2)}%`}
                                sageVal={`${(sage?.pnl_pct || 0) >= 0 ? '+' : ''}${(sage?.pnl_pct || 0).toFixed(2)}%`}
                                highlight="return-user"
                            />
                            <StatRow label="Trades" userVal={user?.num_trades || 0} sageVal={sage?.num_trades || 0} />
                            <StatRow
                                label="Best Trade"
                                userVal={user?.best_trade ? `${user.best_trade.crypto} ${user.best_trade.pnl >= 0 ? '+' : ''}$${user.best_trade.pnl.toFixed(2)}` : '—'}
                                sageVal={sage?.best_trade ? `${sage.best_trade.crypto} ${sage.best_trade.pnl >= 0 ? '+' : ''}$${sage.best_trade.pnl.toFixed(2)}` : '—'}
                            />
                            <StatRow
                                label="Worst Trade"
                                userVal={user?.worst_trade ? `${user.worst_trade.crypto} ${user.worst_trade.pnl >= 0 ? '+' : ''}$${user.worst_trade.pnl.toFixed(2)}` : '—'}
                                sageVal={sage?.worst_trade ? `${sage.worst_trade.crypto} ${sage.worst_trade.pnl >= 0 ? '+' : ''}$${sage.worst_trade.pnl.toFixed(2)}` : '—'}
                            />
                        </tbody>
                    </table>
                </motion.div>

                {/* AI Analysis */}
                {post_game_analysis && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="card card-ai"
                        style={{ marginBottom: '1.5rem' }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.75rem',
                        }}>
                            <span style={{ fontSize: '1.2rem' }}>🧠</span>
                            <span style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '0.9rem',
                                letterSpacing: '0.1em',
                                color: 'var(--ai-color)',
                            }}>
                                SAGE'S POST-GAME ANALYSIS
                            </span>
                        </div>
                        <p style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.7,
                            fontStyle: 'italic',
                            borderLeft: '3px solid var(--ai-color)',
                            paddingLeft: '1rem',
                            marginLeft: '0.25rem',
                        }}>
                            "{post_game_analysis}"
                        </p>
                    </motion.div>
                )}

                {/* Action Buttons */}

                {/* SAGE's Post-Game Roast */}
                {(roast || roastLoading) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.9, type: 'spring', bounce: 0.3 }}
                        style={{
                            marginBottom: '1.5rem',
                            background: 'linear-gradient(135deg, rgba(255,107,107,0.08) 0%, rgba(255,140,0,0.08) 100%)',
                            border: '1px solid rgba(255,140,0,0.25)',
                            borderRadius: 'var(--radius, 12px)',
                            padding: '1.25rem 1.5rem',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Decorative gradient bar at top */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 3,
                            background: 'linear-gradient(90deg, var(--ai-color), #ff6b6b, var(--ai-color))',
                            backgroundSize: '200% 100%',
                            animation: 'roastShimmer 3s linear infinite',
                        }} />

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.75rem',
                        }}>
                            <span style={{ fontSize: '1.1rem' }}>🔥</span>
                            <span style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '0.8rem',
                                letterSpacing: '0.12em',
                                color: '#ff6b6b',
                                textTransform: 'uppercase',
                            }}>
                                SAGE'S POST-GAME ROAST
                            </span>
                        </div>

                        {roastLoading ? (
                            <p style={{
                                fontFamily: 'var(--font-body)',
                                fontSize: '0.85rem',
                                color: 'var(--muted)',
                                fontStyle: 'italic',
                            }}>
                                SAGE is preparing their hot take...
                            </p>
                        ) : (
                            <p style={{
                                fontFamily: 'var(--font-body)',
                                fontSize: '0.92rem',
                                color: 'var(--text)',
                                lineHeight: 1.7,
                                fontStyle: 'italic',
                                margin: 0,
                                borderLeft: '3px solid #ff6b6b',
                                paddingLeft: '1rem',
                            }}>
                                "{roast}"
                            </p>
                        )}
                    </motion.div>
                )}

                <style>{`
                    @keyframes roastShimmer {
                        0% { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                    }
                `}</style>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    style={{ display: 'flex', gap: '1rem' }}
                >
                    <button className="btn btn-gold" onClick={onRematch} style={{ flex: 1, fontSize: '1.3rem' }}>
                        ⚔ REMATCH
                    </button>
                    <button className="btn btn-ghost" onClick={onChangeSettings} style={{ flex: 1, fontSize: '1rem' }}>
                        ⚙ CHANGE SETTINGS
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
}
