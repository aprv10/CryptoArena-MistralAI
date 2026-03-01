import { useState, useMemo, useRef, useEffect } from 'react';
import {
    ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';

const COINS = ['BTC', 'ETH', 'BNB', 'DOGE', 'SOL'];
const WINDOW_SIZE = 120;
const CHART_HEIGHT = 350;
const CHART_PADDING = { top: 10, right: 12, bottom: 25, left: 65 };

/* ── Pure SVG Candlestick Chart ───────────────────────────────────────────── */

function SVGCandlestickChart({ data, width, formatPrice, selectedCoin }) {
    if (!data || !data.length || width <= 0) {
        return (
            <div style={{
                height: CHART_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--muted, #888)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
            }}>
                Waiting for candle data…
            </div>
        );
    }

    const plotW = width - CHART_PADDING.left - CHART_PADDING.right;
    const plotH = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

    // Y domain
    const allLows = data.map(d => d.low);
    const allHighs = data.map(d => d.high);
    const yMin = Math.min(...allLows);
    const yMax = Math.max(...allHighs);
    const yPad = (yMax - yMin) * 0.08 || 1;
    const domainMin = yMin - yPad;
    const domainMax = yMax + yPad;

    // Scales
    const yScale = (v) => CHART_PADDING.top + plotH - ((v - domainMin) / (domainMax - domainMin)) * plotH;
    const candleWidth = Math.max(1, plotW / data.length);
    const bodyWidth = Math.max(2, candleWidth * 0.65);
    const xCenter = (i) => CHART_PADDING.left + i * candleWidth + candleWidth / 2;

    // Grid lines + labels
    const tickCount = 7;
    const tickStep = (domainMax - domainMin) / tickCount;
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => domainMin + i * tickStep);

    // X-axis labels (every 20 candles)
    const xLabels = data.filter((_, i) => i % 20 === 0);

    // Tooltip state
    const [hoverIndex, setHoverIndex] = useState(null);
    const svgRef = useRef(null);

    const handleMouseMove = (e) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left - CHART_PADDING.left;
        const idx = Math.floor(mx / candleWidth);
        if (idx >= 0 && idx < data.length) {
            setHoverIndex(idx);
        } else {
            setHoverIndex(null);
        }
    };

    const hoveredCandle = hoverIndex !== null ? data[hoverIndex] : null;

    return (
        <div style={{ position: 'relative' }}>
            <svg
                ref={svgRef}
                width={width}
                height={CHART_HEIGHT}
                style={{ display: 'block', cursor: 'crosshair' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoverIndex(null)}
            >
                {/* Background */}
                <rect
                    x={CHART_PADDING.left}
                    y={CHART_PADDING.top}
                    width={plotW}
                    height={plotH}
                    fill="transparent"
                />

                {/* Horizontal grid lines + Y-axis labels */}
                {ticks.map((tick, i) => {
                    const y = yScale(tick);
                    return (
                        <g key={i}>
                            <line
                                x1={CHART_PADDING.left}
                                y1={y}
                                x2={CHART_PADDING.left + plotW}
                                y2={y}
                                stroke="rgba(255,255,255,0.06)"
                                strokeDasharray="3 3"
                            />
                            <text
                                x={CHART_PADDING.left - 8}
                                y={y + 3}
                                fill="#888"
                                fontSize={9}
                                fontFamily="monospace"
                                textAnchor="end"
                            >
                                {formatPrice(tick)}
                            </text>
                        </g>
                    );
                })}

                {/* X-axis labels */}
                {xLabels.map((d, i) => {
                    const idx = data.indexOf(d);
                    return (
                        <text
                            key={i}
                            x={xCenter(idx)}
                            y={CHART_HEIGHT - 5}
                            fill="#888"
                            fontSize={9}
                            fontFamily="monospace"
                            textAnchor="middle"
                        >
                            {d.index}
                        </text>
                    );
                })}

                {/* Candlesticks */}
                {data.map((d, i) => {
                    const cx = xCenter(i);
                    const yH = yScale(d.high);
                    const yL = yScale(d.low);
                    const yO = yScale(d.open);
                    const yC = yScale(d.close);
                    const isGreen = d.close >= d.open;
                    const color = isGreen ? '#00e676' : '#ff1744';
                    const bodyTop = Math.min(yO, yC);
                    const bodyH = Math.max(1, Math.abs(yO - yC));

                    return (
                        <g key={i}>
                            {/* Wick */}
                            <line
                                x1={cx} y1={yH}
                                x2={cx} y2={yL}
                                stroke={color}
                                strokeWidth={1}
                                opacity={0.7}
                            />
                            {/* Body */}
                            <rect
                                x={cx - bodyWidth / 2}
                                y={bodyTop}
                                width={bodyWidth}
                                height={bodyH}
                                fill={color}
                                opacity={hoverIndex === i ? 1 : 0.85}
                                rx={0.5}
                            />
                        </g>
                    );
                })}

                {/* Hover crosshair */}
                {hoverIndex !== null && hoveredCandle && (
                    <>
                        {/* Vertical line */}
                        <line
                            x1={xCenter(hoverIndex)}
                            y1={CHART_PADDING.top}
                            x2={xCenter(hoverIndex)}
                            y2={CHART_PADDING.top + plotH}
                            stroke="rgba(255,255,255,0.2)"
                            strokeDasharray="3 3"
                        />
                        {/* Horizontal line at close price */}
                        <line
                            x1={CHART_PADDING.left}
                            y1={yScale(hoveredCandle.close)}
                            x2={CHART_PADDING.left + plotW}
                            y2={yScale(hoveredCandle.close)}
                            stroke="rgba(255,255,255,0.15)"
                            strokeDasharray="3 3"
                        />
                        {/* Price label on Y axis */}
                        <rect
                            x={0}
                            y={yScale(hoveredCandle.close) - 8}
                            width={CHART_PADDING.left - 5}
                            height={16}
                            fill="var(--accent, #00e5ff)"
                            rx={3}
                        />
                        <text
                            x={CHART_PADDING.left - 8}
                            y={yScale(hoveredCandle.close) + 3}
                            fill="#000"
                            fontSize={8}
                            fontWeight={700}
                            fontFamily="monospace"
                            textAnchor="end"
                        >
                            {formatPrice(hoveredCandle.close)}
                        </text>
                    </>
                )}
            </svg>

            {/* Tooltip overlay */}
            {hoverIndex !== null && hoveredCandle && (
                <div style={{
                    position: 'absolute',
                    top: CHART_PADDING.top + 5,
                    right: CHART_PADDING.right + 5,
                    background: 'rgba(20, 20, 40, 0.95)',
                    border: '1px solid var(--border, #333)',
                    borderRadius: 6,
                    padding: '0.5rem 0.7rem',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    pointerEvents: 'none',
                    zIndex: 10,
                    minWidth: 130,
                }}>
                    <div style={{ color: 'var(--muted, #888)', fontWeight: 600, marginBottom: '0.2rem' }}>
                        {selectedCoin} #{hoveredCandle.index}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.1rem 0.5rem' }}>
                        <span style={{ color: '#888' }}>O:</span>
                        <span>${hoveredCandle.open?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span style={{ color: '#888' }}>H:</span>
                        <span>${hoveredCandle.high?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span style={{ color: '#888' }}>L:</span>
                        <span>${hoveredCandle.low?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span style={{ color: '#888' }}>C:</span>
                        <span>${hoveredCandle.close?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{
                        borderTop: '1px solid #333',
                        marginTop: '0.2rem',
                        paddingTop: '0.2rem',
                        color: hoveredCandle.close >= hoveredCandle.open ? '#00e676' : '#ff1744',
                        fontWeight: 600,
                    }}>
                        {hoveredCandle.close >= hoveredCandle.open ? '▲' : '▼'}{' '}
                        {hoveredCandle.open ? ((hoveredCandle.close - hoveredCandle.open) / hoveredCandle.open * 100).toFixed(2) : 0}%
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Portfolio Tooltip ────────────────────────────────────────────────────── */

function PortfolioTooltip({ active, payload, startingCapital }) {
    if (!active || !payload?.length) return null;

    const userVal = payload.find(p => p.dataKey === 'user')?.value;
    const sageVal = payload.find(p => p.dataKey === 'sage')?.value;
    const diff = (userVal || 0) - (sageVal || 0);

    return (
        <div style={{
            background: 'var(--surface, #1a1a2e)',
            border: '1px solid var(--border, #333)',
            borderRadius: 'var(--radius-sm, 6px)',
            padding: '0.6rem 0.8rem',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono, monospace)',
        }}>
            <div style={{ color: 'var(--user-color, #00e5ff)' }}>
                YOU: ${userVal?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '—'}
            </div>
            <div style={{ color: 'var(--ai-color, #ff6f00)' }}>
                SAGE: ${sageVal?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '—'}
            </div>
            <div style={{
                color: diff >= 0 ? 'var(--success, #00e676)' : 'var(--danger, #ff1744)',
                borderTop: '1px solid var(--border, #333)',
                marginTop: '0.3rem',
                paddingTop: '0.3rem',
            }}>
                Diff: {diff >= 0 ? '+' : ''}{diff?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '—'}
            </div>
        </div>
    );
}

/* ── Main Component ───────────────────────────────────────────────────────── */

export default function PortfolioChart({
    userHistory,
    sageHistory,
    startingCapital,
    candlesSoFar,
    currentCandle,
    totalCandles,
}) {
    const [selectedCoin, setSelectedCoin] = useState('BTC');
    const [view, setView] = useState('candles');
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);

    // Measure container width
    useEffect(() => {
        if (!containerRef.current) return;
        const measure = () => {
            setContainerWidth(containerRef.current.offsetWidth);
        };
        measure();
        const obs = new ResizeObserver(measure);
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    // ── Candlestick data (120-candle sliding window) ──
    const candleData = useMemo(() => {
        if (!candlesSoFar || !candlesSoFar[selectedCoin]) return [];

        const rawCandles = candlesSoFar[selectedCoin];
        const start = Math.max(0, rawCandles.length - WINDOW_SIZE);
        const windowed = rawCandles.slice(start);

        return windowed.map((c, i) => {
            const [ts, open, high, low, close, volume] = c;
            return { index: start + i, time: ts, open, high, low, close, volume };
        });
    }, [candlesSoFar, selectedCoin]);

    // ── Portfolio value data ──
    const portfolioData = useMemo(() => {
        const uH = userHistory || [];
        const sH = sageHistory || [];
        const allTimes = new Set([...uH.map(p => p.time), ...sH.map(p => p.time)]);
        const sorted = [...allTimes].sort((a, b) => a - b);
        return sorted.map(t => {
            const uPoint = uH.find(p => Math.abs(p.time - t) < 2) || uH[uH.length - 1];
            const sPoint = sH.find(p => Math.abs(p.time - t) < 2) || sH[sH.length - 1];
            return {
                time: t,
                user: uPoint?.value || startingCapital,
                sage: sPoint?.value || startingCapital,
            };
        });
    }, [userHistory, sageHistory, startingCapital]);

    // ── Portfolio Y domain ──
    const portfolioDomain = useMemo(() => {
        if (!portfolioData.length) return [startingCapital * 0.99, startingCapital * 1.01];
        const allVals = portfolioData.flatMap(d => [d.user, d.sage]);
        const min = Math.min(...allVals, startingCapital) * 0.995;
        const max = Math.max(...allVals, startingCapital) * 1.005;
        return [min, max];
    }, [portfolioData, startingCapital]);

    const progressPct = totalCandles > 0 ? ((currentCandle || 0) / totalCandles) * 100 : 0;

    const formatPrice = (v) => {
        if (v >= 10000) return `$${(v / 1000).toFixed(1)}k`;
        if (v >= 1000) return `$${v.toFixed(0)}`;
        if (v >= 1) return `$${v.toFixed(2)}`;
        if (v >= 0.01) return `$${v.toFixed(3)}`;
        return `$${v.toFixed(5)}`;
    };

    // Current price
    const currentPrice = candleData.length > 0 ? candleData[candleData.length - 1] : null;
    const priceChange = currentPrice && candleData.length > 1
        ? ((currentPrice.close - candleData[0].open) / candleData[0].open * 100)
        : 0;
    const priceIsUp = priceChange >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{ marginBottom: '1rem' }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
            }}>
                <div>
                    <h3 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1rem',
                        letterSpacing: '0.1em',
                        color: 'var(--text-secondary)',
                        margin: 0,
                    }}>
                        {view === 'candles' ? `${selectedCoin} PRICE` : 'PORTFOLIO VALUE'}
                    </h3>
                    {view === 'candles' && currentPrice && (
                        <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '1.3rem',
                            fontWeight: 700,
                            color: 'var(--text)',
                            marginTop: '0.15rem',
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '0.5rem',
                        }}>
                            {formatPrice(currentPrice.close)}
                            <span style={{
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                color: priceIsUp ? '#00e676' : '#ff1744',
                            }}>
                                {priceIsUp ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
                            </span>
                        </div>
                    )}
                </div>

                <div style={{
                    display: 'flex',
                    background: 'var(--surface-alt, rgba(255,255,255,0.05))',
                    borderRadius: 'var(--radius-sm, 6px)',
                    padding: '2px',
                    gap: '2px',
                }}>
                    {['candles', 'portfolio'].map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            style={{
                                padding: '0.3rem 0.7rem',
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                fontFamily: 'var(--font-mono)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                border: 'none',
                                borderRadius: 'var(--radius-sm, 4px)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: v === view ? 'var(--accent, #00e5ff)' : 'transparent',
                                color: v === view ? 'var(--bg, #0a0a1a)' : 'var(--muted, #888)',
                            }}
                        >
                            {v === 'candles' ? '🕯 Candles' : '📊 Portfolio'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Coin selector tabs */}
            {view === 'candles' && (
                <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    {COINS.map(coin => (
                        <button
                            key={coin}
                            onClick={() => setSelectedCoin(coin)}
                            style={{
                                padding: '0.3rem 0.7rem',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                fontFamily: 'var(--font-mono)',
                                border: coin === selectedCoin
                                    ? '1px solid var(--accent, #00e5ff)'
                                    : '1px solid var(--border, #333)',
                                borderRadius: 'var(--radius-sm, 4px)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: coin === selectedCoin ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                                color: coin === selectedCoin ? 'var(--accent, #00e5ff)' : 'var(--muted, #888)',
                            }}
                        >
                            {coin}
                        </button>
                    ))}
                </div>
            )}

            {/* Chart area */}
            <div ref={containerRef}>
                {view === 'candles' ? (
                    <SVGCandlestickChart
                        data={candleData}
                        width={containerWidth}
                        formatPrice={formatPrice}
                        selectedCoin={selectedCoin}
                    />
                ) : (
                    <div style={{ width: '100%', height: CHART_HEIGHT }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={portfolioData}
                                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #333)" opacity={0.3} />
                                <XAxis
                                    dataKey="time"
                                    stroke="var(--muted, #888)"
                                    fontSize={10}
                                    fontFamily="var(--font-mono)"
                                    tick={{ fill: 'var(--muted, #888)' }}
                                    tickFormatter={() => ''}
                                />
                                <YAxis
                                    domain={portfolioDomain}
                                    tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                                    stroke="var(--muted, #888)"
                                    fontSize={10}
                                    fontFamily="var(--font-mono)"
                                    tick={{ fill: 'var(--muted, #888)' }}
                                    width={55}
                                />
                                <Tooltip content={<PortfolioTooltip startingCapital={startingCapital} />} />
                                <ReferenceLine
                                    y={startingCapital}
                                    stroke="var(--muted, #888)"
                                    strokeDasharray="6 4"
                                    strokeOpacity={0.5}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="user"
                                    stroke="var(--user-color, #00e5ff)"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, fill: 'var(--user-color, #00e5ff)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="sage"
                                    stroke="var(--ai-color, #ff6f00)"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, fill: 'var(--ai-color, #ff6f00)' }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1.5rem',
                marginTop: '0.4rem',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
            }}>
                {view === 'candles' ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <div style={{ width: 10, height: 10, background: '#00e676', borderRadius: 2 }} />
                            <span style={{ color: 'var(--muted, #888)' }}>Bullish</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <div style={{ width: 10, height: 10, background: '#ff1744', borderRadius: 2 }} />
                            <span style={{ color: 'var(--muted, #888)' }}>Bearish</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <div style={{ width: 12, height: 3, background: 'var(--user-color, #00e5ff)', borderRadius: 2 }} />
                            <span style={{ color: 'var(--user-color, #00e5ff)' }}>YOU</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <div style={{ width: 12, height: 3, background: 'var(--ai-color, #ff6f00)', borderRadius: 2 }} />
                            <span style={{ color: 'var(--ai-color, #ff6f00)' }}>SAGE</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <div style={{ width: 12, height: 3, borderTop: '2px dashed var(--muted, #888)' }} />
                            <span style={{ color: 'var(--muted, #888)' }}>START</span>
                        </div>
                    </>
                )}
            </div>

            {/* Progress Bar */}
            <div style={{
                marginTop: '0.75rem',
                paddingTop: '0.6rem',
                borderTop: '1px solid var(--border, #333)',
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.3rem',
                }}>
                    <span style={{
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--muted, #888)',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                    }}>
                        REPLAY PROGRESS
                    </span>
                    <span style={{
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-secondary, #ccc)',
                        fontWeight: 700,
                    }}>
                        Candle {currentCandle || 0}
                        <span style={{ color: 'var(--muted, #888)', fontWeight: 400 }}>
                            {' / '}{totalCandles || 1440}
                        </span>
                    </span>
                </div>
                <div style={{
                    width: '100%',
                    height: 4,
                    background: 'var(--surface-alt, rgba(255,255,255,0.06))',
                    borderRadius: 2,
                    overflow: 'hidden',
                }}>
                    <div style={{
                        width: `${Math.min(100, progressPct)}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--accent, #00e5ff), var(--accent-alt, #7c4dff))',
                        borderRadius: 2,
                        transition: 'width 0.3s ease-out',
                    }} />
                </div>
            </div>
        </motion.div>
    );
}
