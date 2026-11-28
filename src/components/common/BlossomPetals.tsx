'use client';

import React, { useMemo } from 'react';

interface PetalConfig {
  id: number;
  leftPercent: number;
  size: number;
  fallDuration: number;
  fallDelay: number;
  swayDuration: number;
  swayDistance: number;
  flipDuration: number;
  rotDir: 1 | -1;
  opacity: number;
  variant: 'rose' | 'blush' | 'peach' | 'cream';
  shapeIndex: number;
}

const PETAL_GRADIENTS = {
  rose: { start: '#F48FB1', mid: '#F06292', end: '#EC407A' },
  blush: { start: '#FCE4EC', mid: '#F8BBD0', end: '#F48FB1' },
  peach: { start: '#FFCCBC', mid: '#FFAB91', end: '#FF8A65' },
  cream: { start: '#FFF8F0', mid: '#FFE4E1', end: '#FADADD' },
};

const PETAL_PATHS = [
  'M 12 2 C 18 4, 22 10, 20 18 C 18 24, 14 28, 12 29 C 10 28, 6 24, 4 18 C 2 10, 6 4, 12 2 Z',
  'M 12 1 C 19 5, 23 13, 19 21 C 16 26, 13 28, 12 29 C 11 28, 7 25, 5 19 C 3 12, 6 4, 12 1 Z',
  'M 12 2 C 15 0, 21 5, 21 12 C 21 19, 16 26, 12 29 C 8 26, 3 19, 3 12 C 3 5, 9 0, 12 2 Z',
];

function seededValue(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export const BlossomPetals: React.FC = () => {
  const petals: PetalConfig[] = useMemo(() => {
    const count = 26;
    const variants: Array<PetalConfig['variant']> = ['blush', 'rose', 'cream', 'peach'];

    return Array.from({ length: count }).map((_, i) => {
      const r1 = seededValue(i, 1);
      const r2 = seededValue(i, 2);
      const r3 = seededValue(i, 3);
      const r4 = seededValue(i, 4);
      const r5 = seededValue(i, 5);
      const r6 = seededValue(i, 6);

      return {
        id: i,
        leftPercent: Math.round((i / count) * 96 + r1 * 6),
        size: Math.round(13 + r2 * 14),
        fallDuration: Number((10 + r3 * 9).toFixed(2)),
        fallDelay: Number((-1 * r4 * 16).toFixed(2)),
        swayDuration: Number((3.2 + r5 * 2.8).toFixed(2)),
        swayDistance: Math.round((r1 > 0.5 ? 1 : -1) * (24 + r6 * 34)),
        flipDuration: Number((4 + r2 * 4).toFixed(2)),
        rotDir: r5 > 0.5 ? 1 : -1,
        opacity: Number((0.45 + r3 * 0.35).toFixed(2)),
        variant: variants[i % variants.length],
        shapeIndex: i % PETAL_PATHS.length,
      };
    });
  }, []);

  return (
    <div className="blossom-petals-layer" aria-hidden="true">
      {petals.map((p) => {
        const gradId = `ct-petal-grad-${p.id}`;
        const colors = PETAL_GRADIENTS[p.variant];
        return (
          <div
            key={p.id}
            className="blossom-petal-item"
            style={
              {
                left: `${p.leftPercent}%`,
                width: `${p.size}px`,
                height: `${p.size * 1.2}px`,
                animationDuration: `${p.fallDuration}s`,
                animationDelay: `${p.fallDelay}s`,
                '--petal-opacity': p.opacity,
              } as React.CSSProperties
            }
          >
            <div
              className="blossom-petal-sway"
              style={
                {
                  animationDuration: `${p.swayDuration}s`,
                  '--sway-distance': `${p.swayDistance}px`,
                } as React.CSSProperties
              }
            >
              <div
                className="blossom-petal-flip"
                style={
                  {
                    animationDuration: `${p.flipDuration}s`,
                    '--rot-dir': p.rotDir,
                  } as React.CSSProperties
                }
              >
                <svg viewBox="0 0 24 30" className="w-full h-full drop-shadow-2xs">
                  <defs>
                    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={colors.start} />
                      <stop offset="55%" stopColor={colors.mid} />
                      <stop offset="100%" stopColor={colors.end} />
                    </linearGradient>
                  </defs>
                  <path d={PETAL_PATHS[p.shapeIndex]} fill={`url(#${gradId})`} />
                </svg>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

