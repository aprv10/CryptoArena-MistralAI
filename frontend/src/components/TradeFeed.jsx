import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CRYPTO_ICONS = {
    BTC: '₿', ETH: 'Ξ', SOL: '◎', BNB: '⬡', DOGE: '🐕',
    PEPE: '🐸', WIF: '🐶', ARB: '🔵', MATIC: '🟣', AVAX: '🔺',
};

function getTimeAgo(timestamp) {
    const diff = (Date.now() / 1000) - timestamp;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

export default function TradeFeed({ trades }) {
    const containerRef = useRef(null);

    // Auto-scroll to top on new trade
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [trades?.length]);

    const sorted = [...(trades || [])].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{ marginBottom: '1rem' }}
        >
            <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                letterSpacing: '0.1em',
                color: 'var(--text-secondary)',
                marginBottom: '0.75rem',
            }}>
                LIVE TRADE FEED
            </h3>

            <div
                ref={containerRef}
                style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                }}
            >
                <AnimatePresence initial={false}>
                    {sorted.map((trade, i) => {
                        const isUser = trade.agent === 'user';
                        const borderColor = isUser ? 'var(--user-color)' : 'var(--ai-color)';
                        const badge = isUser ? 'YOU' : 'SAGE';
                        const badgeColor = isUser ? 'var(--user-color)' : 'var(--ai-color)';

                        return (
                            <motion.div
                                key={`${trade.timestamp}-${trade.agent}-${trade.crypto}-${i}`}
                                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    borderLeft: `3px solid ${borderColor}`,
                                    background: 'var(--elevated)',
                                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                                    fontSize: '0.78rem',
                                    fontFamily: 'var(--font-mono)',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {/* Badge */}
                                        <span style={{
                                            fontSize: '0.6rem',
                                            fontFamily: 'var(--font-display)',
                                            letterSpacing: '0.1em',
                                            padding: '0.15rem 0.4rem',
                                            borderRadius: '3px',
                                            background: `${badgeColor}20`,
                                            color: badgeColor,
                                        }}>
                                            {badge}
                                        </span>

                                        {/* Action */}
                                        <span style={{
                                            color: trade.action === 'BUY' ? 'var(--success)' : 'var(--danger)',
                                            fontWeight: 600,
                                        }}>
                                            {trade.action}
                                        </span>

                                        {/* Crypto */}
                                        <span>{CRYPTO_ICONS[trade.crypto]} {trade.crypto}</span>

                                        {/* Amount */}
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            ${trade.amount_usd?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
                                    </div>

                                    <span style={{ color: 'var(--muted)', fontSize: '0.65rem' }}>
                                        {getTimeAgo(trade.timestamp)}
                                    </span>
                                </div>

                                {/* AI reasoning */}
                                {!isUser && trade.reasoning && (
                                    <div style={{
                                        marginTop: '0.3rem',
                                        fontSize: '0.7rem',
                                        color: 'var(--text-secondary)',
                                        fontFamily: 'var(--font-body)',
                                        fontStyle: 'italic',
                                        opacity: 0.8,
                                    }}>
                                        "{trade.reasoning}"
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {sorted.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        color: 'var(--muted)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        padding: '2rem',
                    }}>
                        No trades yet. Make your first move!
                    </div>
                )}
            </div>
        </motion.div>
    );
}
