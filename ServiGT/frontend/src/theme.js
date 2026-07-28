// ServiGT Design Tokens — from Logo Exploration design file
// Use these constants in every screen for visual consistency.
export const T = {
  // ── Brand colors ──────────────────────────────────────────
  blue:   '#4589d4',   // GT Blue  (oklch 0.62 0.16 240) — Guatemalan sky blue
  deep:   '#1b5499',   // GT Deep  (oklch 0.46 0.15 250) — gradient / depth
  soft:   '#b3cfe8',   // GT Soft  (oklch 0.86 0.08 235) — light badge tint

  // ── Neutral surfaces ──────────────────────────────────────
  ink:    '#0e1424',   // Near-black for headings and UI chrome
  paper:  '#f6f4ee',   // Warm off-white card / panel surface
  canvas: '#f0eee9',   // Warm gray page background
  white:  '#ffffff',   // Pure white — inputs, high-contrast overlays

  // ── Typography ────────────────────────────────────────────
  text:   '#0e1424',   // Primary body text
  muted:  '#667085',   // Secondary / supporting text
  faint:  '#9aa3af',   // Placeholder, disabled

  // ── Semantic ─────────────────────────────────────────────
  success: '#16a34a',
  danger:  '#be123c',
  warn:    '#b45309',
  amber:   '#f59e0b',  // Star ratings

  // ── UI chrome ────────────────────────────────────────────
  border:  'rgba(14,20,36,0.09)',
  inputBg: '#f9f8f5',
  inputBorder: '#d9e2ef',

  // ── Espaciado ────────────────────────────────────────────
  s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24,

  // ── Radii ────────────────────────────────────────────────
  rSm: 8, rMd: 12, rLg: 16,

  // ── Sombras en formato RN ────────────────────────────────
  sh1: {
    shadowColor: '#0f1a2e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sh2: {
    shadowColor: '#0f1a2e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  sh3: {
    shadowColor: '#0f1a2e',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.10,
    shadowRadius: 32,
    elevation: 6,
  },

  // ── Component patterns ───────────────────────────────────────────────────
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(14,20,36,0.09)',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0e1424',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(14,20,36,0.09)',
    backgroundColor: '#ffffff',
  },
  primaryButton: {
    backgroundColor: '#4589d4',
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
};

export default T;
