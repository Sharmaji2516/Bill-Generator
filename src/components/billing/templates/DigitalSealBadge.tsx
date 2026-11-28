'use client';

import React from 'react';
import { DigitalSealConfig } from '@/types';

interface DigitalSealBadgeProps {
  seal?: DigitalSealConfig;
  businessName: string;
  compact?: boolean;
}

const SEAL_PALETTE: Record<
  DigitalSealConfig['style'],
  { border: string; text: string; bg: string }
> = {
  teal: { border: '#0f766e', text: '#0f766e', bg: '#f0fdfa' },
  green: { border: '#15803d', text: '#15803d', bg: '#f0fdf4' },
  blue: { border: '#1d4ed8', text: '#1d4ed8', bg: '#eff6ff' },
  charcoal: { border: '#334155', text: '#1e293b', bg: '#f8fafc' },
  red: { border: '#b91c1c', text: '#b91c1c', bg: '#fef2f2' },
};

export const DigitalSealBadge: React.FC<DigitalSealBadgeProps> = ({
  seal,
  businessName,
  compact = false,
}) => {
  if (!seal || !seal.enabled) return null;
  const palette = SEAL_PALETTE[seal.style || 'teal'] || SEAL_PALETTE.teal;

  return (
    <div
      className={`inline-flex flex-col items-center justify-center rounded-xl border-2 text-center select-none ${
        compact ? 'px-3 py-1.5 min-w-[145px]' : 'px-4 py-2.5 min-w-[170px]'
      }`}
      style={{
        borderColor: palette.border,
        color: palette.text,
        backgroundColor: palette.bg,
        borderStyle: 'double',
      }}
    >
      <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em]">
        <span>★</span>
        <span>{seal.statusText || 'DIGITALLY VERIFIED'}</span>
        <span>★</span>
      </div>
      <div className="my-0.5 h-px w-full opacity-35" style={{ backgroundColor: palette.border }} />
      <div className="text-[10px] font-bold tracking-tight truncate max-w-[165px]">
        {businessName}
      </div>
      <div className="text-[8.5px] font-mono opacity-85 mt-0.5">
        {seal.verificationId || 'VERIFIED-DOC'}
      </div>
      {seal.timestampText && (
        <div className="text-[8px] opacity-75">{seal.timestampText}</div>
      )}
    </div>
  );
};

