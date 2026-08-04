// Marketplace de demanda — pedidos, cotizaciones, créditos, recargas.
// Convención: "pedido" = publicación del cliente. "cotización" = oferta del proveedor.
// Al adjudicar, el pedido genera un SERVICIO (entidad de ejecución, ver r*).

const SB_CLIENTE = [
  { id: 'home', label: 'Inicio', icon: 'Home' },
  { id: 'servicios', label: 'Mis servicios', icon: 'ClipboardCheck' },
  { id: 'pedidos', label: 'Mis pedidos', icon: 'Megaphone', badge: 3 },
  { id: 'chat', label: 'Mensajes', icon: 'MessageCircle', badge: 2 },
  { id: 'perfil', label: 'Mi perfil', icon: 'User' },
];
const SB_PROV = [
  { id: 'dash', label: 'Inicio', icon: 'LayoutDashboard' },
  { id: 'oportunidades', label: 'Oportunidades', icon: 'Search', badge: 4 },
  { id: 'trabajos', label: 'Trabajos', icon: 'Briefcase' },
  { id: 'creditos', label: 'Créditos', icon: 'Coins' },
  { id: 'premium', label: 'Premium', icon: 'Crown' },
  { id: 'chat', label: 'Mensajes', icon: 'MessageCircle' },
  { id: 'perfil', label: 'Mi perfil', icon: 'User' },
];
const SB_ADMIN = [
  { id: 'resumen', label: 'Resumen', icon: 'LayoutDashboard' },
  { id: 'recargas', label: 'Recargas', icon: 'Coins', badge: 2 },
  { id: 'usuarios', label: 'Usuarios', icon: 'Users' },
  { id: 'pedidos', label: 'Pedidos', icon: 'Megaphone', proposed: true },
  { id: 'disputas', label: 'Disputas', icon: 'AlertTriangle', proposed: true },
];

const mkRow = { display: 'flex', alignItems: 'center', gap: 10 };
const sub = { color: 'var(--sgt-text-sub, #667085)' };
const faint = { color: 'var(--sgt-faint, #9aa3af)' };
const money = (n) => 'Q' + n.toLocaleString('es-GT');
const qUnit = (n) => 'Q' + n.toFixed(2);
const hrs = (h) => h <= 0 ? 'Expirado' : h >= 24 ? `${Math.floor(h / 24)} d ${String(h % 24).padStart(2, '0')} h` : `${h} h`;

// Barra de expiración (7 días = 168 h)
const ExpiryBar = ({ hoursLeft, width = 120 }) => {
  const pct = Math.max(0, Math.min(1, hoursLeft / 168));
  const c = hoursLeft <= 0 ? SGT.danger : pct < 0.25 ? SGT.amber : SGT.success;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width, height: 5, borderRadius: 999, background: 'var(--sgt-input-bg,#f1f0ec)', overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: c, borderRadius: 999 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: c, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{hrs(hoursLeft)}</span>
    </div>
  );
};

// Medidor de slots 1–6: 3 gratis, 3 pagadas
const SlotMeter = ({ used = 0, showLegend = true }) => (
  <div>
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2, 3, 4, 5].map(i => {
        const filled = i < used, paid = i >= SGT_COT_GRATIS;
        return <div key={i} title={paid ? 'Slot pagado' : 'Slot gratis'} style={{
          width: 26, height: 8, borderRadius: 999,
          background: filled ? (paid ? SGT.amber : SGT.success) : 'var(--sgt-input-bg,#eceae5)',
          boxShadow: filled ? 'none' : `inset 0 0 0 1px var(--sgt-border, rgba(0,0,0,.08))`,
        }} />;
      })}
    </div>
    {showLegend && <div style={{ ...faint, fontSize: 11, marginTop: 6 }}>
      {used}/{SGT_MAX_COTIZACIONES} cotizaciones · las primeras {SGT_COT_GRATIS} son gratis
    </div>}
  </div>
);

const CreditBalance = ({ providerId = 'p1', compact }) => {
  const bal = SGT_CREDITS[providerId] ?? 0;
  const low = bal <= 2;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      background: low ? 'var(--sgt-st-bg-credito-sin_saldo)' : 'var(--sgt-tint, #e6effa)',
      color: low ? 'var(--sgt-st-fg-credito-sin_saldo)' : SGT.blueText,
      fontWeight: 700, fontSize: compact ? 12 : 13,
      padding: compact ? '5px 11px' : '7px 13px', borderRadius: 999,
    }}>
      <Icon name="Coins" size={compact ? 13 : 15} color="currentColor" />
      {bal} {bal === 1 ? 'crédito' : 'créditos'}
      {low && <span style={{ fontWeight: 600, opacity: .85 }}>· recargá</span>}
    </span>
  );
};

// ── 14 · Publicar pedido (cliente, 3 pasos) ────────────────────────
const ScreenPublicarPedido = ({ dark, setDark }) => {
  const [step, setStep] = React.useState(2);
  const [cat, setCat] = React.useState('plomeria');
  const [urg, setUrg] = React.useState('media');
  const [title, setTitle] = React.useState('Fuga en tubería del baño principal');
  const [desc, setDesc] = React.useState('Hay una fuga constante bajo el lavamanos. Ya cerré la llave de paso pero necesito que lo revisen hoy o mañana.');
  const [depto, setDepto] = React.useState('Guatemala');
  const [zone, setZone] = React.useState('Zona 10');
  const steps = ['Qué necesitás', 'Dónde y cuándo', 'Revisar y publicar'];

  return (
    <SgtFrame mode="client" sidebar={SB_CLIENTE} current="pedidos" dark={dark} setDark={setDark} notifCount={3}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-.02em' }}>Publicar un pedido</h1>
          <p style={{ ...sub, margin: 0, fontSize: 14 }}>Describí lo que necesitás y recibí hasta {SGT_MAX_COTIZACIONES} cotizaciones. Tu pedido queda abierto 7 días.</p>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <button onClick={() => setStep(i + 1)} style={{ ...mkRow, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: step > i ? SGT.blue : 'var(--sgt-input-bg,#f1f0ec)',
                  color: step > i ? '#fff' : 'var(--sgt-text-sub,#667085)',
                  fontSize: 13, fontWeight: 700, flexShrink: 0,
                  boxShadow: step === i + 1 ? `0 0 0 4px var(--sgt-tint,#e6effa)` : 'none',
                }}>{step > i + 1 ? <Icon name="Check" size={15} color="#fff" strokeWidth={3} /> : i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: step === i + 1 ? 700 : 500, color: step === i + 1 ? 'var(--sgt-text,#0e1424)' : 'var(--sgt-text-sub,#667085)' }}>{s}</span>
              </button>
              {i < 2 && <div style={{ flex: 1, height: 1, background: 'var(--sgt-border,rgba(0,0,0,.09))', margin: '0 12px' }} />}
            </React.Fragment>
          ))}
        </div>

        <Card padding={24}>
          {step === 1 && (
            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 9 }}>Categoría</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                  {SGT_CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => setCat(c.id)} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 8px',
                      background: cat === c.id ? 'var(--sgt-tint,#e6effa)' : 'var(--sgt-input-bg,#f9f8f5)',
                      border: `1.5px solid ${cat === c.id ? SGT.blue : 'var(--sgt-border,rgba(0,0,0,.08))'}`,
                      borderRadius: 12, cursor: 'pointer',
                    }}>
                      <CatIcon catId={c.id} size={34} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sgt-text,#0e1424)', textAlign: 'center' }}>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 9 }}>Título del pedido</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Fuga en tubería del baño" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 9 }}>Descripción</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={5} style={{
                  width: '100%', padding: 14, borderRadius: 12, fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
                  background: 'var(--sgt-input-bg,#f9f8f5)', color: 'var(--sgt-text,#0e1424)',
                  border: '1px solid var(--sgt-input-border,#d9e2ef)', outline: 'none',
                }} />
                <div style={{ ...faint, fontSize: 11.5, marginTop: 6 }}>Mientras más detalle des, más precisas serán las cotizaciones.</div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 9 }}>Fotos <span style={{ ...faint, fontWeight: 500 }}>(opcional)</span></label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[0, 1].map(i => <img key={i} src={sgtWork(cat, i, 200)} alt="" style={{ width: 84, height: 84, borderRadius: 12, objectFit: 'cover' }} />)}
                  <button style={{
                    width: 84, height: 84, borderRadius: 12, cursor: 'pointer',
                    border: '1.5px dashed var(--sgt-input-border,#d9e2ef)', background: 'transparent',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    color: 'var(--sgt-text-sub,#667085)', fontSize: 11, fontWeight: 600,
                  }}><Icon name="Plus" size={18} color="currentColor" />Agregar</button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 9 }}>Departamento</label>
                  <select value={depto} onChange={e => setDepto(e.target.value)} style={selStyle}>
                    {SGT_DEPTOS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 9 }}>Zona / municipio</label>
                  <select value={zone} onChange={e => setZone(e.target.value)} style={selStyle}>
                    {SGT_ZONES.map(z => <option key={z}>{z}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 9 }}>Dirección</label>
                <Input icon="MapPin" value="6a Avenida 12-34" onChange={() => {}} />
                <div style={{ marginTop: 10 }}><OsmMap height={170} /></div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 9 }}>Urgencia</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['baja', 'Cuando se pueda'], ['media', 'Esta semana'], ['alta', 'Hoy o mañana']].map(([k, help]) => (
                    <button key={k} onClick={() => setUrg(k)} style={{
                      flex: 1, padding: '13px 14px', textAlign: 'left', cursor: 'pointer', borderRadius: 12,
                      background: urg === k ? 'var(--sgt-tint,#e6effa)' : 'var(--sgt-input-bg,#f9f8f5)',
                      border: `1.5px solid ${urg === k ? SGT.blue : 'var(--sgt-border,rgba(0,0,0,.08))'}`,
                    }}>
                      <StatusChip kind="urgencia" status={k} size="sm" />
                      <div style={{ ...sub, fontSize: 12, marginTop: 7 }}>{help}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'grid', gap: 18 }}>
              <div style={{ ...mkRow, gap: 14, alignItems: 'flex-start' }}>
                <CatIcon catId={cat} size={48} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.01em' }}>{title}</div>
                  <div style={{ ...mkRow, gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
                    <StatusChip kind="urgencia" status={urg} size="sm" />
                    <span style={{ ...sub, fontSize: 12.5 }}>{zone} · {depto}</span>
                  </div>
                </div>
              </div>
              <p style={{ ...sub, fontSize: 13.5, lineHeight: 1.6, margin: 0, textWrap: 'pretty' }}>{desc}</p>
              <div style={{ display: 'grid', gap: 11, padding: 16, borderRadius: 12, background: 'var(--sgt-input-bg,#f9f8f5)', border: '1px solid var(--sgt-border,rgba(0,0,0,.07))' }}>
                {[
                  ['Clock', 'Tu pedido queda abierto 7 días', 'Después se cierra automáticamente si no adjudicás.'],
                  ['Users', `Recibís hasta ${SGT_MAX_COTIZACIONES} cotizaciones`, 'Vos elegís la que más te conviene. No estás obligado a aceptar ninguna.'],
                  ['Eye', 'Tu dirección exacta queda oculta', 'Los proveedores solo ven la zona hasta que adjudiques.'],
                ].map(([ic, t, d]) => (
                  <div key={t} style={{ ...mkRow, gap: 11, alignItems: 'flex-start' }}>
                    <Icon name={ic} size={17} color={SGT.blue} style={{ marginTop: 1, flexShrink: 0 }} />
                    <div><div style={{ fontSize: 13, fontWeight: 600 }}>{t}</div><div style={{ ...sub, fontSize: 12.5, marginTop: 2 }}>{d}</div></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--sgt-border,rgba(0,0,0,.08))' }}>
            <Button kind="ghost" icon="ArrowLeft" disabled={step === 1} onClick={() => setStep(s => Math.max(1, s - 1))}>Atrás</Button>
            {step < 3
              ? <Button kind="primary" iconRight="ArrowRight" onClick={() => setStep(s => s + 1)}>Continuar</Button>
              : <Button kind="primary" icon="Megaphone" onClick={() => {}}>Publicar pedido</Button>}
          </div>
        </Card>
      </div>
    </SgtFrame>
  );
};

const selStyle = {
  width: '100%', height: 44, padding: '0 12px', borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
  background: 'var(--sgt-input-bg,#f9f8f5)', color: 'var(--sgt-text,#0e1424)',
  border: '1px solid var(--sgt-input-border,#d9e2ef)', outline: 'none', cursor: 'pointer',
};

// ── 15 · Mis pedidos + Mis servicios (cliente) ─────────────────────
// Segmentado por ENTIDAD: Servicios = en ejecución (venga de contratación directa
// o de un pedido adjudicado). Pedidos = publicaciones esperando cotizaciones.
const ScreenMisPedidos = ({ dark, setDark }) => {
  const [tab, setTab] = React.useState('pedidos');
  const misPedidos = SGT_PEDIDOS.filter(p => p.client === 'Ana Sofía R.');

  return (
    <SgtFrame mode="client" sidebar={SB_CLIENTE} current="pedidos" dark={dark} setDark={setDark} notifCount={3}>
      <div style={{ maxWidth: 940, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 5px', letterSpacing: '-.02em' }}>Mi actividad</h1>
            <p style={{ ...sub, margin: 0, fontSize: 13.5 }}>Los servicios en ejecución y los pedidos esperando cotizaciones.</p>
          </div>
          <Button kind="primary" icon="Megaphone" size="sm">Publicar pedido</Button>
        </div>

        <Tabs value={tab} onChange={setTab} items={[
          { id: 'servicios', label: 'Servicios', icon: 'ClipboardCheck', count: SGT_REQUESTS.length },
          { id: 'pedidos', label: 'Pedidos', icon: 'Megaphone', count: misPedidos.length },
        ]} />

        <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
          {tab === 'servicios' && SGT_REQUESTS.map(r => {
            const p = SGT_PROVIDERS_BY_ID[r.provider];
            const fromPedido = SGT_PEDIDOS.find(pd => pd.serviceId === r.id);
            return (
              <Card key={r.id} hoverable padding={16}>
                <div style={{ ...mkRow, gap: 14, alignItems: 'flex-start' }}>
                  <Avatar idx={p.faceIdx} size={46} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...mkRow, justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em' }}>{r.service}</div>
                      <StatusChip status={r.status} />
                    </div>
                    <div style={{ ...sub, fontSize: 12.5, marginTop: 5 }}>{p.name} · {r.date}</div>
                    <div style={{ ...mkRow, justifyContent: 'space-between', marginTop: 11, gap: 12 }}>
                      <span style={{ ...mkRow, gap: 6, ...faint, fontSize: 12 }}>
                        <Icon name="MapPin" size={13} color="currentColor" />{r.address}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{money(r.amount)}</span>
                    </div>
                    {fromPedido && (
                      <a style={{ ...mkRow, gap: 6, marginTop: 11, fontSize: 12.5, fontWeight: 600, color: SGT.blueText, cursor: 'pointer' }}>
                        <Icon name="Megaphone" size={13} color="currentColor" />
                        Generado desde el pedido «{fromPedido.title}»
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {tab === 'pedidos' && misPedidos.map(pd => {
            const cots = sgtCotsDe(pd.id).filter(c => c.status !== 'retirada');
            const ganadora = cots.find(c => c.status === 'aceptada');
            const gp = ganadora && SGT_PROVIDERS_BY_ID[ganadora.provider];
            return (
              <Card key={pd.id} hoverable padding={16}>
                <div style={{ ...mkRow, gap: 14, alignItems: 'flex-start' }}>
                  <CatIcon catId={pd.cat} size={46} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...mkRow, justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em' }}>{pd.title}</div>
                      <div style={{ ...mkRow, gap: 7 }}>
                        <StatusChip kind="urgencia" status={pd.urgency} size="sm" />
                        <StatusChip kind="pedido" status={pd.status} />
                      </div>
                    </div>
                    <div style={{ ...sub, fontSize: 12.5, marginTop: 5 }}>{pd.zone} · Publicado {pd.publishedAt.toLowerCase()} · {pd.reach} proveedores alcanzados</div>

                    <div style={{ ...mkRow, justifyContent: 'space-between', gap: 16, marginTop: 13, flexWrap: 'wrap' }}>
                      <SlotMeter used={cots.length} />
                      {pd.status === 'abierto' && <ExpiryBar hoursLeft={pd.expiresIn} />}
                    </div>

                    {/* Enlace al servicio generado cuando el pedido fue adjudicado */}
                    {pd.status === 'adjudicado' && pd.serviceId && (
                      <div style={{
                        ...mkRow, gap: 11, marginTop: 13, padding: '11px 13px', borderRadius: 11,
                        background: 'var(--sgt-st-bg-pedido-adjudicado)', border: `1px solid var(--sgt-st-dot-pedido-adjudicado)`,
                      }}>
                        <Icon name="ArrowRightCircle" size={17} color="var(--sgt-st-fg-pedido-adjudicado)" style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sgt-st-fg-pedido-adjudicado)' }}>
                            Este pedido generó un servicio
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--sgt-st-fg-pedido-adjudicado)', opacity: .85, marginTop: 2 }}>
                            {gp?.name} · {money(ganadora.amount)}
                          </div>
                        </div>
                        <Button kind="secondary" size="sm" iconRight="ArrowRight">Ver servicio</Button>
                      </div>
                    )}

                    <div style={{ ...mkRow, justifyContent: 'space-between', marginTop: 13, gap: 12 }}>
                      <span style={{ ...sub, fontSize: 12.5, fontWeight: 600 }}>
                        {cots.length === 0 ? 'Sin cotizaciones aún'
                          : `${cots.length} ${cots.length === 1 ? 'cotización' : 'cotizaciones'} · desde ${money(Math.min(...cots.map(c => c.amount)))}`}
                      </span>
                      <Button kind={pd.status === 'abierto' && cots.length ? 'primary' : 'ghost'} size="sm" iconRight="ChevronRight">
                        {pd.status === 'abierto' && cots.length ? 'Ver cotizaciones' : 'Ver pedido'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </SgtFrame>
  );
};

// ── 16 · Detalle de pedido + cotizaciones (cliente) ────────────────
const ScreenDetallePedido = ({ dark, setDark }) => {
  const pd = sgtPedido('pd1');
  const cots = sgtCotsDe(pd.id);
  const [sel, setSel] = React.useState(null);
  const cheapest = Math.min(...cots.map(c => c.amount));
  const bestRated = cots.reduce((a, c) => (SGT_PROVIDERS_BY_ID[c.provider].rating > SGT_PROVIDERS_BY_ID[a.provider].rating ? c : a), cots[0]);

  return (
    <SgtFrame mode="client" sidebar={SB_CLIENTE} current="pedidos" dark={dark} setDark={setDark} notifCount={3}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <a style={{ ...mkRow, gap: 6, ...sub, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>
          <Icon name="ArrowLeft" size={15} color="currentColor" />Mis pedidos
        </a>

        <Card padding={22} style={{ marginBottom: 20 }}>
          <div style={{ ...mkRow, gap: 16, alignItems: 'flex-start' }}>
            <CatIcon catId={pd.cat} size={52} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...mkRow, justifyContent: 'space-between', gap: 14 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-.02em' }}>{pd.title}</h1>
                <div style={{ ...mkRow, gap: 7 }}>
                  <StatusChip kind="urgencia" status={pd.urgency} size="sm" />
                  <StatusChip kind="pedido" status={pd.status} />
                </div>
              </div>
              <div style={{ ...sub, fontSize: 13, marginTop: 7 }}>{pd.zone} · {pd.depto} · Publicado {pd.publishedAt.toLowerCase()}</div>
              <p style={{ ...sub, fontSize: 13.5, lineHeight: 1.6, margin: '13px 0 0', textWrap: 'pretty' }}>{pd.desc}</p>
              <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
                {[0, 1, 2].map(i => <img key={i} src={sgtWork(pd.cat, i, 240)} alt="" style={{ width: 92, height: 70, borderRadius: 10, objectFit: 'cover' }} />)}
              </div>
              <div style={{ display: 'flex', gap: 26, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--sgt-border,rgba(0,0,0,.08))', flexWrap: 'wrap' }}>
                <div><div style={{ ...faint, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 7 }}>Cotizaciones</div><SlotMeter used={cots.filter(c => c.status !== 'retirada').length} /></div>
                <div><div style={{ ...faint, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 7 }}>Expira en</div><ExpiryBar hoursLeft={pd.expiresIn} width={140} /></div>
                <div><div style={{ ...faint, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 7 }}>Alcance</div><div style={{ fontSize: 14, fontWeight: 700 }}>{pd.reach} proveedores</div></div>
              </div>
            </div>
          </div>
        </Card>

        <SectionTitle action={<span style={{ ...sub, fontSize: 12.5 }}>Ordenadas por llegada</span>}>
          Cotizaciones recibidas ({cots.length})
        </SectionTitle>

        <div style={{ display: 'grid', gap: 12 }}>
          {cots.map(c => {
            const p = SGT_PROVIDERS_BY_ID[c.provider];
            const active = sel === c.id;
            return (
              <Card key={c.id} padding={0} style={{
                overflow: 'hidden',
                border: `1.5px solid ${active ? SGT.blue : 'var(--sgt-border,rgba(0,0,0,.08))'}`,
                boxShadow: active ? `0 0 0 3px var(--sgt-tint,#e6effa)` : undefined,
              }}>
                <div style={{ padding: 16 }}>
                  <div style={{ ...mkRow, gap: 14, alignItems: 'flex-start' }}>
                    <Avatar idx={p.faceIdx} size={48} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...mkRow, justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ ...mkRow, gap: 7, minWidth: 0 }}>
                          <span style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</span>
                          {p.verified && <VerifiedBadge size={12} />}
                        </div>
                        <div style={{ ...mkRow, gap: 8 }}>
                          {c.amount === cheapest && <StatusChip kind="etiqueta" status="barata" size="sm" />}
                          {c.id === bestRated.id && <StatusChip kind="etiqueta" status="mejor" size="sm" />}
                          <StatusChip kind="cotizacion" status={c.status} size="sm" />
                        </div>
                      </div>
                      <div style={{ ...mkRow, gap: 10, marginTop: 6 }}>
                        <Stars value={p.rating} size={13} />
                        <span style={{ ...sub, fontSize: 12.5 }}>{p.rating} · {p.reviews} reseñas · {p.exp} años · {p.zone}</span>
                      </div>
                      <p style={{ ...sub, fontSize: 13, lineHeight: 1.6, margin: '12px 0 0', textWrap: 'pretty' }}>{c.message}</p>
                      <div style={{ ...mkRow, justifyContent: 'space-between', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em' }}>{money(c.amount)}</div>
                          <div style={{ ...faint, fontSize: 11.5, marginTop: 2 }}>Cotización {c.slot} de {SGT_MAX_COTIZACIONES} · {c.sentAt.toLowerCase()}</div>
                        </div>
                        <div style={{ ...mkRow, gap: 9 }}>
                          <Button kind="ghost" size="sm" icon="MessageCircle">Preguntar</Button>
                          <Button kind={active ? 'success' : 'primary'} size="sm" icon={active ? 'Check' : undefined}
                                  onClick={() => setSel(active ? null : c.id)}>
                            {active ? 'Seleccionada' : 'Elegir esta'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {active && (
                  <div style={{ padding: '13px 16px', background: 'var(--sgt-st-bg-servicio-completada)', borderTop: `1px solid var(--sgt-st-dot-servicio-completada)`, ...mkRow, gap: 11 }}>
                    <Icon name="Info" size={16} color="var(--sgt-st-fg-servicio-completada)" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12.5, color: 'var(--sgt-st-fg-servicio-completada)', lineHeight: 1.5 }}>
                      Al adjudicar se crea un <b>servicio</b> con {p.name}, se comparte tu dirección exacta y las demás cotizaciones se marcan como rechazadas.
                    </div>
                    <Button kind="success" size="sm" icon="Handshake">Adjudicar pedido</Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </SgtFrame>
  );
};


// ── 17 · Oportunidades (proveedor) ─────────────────────────────────
const ScreenOportunidades = ({ dark, setDark }) => {
  const ME = 'p1';
  const [tab, setTab] = React.useState('abiertas');
  const [cat, setCat] = React.useState('todas');
  const abiertas = SGT_PEDIDOS.filter(p => p.status === 'abierto' && (cat === 'todas' || p.cat === cat));
  const mias = SGT_COTIZACIONES.filter(c => c.provider === ME);

  return (
    <SgtFrame mode="provider" sidebar={SB_PROV} current="oportunidades" dark={dark} setDark={setDark} notifCount={4}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 5px', letterSpacing: '-.02em' }}>Oportunidades</h1>
            <p style={{ ...sub, margin: 0, fontSize: 13.5 }}>Pedidos abiertos en tus categorías y zonas, y las cotizaciones que ya enviaste.</p>
          </div>
          <CreditBalance providerId={ME} />
        </div>

        <Tabs value={tab} onChange={setTab} items={[
          { id: 'abiertas', label: 'Abiertas', icon: 'Search', count: abiertas.length },
          { id: 'mias', label: 'Mis cotizaciones', icon: 'FileText', count: mias.length },
        ]} />

        {tab === 'abiertas' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {[{ id: 'todas', name: 'Todas' }, ...SGT_CATEGORIES.slice(0, 5)].map(c => (
                <button key={c.id} onClick={() => setCat(c.id)} style={{
                  height: 32, padding: '0 13px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                  background: cat === c.id ? SGT.blue : 'var(--sgt-card-bg,#f6f4ee)',
                  color: cat === c.id ? '#fff' : 'var(--sgt-text-sub,#667085)',
                  border: `1px solid ${cat === c.id ? SGT.blue : 'var(--sgt-border,rgba(0,0,0,.09))'}`,
                }}>{c.name}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              {abiertas.map(pd => {
                const cots = sgtCotsDe(pd.id).filter(c => c.status !== 'retirada');
                const costo = sgtCostoSiguiente(pd.id);
                const yaCotice = cots.some(c => c.provider === ME);
                const saldo = SGT_CREDITS[ME] ?? 0;
                const slotKey = costo === null ? 'limite' : yaCotice ? null : costo === 0 ? 'gratis' : (saldo > 0 ? 'pagada' : 'sin_saldo');
                return (
                  <Card key={pd.id} hoverable padding={16}>
                    <div style={{ ...mkRow, gap: 14, alignItems: 'flex-start' }}>
                      <CatIcon catId={pd.cat} size={46} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...mkRow, justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em' }}>{pd.title}</div>
                          <div style={{ ...mkRow, gap: 7 }}>
                            <StatusChip kind="urgencia" status={pd.urgency} size="sm" />
                            {slotKey && <StatusChip kind="credito" status={slotKey} size="sm" />}
                          </div>
                        </div>
                        <div style={{ ...sub, fontSize: 12.5, marginTop: 5 }}>{pd.zone} · {pd.depto} · {pd.publishedAt}</div>
                        <p style={{ ...sub, fontSize: 13, lineHeight: 1.55, margin: '10px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{pd.desc}</p>
                        <div style={{ ...mkRow, justifyContent: 'space-between', gap: 16, marginTop: 13, flexWrap: 'wrap' }}>
                          <SlotMeter used={cots.length} />
                          <ExpiryBar hoursLeft={pd.expiresIn} />
                        </div>
                        <div style={{ ...mkRow, justifyContent: 'flex-end', gap: 9, marginTop: 13 }}>
                          <Button kind="ghost" size="sm">Ver detalle</Button>
                          {yaCotice
                            ? <Button kind="secondary" size="sm" icon="Check" disabled>Ya cotizaste</Button>
                            : costo === null
                              ? <Button kind="ghost" size="sm" disabled>Cupo lleno</Button>
                              : <Button kind="primary" size="sm" icon="Send">
                                  {costo === 0 ? 'Cotizar gratis' : 'Cotizar · 1 crédito'}
                                </Button>}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {tab === 'mias' && (
          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            <Card padding={15} style={{ background: 'var(--sgt-input-bg,#f9f8f5)' }}>
              <div style={{ ...mkRow, gap: 22, flexWrap: 'wrap' }}>
                {[
                  ['Enviadas', mias.filter(c => c.status === 'enviada').length, SGT.blue],
                  ['Aceptadas', mias.filter(c => c.status === 'aceptada').length, SGT.success],
                  ['Rechazadas', mias.filter(c => c.status === 'rechazada').length, SGT.danger],
                  ['Créditos usados', mias.reduce((s, c) => s + c.credit, 0), SGT.amber],
                ].map(([l, v, c]) => (
                  <div key={l}>
                    <div style={{ ...faint, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{l}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: c, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>

            {mias.map(c => {
              const pd = sgtPedido(c.pedido);
              const rivales = sgtCotsDe(c.pedido).filter(x => x.status !== 'retirada');
              const menor = Math.min(...rivales.map(x => x.amount));
              return (
                <Card key={c.id} hoverable padding={16}>
                  <div style={{ ...mkRow, gap: 14, alignItems: 'flex-start' }}>
                    <CatIcon catId={pd.cat} size={46} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...mkRow, justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em' }}>{pd.title}</div>
                        <div style={{ ...mkRow, gap: 7 }}>
                          <StatusChip kind="credito" status={c.credit ? 'pagada' : 'gratis'} size="sm"
                                      label={c.credit ? '1 crédito usado' : 'Slot gratis'} />
                          <StatusChip kind="cotizacion" status={c.status} size="sm" />
                        </div>
                      </div>
                      <div style={{ ...sub, fontSize: 12.5, marginTop: 5 }}>
                        {pd.zone} · Cotizada {c.sentAt.toLowerCase()} · slot {c.slot} de {SGT_MAX_COTIZACIONES}
                      </div>
                      <p style={{ ...sub, fontSize: 13, lineHeight: 1.55, margin: '10px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.message}</p>

                      <div style={{ ...mkRow, justifyContent: 'space-between', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
                        <div style={{ ...mkRow, gap: 22 }}>
                          <div>
                            <div style={{ ...faint, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Tu oferta</div>
                            <div style={{ fontSize: 19, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{money(c.amount)}</div>
                          </div>
                          <div>
                            <div style={{ ...faint, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Compitiendo con</div>
                            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 5 }}>
                              {rivales.length - 1} más · desde {money(menor)}
                              {c.amount === menor && <span style={{ marginLeft: 8 }}><StatusChip kind="etiqueta" status="baja" size="sm" /></span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ ...mkRow, gap: 9 }}>
                          {c.status === 'enviada' && <Button kind="ghost" size="sm" icon="X">Retirar</Button>}
                          {c.status === 'aceptada'
                            ? <Button kind="success" size="sm" iconRight="ArrowRight">Ver servicio</Button>
                            : <Button kind="secondary" size="sm" iconRight="ChevronRight">Ver pedido</Button>}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SgtFrame>
  );
};

// ── 18 · Enviar cotización (proveedor) ─────────────────────────────
const ScreenEnviarCotizacion = ({ dark, setDark }) => {
  const ME = 'p1', pd = sgtPedido('pd7');
  const [amount, setAmount] = React.useState('320');
  const [msg, setMsg] = React.useState('Puedo pasar mañana en la mañana. El diagnóstico se abona al costo de la reparación si aceptás el presupuesto.');
  const cots = sgtCotsDe(pd.id).filter(c => c.status !== 'retirada');
  const costo = sgtCostoSiguiente(pd.id);
  const saldo = SGT_CREDITS[ME] ?? 0;
  const puede = costo !== null && (costo === 0 || saldo > 0);

  return (
    <SgtFrame mode="provider" sidebar={SB_PROV} current="oportunidades" dark={dark} setDark={setDark} notifCount={4}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <a style={{ ...mkRow, gap: 6, ...sub, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>
          <Icon name="ArrowLeft" size={15} color="currentColor" />Oportunidades
        </a>

        <Card padding={18} style={{ marginBottom: 16 }}>
          <div style={{ ...mkRow, gap: 14, alignItems: 'flex-start' }}>
            <CatIcon catId={pd.cat} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.01em' }}>{pd.title}</div>
              <div style={{ ...sub, fontSize: 12.5, marginTop: 4 }}>{pd.zone} · {pd.depto} · {pd.publishedAt}</div>
              <p style={{ ...sub, fontSize: 13, lineHeight: 1.55, margin: '10px 0 0' }}>{pd.desc}</p>
            </div>
            <StatusChip kind="urgencia" status={pd.urgency} size="sm" />
          </div>
        </Card>

        {/* Costo del slot — la decisión económica, arriba del formulario */}
        <Card padding={17} style={{ marginBottom: 16, borderColor: costo === 0 ? 'var(--sgt-st-dot-credito-gratis)' : 'var(--sgt-st-dot-credito-pagada)' }}>
          <div style={{ ...mkRow, justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <div style={{ ...mkRow, gap: 9 }}>
                <StatusChip kind="credito" status={costo === null ? 'limite' : costo === 0 ? 'gratis' : (saldo ? 'pagada' : 'sin_saldo')} />
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                  Serías la cotización {cots.length + 1} de {SGT_MAX_COTIZACIONES}
                </span>
              </div>
              <div style={{ ...sub, fontSize: 12.5, marginTop: 8, maxWidth: 380, lineHeight: 1.5 }}>
                {costo === 0
                  ? `Las primeras ${SGT_COT_GRATIS} cotizaciones de cada pedido no consumen créditos.`
                  : `Este pedido ya tiene ${cots.length} cotizaciones. De la ${SGT_COT_GRATIS + 1}ª a la ${SGT_MAX_COTIZACIONES}ª se cobra 1 crédito, se descuenta al enviar y no se devuelve si el cliente elige a otro.`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <SlotMeter used={cots.length} showLegend={false} />
              <div style={{ marginTop: 10 }}><CreditBalance providerId={ME} compact /></div>
            </div>
          </div>
        </Card>

        <Card padding={22}>
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 9 }}>Monto que ofertás</label>
              <Input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} type="text"
                     icon="Coins" rightSlot={<span style={{ ...faint, fontSize: 12.5, fontWeight: 600 }}>GTQ</span>} />
              <div style={{ ...faint, fontSize: 11.5, marginTop: 6 }}>
                {cots.length ? `Las cotizaciones actuales van de ${money(Math.min(...cots.map(c => c.amount)))} a ${money(Math.max(...cots.map(c => c.amount)))}.` : 'Sos el primero en cotizar.'}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 9 }}>Qué incluye tu oferta</label>
              <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5} style={{
                width: '100%', padding: 14, borderRadius: 12, fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
                background: 'var(--sgt-input-bg,#f9f8f5)', color: 'var(--sgt-text,#0e1424)',
                border: '1px solid var(--sgt-input-border,#d9e2ef)', outline: 'none',
              }} />
              <div style={{ ...faint, fontSize: 11.5, marginTop: 6 }}>Aclarar materiales, garantía y disponibilidad sube mucho la probabilidad de ser elegido.</div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 9 }}>Disponibilidad</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['Hoy', 'Mañana', 'Esta semana'].map((d, i) => (
                  <button key={d} style={{
                    flex: 1, height: 42, borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: i === 1 ? 'var(--sgt-tint,#e6effa)' : 'var(--sgt-input-bg,#f9f8f5)',
                    color: i === 1 ? SGT.blueText : 'var(--sgt-text-sub,#667085)',
                    border: `1.5px solid ${i === 1 ? SGT.blue : 'var(--sgt-border,rgba(0,0,0,.08))'}`,
                  }}>{d}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--sgt-border,rgba(0,0,0,.08))' }}>
            <span style={{ ...sub, fontSize: 12.5 }}>
              {costo === 0 ? 'No se descuentan créditos.' : `Al enviar se descuenta 1 crédito · quedarían ${Math.max(0, saldo - 1)}.`}
            </span>
            <div style={{ ...mkRow, gap: 10 }}>
              <Button kind="ghost">Cancelar</Button>
              <Button kind="primary" icon="Send" disabled={!puede}>
                {costo === 0 ? 'Enviar cotización' : 'Enviar · 1 crédito'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </SgtFrame>
  );
};

// ── 19 · Créditos (proveedor) ──────────────────────────────────────
const ScreenCreditos = ({ dark, setDark }) => {
  const ME = 'p1', bal = SGT_CREDITS[ME];
  const tx = SGT_CREDIT_TX;
  const packs = SGT_PACKS;
  return (
    <SgtFrame mode="provider" sidebar={SB_PROV} current="creditos" dark={dark} setDark={setDark} notifCount={4}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 5px', letterSpacing: '-.02em' }}>Créditos</h1>
        <p style={{ ...sub, margin: '0 0 20px', fontSize: 13.5 }}>Un crédito equivale a una cotización en un pedido que ya recibió {SGT_COT_GRATIS} ofertas.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14, marginBottom: 22 }}>
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <div className="sgt-grad" style={{ padding: 22, color: '#fff' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', opacity: .85 }}>Saldo disponible</div>
              <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-.03em', marginTop: 6, lineHeight: 1 }}>{bal}</div>
              <div style={{ fontSize: 13, opacity: .9, marginTop: 8 }}>≈ {bal} cotizaciones en pedidos con cupo pagado</div>
            </div>
            <div style={{ padding: 16, display: 'flex', gap: 10 }}>
              <Button kind="primary" size="sm" icon="ShoppingCart" full>Comprar créditos</Button>
              <Button kind="ghost" size="sm" icon="HelpCircle">Cómo funciona</Button>
            </div>
          </Card>
          <Card padding={18}>
            <div style={{ ...faint, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Este mes</div>
            <div style={{ display: 'grid', gap: 13 }}>
              {[['Cotizaciones enviadas', '9'], ['Gratis (slots 1–3)', '7'], ['Con crédito (slots 4–6)', '2'], ['Adjudicadas', '3'], ['Tasa de éxito', '33%']].map(([l, v]) => (
                <div key={l} style={{ ...mkRow, justifyContent: 'space-between' }}>
                  <span style={{ ...sub, fontSize: 13 }}>{l}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <SectionTitle action={<span style={{ ...faint, fontSize: 12 }}>Acreditación inmediata · compra simulada</span>}>Paquetes</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(212px, 1fr))', gap: 12, marginBottom: 14 }}>
          {packs.map(p => {
            const best = p.tag === 'popular';
            return (
              <Card key={p.id} hoverable padding={18} style={{ position: 'relative', display: 'flex', flexDirection: 'column', borderColor: best ? SGT.blue : undefined, boxShadow: best ? '0 4px 16px rgba(69,137,212,.16)' : undefined }}>
                <div style={{ minHeight: 22 }}>
                  {p.tag && <StatusChip kind="etiqueta" status={p.tag} size="sm" />}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 10 }}>{p.name}</div>
                <div style={{ ...mkRow, gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{p.n}</span>
                  <span style={{ ...sub, fontSize: 12.5 }}>créditos</span>
                </div>
                <div style={{ fontSize: 21, fontWeight: 700, marginTop: 14, fontVariantNumeric: 'tabular-nums' }}>{money(p.price)}</div>
                <div style={{ ...faint, fontSize: 11.5, marginTop: 3 }}>≈ US${(p.price / SGT_USD).toFixed(0)} aprox.</div>
                <div style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--sgt-border,rgba(0,0,0,.07))', display: 'grid', gap: 5 }}>
                  <div style={{ ...mkRow, justifyContent: 'space-between' }}>
                    <span style={{ ...sub, fontSize: 12 }}>Por crédito</span>
                    <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{qUnit(p.unit)}</span>
                  </div>
                  <div style={{ ...mkRow, justifyContent: 'space-between' }}>
                    <span style={{ ...sub, fontSize: 12 }}>vs. Inicial</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: p.save ? SGT.success : 'var(--sgt-faint,#9aa3af)' }}>
                      {p.save ? `${p.save}% menos` : 'precio base'}
                    </span>
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ marginTop: 14 }}><Button kind={best ? 'primary' : 'secondary'} size="sm" full>Comprar</Button></div>
              </Card>
            );
          })}
        </div>
        <div style={{ ...mkRow, justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 24, padding: '12px 15px', borderRadius: 12, border: '1px dashed var(--sgt-border,rgba(0,0,0,.14))' }}>
          <div style={{ minWidth: 220, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>¿Pagaste por transferencia o en efectivo?</div>
            <div style={{ ...sub, fontSize: 12.5, marginTop: 3 }}>Vía asistida: el administrador confirma el pago y acredita los créditos a mano. Tarda más que comprar aquí.</div>
          </div>
          <Button kind="ghost" size="sm" icon="Headset">Pedir acreditación al admin</Button>
        </div>

        <SectionTitle action={<Button kind="ghost" size="sm" icon="Download">Exportar</Button>}>Movimientos</SectionTitle>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{['Fecha', 'Concepto', 'Origen', 'Créditos'].map((h, i) => (
                <th key={h} style={{
                  textAlign: i === 3 ? 'right' : 'left', ...faint, fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '.06em', padding: '13px 16px',
                  borderBottom: '1px solid var(--sgt-border,rgba(0,0,0,.08))',
                }}>{h}</th>))}</tr>
            </thead>
            <tbody>
              {tx.map(t => (
                <tr key={t.id}>
                  <td style={tdSt()}><span style={{ ...sub, fontVariantNumeric: 'tabular-nums' }}>{t.date}</span></td>
                  <td style={tdSt()}>{t.reason}</td>
                  <td style={tdSt()}><span style={{ ...faint, textTransform: 'capitalize' }}>{t.by || t.type}</span></td>
                  <td style={{ ...tdSt(), textAlign: 'right' }}>
                    <span style={{
                      fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                      color: t.amount > 0 ? SGT.success : SGT.danger,
                    }}>{t.amount > 0 ? '+' : ''}{t.amount}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </SgtFrame>
  );
};

const tdSt = () => ({ padding: '13px 16px', borderBottom: '1px solid var(--sgt-border,rgba(0,0,0,.06))', verticalAlign: 'middle' });

// ── 20 · Admin · recargas ──────────────────────────────────────────
const ScreenAdminRecargas = ({ dark, setDark }) => {
  const [q, setQ] = React.useState('');
  const [tab, setTab] = React.useState('compras');
  const [fEstado, setFEstado] = React.useState('todos');
  const premiumRows = SGT_PROVIDERS.filter(p => sgtPremium(p.id).estado !== 'nunca').concat(SGT_PROVIDERS.filter(p => sgtPremium(p.id).estado === 'nunca').slice(0, 3));
  const pend = [
    { id: 'rq1', provider: 'p3', n: 15, price: 270, method: 'Transferencia BI', ref: '88213', at: 'Hace 20 min' },
    { id: 'rq2', provider: 'p5', n: 5, price: 100, method: 'Efectivo en oficina', ref: '—', at: 'Hace 2 h' },
  ];
  return (
    <SgtFrame mode="admin" sidebar={SB_ADMIN} current="recargas" dark={dark} setDark={setDark} notifCount={2}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 5px', letterSpacing: '-.02em' }}>Créditos y Premium</h1>
            <p style={{ ...sub, margin: 0, fontSize: 13.5 }}>Las compras se acreditan solas. La acreditación manual queda para pagos fuera de la app.</p>
          </div>
          <Button kind="ghost" size="sm" icon="Plus">Acreditar manual</Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
          <KPI label="Compras del mes" value="64" delta="+18%" icon="ShoppingCart" accent={SGT.blue} />
          <KPI label="Créditos vendidos" value="185" delta="+12%" icon="Coins" accent={SGT.blue} />
          <KPI label="Premium activos" value="2" delta="+1 este mes" icon="Crown" accent="#c2810b" />
          <KPI label="Manuales pendientes" value="2" icon="Clock" accent={SGT.amber} />
          <KPI label="Ingreso del mes" value={money(18400)} delta="+8%" icon="TrendingUp" accent={SGT.success} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <Tabs value={tab} onChange={setTab} items={[
            { id: 'compras', label: 'Compras auto-acreditadas', icon: 'ShoppingCart', count: SGT_COMPRAS.length },
            { id: 'manual', label: 'Acreditación manual', icon: 'Headset', count: 2 },
            { id: 'premium', label: 'Premium', icon: 'Crown', count: 2 },
          ]} />
        </div>

        {tab === 'compras' && (
          <>
            <SectionTitle action={
              <div style={{ ...mkRow, gap: 6 }}>
                {['todos', 'pendiente', 'completada', 'fallida', 'cancelada'].map(e => (
                  <button key={e} onClick={() => setFEstado(e)} style={{
                    height: 30, padding: '0 11px', borderRadius: 999, cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                    background: fEstado === e ? SGT.blue : 'var(--sgt-card-bg,#fff)',
                    color: fEstado === e ? '#fff' : 'var(--sgt-text-sub,#667085)',
                    border: `1px solid ${fEstado === e ? SGT.blue : 'var(--sgt-border,rgba(0,0,0,.09))'}`,
                  }}>{e}</button>
                ))}
              </div>
            }>Compras</SectionTitle>
            <Card padding={0} style={{ overflow: 'hidden', marginBottom: 26 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>{['Proveedor', 'Paquete', 'Créditos', 'Monto', 'Estado', 'Fecha', 'Referencia'].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 2 || i === 3 ? 'right' : 'left', ...faint, fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '.06em', padding: '13px 16px',
                      borderBottom: '1px solid var(--sgt-border,rgba(0,0,0,.08))',
                    }}>{h}</th>))}</tr>
                </thead>
                <tbody>
                  {SGT_COMPRAS.filter(c => fEstado === 'todos' || c.status === fEstado).map(c => {
                    const p = SGT_PROVIDERS_BY_ID[c.provider];
                    return (
                      <tr key={c.id}>
                        <td style={tdSt()}>
                          <span style={{ ...mkRow, gap: 9 }}>
                            <Avatar idx={p.faceIdx} size={28} />
                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                            {sgtPremium(c.provider).estado === 'activo' && <PremiumBadge variant="icon" size={11} />}
                          </span>
                        </td>
                        <td style={tdSt()}>{sgtPack(c.pack).name}</td>
                        <td style={{ ...tdSt(), textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                          {c.status === 'completada' ? `+${c.n}` : <span style={faint}>{c.n}</span>}
                        </td>
                        <td style={{ ...tdSt(), textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(c.amount)}</td>
                        <td style={tdSt()}><StatusChip kind="compra" status={c.status} size="sm" /></td>
                        <td style={tdSt()}><span style={{ ...sub, fontVariantNumeric: 'tabular-nums' }}>{c.date}</span></td>
                        <td style={tdSt()}><span style={{ ...faint, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}>{c.ref}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </>
        )}

        {tab === 'premium' && (
          <>
            <SectionTitle action={<span style={{ ...faint, fontSize: 12 }}>{money(SGT_PREMIUM.price)}/mes · {SGT_PREMIUM.dias} días · {SGT_PREMIUM.creditos} créditos incluidos</span>}>Proveedores y su Premium</SectionTitle>
            <Card padding={0} style={{ overflow: 'hidden', marginBottom: 26 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>{['Proveedor', 'Verificación', 'Premium', 'Vigencia', 'Renovaciones', 'Saldo'].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i >= 4 ? 'right' : 'left', ...faint, fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '.06em', padding: '13px 16px',
                      borderBottom: '1px solid var(--sgt-border,rgba(0,0,0,.08))',
                    }}>{h}</th>))}</tr>
                </thead>
                <tbody>
                  {premiumRows.map(p => {
                    const pr = sgtPremium(p.id);
                    return (
                      <tr key={p.id}>
                        <td style={tdSt()}>
                          <span style={{ ...mkRow, gap: 9 }}>
                            <Avatar idx={SGT_PROVIDERS.indexOf(p)} size={28} />
                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                          </span>
                        </td>
                        <td style={tdSt()}>{p.verified
                          ? <span style={{ ...mkRow, gap: 6, fontSize: 12.5 }}><VerifiedBadge size={11} />Verificado</span>
                          : <span style={{ ...faint, fontSize: 12.5 }}>Sin verificar</span>}</td>
                        <td style={tdSt()}><StatusChip kind="premium" status={pr.estado} size="sm" /></td>
                        <td style={tdSt()}>
                          {pr.estado === 'nunca'
                            ? <span style={faint}>—</span>
                            : <span style={{ ...sub, fontVariantNumeric: 'tabular-nums' }}>
                                {pr.desde} → {pr.hasta}
                                {pr.estado === 'activo' && <span style={{ color: pr.diasRestantes <= 10 ? SGT.warn : SGT.success, fontWeight: 700 }}> · {pr.diasRestantes} d</span>}
                              </span>}
                        </td>
                        <td style={{ ...tdSt(), textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pr.renovaciones ?? <span style={faint}>—</span>}</td>
                        <td style={{ ...tdSt(), textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{SGT_CREDITS[p.id]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </>
        )}

        {tab === 'manual' && (<>
        <SectionTitle>Solicitudes pendientes</SectionTitle>
        <div style={{ display: 'grid', gap: 12, marginBottom: 26 }}>
          {pend.map(r => {
            const p = SGT_PROVIDERS_BY_ID[r.provider];
            return (
              <Card key={r.id} padding={16} style={{ borderColor: 'var(--sgt-st-dot-credito-pagada)' }}>
                <div style={{ ...mkRow, gap: 14 }}>
                  <Avatar idx={p.faceIdx} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...mkRow, gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</span>
                      {p.verified && <VerifiedBadge size={12} />}
                      <span style={{ ...faint, fontSize: 12 }}>· saldo actual {SGT_CREDITS[r.provider]}</span>
                    </div>
                    <div style={{ ...sub, fontSize: 12.5, marginTop: 5 }}>
                      {r.method} · Ref. {r.ref} · {r.at}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 19, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>+{r.n}</div>
                    <div style={{ ...faint, fontSize: 12 }}>{money(r.price)}</div>
                  </div>
                  <div style={{ ...mkRow, gap: 9 }}>
                    <Button kind="ghost" size="sm">Rechazar</Button>
                    <Button kind="success" size="sm" icon="Check">Acreditar</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <SectionTitle action={<div style={{ width: 260 }}><Input icon="Search" placeholder="Buscar proveedor o boleta…" value={q} onChange={e => setQ(e.target.value)} /></div>}>
          Historial
        </SectionTitle>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{['Proveedor', 'Concepto', 'Fecha', 'Tipo', 'Créditos'].map((h, i) => (
                <th key={h} style={{
                  textAlign: i === 4 ? 'right' : 'left', ...faint, fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '.06em', padding: '13px 16px',
                  borderBottom: '1px solid var(--sgt-border,rgba(0,0,0,.08))',
                }}>{h}</th>))}</tr>
            </thead>
            <tbody>
              {SGT_CREDIT_TX.filter(t => !q || SGT_PROVIDERS_BY_ID[t.provider].name.toLowerCase().includes(q.toLowerCase()) || t.reason.toLowerCase().includes(q.toLowerCase())).map(t => {
                const p = SGT_PROVIDERS_BY_ID[t.provider];
                return (
                  <tr key={t.id}>
                    <td style={tdSt()}>
                      <span style={{ ...mkRow, gap: 9 }}><Avatar idx={p.faceIdx} size={28} /><span style={{ fontWeight: 600 }}>{p.name}</span></span>
                    </td>
                    <td style={tdSt()}>{t.reason}</td>
                    <td style={tdSt()}><span style={{ ...sub, fontVariantNumeric: 'tabular-nums' }}>{t.date}</span></td>
                    <td style={tdSt()}>
                      <StatusChip kind="transaccion" status={t.type} size="sm" />
                    </td>
                    <td style={{ ...tdSt(), textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: t.amount > 0 ? SGT.success : SGT.danger }}>
                        {t.amount > 0 ? '+' : ''}{t.amount}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        </>)}
      </div>
    </SgtFrame>
  );
};

Object.assign(window, {
  ScreenPublicarPedido, ScreenMisPedidos, ScreenDetallePedido,
  ScreenOportunidades, ScreenEnviarCotizacion, ScreenCreditos, ScreenAdminRecargas,
  ExpiryBar, SlotMeter, CreditBalance, SB_CLIENTE, SB_PROV, SB_ADMIN,
});
