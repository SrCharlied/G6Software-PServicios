// Marketplace de demanda — móvil. Reusa SGT_*, StatusChip, M* de mobile-ui.jsx.
// Tab bars: cliente (botón central Publicar) y proveedor. Admin = shell aparte con drawer.

const mSub = { color: 'var(--sgt-text-sub, #667085)' };
const mFaint = { color: 'var(--sgt-faint, #9aa3af)' };
const mRow = { display: 'flex', alignItems: 'center', gap: 10 };
const mQ = (n) => 'Q' + n.toLocaleString('es-GT');
const mHrs = (h) => h <= 0 ? 'Expirado' : h >= 24 ? `${Math.floor(h / 24)} d ${String(h % 24).padStart(2, '0')} h` : `${h} h`;

const TABS_CLIENTE = [
  { id: 'inicio', label: 'Inicio', icon: 'Home' },
  { id: 'pedidos', label: 'Pedidos', icon: 'Megaphone', badge: 3 },
  { id: 'publicar', label: 'Publicar', icon: 'Plus', center: true },
  { id: 'chat', label: 'Chat', icon: 'MessageCircle', badge: 2 },
  { id: 'perfil', label: 'Perfil', icon: 'User' },
];
const TABS_PROV = [
  { id: 'inicio', label: 'Inicio', icon: 'LayoutDashboard' },
  { id: 'oport', label: 'Oportunidades', icon: 'Search', badge: 4 },
  { id: 'trabajos', label: 'Trabajos', icon: 'Briefcase' },
  { id: 'chat', label: 'Chat', icon: 'MessageCircle' },
  { id: 'perfil', label: 'Perfil', icon: 'User' },
];

// Tab bar con botón central elevado (acción primaria del cliente)
const MTabBarCenter = ({ tabs, current, onChange }) => (
  <div style={{
    position: 'sticky', bottom: 0, zIndex: 30,
    background: 'var(--sgt-card-bg, rgba(255,255,255,.96))',
    backdropFilter: 'blur(12px)',
    borderTop: '1px solid var(--sgt-border, #eef0f4)',
    paddingBottom: 22,
  }}>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, height: 54, alignItems: 'center' }}>
      {tabs.map(t => {
        const active = current === t.id;
        if (t.center) return (
          <button key={t.id} onClick={() => onChange?.(t.id)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          }}>
            <span style={{
              width: 46, height: 46, borderRadius: 999, marginTop: -18,
              background: SGT.blue, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 8px 18px ${SGT.blue}59`, border: '3px solid var(--sgt-card-bg,#fff)',
            }}><Icon name="Plus" size={24} color="#fff" strokeWidth={2.6} /></span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: SGT.blue, marginTop: -2 }}>{t.label}</span>
          </button>
        );
        return (
          <button key={t.id} onClick={() => onChange?.(t.id)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          }}>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <Icon name={t.icon} size={22} color={active ? SGT.blue : 'var(--sgt-text-sub,#98a2b3)'} strokeWidth={active ? 2.4 : 2} />
              {t.badge ? <span style={{
                position: 'absolute', top: -3, right: -8, minWidth: 16, height: 16, padding: '0 4px',
                background: SGT.error, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 2px var(--sgt-card-bg, white)',
              }}>{t.badge}</span> : null}
            </span>
            <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500, color: active ? SGT.blue : 'var(--sgt-text-sub,#98a2b3)' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  </div>
);

const MExpiry = ({ hoursLeft }) => {
  const pct = Math.max(0, Math.min(1, hoursLeft / 168));
  const c = hoursLeft <= 0 ? SGT.danger : pct < 0.25 ? SGT.amber : SGT.success;
  return (
    <div style={{ ...mRow, gap: 7 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'var(--sgt-input-bg,#f1f0ec)', overflow: 'hidden', minWidth: 44 }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: c, borderRadius: 999 }} />
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: c, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{mHrs(hoursLeft)}</span>
    </div>
  );
};

const MSlots = ({ used = 0, legend = true }) => (
  <div>
    <div style={{ display: 'flex', gap: 3 }}>
      {[0, 1, 2, 3, 4, 5].map(i => {
        const filled = i < used, paid = i >= SGT_COT_GRATIS;
        return <div key={i} style={{
          flex: 1, height: 7, borderRadius: 999,
          background: filled ? (paid ? SGT.amber : SGT.success) : 'var(--sgt-input-bg,#eceae5)',
          boxShadow: filled ? 'none' : 'inset 0 0 0 1px var(--sgt-border, rgba(0,0,0,.08))',
        }} />;
      })}
    </div>
    {legend && <div style={{ ...mFaint, fontSize: 11, marginTop: 5 }}>{used}/{SGT_MAX_COTIZACIONES} cotizaciones · {SGT_COT_GRATIS} gratis</div>}
  </div>
);

const MCredits = ({ providerId = 'p1' }) => {
  const bal = SGT_CREDITS[providerId] ?? 0, low = bal <= 2;
  return (
    <span style={{
      ...mRow, gap: 5, display: 'inline-flex',
      background: low ? 'var(--sgt-st-bg-credito-sin_saldo)' : 'var(--sgt-tint,#e6effa)',
      color: low ? 'var(--sgt-st-fg-credito-sin_saldo)' : SGT.blueText,
      fontWeight: 700, fontSize: 12.5, padding: '6px 11px', borderRadius: 999,
    }}>
      <Icon name="Coins" size={14} color="currentColor" />{bal}
    </span>
  );
};

const mTextarea = {
  width: '100%', padding: 13, borderRadius: 14, fontSize: 15, fontFamily: 'inherit', resize: 'none',
  background: 'var(--sgt-input-bg,#f9f8f5)', color: 'var(--sgt-text,#0e1424)',
  border: '1px solid var(--sgt-input-border,#d9e2ef)', outline: 'none',
};
const mLabel = { fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 };

// mobile-ui.jsx no exporta su helper y los scripts Babel no comparten scope.
const mkIconBtn = () => ({
  width: 36, height: 36, borderRadius: 10, display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none', cursor: 'pointer',
});

// MFrame posicionado — necesario para overlays (drawer del admin).
const MFrameRel = ({ children, bg }) => (
  <div data-sgt-frame style={{
    position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    background: bg || 'var(--sgt-bg, #f0eee9)', color: 'var(--sgt-text, #0e1424)',
    fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, overflow: 'hidden',
  }}>{children}</div>
);

// ── 14 · Publicar pedido ───────────────────────────────────────────
const MScreenPublicarPedido = () => {
  const [step, setStep] = React.useState(1);
  const [cat, setCat] = React.useState('plomeria');
  const [urg, setUrg] = React.useState('media');
  const [title, setTitle] = React.useState('Fuga en tubería del baño');
  const [desc, setDesc] = React.useState('Hay una fuga bajo el lavamanos. Ya cerré la llave de paso.');
  const [zone, setZone] = React.useState('Zona 10');
  const labels = ['Qué necesitás', 'Dónde', 'Revisar'];

  return (
    <MFrame>
      <MAppBar title="Publicar pedido" onBack={() => {}} trailing={
        <span style={{ ...mFaint, fontSize: 12.5, fontWeight: 700, paddingRight: 6 }}>{step}/3</span>} />
      {/* Progreso */}
      <div style={{ display: 'flex', gap: 5, padding: '10px 16px 0' }}>
        {labels.map((l, i) => (
          <div key={l} style={{ flex: 1 }}>
            <div style={{ height: 4, borderRadius: 999, background: step > i ? SGT.blue : 'var(--sgt-input-bg,#eceae5)' }} />
            <div style={{ fontSize: 10.5, fontWeight: step === i + 1 ? 700 : 500, marginTop: 6, color: step === i + 1 ? 'var(--sgt-text,#0e1424)' : 'var(--sgt-faint,#9aa3af)' }}>{l}</div>
          </div>
        ))}
      </div>

      <MScreen bg="transparent">
        <div style={{ padding: 16, display: 'grid', gap: 18 }}>
          {step === 1 && (<>
            <div>
              <label style={mLabel}>Categoría</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {SGT_CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCat(c.id)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 4px',
                    background: cat === c.id ? 'var(--sgt-tint,#e6effa)' : 'var(--sgt-card-bg,#fff)',
                    border: `1.5px solid ${cat === c.id ? SGT.blue : 'var(--sgt-border,rgba(0,0,0,.08))'}`,
                    borderRadius: 14, cursor: 'pointer', minHeight: 84,
                  }}>
                    <CatIcon catId={c.id} size={30} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sgt-text,#0e1424)', textAlign: 'center', lineHeight: 1.25 }}>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div><label style={mLabel}>Título</label><MInput value={title} onChange={e => setTitle(e.target.value)} /></div>
            <div>
              <label style={mLabel}>Descripción</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} style={mTextarea} />
              <div style={{ ...mFaint, fontSize: 11.5, marginTop: 6 }}>Más detalle = cotizaciones más precisas.</div>
            </div>
            <div>
              <label style={mLabel}>Fotos <span style={{ ...mFaint, fontWeight: 500 }}>(opcional)</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <img src={sgtWork(cat, 0, 200)} alt="" style={{ width: 78, height: 78, borderRadius: 14, objectFit: 'cover' }} />
                <button style={{
                  width: 78, height: 78, borderRadius: 14, cursor: 'pointer', gap: 3,
                  border: '1.5px dashed var(--sgt-input-border,#d9e2ef)', background: 'transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--sgt-text-sub,#667085)', fontSize: 10.5, fontWeight: 600,
                }}><Icon name="Camera" size={19} color="currentColor" />Agregar</button>
              </div>
            </div>
          </>)}

          {step === 2 && (<>
            <div><label style={mLabel}>Zona / municipio</label>
              <select value={zone} onChange={e => setZone(e.target.value)} style={{ ...mTextarea, height: 50, padding: '0 12px', cursor: 'pointer', resize: undefined }}>
                {SGT_ZONES.map(z => <option key={z}>{z}</option>)}
              </select>
            </div>
            <div><label style={mLabel}>Dirección</label><MInput icon="MapPin" value="6a Avenida 12-34" onChange={() => {}} />
              <div style={{ marginTop: 10, borderRadius: 14, overflow: 'hidden' }}><OsmMap height={150} style={{ borderRadius: 0 }} /></div>
            </div>
            <div>
              <label style={mLabel}>Urgencia</label>
              <div style={{ display: 'grid', gap: 8 }}>
                {[['baja', 'Cuando se pueda'], ['media', 'Esta semana'], ['alta', 'Hoy o mañana']].map(([k, help]) => (
                  <button key={k} onClick={() => setUrg(k)} style={{
                    ...mRow, justifyContent: 'space-between', minHeight: 52, padding: '0 14px', cursor: 'pointer', borderRadius: 14,
                    background: urg === k ? 'var(--sgt-tint,#e6effa)' : 'var(--sgt-card-bg,#fff)',
                    border: `1.5px solid ${urg === k ? SGT.blue : 'var(--sgt-border,rgba(0,0,0,.08))'}`,
                  }}>
                    <StatusChip kind="urgencia" status={k} size="sm" />
                    <span style={{ ...mSub, fontSize: 12.5 }}>{help}</span>
                  </button>
                ))}
              </div>
            </div>
          </>)}

          {step === 3 && (<>
            <MCard padding={16}>
              <div style={{ ...mRow, gap: 12, alignItems: 'flex-start' }}>
                <CatIcon catId={cat} size={42} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-.01em' }}>{title}</div>
                  <div style={{ ...mRow, gap: 7, marginTop: 7, flexWrap: 'wrap' }}>
                    <StatusChip kind="urgencia" status={urg} size="sm" />
                    <span style={{ ...mSub, fontSize: 12 }}>{zone}</span>
                  </div>
                </div>
              </div>
              <p style={{ ...mSub, fontSize: 13, lineHeight: 1.55, margin: '12px 0 0', textWrap: 'pretty' }}>{desc}</p>
            </MCard>
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                ['Clock', 'Abierto 7 días', 'Se cierra solo si no adjudicás.'],
                ['Users', `Hasta ${SGT_MAX_COTIZACIONES} cotizaciones`, 'Vos elegís. No estás obligado a aceptar ninguna.'],
                ['Eye', 'Dirección oculta', 'Solo ven la zona hasta que adjudiques.'],
              ].map(([ic, t, d]) => (
                <div key={t} style={{ ...mRow, gap: 11, alignItems: 'flex-start' }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: 'var(--sgt-tint,#e6effa)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}><Icon name={ic} size={16} color={SGT.blue} /></span>
                  <div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{t}</div><div style={{ ...mSub, fontSize: 12.5, marginTop: 2 }}>{d}</div></div>
                </div>
              ))}
            </div>
          </>)}
        </div>
      </MScreen>

      <div style={{ padding: '12px 16px 8px', background: 'var(--sgt-card-bg,#fff)', borderTop: '1px solid var(--sgt-border,rgba(0,0,0,.08))', display: 'flex', gap: 10 }}>
        {step > 1 && <MButton kind="ghost" full={false} onClick={() => setStep(s => s - 1)} style={{ width: 56 }} icon="ArrowLeft" />}
        {step < 3
          ? <MButton kind="primary" iconRight="ArrowRight" onClick={() => setStep(s => s + 1)}>Continuar</MButton>
          : <MButton kind="primary" icon="Megaphone">Publicar pedido</MButton>}
      </div>
      <div style={{ height: 22, background: 'var(--sgt-card-bg,#fff)' }} />
    </MFrame>
  );
};

// ── 15 · Mis pedidos / Mis servicios ───────────────────────────────
const MScreenMisPedidos = () => {
  const [tab, setTab] = React.useState('pedidos');
  const mios = SGT_PEDIDOS.filter(p => p.client === 'Ana Sofía R.');
  return (
    <MFrame tabBar={<MTabBarCenter tabs={TABS_CLIENTE} current="pedidos" />}>
      <MAppBar title="Mi actividad" large trailing={
        <button style={mkIconBtn()}><Icon name="Filter" size={19} color="var(--sgt-text,#0e1424)" /></button>} />
      <div style={{ padding: '0 16px 12px' }}>
        <MSegment value={tab} onChange={setTab} items={[
          { id: 'servicios', label: `Servicios · ${SGT_REQUESTS.length}` },
          { id: 'pedidos', label: `Pedidos · ${mios.length}` },
        ]} />
      </div>

      <MScreen bg="transparent">
        <div style={{ padding: '4px 16px 20px', display: 'grid', gap: 11 }}>
          {tab === 'servicios' && SGT_REQUESTS.map(r => {
            const p = SGT_PROVIDERS_BY_ID[r.provider];
            const fromPedido = SGT_PEDIDOS.find(pd => pd.serviceId === r.id);
            return (
              <MCard key={r.id} padding={14} onClick={() => {}}>
                <div style={{ ...mRow, gap: 11, alignItems: 'flex-start' }}>
                  <Avatar idx={p.faceIdx} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.3 }}>{r.service}</div>
                    <div style={{ ...mSub, fontSize: 12, marginTop: 4 }}>{p.name} · {r.date}</div>
                  </div>
                  <StatusChip status={r.status} size="sm" />
                </div>
                <div style={{ ...mRow, justifyContent: 'space-between', marginTop: 11, gap: 10 }}>
                  <span style={{ ...mRow, gap: 5, ...mFaint, fontSize: 11.5, minWidth: 0 }}>
                    <Icon name="MapPin" size={12} color="currentColor" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.address}</span>
                  </span>
                  <span style={{ fontSize: 15.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{mQ(r.amount)}</span>
                </div>
                {fromPedido && (
                  <div style={{
                    ...mRow, gap: 7, marginTop: 11, paddingTop: 11,
                    borderTop: '1px solid var(--sgt-border,rgba(0,0,0,.07))',
                    fontSize: 12, fontWeight: 600, color: SGT.blueText,
                  }}>
                    <Icon name="Megaphone" size={13} color="currentColor" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Desde el pedido «{fromPedido.title}»</span>
                    <Icon name="ChevronRight" size={14} color="currentColor" />
                  </div>
                )}
              </MCard>
            );
          })}

          {tab === 'pedidos' && mios.map(pd => {
            const cots = sgtCotsDe(pd.id).filter(c => c.status !== 'retirada');
            const gan = cots.find(c => c.status === 'aceptada');
            const gp = gan && SGT_PROVIDERS_BY_ID[gan.provider];
            return (
              <MCard key={pd.id} padding={14} onClick={() => {}}>
                <div style={{ ...mRow, gap: 11, alignItems: 'flex-start' }}>
                  <CatIcon catId={pd.cat} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.3 }}>{pd.title}</div>
                    <div style={{ ...mSub, fontSize: 12, marginTop: 4 }}>{pd.zone} · {pd.publishedAt}</div>
                  </div>
                  <StatusChip kind="pedido" status={pd.status} size="sm" />
                </div>

                <div style={{ marginTop: 12 }}><MSlots used={cots.length} /></div>
                {pd.status === 'abierto' && <div style={{ marginTop: 9 }}><MExpiry hoursLeft={pd.expiresIn} /></div>}

                {pd.status === 'adjudicado' && pd.serviceId && (
                  <button style={{
                    width: '100%', ...mRow, gap: 9, marginTop: 12, padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                    background: 'var(--sgt-st-bg-pedido-adjudicado)', border: '1px solid var(--sgt-st-dot-pedido-adjudicado)',
                    textAlign: 'left',
                  }}>
                    <Icon name="ArrowRightCircle" size={16} color="var(--sgt-st-fg-pedido-adjudicado)" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sgt-st-fg-pedido-adjudicado)' }}>Ver el servicio que generó</div>
                      <div style={{ fontSize: 11.5, color: 'var(--sgt-st-fg-pedido-adjudicado)', opacity: .85, marginTop: 1 }}>{gp?.name} · {mQ(gan.amount)}</div>
                    </div>
                    <Icon name="ChevronRight" size={15} color="var(--sgt-st-fg-pedido-adjudicado)" />
                  </button>
                )}

                <div style={{ ...mRow, justifyContent: 'space-between', gap: 10, marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--sgt-border,rgba(0,0,0,.07))' }}>
                  <span style={{ ...mSub, fontSize: 12, fontWeight: 600 }}>
                    {cots.length === 0 ? 'Sin cotizaciones' : `${cots.length} ${cots.length === 1 ? 'cotización' : 'cotizaciones'} · desde ${mQ(Math.min(...cots.map(c => c.amount)))}`}
                  </span>
                  <span style={{ ...mRow, gap: 3, fontSize: 12.5, fontWeight: 700, color: SGT.blueText }}>
                    {pd.status === 'abierto' && cots.length ? 'Ver' : 'Detalle'}
                    <Icon name="ChevronRight" size={14} color="currentColor" />
                  </span>
                </div>
              </MCard>
            );
          })}
        </div>
      </MScreen>
    </MFrame>
  );
};

// ── 16 · Detalle de pedido + cotizaciones ──────────────────────────
const MScreenDetallePedido = () => {
  const pd = sgtPedido('pd1');
  const cots = sgtCotsDe(pd.id);
  const [sel, setSel] = React.useState(null);
  const cheapest = Math.min(...cots.map(c => c.amount));
  const best = cots.reduce((a, c) => SGT_PROVIDERS_BY_ID[c.provider].rating > SGT_PROVIDERS_BY_ID[a.provider].rating ? c : a, cots[0]);
  const selCot = cots.find(c => c.id === sel);
  const selP = selCot && SGT_PROVIDERS_BY_ID[selCot.provider];

  return (
    <MFrame>
      <MAppBar title="Pedido" onBack={() => {}} trailing={
        <button style={mkIconBtn()}><Icon name="MoreHorizontal" size={20} color="var(--sgt-text,#0e1424)" /></button>} />
      <MScreen bg="transparent">
        <div style={{ padding: '12px 16px 0' }}>
          <MCard padding={15}>
            <div style={{ ...mRow, gap: 12, alignItems: 'flex-start' }}>
              <CatIcon catId={pd.cat} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.3 }}>{pd.title}</div>
                <div style={{ ...mSub, fontSize: 12, marginTop: 4 }}>{pd.zone} · {pd.publishedAt}</div>
              </div>
            </div>
            <div style={{ ...mRow, gap: 7, marginTop: 11 }}>
              <StatusChip kind="urgencia" status={pd.urgency} size="sm" />
              <StatusChip kind="pedido" status={pd.status} size="sm" />
            </div>
            <p style={{ ...mSub, fontSize: 13, lineHeight: 1.55, margin: '12px 0 0', textWrap: 'pretty' }}>{pd.desc}</p>
            <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
              {[0, 1, 2].map(i => <img key={i} src={sgtWork(pd.cat, i, 220)} alt="" style={{ flex: 1, height: 62, borderRadius: 10, objectFit: 'cover', minWidth: 0 }} />)}
            </div>
            <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--sgt-border,rgba(0,0,0,.07))', display: 'grid', gap: 11 }}>
              <MSlots used={cots.filter(c => c.status !== 'retirada').length} />
              <MExpiry hoursLeft={pd.expiresIn} />
            </div>
          </MCard>
        </div>

        <MSectionTitle padding="16px 16px 0" action={<span style={{ ...mFaint, fontSize: 11.5 }}>Por llegada</span>}>
          Cotizaciones ({cots.length})
        </MSectionTitle>

        <div style={{ padding: '10px 16px 20px', display: 'grid', gap: 11 }}>
          {cots.map(c => {
            const p = SGT_PROVIDERS_BY_ID[c.provider];
            const active = sel === c.id;
            return (
              <MCard key={c.id} padding={14} style={{
                border: `1.5px solid ${active ? SGT.blue : 'var(--sgt-border,rgba(0,0,0,.08))'}`,
                boxShadow: active ? `0 0 0 3px var(--sgt-tint,#e6effa)` : undefined,
              }}>
                <div style={{ ...mRow, gap: 11, alignItems: 'flex-start' }}>
                  <Avatar idx={p.faceIdx} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...mRow, gap: 6 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700 }}>{p.name}</span>
                      {p.verified && <VerifiedBadge size={11} />}
                    </div>
                    <div style={{ ...mRow, gap: 7, marginTop: 4 }}>
                      <Stars value={p.rating} size={12} />
                      <span style={{ ...mSub, fontSize: 11.5 }}>{p.rating} · {p.reviews} reseñas</span>
                    </div>
                  </div>
                  <StatusChip kind="cotizacion" status={c.status} size="sm" />
                </div>

                {(c.amount === cheapest || c.id === best.id) && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {c.amount === cheapest && <StatusChip kind="etiqueta" status="barata" size="sm" />}
                    {c.id === best.id && <StatusChip kind="etiqueta" status="mejor" size="sm" />}
                  </div>
                )}

                <p style={{ ...mSub, fontSize: 12.5, lineHeight: 1.55, margin: '11px 0 0', textWrap: 'pretty' }}>{c.message}</p>

                <div style={{ ...mRow, justifyContent: 'space-between', gap: 10, marginTop: 13 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em' }}>{mQ(c.amount)}</div>
                    <div style={{ ...mFaint, fontSize: 11, marginTop: 1 }}>Cotización {c.slot}/{SGT_MAX_COTIZACIONES} · {c.sentAt.toLowerCase()}</div>
                  </div>
                  <div style={{ ...mRow, gap: 7 }}>
                    <button style={{
                      width: 44, height: 44, borderRadius: 12, cursor: 'pointer', flexShrink: 0,
                      background: 'var(--sgt-input-bg,#f9f8f5)', border: '1px solid var(--sgt-border,rgba(0,0,0,.08))',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}><Icon name="MessageCircle" size={18} color="var(--sgt-text-sub,#667085)" /></button>
                    <MButton kind={active ? 'success' : 'primary'} size="sm" full={false}
                             icon={active ? 'Check' : undefined} onClick={() => setSel(active ? null : c.id)}
                             style={{ height: 44, borderRadius: 12 }}>
                      {active ? 'Elegida' : 'Elegir'}
                    </MButton>
                  </div>
                </div>
              </MCard>
            );
          })}
        </div>
      </MScreen>

      {/* Barra de confirmación fija — la decisión vive abajo, al alcance del pulgar */}
      {selCot && (
        <div style={{ background: 'var(--sgt-card-bg,#fff)', borderTop: '1px solid var(--sgt-border,rgba(0,0,0,.08))', padding: '12px 16px 8px' }}>
          <div style={{ ...mRow, gap: 9, marginBottom: 10 }}>
            <Icon name="Info" size={15} color="var(--sgt-text-sub,#667085)" style={{ flexShrink: 0 }} />
            <span style={{ ...mSub, fontSize: 11.5, lineHeight: 1.45 }}>
              Se crea un <b>servicio</b> con {selP.name}, se comparte tu dirección y las demás se rechazan.
            </span>
          </div>
          <MButton kind="success" icon="Handshake">Adjudicar · {mQ(selCot.amount)}</MButton>
        </div>
      )}
      <div style={{ height: 22, background: selCot ? 'var(--sgt-card-bg,#fff)' : 'transparent' }} />
    </MFrame>
  );
};

// ── 17 · Oportunidades (proveedor) ─────────────────────────────────
const MScreenOportunidades = () => {
  const ME = 'p1';
  const [tab, setTab] = React.useState('abiertas');
  const [cat, setCat] = React.useState('todas');
  const abiertas = SGT_PEDIDOS.filter(p => p.status === 'abierto' && (cat === 'todas' || p.cat === cat));
  const mias = SGT_COTIZACIONES.filter(c => c.provider === ME);

  return (
    <MFrame tabBar={<MTabBar tabs={TABS_PROV} current="oport" />}>
      <MAppBar title="Oportunidades" large trailing={<MCredits providerId={ME} />} />
      {/* Accesos a monetización: el tab bar se queda en cinco slots */}
      <div style={{ display: 'flex', gap: 7, padding: '0 16px 10px' }}>
        <MChip icon="ShoppingCart">Comprar créditos</MChip>
        <MChip icon="Crown">Premium</MChip>
      </div>
      <div style={{ padding: '0 16px 10px' }}>
        <MSegment value={tab} onChange={setTab} items={[
          { id: 'abiertas', label: `Abiertas · ${abiertas.length}` },
          { id: 'mias', label: `Mis cotizaciones · ${mias.length}` },
        ]} />
      </div>

      {tab === 'abiertas' && (
        <div style={{ display: 'flex', gap: 7, padding: '2px 16px 10px', overflowX: 'auto' }}>
          {[{ id: 'todas', name: 'Todas' }, ...SGT_CATEGORIES.slice(0, 5)].map(c =>
            <MChip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</MChip>)}
        </div>
      )}

      <MScreen bg="transparent">
        {tab === 'abiertas' && (
          <div style={{ padding: '2px 16px 20px', display: 'grid', gap: 11 }}>
            {abiertas.map(pd => {
              const cots = sgtCotsDe(pd.id).filter(c => c.status !== 'retirada');
              const costo = sgtCostoSiguiente(pd.id);
              const ya = cots.some(c => c.provider === ME);
              const saldo = SGT_CREDITS[ME] ?? 0;
              const slotKey = costo === null ? 'limite' : ya ? null : costo === 0 ? 'gratis' : (saldo > 0 ? 'pagada' : 'sin_saldo');
              return (
                <MCard key={pd.id} padding={14}>
                  <div style={{ ...mRow, gap: 11, alignItems: 'flex-start' }}>
                    <CatIcon catId={pd.cat} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.3 }}>{pd.title}</div>
                      <div style={{ ...mSub, fontSize: 12, marginTop: 4 }}>{pd.zone} · {pd.publishedAt}</div>
                    </div>
                    <StatusChip kind="urgencia" status={pd.urgency} size="sm" />
                  </div>
                  <p style={{ ...mSub, fontSize: 12.5, lineHeight: 1.5, margin: '10px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{pd.desc}</p>
                  <div style={{ marginTop: 12 }}><MSlots used={cots.length} legend={false} /></div>
                  <div style={{ ...mRow, justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}><MExpiry hoursLeft={pd.expiresIn} /></div>
                    {slotKey && <StatusChip kind="credito" status={slotKey} size="sm" />}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    {ya ? <MButton kind="ghost" icon="Check" disabled>Ya cotizaste</MButton>
                      : costo === null ? <MButton kind="ghost" disabled>Cupo lleno</MButton>
                      : <MButton kind="primary" icon="Send">{costo === 0 ? 'Cotizar gratis' : 'Cotizar · 1 crédito'}</MButton>}
                  </div>
                </MCard>
              );
            })}
          </div>
        )}

        {tab === 'mias' && (
          <div style={{ padding: '2px 16px 20px', display: 'grid', gap: 11 }}>
            <MCard padding={14} style={{ background: 'var(--sgt-input-bg,#f9f8f5)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {[
                  ['Enviadas', mias.filter(c => c.status === 'enviada').length, SGT.blue],
                  ['Aceptad.', mias.filter(c => c.status === 'aceptada').length, SGT.success],
                  ['Rechaz.', mias.filter(c => c.status === 'rechazada').length, SGT.danger],
                  ['Créditos', mias.reduce((s, c) => s + c.credit, 0), SGT.amber],
                ].map(([l, v, c]) => (
                  <div key={l}>
                    <div style={{ ...mFaint, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{l}</div>
                    <div style={{ fontSize: 19, fontWeight: 700, color: c, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                  </div>
                ))}
              </div>
            </MCard>

            {mias.map(c => {
              const pd = sgtPedido(c.pedido);
              const rivales = sgtCotsDe(c.pedido).filter(x => x.status !== 'retirada');
              const menor = Math.min(...rivales.map(x => x.amount));
              return (
                <MCard key={c.id} padding={14}>
                  <div style={{ ...mRow, gap: 11, alignItems: 'flex-start' }}>
                    <CatIcon catId={pd.cat} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.3 }}>{pd.title}</div>
                      <div style={{ ...mSub, fontSize: 12, marginTop: 4 }}>{pd.zone} · slot {c.slot}/{SGT_MAX_COTIZACIONES} · {c.sentAt.toLowerCase()}</div>
                    </div>
                    <StatusChip kind="cotizacion" status={c.status} size="sm" />
                  </div>

                  <div style={{ ...mRow, gap: 6, marginTop: 10 }}>
                    <StatusChip kind="credito" status={c.credit ? 'pagada' : 'gratis'} size="sm"
                                label={c.credit ? '1 crédito usado' : 'Slot gratis'} />
                    {c.amount === menor && <StatusChip kind="etiqueta" status="baja" size="sm" />}
                  </div>

                  <div style={{ ...mRow, justifyContent: 'space-between', gap: 12, marginTop: 13, paddingTop: 12, borderTop: '1px solid var(--sgt-border,rgba(0,0,0,.07))' }}>
                    <div>
                      <div style={{ ...mFaint, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Tu oferta</div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{mQ(c.amount)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ ...mFaint, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Compitiendo</div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 4 }}>{rivales.length - 1} más · desde {mQ(menor)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {c.status === 'enviada' && <MButton kind="ghost" size="sm">Retirar</MButton>}
                    {c.status === 'aceptada'
                      ? <MButton kind="success" size="sm" iconRight="ArrowRight">Ver servicio</MButton>
                      : <MButton kind="secondary" size="sm" iconRight="ChevronRight">Ver pedido</MButton>}
                  </div>
                </MCard>
              );
            })}
          </div>
        )}
      </MScreen>
    </MFrame>
  );
};

// ── 18 · Enviar cotización ─────────────────────────────────────────
const MScreenEnviarCotizacion = () => {
  const ME = 'p1', pd = sgtPedido('pd7');
  const [amount, setAmount] = React.useState('320');
  const [msg, setMsg] = React.useState('Puedo pasar mañana temprano. El diagnóstico se abona a la reparación si aceptás.');
  const [disp, setDisp] = React.useState('Mañana');
  const cots = sgtCotsDe(pd.id).filter(c => c.status !== 'retirada');
  const costo = sgtCostoSiguiente(pd.id);
  const saldo = SGT_CREDITS[ME] ?? 0;
  const puede = costo !== null && (costo === 0 || saldo > 0);

  return (
    <MFrame>
      <MAppBar title="Enviar cotización" onBack={() => {}} trailing={<MCredits providerId={ME} />} />
      <MScreen bg="transparent">
        <div style={{ padding: '12px 16px 20px', display: 'grid', gap: 14 }}>
          <MCard padding={14}>
            <div style={{ ...mRow, gap: 11, alignItems: 'flex-start' }}>
              <CatIcon catId={pd.cat} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>{pd.title}</div>
                <div style={{ ...mSub, fontSize: 12, marginTop: 4 }}>{pd.zone} · {pd.publishedAt}</div>
              </div>
              <StatusChip kind="urgencia" status={pd.urgency} size="sm" />
            </div>
            <p style={{ ...mSub, fontSize: 12.5, lineHeight: 1.5, margin: '10px 0 0' }}>{pd.desc}</p>
          </MCard>

          {/* Costo del slot */}
          <MCard padding={14} style={{ borderColor: costo === 0 ? 'var(--sgt-st-dot-credito-gratis)' : 'var(--sgt-st-dot-credito-pagada)' }}>
            <div style={{ ...mRow, justifyContent: 'space-between', gap: 10 }}>
              <StatusChip kind="credito" status={costo === null ? 'limite' : costo === 0 ? 'gratis' : (saldo ? 'pagada' : 'sin_saldo')} size="sm" />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Serías la {cots.length + 1} de {SGT_MAX_COTIZACIONES}</span>
            </div>
            <div style={{ marginTop: 11 }}><MSlots used={cots.length} legend={false} /></div>
            <div style={{ ...mSub, fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>
              {costo === 0
                ? `Las primeras ${SGT_COT_GRATIS} cotizaciones de cada pedido no consumen créditos.`
                : `De la ${SGT_COT_GRATIS + 1}ª a la ${SGT_MAX_COTIZACIONES}ª se cobra 1 crédito. Se descuenta al enviar y no se devuelve si el cliente elige a otro.`}
            </div>
          </MCard>

          <div>
            <label style={mLabel}>Monto que ofertás</label>
            <MInput icon="Coins" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
                    rightSlot={<span style={{ ...mFaint, fontSize: 12.5, fontWeight: 700 }}>GTQ</span>} />
            <div style={{ ...mFaint, fontSize: 11.5, marginTop: 6 }}>
              {cots.length ? `Las actuales van de ${mQ(Math.min(...cots.map(c => c.amount)))} a ${mQ(Math.max(...cots.map(c => c.amount)))}.` : 'Sos el primero en cotizar.'}
            </div>
          </div>

          <div>
            <label style={mLabel}>Qué incluye</label>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4} style={mTextarea} />
            <div style={{ ...mFaint, fontSize: 11.5, marginTop: 6 }}>Materiales, garantía y disponibilidad suben tu probabilidad de ser elegido.</div>
          </div>

          <div>
            <label style={mLabel}>Disponibilidad</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Hoy', 'Mañana', 'Esta semana'].map(d => (
                <button key={d} onClick={() => setDisp(d)} style={{
                  flex: 1, height: 46, borderRadius: 14, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: disp === d ? 'var(--sgt-tint,#e6effa)' : 'var(--sgt-card-bg,#fff)',
                  color: disp === d ? SGT.blueText : 'var(--sgt-text-sub,#667085)',
                  border: `1.5px solid ${disp === d ? SGT.blue : 'var(--sgt-border,rgba(0,0,0,.08))'}`,
                }}>{d}</button>
              ))}
            </div>
          </div>
        </div>
      </MScreen>

      <div style={{ background: 'var(--sgt-card-bg,#fff)', borderTop: '1px solid var(--sgt-border,rgba(0,0,0,.08))', padding: '12px 16px 8px' }}>
        <div style={{ ...mSub, fontSize: 11.5, marginBottom: 9, textAlign: 'center' }}>
          {costo === 0 ? 'No se descuentan créditos.' : `Se descuenta 1 crédito · quedarían ${Math.max(0, saldo - 1)}.`}
        </div>
        <MButton kind="primary" icon="Send" disabled={!puede}>
          {costo === 0 ? 'Enviar cotización' : 'Enviar · 1 crédito'}
        </MButton>
      </div>
      <div style={{ height: 22, background: 'var(--sgt-card-bg,#fff)' }} />
    </MFrame>
  );
};

// ── 19 · Créditos (proveedor) ──────────────────────────────────────
const MScreenCreditos = () => {
  const ME = 'p1', bal = SGT_CREDITS[ME];
  const packs = SGT_PACKS;
  const prem = sgtPremium(ME);
  return (
    <MFrame tabBar={<MTabBar tabs={TABS_PROV} current="perfil" />}>
      <MAppBar title="Créditos" onBack={() => {}} trailing={
        <button style={mkIconBtn()}><Icon name="HelpCircle" size={19} color="var(--sgt-text,#0e1424)" /></button>} />
      <MScreen bg="transparent">
        <div style={{ padding: '12px 16px 20px', display: 'grid', gap: 16 }}>
          <div className="sgt-grad" style={{ borderRadius: 18, padding: 20, color: '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', opacity: .85 }}>Saldo disponible</div>
            <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-.03em', marginTop: 4, lineHeight: 1 }}>{bal}</div>
            <div style={{ fontSize: 12.5, opacity: .9, marginTop: 7 }}>≈ {bal} cotizaciones en pedidos con cupo pagado</div>
            <div style={{ marginTop: 16 }}><MButton kind="glass" icon="ShoppingCart">Comprar créditos</MButton></div>
          </div>

          <MCard padding={0}>
            {[['Cotizaciones enviadas', '9'], ['Gratis (slots 1–3)', '7'], ['Con crédito (slots 4–6)', '2'], ['Adjudicadas', '3'], ['Tasa de éxito', '33%']].map(([l, v], i, a) => (
              <div key={l} style={{
                ...mRow, justifyContent: 'space-between', padding: '13px 15px',
                borderBottom: i === a.length - 1 ? 'none' : '1px solid var(--sgt-border,rgba(0,0,0,.06))',
              }}>
                <span style={{ ...mSub, fontSize: 13 }}>{l}</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
              </div>
            ))}
          </MCard>

          <div>
            <MSectionTitle padding="0 0 0" action={<span style={{ ...mFaint, fontSize: 11 }}>Acreditación inmediata</span>}>Paquetes</MSectionTitle>
            <div style={{ display: 'grid', gap: 9 }}>
              {packs.map(p => {
                const best = p.tag === 'popular';
                return (
                  <MCard key={p.id} padding={14} style={{ borderColor: best ? SGT.blue : undefined }}>
                    <div style={{ ...mRow, gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                        background: 'var(--sgt-tint,#e6effa)', color: SGT.blueText,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1 }}>{p.n}</span>
                        <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2 }}>créd.</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...mRow, gap: 7, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14.5, fontWeight: 700 }}>{p.name}</span>
                          {p.tag && <StatusChip kind="etiqueta" status={p.tag} size="sm" />}
                        </div>
                        <div style={{ ...mRow, gap: 8, marginTop: 5 }}>
                          <span style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{mQ(p.price)}</span>
                          <span style={{ ...mFaint, fontSize: 11.5 }}>{'Q' + p.unit.toFixed(2)} / crédito</span>
                        </div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 4, color: p.save ? SGT.success : 'var(--sgt-faint,#9aa3af)' }}>
                          {p.save ? `${p.save}% menos que Inicial` : 'precio base'}
                        </div>
                      </div>
                      <MButton kind={best ? 'primary' : 'secondary'} size="sm" full={false}>Comprar</MButton>
                    </div>
                  </MCard>
                );
              })}
            </div>
            <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 14, border: '1px dashed var(--sgt-border,rgba(0,0,0,.14))' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>¿Pagaste por transferencia o efectivo?</div>
              <div style={{ ...mSub, fontSize: 11.5, marginTop: 3, lineHeight: 1.5 }}>Vía asistida: el administrador confirma el pago y acredita a mano. Tarda más.</div>
              <div style={{ marginTop: 10 }}><MButton kind="ghost" size="sm" icon="Headset">Pedir acreditación al admin</MButton></div>
            </div>
          </div>

          <MCard padding={0}>
            <MListRow icon="Crown" title="Premium"
              subtitle={prem.estado === 'activo' ? `Activo · ${prem.diasRestantes} días restantes` : prem.estado === 'vencido' ? `Venció el ${prem.hasta}` : `${mQ(SGT_PREMIUM.price)}/mes · badge y visibilidad`}
              trailing={prem.estado === 'activo' ? <PremiumBadge variant="icon" size={11} /> : null} last />
          </MCard>

          <div>
            <MSectionTitle padding="0 0 0">Movimientos</MSectionTitle>
            <MCard padding={0}>
              {SGT_CREDIT_TX.map((t, i, a) => (
                <div key={t.id} style={{
                  ...mRow, gap: 11, padding: '12px 15px',
                  borderBottom: i === a.length - 1 ? 'none' : '1px solid var(--sgt-border,rgba(0,0,0,.06))',
                }}>
                  <span style={{
                    width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                    background: `var(--sgt-st-bg-transaccion-${t.type})`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={t.type === 'gasto' ? 'ArrowDownRight' : t.type === 'bono' ? 'Gift' : 'ArrowUpRight'}
                          size={16} color={`var(--sgt-st-fg-transaccion-${t.type})`} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{t.reason}</div>
                    <div style={{ ...mFaint, fontSize: 11.5, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{t.date}</div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: t.amount > 0 ? SGT.success : SGT.danger }}>
                    {t.amount > 0 ? '+' : ''}{t.amount}
                  </span>
                </div>
              ))}
            </MCard>
          </div>
        </div>
      </MScreen>
    </MFrame>
  );
};

// ── 20 · Admin · recargas (shell con drawer, sin tab bar) ──────────
const MScreenAdminRecargas = () => {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState('compras');
  const [fEstado, setFEstado] = React.useState('todos');
  // prop = sección propuesta, todavía no existe en el backend
  const nav = [
    { id: 'resumen', label: 'Resumen', icon: 'LayoutDashboard' },
    { id: 'recargas', label: 'Recargas', icon: 'Coins', badge: 2 },
    { id: 'usuarios', label: 'Usuarios', icon: 'Users' },
    { id: 'pedidos', label: 'Pedidos', icon: 'Megaphone', prop: true },
    { id: 'disputas', label: 'Disputas', icon: 'AlertTriangle', prop: true },
  ];
  const pend = [
    { id: 'rq1', provider: 'p3', n: 15, price: 270, method: 'Transferencia BI', ref: '88213', at: 'Hace 20 min' },
    { id: 'rq2', provider: 'p5', n: 5, price: 100, method: 'Efectivo en oficina', ref: '—', at: 'Hace 2 h' },
  ];

  return (
    <MFrameRel>
      <MAppBar title="Créditos y Premium" trailing={
        <button onClick={() => setOpen(true)} style={mkIconBtn()}>
          <Icon name="Menu" size={21} color="var(--sgt-text,#0e1424)" />
        </button>} />
      <div style={{ padding: '0 16px 10px', ...mRow, gap: 7 }}>
        <span style={{
          ...mRow, gap: 5, display: 'inline-flex', fontSize: 10.5, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '.06em', padding: '4px 9px', borderRadius: 6,
          background: 'var(--sgt-input-bg,#f1f0ec)', color: 'var(--sgt-text-sub,#667085)',
        }}><Icon name="ShieldCheck" size={12} color="currentColor" />Panel de administración</span>
      </div>

      <MScreen bg="transparent">
        <div style={{ padding: '4px 16px 20px', display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            {[['Compras del mes', '64', SGT.blue, 'ShoppingCart'], ['Créditos vendidos', '185', SGT.blue, 'Coins'],
              ['Premium activos', '2', '#c2810b', 'Crown'], ['Manuales pendientes', '2', SGT.amber, 'Clock'],
              ['Ingreso del mes', mQ(18400), SGT.success, 'TrendingUp']].map(([l, v, c, ic]) => (
              <MCard key={l} padding={13}>
                <div style={{ ...mRow, justifyContent: 'space-between' }}>
                  <span style={{ ...mFaint, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{l}</span>
                  <Icon name={ic} size={14} color={c} />
                </div>
                <div style={{ fontSize: 21, fontWeight: 700, marginTop: 6, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em' }}>{v}</div>
              </MCard>
            ))}
          </div>

          <MSegment value={tab} onChange={setTab} items={[
            { id: 'compras', label: 'Compras' },
            { id: 'manual', label: 'Manual' },
            { id: 'premium', label: 'Premium' },
          ]} />

          {tab === 'compras' && (
            <div>
              <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 10 }}>
                {['todos', 'pendiente', 'completada', 'fallida', 'cancelada'].map(e => (
                  <MChip key={e} active={fEstado === e} onClick={() => setFEstado(e)}>
                    <span style={{ textTransform: 'capitalize' }}>{e}</span>
                  </MChip>
                ))}
              </div>
              <div style={{ display: 'grid', gap: 9 }}>
                {SGT_COMPRAS.filter(c => fEstado === 'todos' || c.status === fEstado).map(c => {
                  const p = SGT_PROVIDERS_BY_ID[c.provider];
                  return (
                    <MCard key={c.id} padding={13}>
                      <div style={{ ...mRow, gap: 11 }}>
                        <Avatar idx={p.faceIdx} size={36} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ ...mRow, gap: 6 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                            {sgtPremium(c.provider).estado === 'activo' && <PremiumBadge variant="icon" size={10} />}
                          </div>
                          <div style={{ ...mFaint, fontSize: 11, marginTop: 2 }}>{sgtPack(c.pack).name} · {c.date}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 14.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{mQ(c.amount)}</div>
                          <div style={{ ...mFaint, fontSize: 11 }}>{c.status === 'completada' ? `+${c.n} créd.` : `${c.n} créd.`}</div>
                        </div>
                      </div>
                      <div style={{ ...mRow, justifyContent: 'space-between', gap: 10, marginTop: 11, paddingTop: 10, borderTop: '1px solid var(--sgt-border,rgba(0,0,0,.07))' }}>
                        <StatusChip kind="compra" status={c.status} size="sm" />
                        <span style={{ ...mFaint, fontSize: 11, fontFamily: 'ui-monospace, Menlo, monospace' }}>{c.ref}</span>
                      </div>
                    </MCard>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'premium' && (
            <div>
              <MSectionTitle padding="0 0 0" action={<span style={{ ...mFaint, fontSize: 11 }}>{mQ(SGT_PREMIUM.price)}/mes</span>}>Proveedores</MSectionTitle>
              <MCard padding={0}>
                {SGT_PROVIDERS.filter(p => sgtPremium(p.id).estado !== 'nunca').concat(SGT_PROVIDERS.filter(p => sgtPremium(p.id).estado === 'nunca').slice(0, 2)).map((p, i, a) => {
                  const pr = sgtPremium(p.id);
                  return (
                    <div key={p.id} style={{
                      ...mRow, gap: 11, padding: '12px 14px',
                      borderBottom: i === a.length - 1 ? 'none' : '1px solid var(--sgt-border,rgba(0,0,0,.06))',
                    }}>
                      <Avatar idx={SGT_PROVIDERS.indexOf(p)} size={34} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...mRow, gap: 5 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                          {p.verified && <VerifiedBadge size={10} />}
                        </div>
                        <div style={{ ...mFaint, fontSize: 11, marginTop: 3 }}>
                          {pr.estado === 'nunca' ? 'Nunca activó' : pr.estado === 'activo' ? `Vence ${pr.hasta} · ${pr.diasRestantes} d` : `Venció ${pr.hasta}`}
                        </div>
                      </div>
                      <StatusChip kind="premium" status={pr.estado} size="sm" />
                    </div>
                  );
                })}
              </MCard>
            </div>
          )}

          {tab === 'manual' && (<>
          <div>
            <MSectionTitle padding="0 0 0">Pendientes</MSectionTitle>
            <div style={{ display: 'grid', gap: 9 }}>
              {pend.map(r => {
                const p = SGT_PROVIDERS_BY_ID[r.provider];
                return (
                  <MCard key={r.id} padding={14} style={{ borderColor: 'var(--sgt-st-dot-credito-pagada)' }}>
                    <div style={{ ...mRow, gap: 11 }}>
                      <Avatar idx={p.faceIdx} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...mRow, gap: 6 }}>
                          <span style={{ fontSize: 14.5, fontWeight: 700 }}>{p.name}</span>
                          {p.verified && <VerifiedBadge size={11} />}
                        </div>
                        <div style={{ ...mSub, fontSize: 11.5, marginTop: 3 }}>{r.method} · Ref. {r.ref}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 17, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>+{r.n}</div>
                        <div style={{ ...mFaint, fontSize: 11 }}>{mQ(r.price)}</div>
                      </div>
                    </div>
                    <div style={{ ...mRow, justifyContent: 'space-between', gap: 10, marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--sgt-border,rgba(0,0,0,.07))' }}>
                      <span style={{ ...mFaint, fontSize: 11.5 }}>{r.at} · saldo {SGT_CREDITS[r.provider]}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <MButton kind="ghost" size="sm" full={false}>Rechazar</MButton>
                        <MButton kind="success" size="sm" full={false} icon="Check">Acreditar</MButton>
                      </div>
                    </div>
                  </MCard>
                );
              })}
            </div>
          </div>

          <div>
            <MSectionTitle padding="0 0 0" action={<span style={{ ...mFaint, fontSize: 11.5 }}>Últimos</span>}>Historial</MSectionTitle>
            <MCard padding={0}>
              {SGT_CREDIT_TX.slice(0, 6).map((t, i, a) => {
                const p = SGT_PROVIDERS_BY_ID[t.provider];
                return (
                  <div key={t.id} style={{
                    ...mRow, gap: 11, padding: '12px 14px',
                    borderBottom: i === a.length - 1 ? 'none' : '1px solid var(--sgt-border,rgba(0,0,0,.06))',
                  }}>
                    <Avatar idx={p.faceIdx} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                      <div style={{ ...mFaint, fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.reason}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: t.amount > 0 ? SGT.success : SGT.danger }}>
                        {t.amount > 0 ? '+' : ''}{t.amount}
                      </div>
                      <div style={{ marginTop: 4 }}><StatusChip kind="transaccion" status={t.type} size="sm" /></div>
                    </div>
                  </div>
                );
              })}
            </MCard>
          </div>
          </>)}
        </div>
      </MScreen>

      <div style={{ background: 'var(--sgt-card-bg,#fff)', borderTop: '1px solid var(--sgt-border,rgba(0,0,0,.08))', padding: '12px 16px 8px' }}>
        <MButton kind={tab === 'manual' ? 'primary' : 'ghost'} icon="Plus">Acreditar manual</MButton>
      </div>
      <div style={{ height: 22, background: 'var(--sgt-card-bg,#fff)' }} />

      {/* Drawer de secciones — reemplaza al tab bar en el contexto de back-office */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(9,13,24,.45)',
          backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'flex-end',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 272, height: '100%', background: 'var(--sgt-card-bg,#fff)',
            borderLeft: '1px solid var(--sgt-border,rgba(0,0,0,.08))',
            display: 'flex', flexDirection: 'column', padding: '52px 12px 30px',
          }}>
            <div style={{ ...mRow, justifyContent: 'space-between', padding: '0 8px 14px' }}>
              <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.01em' }}>Administración</span>
              <button onClick={() => setOpen(false)} style={mkIconBtn()}>
                <Icon name="X" size={19} color="var(--sgt-text,#0e1424)" />
              </button>
            </div>
            <div style={{ display: 'grid', gap: 3 }}>
              {nav.map(it => {
                const active = it.id === 'recargas';
                return (
                  <button key={it.id} style={{
                    ...mRow, gap: 12, width: '100%', minHeight: 46, padding: '0 12px', cursor: 'pointer',
                    background: active ? 'var(--sgt-tint,#e6effa)' : 'transparent',
                    color: active ? SGT.blueText : it.prop ? 'var(--sgt-text-sub,#667085)' : 'var(--sgt-text,#0e1424)',
                    border: it.prop ? '1px dashed var(--sgt-border,rgba(0,0,0,.14))' : 'none',
                    borderRadius: 12, fontSize: 14.5, fontWeight: active ? 700 : 500, textAlign: 'left',
                  }}>
                    <Icon name={it.icon} size={19} color={active ? SGT.blue : 'var(--sgt-text-sub,#667085)'} />
                    <span style={{ flex: 1, opacity: it.prop ? .82 : 1 }}>{it.label}</span>
                    {it.prop && <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase',
                      padding: '2px 6px', borderRadius: 5, background: 'var(--sgt-input-bg,#f1f0ec)',
                      color: 'var(--sgt-faint,#9aa3af)', border: '1px dashed var(--sgt-border,rgba(0,0,0,.14))',
                    }}>Futuro</span>}
                    {it.badge && !it.prop ? <span style={{
                      minWidth: 20, height: 20, padding: '0 6px', background: SGT.blue, color: '#fff',
                      fontSize: 11, fontWeight: 700, borderRadius: 999,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>{it.badge}</span> : null}
                  </button>
                );
              })}
            </div>
            <div style={{ flex: 1 }} />
            <button style={{
              ...mRow, gap: 11, width: '100%', minHeight: 46, padding: '0 12px', cursor: 'pointer',
              background: 'transparent', border: 'none', borderRadius: 12,
              color: SGT.danger, fontSize: 14, fontWeight: 600, textAlign: 'left',
            }}>
              <Icon name="LogOut" size={18} color="currentColor" />Salir del panel
            </button>
          </div>
        </div>
      )}
    </MFrameRel>
  );
};

Object.assign(window, {
  MScreenPublicarPedido, MScreenMisPedidos, MScreenDetallePedido,
  MScreenOportunidades, MScreenEnviarCotizacion, MScreenCreditos, MScreenAdminRecargas,
  MTabBarCenter, MExpiry, MSlots, MCredits, TABS_CLIENTE, TABS_PROV,
});
