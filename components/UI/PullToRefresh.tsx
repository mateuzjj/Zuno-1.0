import React, { useState, useRef, useEffect } from 'react';
import { Zap } from 'lucide-react';
import './PullToRefresh.css';

interface PullToRefreshProps {
    onRefresh: () => Promise<void> | void;
    children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isReady, setIsReady] = useState(false);

    const startY = useRef(0);
    const currentY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const PULL_THRESHOLD = 80;
    const MAX_PULL = 120;

    useEffect(() => {
        // Prevent default pull-to-refresh behavior on mobile browsers
        const preventDefault = (e: TouchEvent) => {
            if (containerRef.current) {
                const scrollTop = containerRef.current.scrollTop;
                if (scrollTop === 0 && e.touches[0].clientY > startY.current) {
                    e.preventDefault();
                }
            }
        };

        document.addEventListener('touchmove', preventDefault, { passive: false });
        return () => document.removeEventListener('touchmove', preventDefault);
    }, []);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (isRefreshing) return;

        const scrollContainer = containerRef.current;
        if (!scrollContainer) return;

        // Only activate if at the top of the scroll
        if (scrollContainer.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isRefreshing) return;

        const scrollContainer = containerRef.current;
        if (!scrollContainer || scrollContainer.scrollTop !== 0) return;

        currentY.current = e.touches[0].clientY;
        const distance = currentY.current - startY.current;

        if (distance > 0) {
            // Apply resistance to pull distance
            const resistedDistance = Math.min(distance * 0.5, MAX_PULL);
            setPullDistance(resistedDistance);
            setIsReady(resistedDistance >= PULL_THRESHOLD);
        }
    };

    const handleTouchEnd = async () => {
        if (isRefreshing) return;

        if (pullDistance >= PULL_THRESHOLD) {
            setIsRefreshing(true);

            try {
                await onRefresh();
            } catch (error) {
                console.error('Refresh failed:', error);
            } finally {
                setTimeout(() => {
                    setIsRefreshing(false);
                    setPullDistance(0);
                    setIsReady(false);
                }, 500);
            }
        } else {
            setPullDistance(0);
            setIsReady(false);
        }
    };

    // Mouse events for desktop testing
    const handleMouseDown = (e: React.MouseEvent) => {
        if (isRefreshing) return;

        const scrollContainer = containerRef.current;
        if (!scrollContainer || scrollContainer.scrollTop !== 0) return;

        startY.current = e.clientY;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isRefreshing) return;

        const scrollContainer = containerRef.current;
        if (!scrollContainer || scrollContainer.scrollTop !== 0) return;

        currentY.current = e.clientY;
        const distance = currentY.current - startY.current;

        if (distance > 0) {
            const resistedDistance = Math.min(distance * 0.5, MAX_PULL);
            setPullDistance(resistedDistance);
            setIsReady(resistedDistance >= PULL_THRESHOLD);
        }
    };

    const handleMouseUp = async () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        await handleTouchEnd();
    };

    const indicatorOpacity = Math.min(pullDistance / PULL_THRESHOLD, 1);
    const indicatorScale = 0.5 + (pullDistance / MAX_PULL) * 0.5;

    return (
        <div
            ref={containerRef}
            className="pull-to-refresh-container"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
        >
            {/* Pull Indicator */}
            <div
                className="pull-indicator"
                style={{
                    opacity: indicatorOpacity,
                    transform: `translateX(-50%) translateY(${pullDistance}px)`,
                }}
            >
                <div className="lightning-container">
                    <Zap
                        size={40 * indicatorScale}
                        className={`lightning-bolt ${isReady ? 'ready' : ''} ${isRefreshing ? 'refreshing' : ''}`}
                        fill="#5B8CFF"
                        color="#5B8CFF"
                    />
                </div>
                {isReady && !isRefreshing && (
                    <span className="refresh-text">Solte para atualizar</span>
                )}
                {isRefreshing && (
                    <span className="refresh-text">Atualizando...</span>
                )}
            </div>

            {/* Content */}
            <div className="pull-to-refresh-content">
                {children}
            </div>
        </div>
    );
};
