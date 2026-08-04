// Mobile UI primitives for ServiGT (iOS-style)
// Reuses SGT tokens, Icon, Stars, StatusChip, Avatar, CatIcon from ui.jsx + data.jsx.

// Mobile App Bar — compact header with back, title, trailing icons
const MAppBar = ({ title, onBack, trailing, large = false, transparent = false, dark }) => (
  <div style={{
    position: 'sticky', top: 0, zIndex: 30,
    background: transparent ? 'transparent' : 'var(--sgt-card-bg, #fff)',
    borderBottom: transparent ? 'none' : '1px solid var(--sgt-border, #eef0f4)',
    paddingTop: 8,
  }}>
    <div style={{
      height: 52, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
    }}>
      {onBack !== undefined && (
        <button onClick={onBack} style={mIconBtn()}>
          <Icon name="ChevronLeft" size={22} color="var(--sgt-text, #1f2937)" />
        </button>
      )}
      {!large && (
        <div style={{
          flex: 1, fontSize: 17, fontWeight: 700, color: 'var(--sgt-text, #1f2937)',
          textAlign: onBack !== undefined ? 'center' : 'left',
          paddingLeft: onBack !== undefined ? 0 : 4,
        }}>{title}</div>
      )}
      {large && <div style={{ flex: 1 }} />}
      <div style={{ display: 'flex', gap: 4 }}>{trailing}</div>
    </div>
    {large && (
      <div style={{
        padding: '4px 16px 14px', fontSize: 28, fontWeight: 800,
        color: 'var(--sgt-text, #1f2937)', letterSpacing: '-0.02em',
      }}>{title}</div>
    )}
  </div>
);

const mIconBtn = () => ({
  width: 36, height: 36, borderRadius: 10,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none', cursor: 'pointer',
});

// Mobile bottom tab bar (5 tabs, glass-ish)
const MTabBar = ({ tabs, current, onChange }) => (
  <div style={{
    position: 'sticky', bottom: 0, zIndex: 30,
    background: 'var(--sgt-card-bg, rgba(255,255,255,.96))',
    backdropFilter: 'blur(12px)',
    borderTop: '1px solid var(--sgt-border, #eef0f4)',
    paddingBottom: 22, // home-indicator clearance
  }}>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, height: 54 }}>
      {tabs.map(t => {
        const active = current === t.id;
        return (
          <button key={t.id} onClick={() => onChange?.(t.id)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2, position: 'relative',
          }}>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <Icon name={t.icon} size={22} color={active ? SGT.blue : 'var(--sgt-text-sub, #98a2b3)'} strokeWidth={active ? 2.4 : 2} />
              {t.badge ? (
                <span style={{
                  position: 'absolute', top: -3, right: -8,
                  minWidth: 16, height: 16, padding: '0 4px',
                  background: SGT.error, color: 'white', fontSize: 10, fontWeight: 700,
                  borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 2px var(--sgt-card-bg, white)',
                }}>{t.badge}</span>
              ) : null}
            </span>
            <span style={{
              fontSize: 10.5, fontWeight: active ? 700 : 500,
              color: active ? SGT.blue : 'var(--sgt-text-sub, #98a2b3)',
            }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  </div>
);

// Container for a screen body that scrolls between AppBar + TabBar
const MScreen = ({ children, style, bg }) => (
  <div style={{
    flex: 1, minHeight: 0, overflow: 'auto',
    background: bg || 'var(--sgt-bg, #f5f7fb)',
    ...style,
  }}>
    {children}
  </div>
);

// MFrame — full mobile-screen wrapper that lays out AppBar + Body + TabBar
const MFrame = ({ appBar, tabBar, children, bg, dark }) => (
  <div data-sgt-frame style={{
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    background: bg || 'var(--sgt-bg, #f5f7fb)',
    color: 'var(--sgt-text, #1f2937)',
    fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14,
  }}>
    {appBar}
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
    {tabBar}
  </div>
);

// Mobile button — full-width primary, etc. (re-exports Button styling but enforces 48-52 height)
const MButton = ({ kind = 'primary', size = 'md', icon, iconRight, children, onClick, full = true, disabled, style }) => {
  const h = size === 'sm' ? 38 : size === 'lg' ? 54 : 48;
  const fz = size === 'sm' ? 13 : 15;
  const styles = {
    primary:  { background: SGT.blue, color: 'white', border: 'none' },
    secondary:{ background: 'var(--sgt-card-bg, #fff)', color: SGT.blueText, border: '1.5px solid var(--sgt-soft, ' + SGT.soft + ')' },
    ghost:    { background: 'var(--sgt-card-bg, #fff)', color: 'var(--sgt-text, #1f2937)', border: '1px solid var(--sgt-border, #eef0f4)' },
    danger:   { background: SGT.error, color: 'white', border: 'none' },
    success:  { background: SGT.success, color: 'white', border: 'none' },
    glass:    { background: 'rgba(255,255,255,.18)', color: 'white', border: '1px solid rgba(255,255,255,.32)', backdropFilter: 'blur(8px)' },
    dark:     { background: SGT.blueDark, color: 'white', border: 'none' },
  }[kind];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      height: h, padding: '0 18px', fontSize: fz, fontWeight: 600,
      borderRadius: 14, cursor: disabled ? 'not-allowed' : 'pointer',
      width: full ? '100%' : 'auto', opacity: disabled ? 0.55 : 1,
      transition: 'transform .08s, filter .12s', whiteSpace: 'nowrap',
      boxShadow: kind === 'primary' ? '0 6px 16px rgba(26,115,232,.32)' : 'none',
      ...styles, ...style,
    }}
    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
    onMouseUp={e => e.currentTarget.style.transform = ''}
    onMouseLeave={e => e.currentTarget.style.transform = ''}>
      {icon && <Icon name={icon} size={18} color="currentColor" />}
      {children}
      {iconRight && <Icon name={iconRight} size={18} color="currentColor" />}
    </button>
  );
};

// Mobile input — slightly bigger touch target
const MInput = ({ icon, value, onChange, placeholder, type = 'text', style, rightSlot, error }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    height: 50, padding: '0 14px',
    background: 'var(--sgt-input-bg, white)',
    color: 'var(--sgt-text, #1f2937)',
    border: `1px solid ${error ? SGT.error : 'var(--sgt-border, #e5e7eb)'}`,
    borderRadius: 14, ...style,
  }}>
    {icon && <Icon name={icon} size={18} color="var(--sgt-text-sub, #667085)" />}
    <input value={value} onChange={onChange} placeholder={placeholder} type={type}
      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent',
               fontSize: 15, color: 'inherit', fontFamily: 'inherit', minWidth: 0 }} />
    {rightSlot}
  </div>
);

// Mobile list row (iOS-style)
const MListRow = ({ icon, leading, title, subtitle, trailing, chevron = true, onClick, last, dense }) => (
  <button onClick={onClick} style={{
    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
    padding: dense ? '10px 16px' : '14px 16px', background: 'transparent', border: 'none',
    cursor: onClick ? 'pointer' : 'default',
    borderBottom: last ? 'none' : '1px solid var(--sgt-border, #eef0f4)',
    textAlign: 'left',
  }}>
    {leading || (icon && (
      <span style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'var(--sgt-tint, ' + SGT.skyLight + ')', color: SGT.blueText,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={icon} size={18} color="currentColor" />
      </span>
    ))}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--sgt-text, #1f2937)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12.5, color: 'var(--sgt-text-sub, #667085)', marginTop: 2 }}>{subtitle}</div>}
    </div>
    {trailing}
    {chevron && (
      <Icon name="ChevronRight" size={18} color="var(--sgt-text-sub, #98a2b3)" />
    )}
  </button>
);

// Mobile card (rounded 16, no border by default)
const MCard = ({ children, style, padding = 16, onClick }) => (
  <div onClick={onClick} style={{
    background: 'var(--sgt-card-bg, white)',
    borderRadius: 16,
    boxShadow: '0 1px 2px rgba(16,24,40,.04)',
    padding,
    color: 'var(--sgt-text, #1f2937)',
    cursor: onClick ? 'pointer' : 'default',
    border: '1px solid var(--sgt-border, #eef0f4)',
    ...style,
  }}>
    {children}
  </div>
);

// Premium badge (móvil) — misma API que en ui.jsx, tamaños táctiles.
// Se define aquí porque mobile-ui.jsx se carga después y esta versión gana en la app.
const M_GOLD_GRAD = 'linear-gradient(135deg,#a86a06 0%,#c2810b 45%,#e0a83a 100%)';
const PremiumBadge = ({ size = 12, variant = 'inline', label = 'Premium' }) => {
  if (variant === 'icon') return (
    <span title="Premium" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size + 8, height: size + 8, borderRadius: 999,
      background: M_GOLD_GRAD, color: '#fff', flex: 'none',
    }}><Icon name="Crown" size={size} color="#fff" strokeWidth={2.5} /></span>
  );
  const hero = variant === 'hero';
  return (
    <span title="Suscripción Premium vigente" style={{
      display: 'inline-flex', alignItems: 'center', gap: hero ? 7 : 5,
      background: M_GOLD_GRAD, color: '#fff',
      fontSize: hero ? 13.5 : 11, fontWeight: 700,
      padding: hero ? '7px 14px' : '3px 8px', borderRadius: 999,
      lineHeight: 1.2, whiteSpace: 'nowrap', flex: 'none',
      boxShadow: hero ? '0 3px 10px rgba(168,106,6,.38)' : 'none',
    }}><Icon name="Crown" size={hero ? 15 : 11} color="#fff" strokeWidth={2.4} />{label}</span>
  );
};

// Bottom sheet handle
const MSheetHandle = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
    <div style={{ width: 38, height: 4, borderRadius: 2, background: '#d0d5dd' }} />
  </div>
);

// Section title in mobile (smaller than desktop)
const MSectionTitle = ({ children, action, padding = '0 16px' }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding, marginBottom: 10 }}>
    <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--sgt-text, #1f2937)', margin: 0, letterSpacing: '-0.01em' }}>{children}</h2>
    {action}
  </div>
);

// Segmented control (iOS-style)
const MSegment = ({ items, value, onChange }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`,
    background: 'rgba(120,120,128,.12)', borderRadius: 10, padding: 2, gap: 2,
  }}>
    {items.map(it => {
      const active = value === it.id;
      return (
        <button key={it.id} onClick={() => onChange(it.id)} style={{
          height: 32, fontSize: 13, fontWeight: active ? 600 : 500,
          background: active ? 'var(--sgt-card-bg, #fff)' : 'transparent',
          color: active ? 'var(--sgt-text, #1f2937)' : 'var(--sgt-text-sub, #667085)',
          border: 'none', borderRadius: 8, cursor: 'pointer',
          boxShadow: active ? '0 1px 2px rgba(16,24,40,.08)' : 'none',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          {it.icon && <Icon name={it.icon} size={14} color="currentColor" />}
          {it.label}
        </button>
      );
    })}
  </div>
);

// Chip / filter pill (mobile)
const MChip = ({ children, active, onClick, icon }) => (
  <button onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px',
    background: active ? SGT.blue : 'var(--sgt-card-bg, white)',
    color: active ? 'white' : 'var(--sgt-text, #1f2937)',
    border: `1px solid ${active ? SGT.blue : 'var(--sgt-border, #e5e7eb)'}`,
    borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  }}>
    {icon && <Icon name={icon} size={14} color="currentColor" />}
    {children}
  </button>
);

// Status pill (re-uses StatusChip but smaller for mobile)
// (We just use StatusChip directly when needed.)

Object.assign(window, {
  MAppBar, MTabBar, MFrame, MScreen, MButton, MInput, MListRow, MCard,
  MSheetHandle, MSectionTitle, MSegment, MChip, PremiumBadge, M_GOLD_GRAD,
});
