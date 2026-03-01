import { useState, useEffect, useRef } from 'react';

/**
 * BreakingNewsBanner — full-width fixed banner that slides down from top
 * when a news event fires during the historical replay.
 *
 * Props:
 *   activeNewsEvent: { candle_index: number, headline: string } | null
 *
 * Behavior:
 *   - Watches for changes to activeNewsEvent
 *   - When it goes non-null (and is a new event), slides down from top
 *   - Stays visible for 8 seconds, then slides back up
 */
export default function BreakingNewsBanner({ activeNewsEvent }) {
    const [visible, setVisible] = useState(false);
    const [headline, setHeadline] = useState('');
    const lastEventRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!activeNewsEvent) return;

        // Only trigger if this is a genuinely new event
        const eventKey = `${activeNewsEvent.candle_index}-${activeNewsEvent.headline}`;
        if (eventKey === lastEventRef.current) return;
        lastEventRef.current = eventKey;

        // Clear any existing timer
        if (timerRef.current) clearTimeout(timerRef.current);

        // Show the banner
        setHeadline(activeNewsEvent.headline);
        setVisible(true);

        // Auto-hide after 8 seconds
        timerRef.current = setTimeout(() => {
            setVisible(false);
        }, 8000);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [activeNewsEvent]);

    return (
        <>
            <div
                className="breaking-news-banner"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    transform: visible ? 'translateY(0)' : 'translateY(-100%)',
                    transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: 'linear-gradient(135deg, #ff1744 0%, #d50000 50%, #ff1744 100%)',
                    backgroundSize: '200% 200%',
                    animation: visible ? 'newsGradientShift 3s ease infinite' : 'none',
                    color: '#fff',
                    padding: '0.75rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: visible
                        ? '0 4px 20px rgba(255, 23, 68, 0.5), 0 0 40px rgba(255, 23, 68, 0.2)'
                        : 'none',
                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                }}
            >
                {/* Pulsing news icon */}
                <span
                    style={{
                        fontSize: '1.3rem',
                        animation: visible ? 'newsPulse 1s ease-in-out infinite' : 'none',
                        flexShrink: 0,
                    }}
                >
                    📡
                </span>

                {/* "BREAKING" badge */}
                <span
                    style={{
                        background: 'rgba(0,0,0,0.3)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                        border: '1px solid rgba(255,255,255,0.2)',
                    }}
                >
                    BREAKING
                </span>

                {/* Headline text */}
                <span
                    style={{
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        letterSpacing: '0.02em',
                        textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        flex: 1,
                    }}
                >
                    {headline}
                </span>

                {/* Dismiss button */}
                <button
                    onClick={() => setVisible(false)}
                    style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => (e.target.style.background = 'rgba(255,255,255,0.3)')}
                    onMouseLeave={(e) => (e.target.style.background = 'rgba(255,255,255,0.15)')}
                    aria-label="Dismiss"
                >
                    ✕
                </button>
            </div>

            {/* Keyframe animations */}
            <style>{`
        @keyframes newsPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        @keyframes newsGradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
        </>
    );
}
