import { motion } from 'framer-motion';

function formatMoney(val) {
    if (val === undefined || val === null) return '$0.00';
    return '$' + Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PlayerCard({ label, data, colorClass, isUser, aiThinking, aiLastAction }) {
    const pnlPositive = (data?.pnl || 0) >= 0;

    return (
        <motion.div
            className={`card ${colorClass}`}
            initial={{ opacity: 0, x: isUser ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            style={{ flex: 1, minWidth: 0 }}
        >
            {/* Name */}
            <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
                color: isUser ? 'var(--user-color)' : 'var(--ai-color)',
                letterSpacing: '0.1em',
                marginBottom: '0.75rem',
            }}>
                {label}
            </h2>

            {/* Total Value */}
            <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
                fontWeight: 700,
                marginBottom: '0.25rem',
            }}>
                {formatMoney(data?.total_value)}
            </div>

            {/* P&L */}
            <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.95rem',
                color: pnlPositive ? 'var(--success)' : 'var(--danger)',
                marginBottom: '0.75rem',
            }}>
                {pnlPositive ? '+' : '-'}{formatMoney(data?.pnl)}{' '}
                ({pnlPositive ? '+' : ''}{(data?.pnl_pct || 0).toFixed(2)}%)
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                fontSize: '0.8rem',
            }}>
                <div>
                    <span style={{ color: 'var(--muted)' }}>Cash </span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatMoney(data?.cash)}</span>
                </div>
                <div>
                    <span style={{ color: 'var(--muted)' }}>Trades </span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{data?.num_trades || 0}</span>
                </div>
            </div>

            {/* AI-specific indicators */}
            {!isUser && (
                <div style={{ marginTop: '0.75rem' }}>
                    {aiThinking && (
                        <div style={{
                            fontSize: '0.8rem',
                            color: 'var(--ai-color)',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                        }}>
                            🧠 Thinking
                            <span className="thinking-dots">
                                <span></span><span></span><span></span>
                            </span>
                        </div>
                    )}
                    {aiLastAction && (
                        <div style={{
                            fontSize: '0.7rem',
                            color: 'var(--muted)',
                            marginTop: '0.25rem',
                            fontFamily: 'var(--font-mono)',
                        }}>
                            Last: {aiLastAction}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}

export default function BattleCards({ user, sage, userWinPct, leader, leadAmount, trades }) {
    // Find last AI action
    const lastAiTrade = [...(trades || [])].reverse().find(t => t.agent === 'sage');
    const aiLastAction = lastAiTrade
        ? `${lastAiTrade.action} ${lastAiTrade.crypto} ${getTimeAgo(lastAiTrade.timestamp)}`
        : null;

    // AI "thinking" — show briefly when it's mid-cycle
    const aiThinking = sage?.num_trades > 0;

    return (
        <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'stretch',
            marginBottom: '1rem',
        }}>
            {/* User Card */}
            <PlayerCard label="YOU" data={user} colorClass="card-user" isUser={true} />

            {/* VS Center */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '80px',
                gap: '0.5rem',
            }}>
                <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '2rem',
                        color: 'var(--gold)',
                        textShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
                        letterSpacing: '0.1em',
                    }}
                >
                    VS
                </motion.div>

                {/* Win Probability Bar */}
                <div style={{ width: '100%' }}>
                    <div className="prob-bar">
                        <div
                            className="prob-bar-fill"
                            style={{
                                width: `${userWinPct || 50}%`,
                                background: `linear-gradient(90deg, var(--user-color), ${(userWinPct || 50) > 50 ? 'var(--user-color)' : 'var(--ai-color)'})`,
                            }}
                        />
                    </div>
                </div>

                {/* Leader indicator */}
                <div style={{
                    fontSize: '0.65rem',
                    fontFamily: 'var(--font-mono)',
                    color: leader === 'user' ? 'var(--user-color)' : leader === 'sage' ? 'var(--ai-color)' : 'var(--muted)',
                    textAlign: 'center',
                }}>
                    {leader === 'user' ? '▲ YOU' : leader === 'sage' ? '▲ SAGE' : '— TIE'}{' '}
                    {leadAmount > 0 && `+$${leadAmount.toFixed(0)}`}
                </div>
            </div>

            {/* SAGE Card */}
            <PlayerCard
                label="SAGE 🧠"
                data={sage}
                colorClass="card-ai"
                isUser={false}
                aiThinking={aiThinking}
                aiLastAction={aiLastAction}
            />
        </div>
    );
}

function getTimeAgo(timestamp) {
    const diff = (Date.now() / 1000) - timestamp;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}
