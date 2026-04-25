// Web-only logo component (.web.js is loaded by Metro for web builds only).
// Uses HTML + SVG directly — the ClaspMark is the primary mark from the
// ServiGT Logo Exploration design file (Logo 04 · Stacked / Logo 08 · App Icons).
//
// Color system (from design file):
//   GT Blue  oklch(0.62 0.16 240) → #4589d4   Guatemalan sky blue
//   GT Deep  oklch(0.46 0.15 250) → #1b5499   depth / gradient stop
//   GT Soft  oklch(0.86 0.08 235) → #b3cfe8   subtle tint
//   Ink      #0e1424              → near-black for type
//   Paper    #f6f4ee              → warm off-white

import React from 'react';

export const GT = {
  blue: '#4589d4',
  deep: '#1b5499',
  soft: '#b3cfe8',
  ink:  '#0e1424',
  paper:'#f6f4ee',
};

// ── ClaspMark ──────────────────────────────────────────────────────────────
// Two interlocking C-hooks → worker ↔ client connection.
// Matches Logo04 (stacked) and Logo08 (app icons) from the design.
export function ClaspIcon({ size = 76, shape = 'squircle' }) {
  const radius = shape === 'round' ? '50%' : shape === 'square' ? '8%' : `${size * 0.22}px`;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(135deg, ${GT.blue} 0%, ${GT.deep} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '0 4px 16px rgba(14,20,36,0.22)',
      }}
    >
      {/* Subtle horizontal stripe — nod to Guatemala flag */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 2,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.14)',
        }}
      />
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 60 60"
        style={{ position: 'relative' }}
      >
        {/* Top C-hook (opens down-right) */}
        <path
          d="M 40 10 L 22 10 A 11 11 0 0 0 22 32 L 30 32"
          stroke={GT.paper}
          strokeWidth="6.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Bottom C-hook (opens up-left) */}
        <path
          d="M 20 50 L 38 50 A 11 11 0 0 0 38 28 L 30 28"
          stroke={GT.paper}
          strokeWidth="6.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

// ── Interlock mark (Logo 01) ───────────────────────────────────────────────
// Two arc segments — simpler, works well at very small sizes.
export function InterlockIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <path d="M 50 10 A 40 40 0 0 0 50 90 L 50 70 A 20 20 0 0 1 50 30 Z" fill={GT.blue} />
      <path d="M 50 10 A 40 40 0 0 1 50 90 L 50 70 A 20 20 0 0 0 50 30 Z" fill={GT.deep} />
      <circle cx="50" cy="50" r="6" fill={GT.paper} />
    </svg>
  );
}

// ── Full logo: icon + wordmark ─────────────────────────────────────────────
// `variant` controls which icon to use: 'clasp' (default) | 'interlock'
// `mode`: 'light' reverses text color for dark backgrounds
// `layout`: 'horizontal' (default) | 'stacked'
export default function ServiGTLogo({
  size = 26,
  mode = 'dark',
  variant = 'clasp',
  layout = 'horizontal',
}) {
  const light = mode === 'light';
  const iconSize = size * 1.55;
  const gap = size * 0.42;

  const Icon =
    variant === 'interlock' ? (
      <InterlockIcon size={iconSize} />
    ) : (
      <ClaspIcon size={iconSize} />
    );

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: layout === 'stacked' ? 'column' : 'row',
        alignItems: 'center',
        gap,
      }}
    >
      {Icon}
      <span
        style={{
          fontSize: size,
          fontWeight: 700,
          color: light ? GT.paper : GT.ink,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          fontFamily: "'Sora', 'Geist', system-ui, sans-serif",
          whiteSpace: 'nowrap',
        }}
      >
        Servi
        <span style={{ color: GT.blue, fontWeight: 800 }}>GT</span>
      </span>
    </div>
  );
}

// ── Pill lockup (Logo 09) — great for navbars ─────────────────────────────
export function PillLogo({ size = 18, mode = 'dark' }) {
  const dark = mode === 'dark';
  const bg = dark ? GT.ink : GT.paper;
  const border = dark ? 'none' : `1.5px solid ${GT.ink}`;
  const textColor = dark ? GT.paper : GT.ink;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
        padding: `${size * 0.44}px ${size * 0.8}px ${size * 0.44}px ${size * 0.55}px`,
        background: bg,
        border,
        borderRadius: 999,
      }}
    >
      <div
        style={{
          width: size * 1.1,
          height: size * 1.1,
          borderRadius: '50%',
          background: GT.blue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: size * 0.4,
            height: size * 0.4,
            background: GT.paper,
            borderRadius: '50%',
          }}
        />
      </div>
      <span
        style={{
          fontSize: size,
          fontWeight: 600,
          color: textColor,
          letterSpacing: '-0.02em',
          fontFamily: "'Sora', 'Geist', system-ui, sans-serif",
          whiteSpace: 'nowrap',
        }}
      >
        Servi<span style={{ color: GT.blue }}>GT</span>
      </span>
    </div>
  );
}
