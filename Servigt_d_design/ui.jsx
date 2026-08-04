// Shared UI primitives + theme tokens for ServiGT screens.
// Each screen renders inside an artboard; we provide a `<SgtFrame mode="public|client|provider|admin">`
// that includes a sticky header + (optional) sidebar.

const SGT = {
  // Marca (v2 — alineada al logo en producción)
  blue:       '#4589d4',
  blueDark:   '#1b5499',   // degradados, hover, rellenos oscuros
  blueText:   'var(--sgt-blue-text, #1b5499)', // azul para TEXTO sobre superficie (flipea en oscuro)
  soft:       '#b3cfe8',
  sky:        '#7db2e4',
  skyLight:   'var(--sgt-tint, #e6effa)',
  // Superficies (cálidas)
  ink:        '#0e1424',
  white:      '#ffffff',
  paper:      '#f6f4ee',
  canvas:     '#f0eee9',
  bg:         '#f0eee9',
  // Texto
  text:       '#0e1424',
  textSub:    '#667085',
  muted:      '#667085',
  faint:      '#9aa3af',
  // Semánticos
  success:    '#16a34a',
  warn:       '#b45309',
  amber:      '#f59e0b',
  danger:     '#be123c',
  error:      '#be123c',
  // Chrome
  border:     'rgba(14,20,36,0.09)',
  borderSoft: 'rgba(14,20,36,0.06)',
  inputBg:    '#f9f8f5',
  inputBorder:'#d9e2ef',
};

// ── Lucide icon helper ─────────────────────────────────────────────
// Loads from window.lucide (UMD). Falls back to a tiny square if missing.
const Icon = ({ name, size = 18, color = 'currentColor', strokeWidth = 2, style }) => {
  const node = window.lucide?.icons?.[name] || window.lucide?.[name];
  if (!node || !node.toSvg) {
    // Try the createElement variant (newer lucide UMD)
    const create = window.lucide?.createIcons;
    return <span style={{ display: 'inline-block', width: size, height: size, ...style }} />;
  }
  const svg = node.toSvg({ width: size, height: size, stroke: color, 'stroke-width': strokeWidth });
  return <span style={{ display: 'inline-flex', verticalAlign: 'middle', ...style }}
                dangerouslySetInnerHTML={{ __html: svg }} />;
};

// Stars row (fractional supported via floor)
const Stars = ({ value = 0, size = 14, color = '#f59e0b' }) => {
  const full = Math.round(value);
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[0,1,2,3,4].map(i =>
        <Icon key={i} name="Star" size={size} color={i < full ? color : 'var(--sgt-star-off, #dcd9d2)'} strokeWidth={2}
              style={{ color: i < full ? color : 'var(--sgt-star-off, #dcd9d2)' }} />)}
    </span>
  );
};

// Status chip — kind: servicio | pedido | cotizacion | urgencia | credito
// Servicio/pedido = relleno + dot sólido. Cotización = contorno + dot hueco.
const StatusChip = ({ status, kind = 'servicio', size = 'md', label }) => {
  const s = sgtStatus(status, kind);
  const padY = size === 'sm' ? 2 : 4;
  const padX = size === 'sm' ? 8 : 10;
  const fz = size === 'sm' ? 11 : 12;
  const v = (p, fb) => s.unknown ? fb : `var(--sgt-st-${p}-${kind}-${status}, ${fb})`;
  return (
    <span data-sgt-status={kind + ':' + status} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: v('bg', s.bg), color: v('fg', s.fg),
      fontWeight: 600, fontSize: fz,
      padding: `${padY}px ${padX}px`, borderRadius: 999, lineHeight: 1.2,
      boxShadow: s.outline ? `inset 0 0 0 1.5px ${v('dot', s.dot)}` : 'none',
      outline: s.unknown ? '1.5px dashed var(--sgt-faint, #9aa3af)' : 'none', outlineOffset: -1,
      fontFamily: s.unknown ? 'ui-monospace, Menlo, monospace' : 'inherit',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 999, flex: 'none',
        display: s.nodot ? 'none' : 'block',
        background: s.outline ? 'transparent' : v('dot', s.dot),
        boxShadow: s.outline ? 'inset 0 0 0 2px currentColor' : 'none',
      }} />
      {label || s.label}
    </span>
  );
};

// Verified badge
const VerifiedBadge = ({ size = 14 }) => (
  <span title="Verificado" style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: size + 8, height: size + 8, borderRadius: 999,
    background: SGT.sky, color: 'white',
  }}>
    <Icon name="ShieldCheck" size={size} color="white" strokeWidth={2.5} />
  </span>
);

// Premium badge — dorado + corona. Distinto de VerifiedBadge (azul + escudo):
// verificado = documentos comprobados; premium = suscripción vigente.
// Un proveedor puede tener una, otra, ambas o ninguna.
const SGT_GOLD_GRAD = 'linear-gradient(135deg,#a86a06 0%,#c2810b 45%,#e0a83a 100%)';
const PremiumBadge = ({ size = 12, variant = 'inline', label = 'Premium' }) => {
  if (variant === 'icon') return (
    <span title="Premium" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size + 8, height: size + 8, borderRadius: 999,
      background: SGT_GOLD_GRAD, color: '#fff', flex: 'none',
    }}>
      <Icon name="Crown" size={size} color="#fff" strokeWidth={2.5} />
    </span>
  );
  const hero = variant === 'hero';
  return (
    <span title="Suscripción Premium vigente" style={{
      display: 'inline-flex', alignItems: 'center', gap: hero ? 7 : 5,
      background: SGT_GOLD_GRAD, color: '#fff',
      fontSize: hero ? 13 : 11, fontWeight: 700,
      letterSpacing: hero ? '.02em' : '.03em',
      padding: hero ? '6px 13px' : '3px 8px', borderRadius: 999,
      lineHeight: 1.2, whiteSpace: 'nowrap', flex: 'none',
      boxShadow: hero ? '0 2px 8px rgba(168,106,6,.35)' : 'none',
    }}>
      <Icon name="Crown" size={hero ? 15 : 11} color="#fff" strokeWidth={2.4} />{label}
    </span>
  );
};

// Category icon chip
const CatIcon = ({ catId, size = 40 }) => {
  const cat = SGT_CATEGORIES.find(c => c.id === catId) || SGT_CATEGORIES[0];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: size * 0.28,
      background: cat.color + '18', color: cat.color, flexShrink: 0,
    }}>
      <Icon name={cat.icon} size={size * 0.5} color={cat.color} strokeWidth={2} />
    </span>
  );
};

// Avatar
const Avatar = ({ idx = 0, size = 40, ring, online }) => (
  <span style={{ position: 'relative', display: 'inline-block', width: size, height: size, flexShrink: 0 }}>
    <img src={sgtFace(idx, size * 2)} alt=""
         style={{
           width: size, height: size, borderRadius: 999, objectFit: 'cover',
           boxShadow: ring ? `0 0 0 2px ${ring}, 0 0 0 4px ${SGT.white}` : 'none',
           background: '#eee',
         }} />
    {online && (
      <span style={{
        position: 'absolute', right: 0, bottom: 0,
        width: size * 0.28, height: size * 0.28, borderRadius: 999,
        background: SGT.success, boxShadow: `0 0 0 2px ${SGT.white}`,
      }} />
    )}
  </span>
);

// Button
const Button = ({ kind = 'primary', size = 'md', icon, iconRight, children, onClick, full, disabled, style }) => {
  const h = size === 'sm' ? 36 : size === 'lg' ? 48 : 44;
  const px = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;
  const fz = size === 'sm' ? 13 : 14;

  const styles = {
    primary:  { background: SGT.blue, color: 'white', border: '1px solid ' + SGT.blue },
    secondary:{ background: 'var(--sgt-card-bg, white)', color: SGT.blueText, border: '1.5px solid var(--sgt-soft, ' + SGT.soft + ')' },
    ghost:    { background: 'transparent', color: SGT.text, border: '1px solid ' + SGT.border },
    danger:   { background: SGT.error, color: 'white', border: '1px solid ' + SGT.error },
    success:  { background: SGT.success, color: 'white', border: '1px solid ' + SGT.success },
    dark:     { background: SGT.blueDark, color: 'white', border: '1px solid ' + SGT.blueDark },
  }[kind];

  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      height: h, padding: `0 ${px}px`, fontSize: fz, fontWeight: 600,
      borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer',
      width: full ? '100%' : 'auto', opacity: disabled ? 0.55 : 1,
      transition: 'transform .08s, box-shadow .12s, filter .12s',
      whiteSpace: 'nowrap', ...styles, ...style,
    }}
    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
    onMouseUp={e => e.currentTarget.style.transform = ''}
    onMouseLeave={e => e.currentTarget.style.transform = ''}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} color="currentColor" />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 14 : 16} color="currentColor" />}
    </button>
  );
};

// Input
const Input = ({ icon, value, onChange, placeholder, type = 'text', style, rightSlot, full = true, error }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    height: 44, padding: '0 14px',
    background: 'var(--sgt-input-bg, white)',
    color: 'var(--sgt-text, #1f2937)',
    border: `1px solid ${error ? SGT.error : 'var(--sgt-border, #e5e7eb)'}`,
    borderRadius: 12, width: full ? '100%' : 'auto', transition: 'border-color .12s, box-shadow .12s',
    ...style,
  }}
  onFocusCapture={e => e.currentTarget.style.boxShadow = `0 0 0 3px ${SGT.skyLight}`}
  onBlurCapture={e => e.currentTarget.style.boxShadow = 'none'}>
    {icon && <Icon name={icon} size={16} color="var(--sgt-text-sub, #667085)" />}
    <input
      value={value} onChange={onChange} placeholder={placeholder} type={type}
      style={{
        flex: 1, border: 'none', outline: 'none', background: 'transparent',
        fontSize: 14, color: 'inherit', fontFamily: 'inherit', minWidth: 0,
      }} />
    {rightSlot}
  </div>
);

// Card (rounded 12, subtle shadow)
const Card = ({ children, style, padding = 16, hoverable }) => (
  <div className={hoverable ? 'sgt-card-hover' : ''} style={{
    background: 'var(--sgt-card-bg, white)',
    border: `1px solid var(--sgt-border, ${SGT.borderSoft})`,
    borderRadius: 14,
    boxShadow: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.04)',
    padding,
    color: 'var(--sgt-text, #1f2937)',
    ...style,
  }}>
    {children}
  </div>
);

// KPI
const KPI = ({ label, value, delta, deltaPositive = true, icon, accent = SGT.blue }) => (
  <Card padding={18} style={{ minHeight: 98 }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sgt-text-sub, #667085)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--sgt-text, #1f2937)', marginTop: 6, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        {delta && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, fontWeight: 600,
                        color: deltaPositive ? SGT.success : SGT.error }}>
            <Icon name={deltaPositive ? 'TrendingUp' : 'TrendingDown'} size={14} color="currentColor" />
            {delta}
          </div>
        )}
      </div>
      {icon && (
        <span style={{
          width: 38, height: 38, borderRadius: 10,
          background: accent + '18', color: accent,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name={icon} size={18} color={accent} />
        </span>
      )}
    </div>
  </Card>
);

// ── Header (sticky, scoped to artboard) ────────────────────────────
const Header = ({ mode = 'public', notifCount = 3, dark, setDark, onNav, current }) => (
  <div style={{
    position: 'sticky', top: 0, zIndex: 20,
    height: 64, padding: '0 24px',
    display: 'flex', alignItems: 'center', gap: 18,
    background: 'var(--sgt-header-bg, rgba(255,255,255,.92))',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid var(--sgt-border, #eef0f4)',
  }}>
    {/* Logo */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <span style={{
        width: 32, height: 32, borderRadius: 9,
        background: `linear-gradient(135deg, ${SGT.blue}, ${SGT.sky})`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white',
        boxShadow: '0 2px 6px rgba(26,115,232,.35)',
      }}>
        <Icon name="Wrench" size={16} color="white" strokeWidth={2.5} />
      </span>
      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--sgt-text, #1f2937)', letterSpacing: '-0.01em' }}>
        Servi<span style={{ color: SGT.blue }}>GT</span>
      </span>
    </div>

    {/* Center: search or links */}
    {mode === 'public' ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginLeft: 16 }}>
        {['Inicio','Categorías','Cómo funciona','Para proveedores'].map(l =>
          <a key={l} style={{ fontSize: 14, fontWeight: 500, color: 'var(--sgt-text-sub, #667085)', cursor: 'pointer' }}>{l}</a>)}
      </div>
    ) : (
      <div style={{ flex: 1, maxWidth: 480, marginLeft: 8 }}>
        <Input icon="Search" placeholder="Buscar servicios, proveedores…" value="" onChange={() => {}} />
      </div>
    )}

    <div style={{ flex: 1 }} />

    {/* Right cluster */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button onClick={() => setDark && setDark(!dark)} title="Modo oscuro" style={iconBtn()}>
        <Icon name={dark ? 'Sun' : 'Moon'} size={18} color="var(--sgt-text, #1f2937)" />
      </button>
      <button title="Notificaciones" style={{ ...iconBtn(), position: 'relative' }}>
        <Icon name="Bell" size={18} color="var(--sgt-text, #1f2937)" />
        {notifCount > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            minWidth: 16, height: 16, padding: '0 4px',
            background: SGT.error, color: 'white', fontSize: 10, fontWeight: 700,
            borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 2px var(--sgt-header-bg, white)',
          }}>{notifCount}</span>
        )}
      </button>
      {mode === 'public' ? (
        <>
          <Button kind="ghost" size="sm">Ingresar</Button>
          <Button kind="primary" size="sm">Registrarme</Button>
        </>
      ) : (
        <Avatar idx={9} size={36} />
      )}
    </div>
  </div>
);

const iconBtn = () => ({
  width: 38, height: 38, borderRadius: 10,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: '1px solid var(--sgt-border, #eef0f4)',
  cursor: 'pointer',
});

// Sidebar
const Sidebar = ({ items, current, onNav, footer }) => (
  <aside style={{
    width: 240, flexShrink: 0,
    borderRight: '1px solid var(--sgt-border, #eef0f4)',
    background: 'var(--sgt-card-bg, white)',
    padding: '20px 12px',
    display: 'flex', flexDirection: 'column', gap: 4,
  }}>
    {items.map(item => {
      const active = current === item.id;
      // item.proposed = sección propuesta, no existe todavía en el backend
      return (
        <button key={item.id} onClick={() => onNav?.(item.id)} title={item.proposed ? 'Propuesta — no existe en el producto actual' : undefined} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          width: '100%', height: 40, padding: '0 12px',
          background: active ? SGT.skyLight : 'transparent',
          color: active ? SGT.blueText : item.proposed ? 'var(--sgt-text-sub, #667085)' : 'var(--sgt-text, #1f2937)',
          border: item.proposed ? '1px dashed var(--sgt-border, #d9e2ef)' : 'none',
          borderRadius: 10, cursor: 'pointer',
          fontSize: 14, fontWeight: active ? 600 : 500, textAlign: 'left',
          transition: 'background .12s',
        }}>
          <Icon name={item.icon} size={18} color={active ? SGT.blue : 'var(--sgt-text-sub, #667085)'} />
          <span style={{ flex: 1, opacity: item.proposed ? .82 : 1 }}>{item.label}</span>
          {item.proposed && (
            <span style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase',
              padding: '2px 6px', borderRadius: 5,
              background: 'var(--sgt-input-bg, #f1f0ec)', color: 'var(--sgt-faint, #9aa3af)',
              border: '1px dashed var(--sgt-border, #d9e2ef)',
            }}>Futuro</span>
          )}
          {item.badge && !item.proposed && (
            <span style={{
              minWidth: 20, height: 20, padding: '0 6px',
              background: SGT.blue, color: 'white', fontSize: 11, fontWeight: 700,
              borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>{item.badge}</span>
          )}
        </button>
      );
    })}
    <div style={{ flex: 1 }} />
    {footer}
  </aside>
);

// Frame: header + (optional) sidebar + scrollable content
// Each artboard is fixed-size; content scrolls inside with hidden scrollbars
// (DCArtboardFrame already hides them, but we set overflow ourselves).
const SgtFrame = ({ mode, sidebar, current, dark, setDark, notifCount, onNav, children, padding = 28, contentBg }) => (
  <div data-sgt-frame style={{
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    background: contentBg || 'var(--sgt-bg, #f5f7fb)',
    color: 'var(--sgt-text, #1f2937)',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
  }}>
    <Header mode={mode} dark={dark} setDark={setDark} notifCount={notifCount}
            onNav={onNav} current={current} />
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      {sidebar && (
        <Sidebar items={sidebar} current={current} onNav={onNav} />
      )}
      <main style={{ flex: 1, overflow: 'auto', padding }}>
        {children}
      </main>
    </div>
  </div>
);

// Section title
const SectionTitle = ({ children, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--sgt-text, #1f2937)', margin: 0, letterSpacing: '-0.01em' }}>{children}</h2>
    {action}
  </div>
);

// Tabs (chips)
const Tabs = ({ items, value, onChange, size = 'md' }) => {
  const h = size === 'sm' ? 32 : 38;
  const fz = size === 'sm' ? 12 : 13;
  return (
    <div style={{ display: 'flex', gap: 6, padding: 4, background: 'var(--sgt-bg, #f5f7fb)', borderRadius: 10, alignSelf: 'flex-start', border: '1px solid var(--sgt-border, #eef0f4)' }}>
      {items.map(it => {
        const active = value === it.id;
        return (
          <button key={it.id} onClick={() => onChange(it.id)} style={{
            height: h, padding: '0 14px', fontSize: fz, fontWeight: 600,
            background: active ? 'var(--sgt-card-bg, white)' : 'transparent',
            color: active ? SGT.blueText : 'var(--sgt-text-sub, #667085)',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            boxShadow: active ? '0 1px 2px rgba(16,24,40,.06)' : 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            {it.icon && <Icon name={it.icon} size={14} color="currentColor" />}
            {it.label}
            {it.count != null && (
              <span style={{
                background: active ? SGT.skyLight : 'rgba(0,0,0,.06)',
                color: active ? SGT.blueText : 'var(--sgt-text-sub, #667085)',
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
              }}>{it.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// OSM iframe map (no key required)
const OsmMap = ({ bbox = '-90.55,14.55,-90.45,14.65', height = 200, marker = '14.6,-90.5', style }) => (
  <iframe
    title="map"
    src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`}
    style={{ width: '100%', height, border: 0, borderRadius: 12, ...style }}
    loading="lazy"
  />
);

// inject card hover style once
if (typeof document !== 'undefined' && !document.getElementById('sgt-shared-styles')) {
  const s = document.createElement('style');
  s.id = 'sgt-shared-styles';
  s.textContent = `
    .sgt-card-hover { transition: transform .15s, box-shadow .15s, border-color .15s; }
    .sgt-card-hover:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(14,20,36,.10); border-color: ${SGT.soft}; }
    [data-sgt-frame] *::selection { background: ${SGT.skyLight}; }
    [data-sgt-frame].sgt-dark { color-scheme: dark; }
    .sgt-grad { background: linear-gradient(135deg, ${SGT.blueDark} 0%, ${SGT.blue} 50%, ${SGT.sky} 100%); }
    @keyframes sgt-pulse { 0%,100% { opacity: 1 } 50% { opacity: .6 } }
    @keyframes sgt-typing { 0%,60%,100% { transform: translateY(0); opacity: .4 } 30% { transform: translateY(-3px); opacity: 1 } }
  `;
  document.head.appendChild(s);
}

// dark theme variables applied per artboard if dark=true
// Los estados se emiten como vars (--sgt-st-{bg|fg|dot}-{kind}-{status}) para que
// StatusChip no necesite saber si está en claro u oscuro.
const SGT_KIND_OF = { '': 'servicio', 'pedido_': 'pedido', 'cot_': 'cotizacion', 'urg_': 'urgencia', 'slot_': 'credito', 'tx_': 'transaccion', 'tag_': 'etiqueta', 'compra_': 'compra', 'prem_': 'premium' };
const sgtStatusVars = (dark) => {
  const out = {};
  for (const [key, s] of Object.entries(SGT_STATUS)) {
    const pre = Object.keys(SGT_KIND_OF).filter(p => p && key.startsWith(p)).sort((a, b) => b.length - a.length)[0] || '';
    const kind = SGT_KIND_OF[pre], status = key.slice(pre.length);
    const v = dark && s.d ? s.d : s;
    out[`--sgt-st-bg-${kind}-${status}`] = v.bg;
    out[`--sgt-st-fg-${kind}-${status}`] = v.fg;
    out[`--sgt-st-dot-${kind}-${status}`] = v.dot;
  }
  return out;
};

const applySgtTheme = (dark) => {
  if (!dark) {
    return {
      '--sgt-bg': '#f0eee9',
      '--sgt-card-bg': '#f6f4ee',
      '--sgt-header-bg': 'rgba(246,244,238,.92)',
      '--sgt-text': '#0e1424',
      '--sgt-text-sub': '#667085',
      '--sgt-faint': '#9aa3af',
      '--sgt-border': 'rgba(14,20,36,0.09)',
      '--sgt-input-bg': '#f9f8f5',
      '--sgt-input-border': '#d9e2ef',
      '--sgt-blue-text': '#1b5499',
      '--sgt-tint': '#e6effa',
      '--sgt-star-off': '#dcd9d2',
      '--sgt-soft': '#b3cfe8',
      '--sgt-elev': 'rgba(14,20,36,.08)',
      ...sgtStatusVars(false),
    };
  }
  return {
    '--sgt-bg': '#090d18',
    '--sgt-card-bg': '#151b2b',
    '--sgt-header-bg': 'rgba(21,27,43,.92)',
    '--sgt-text': '#eae7e0',
    '--sgt-text-sub': '#98a1b0',
    '--sgt-faint': '#6f7887',
    '--sgt-border': 'rgba(246,244,238,0.10)',
    '--sgt-input-bg': '#111726',
    '--sgt-input-border': '#24304a',
    '--sgt-blue-text': '#a8cbec',
    '--sgt-tint': 'rgba(69,137,212,.18)',
    '--sgt-star-off': 'rgba(246,244,238,.18)',
    '--sgt-soft': 'rgba(69,137,212,.38)',
    '--sgt-elev': 'rgba(0,0,0,.5)',
    ...sgtStatusVars(true),
  };
};

Object.assign(window, {
  SGT, Icon, Stars, StatusChip, VerifiedBadge, PremiumBadge, SGT_GOLD_GRAD, CatIcon, Avatar,
  Button, Input, Card, KPI, Header, Sidebar, SgtFrame, SectionTitle, Tabs, OsmMap,
  applySgtTheme,
});
