import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CRYPTO_ICONS = {
    BTC: '₿', ETH: 'Ξ', SOL: '◎', BNB: '⬡', DOGE: '🐕',
    PEPE: '🐸', WIF: '🐶', ARB: '🔵', MATIC: '🟣', AVAX: '🔺',
};

export default function TradingPanel({ prices, userHoldings, userCash, watchlist, onTrade, disabled }) {
    const [selectedCrypto, setSelectedCrypto] = useState('BTC');
    const [action, setAction] = useState('BUY');
    const [amountStr, setAmountStr] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [flashClass, setFlashClass] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const currentPrice = prices?.[selectedCrypto] || 0;
    const amount = parseFloat(amountStr) || 0;
    const estimatedQty = currentPrice > 0 ? amount / currentPrice : 0;

    // Find current holding for selected crypto
    const holding = userHoldings?.find(h => h.crypto === selectedCrypto);
    const maxSell = holding ? holding.market_value : 0;

    const setQuickAmount = (pct) => {
        if (action === 'BUY') {
            setAmountStr(Math.floor((userCash || 0) * pct).toString());
        } else {
            setAmountStr(Math.floor(maxSell * pct).toString());
        }
    };

    const handleTrade = useCallback(async () => {
        if (!amount || amount <= 0) {
            setError('Enter an amount');
            return;
        }
        if (action === 'BUY' && amount > userCash) {
            setError(`Insufficient cash. You have $${userCash?.toLocaleString()}`);
            return;
        }
        if (action === 'SELL' && amount > maxSell * 1.01) {
            setError(`Insufficient ${selectedCrypto}. Max $${maxSell.toFixed(2)}`);
            return;
        }

        setLoading(true);
        setError('');
        try {
            await onTrade(action, selectedCrypto, amount);
            setFlashClass(action === 'BUY' ? 'trade-flash-buy' : 'trade-flash-sell');
            setSuccessMsg(`${action} $${amount.toLocaleString()} of ${selectedCrypto}`);
            setAmountStr('');
            setTimeout(() => { setFlashClass(''); setSuccessMsg(''); }, 2000);
        } catch (err) {
            setError(err.message || 'Trade failed');
        } finally {
            setLoading(false);
        }
    }, [action, selectedCrypto, amount, userCash, maxSell, onTrade]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card card-user ${flashClass}`}
            style={{ marginBottom: '1rem' }}
        >
            <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                letterSpacing: '0.1em',
                color: 'var(--user-color)',
                marginBottom: '1rem',
            }}>
                TRADE
            </h3>

            {/* Row 1: Crypto selector + Buy/Sell toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <select
                    className="select"
                    value={selectedCrypto}
                    onChange={(e) => { setSelectedCrypto(e.target.value); setError(''); }}
                    style={{ flex: 1 }}
                    disabled={disabled}
                >
                    {(watchlist || []).map(sym => (
                        <option key={sym} value={sym}>
                            {CRYPTO_ICONS[sym] || ''} {sym}
                        </option>
                    ))}
                </select>

                <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <button
                        onClick={() => { setAction('BUY'); setError(''); }}
                        disabled={disabled}
                        style={{
                            padding: '0.5rem 1.2rem',
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.95rem',
                            letterSpacing: '0.1em',
                            border: 'none',
                            cursor: 'pointer',
                            background: action === 'BUY' ? 'var(--success)' : 'var(--elevated)',
                            color: action === 'BUY' ? '#000' : 'var(--muted)',
                            transition: 'all 0.2s',
                        }}
                    >
                        BUY
                    </button>
                    <button
                        onClick={() => { setAction('SELL'); setError(''); }}
                        disabled={disabled}
                        style={{
                            padding: '0.5rem 1.2rem',
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.95rem',
                            letterSpacing: '0.1em',
                            border: 'none',
                            cursor: 'pointer',
                            background: action === 'SELL' ? 'var(--danger)' : 'var(--elevated)',
                            color: action === 'SELL' ? '#fff' : 'var(--muted)',
                            transition: 'all 0.2s',
                        }}
                    >
                        SELL
                    </button>
                </div>
            </div>

            {/* Row 2: Amount + quick buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{
                        position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--muted)', fontFamily: 'var(--font-mono)',
                    }}>$</span>
                    <input
                        className="input"
                        type="number"
                        placeholder="Amount in USD"
                        value={amountStr}
                        onChange={(e) => { setAmountStr(e.target.value); setError(''); }}
                        disabled={disabled}
                        style={{ paddingLeft: '1.5rem' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {[0.25, 0.5, 1].map(pct => (
                        <button
                            key={pct}
                            onClick={() => setQuickAmount(pct)}
                            disabled={disabled}
                            style={{
                                padding: '0.4rem 0.6rem',
                                fontSize: '0.7rem',
                                fontFamily: 'var(--font-mono)',
                                background: 'var(--elevated)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {pct === 1 ? 'MAX' : `${pct * 100}%`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Estimate */}
            {amount > 0 && currentPrice > 0 && (
                <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    marginBottom: '0.5rem',
                    padding: '0.4rem 0.6rem',
                    background: 'var(--elevated)',
                    borderRadius: 'var(--radius-sm)',
                }}>
                    ≈ {estimatedQty < 1 ? estimatedQty.toFixed(6) : estimatedQty.toFixed(4)} {selectedCrypto} @ ${currentPrice >= 1
                        ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })
                        : currentPrice.toFixed(currentPrice < 0.001 ? 8 : 4)}
                </div>
            )}

            {/* Error */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                            color: 'var(--danger)',
                            fontSize: '0.8rem',
                            fontFamily: 'var(--font-mono)',
                            marginBottom: '0.5rem',
                            padding: '0.4rem 0.6rem',
                            background: 'rgba(255,51,85,0.1)',
                            borderRadius: 'var(--radius-sm)',
                        }}
                    >
                        ⚠ {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success */}
            <AnimatePresence>
                {successMsg && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                            color: 'var(--success)',
                            fontSize: '0.8rem',
                            fontFamily: 'var(--font-mono)',
                            marginBottom: '0.5rem',
                            padding: '0.4rem 0.6rem',
                            background: 'rgba(0,255,135,0.1)',
                            borderRadius: 'var(--radius-sm)',
                        }}
                    >
                        ✅ {successMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Execute Button */}
            <button
                className={`btn ${action === 'BUY' ? 'btn-buy' : 'btn-sell'}`}
                onClick={handleTrade}
                disabled={disabled || loading || !amount}
                style={{
                    width: '100%',
                    fontSize: '1.1rem',
                    marginBottom: '1rem',
                    opacity: disabled || loading ? 0.5 : 1,
                }}
            >
                {loading ? 'EXECUTING...' : disabled ? 'TRADING LOCKED' : `${action} ${selectedCrypto}`}
            </button>

            {/* Current Holdings Summary */}
            {userHoldings && userHoldings.length > 0 && (
                <div>
                    <div style={{
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '0.1em',
                        color: 'var(--muted)',
                        marginBottom: '0.4rem',
                    }}>
                        YOUR HOLDINGS
                    </div>
                    <div style={{
                        display: 'grid',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                    }}>
                        {userHoldings.map(h => (
                            <div
                                key={h.crypto}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '0.3rem 0.5rem',
                                    background: selectedCrypto === h.crypto ? 'var(--elevated)' : 'transparent',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                }}
                                onClick={() => setSelectedCrypto(h.crypto)}
                            >
                                <span>
                                    {CRYPTO_ICONS[h.crypto]} {h.crypto}
                                    <span style={{ color: 'var(--muted)', marginLeft: '0.5rem' }}>
                                        {h.quantity < 1 ? h.quantity.toFixed(6) : h.quantity.toFixed(4)}
                                    </span>
                                </span>
                                <span style={{ color: h.pnl >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                    ${h.market_value.toFixed(2)}
                                    <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem' }}>
                                        {h.pnl >= 0 ? '+' : ''}{h.pnl_pct.toFixed(1)}%
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
