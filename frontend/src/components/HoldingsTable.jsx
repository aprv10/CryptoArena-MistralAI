import { motion } from 'framer-motion';

const CRYPTO_ICONS = {
    BTC: '₿', ETH: 'Ξ', SOL: '◎', BNB: '⬡', DOGE: '🐕',
    PEPE: '🐸', WIF: '🐶', ARB: '🔵', MATIC: '🟣', AVAX: '🔺',
};

function HoldingsColumn({ label, holdings, colorClass, accentColor }) {
    return (
        <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.9rem',
                letterSpacing: '0.1em',
                color: accentColor,
                marginBottom: '0.5rem',
            }}>
                {label}
            </h4>

            {(!holdings || holdings.length === 0) ? (
                <div style={{
                    color: 'var(--muted)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'center',
                    padding: '1rem',
                }}>
                    No positions
                </div>
            ) : (
                <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                    {/* Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr',
                        gap: '0.25rem',
                        padding: '0.3rem 0.4rem',
                        color: 'var(--muted)',
                        borderBottom: '1px solid var(--border)',
                        marginBottom: '0.25rem',
                    }}>
                        <span>Crypto</span>
                        <span style={{ textAlign: 'right' }}>Qty</span>
                        <span style={{ textAlign: 'right' }}>Value</span>
                        <span style={{ textAlign: 'right' }}>P&L</span>
                    </div>

                    {/* Rows */}
                    {holdings.map(h => (
                        <div
                            key={h.crypto}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr',
                                gap: '0.25rem',
                                padding: '0.35rem 0.4rem',
                                borderRadius: 'var(--radius-sm)',
                                transition: 'background 0.2s',
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span>{CRYPTO_ICONS[h.crypto] || ''}</span>
                                <span style={{ fontWeight: 600 }}>{h.crypto}</span>
                            </span>
                            <span style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                                {h.quantity < 1 ? h.quantity.toFixed(4) : h.quantity.toFixed(2)}
                            </span>
                            <span style={{ textAlign: 'right' }}>
                                ${h.market_value.toFixed(0)}
                            </span>
                            <span style={{
                                textAlign: 'right',
                                color: h.pnl >= 0 ? 'var(--success)' : 'var(--danger)',
                            }}>
                                {h.pnl >= 0 ? '+' : ''}{h.pnl_pct.toFixed(1)}%
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function HoldingsTable({ userHoldings, sageHoldings }) {
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
                HOLDINGS
            </h3>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
                <HoldingsColumn
                    label="YOU"
                    holdings={userHoldings}
                    colorClass="text-user"
                    accentColor="var(--user-color)"
                />
                <div style={{ width: '1px', background: 'var(--border)', flexShrink: 0 }} />
                <HoldingsColumn
                    label="SAGE 🧠"
                    holdings={sageHoldings}
                    colorClass="text-ai"
                    accentColor="var(--ai-color)"
                />
            </div>
        </motion.div>
    );
}
