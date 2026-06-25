'use client';
import { useEffect, useState } from 'react';

export default function PageLoader({ onLoadComplete }: { onLoadComplete: () => void }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Simulate loading time for the animation to play
    const timer = setTimeout(() => {
      setHidden(true);
      setTimeout(onLoadComplete, 500); // Wait for fade out
    }, 2500);

    return () => clearTimeout(timer);
  }, [onLoadComplete]);

  return (
    <div className={`truck-loader-overlay ${hidden ? 'hidden' : ''}`}>
      <div className="truck-container">
        <div className="truck">🚚</div>
        <div className="truck-smoke" style={{ animationDelay: '0s' }}>💨</div>
        <div className="truck-smoke" style={{ animationDelay: '0.4s' }}>💨</div>
        <div className="truck-smoke" style={{ animationDelay: '0.8s' }}>💨</div>
      </div>
      <div className="loader-text">Delivering Fresh Data...</div>
    </div>
  );
}
