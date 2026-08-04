// Monetización — móvil. Checkout como bottom sheet sobre Créditos y Premium en sus 3 estados.
// Sin campos bancarios: la compra es simulada. Sin slots nuevos en el tab bar.

const mzmSub = { color: 'var(--sgt-text-sub, #667085)' };
const mzmFaint = { color: 'var(--sgt-faint, #9aa3af)' };
const mzmRow = { display: 'flex', alignItems: 'center', gap: 10 };
const mzmQ = (n) => 'Q' + n.toLocaleString('es-GT');
const mzmNum = { fontVariantNumeric: 'tabular-nums' };
const mzmHair = '1px solid var(--sgt-border,rgba(0,0,0,.06))';

const mzmIconBtn = () => ({
  width: 36, height: 36, borderRadius: 10, display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: '1px solid var(--sgt-border,#eef0f4)', cursor: 'pointer',
});

// Frame relativo para overlays (sheet).
const MzmFrameRel = ({ children }) => (
  <div data-sgt-frame style={{
    position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    background: 'var(--sgt-bg,#f6f4ee)', color: 'var(--sgt-text,#0e1424)', overflow: 'hidden',
  }}>{children}</div>
);

const MzmLine = ({ label, value, strong, accent }) => (
  <div style={{ ...mzmRow, justifyContent: 'space-between', gap: 12 }}>
    <span style={{ ...mzmSub, fontSize: 13 }}>{label}</span>
    <span style={{ ...mzmNum, fontSize: strong ? 15.5 : 13, fontWeight: strong ? 800 : 600, color: accent || 'inherit' }}>{value}</span>
  </div>
);

// ── 21 · Checkout (bottom sheet) ───────────────────────────────────
const MScreenCheckout = ({ initial = 'confirmar', packId = 'impulso' }) => {
  const ME = 'p1', bal = SGT_CREDITS[ME];
  const [st, setSt] = React.useState(initial);
  const pack = sgtPack(packId);
  const after = bal + pack.n;
  const done = st === 'completada';

  React.useEffect(() => {
    if (st !== 'pendiente') return;
    const id = setTimeout(() => setSt('completada'), 1600);
    return () => clearTimeout(id);
  }, [st]);

  const head = {
    confirmar: null,
    pendiente: { icon: 'Loader', color: SGT.amber, title: 'Procesando…', body: 'La acreditación es inmediata al confirmarse el cargo simulado.' },
    completada: { icon: 'CheckCircle2', color: SGT.success, title: `+${pack.n} créditos acreditados`, body: `Tu saldo pasó de ${bal} a ${after}. Ya aparece en tus movimientos.` },
    fallida: { icon: 'XCircle', color: SGT.danger, title: 'No se pudo cobrar', body: 'El emisor rechazó el cargo simulado. No se acreditó nada.' },
    cancelada: { icon: 'MinusCircle', color: 'var(--sgt-faint,#9aa3af)', title: 'Compra cancelada', body: `Saliste antes de confirmar. Tu saldo sigue en ${bal}.` },
  }[st];

  return (
    <MzmFrameRel>
      <MAppBar title="Créditos" onBack={() => {}} trailing={
        <button style={mzmIconBtn()}><Icon name="HelpCircle" size={19} color="var(--sgt-text,#0e1424)" /></button>} />
      {/* Fondo: la pantalla de Créditos atenuada */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '12px 16px', display: 'grid', gap: 12, alignContent: 'start' }}>
        <div className="sgt-grad" style={{ borderRadius: 18, padding: 18, color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', opacity: .85 }}>Saldo disponible</div>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-.03em', marginTop: 4, lineHeight: 1, ...mzmNum }}>{done ? after : bal}</div>
        </div>
        {SGT_PACKS.slice(0, 3).map(p => (
          <MCard key={p.id} padding={13} style={{ borderColor: p.id === pack.id ? SGT.blue : undefined }}>
            <div style={{ ...mzmRow, justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{p.name}</span>
              <span style={{ ...mzmSub, fontSize: 12.5, ...mzmNum }}>{p.n} créd. · {mzmQ(p.price)}</span>
            </div>
          </MCard>
        ))}
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,20,36,.45)' }} />

      {/* Sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '86%', overflow: 'auto',
        background: 'var(--sgt-card-bg,#fff)', borderRadius: '22px 22px 0 0',
        boxShadow: '0 -12px 40px rgba(0,0,0,.22)', display: 'flex', flexDirection: 'column',
      }}>
        <MSheetHandle />
        <div style={{ padding: '4px 18px 0', ...mzmRow, justifyContent: 'space-between' }}>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.01em' }}>Confirmar compra</span>
          {st !== 'confirmar' && <StatusChip kind="compra" status={st} size="sm" />}
        </div>

        {/* Selector de estado — solo del prototipo */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '11px 18px 0' }}>
          {[['confirmar', 'Por confirmar'], ['pendiente', 'Procesando'], ['completada', 'Completada'], ['fallida', 'Fallida'], ['cancelada', 'Cancelada']].map(([id, l]) => (
            <MChip key={id} active={st === id} onClick={() => setSt(id)}>{l}</MChip>
          ))}
        </div>

        <div style={{ padding: '14px 18px 22px', display: 'grid', gap: 14 }}>
          {head && (
            <div style={{
              display: 'flex', gap: 12, alignItems: 'flex-start', padding: '13px 14px', borderRadius: 14,
              background: 'var(--sgt-input-bg,#f6f4ee)', border: `1px solid ${head.color}`,
            }}>
              <Icon name={head.icon} size={19} color={head.color} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{head.title}</div>
                <div style={{ ...mzmSub, fontSize: 12.5, marginTop: 3, lineHeight: 1.5 }}>{head.body}</div>
              </div>
            </div>
          )}

          <div style={{ ...mzmRow, gap: 13 }}>
            <span style={{
              width: 56, height: 56, borderRadius: 15, flexShrink: 0, background: 'var(--sgt-tint,#e6effa)',
              color: SGT.blueText, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, ...mzmNum }}>{pack.n}</span>
              <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>créd.</span>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...mzmRow, gap: 7, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15.5, fontWeight: 700 }}>{pack.name}</span>
                {pack.tag && <StatusChip kind="etiqueta" status={pack.tag} size="sm" />}
              </div>
              <div style={{ ...mzmSub, fontSize: 12.5, marginTop: 3 }}>Q{pack.unit.toFixed(2)} por crédito</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', ...mzmNum }}>{mzmQ(pack.price)}</div>
              <div style={{ ...mzmFaint, fontSize: 11 }}>≈ US${(pack.price / SGT_USD).toFixed(0)} aprox.</div>
            </div>
          </div>

          <div style={{ borderTop: mzmHair, paddingTop: 13, display: 'grid', gap: 9 }}>
            <MzmLine label="Saldo actual" value={`${bal} créditos`} />
            <MzmLine label="Esta compra" value={`+${pack.n}`} accent={SGT.success} />
            <div style={{ borderTop: mzmHair, paddingTop: 10 }}>
              <MzmLine label={done ? 'Saldo actualizado' : 'Saldo después'} value={`${after} créditos`} strong />
            </div>
          </div>

          <div style={{ ...mzmRow, justifyContent: 'space-between', padding: '11px 13px', borderRadius: 13, background: 'var(--sgt-input-bg,#f6f4ee)' }}>
            <span style={{ ...mzmRow, gap: 9 }}>
              <Icon name="CreditCard" size={16} color="var(--sgt-text-sub,#667085)" />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Método simulado</span>
            </span>
            <span style={{ ...mzmFaint, fontSize: 11.5 }}>no editable</span>
          </div>

          <div style={{
            display: 'flex', gap: 9, alignItems: 'flex-start', padding: '11px 13px', borderRadius: 13,
            border: '1px dashed var(--sgt-border,rgba(0,0,0,.16))',
          }}>
            <Icon name="FlaskConical" size={15} color="var(--sgt-faint,#9aa3af)" />
            <div style={{ ...mzmSub, fontSize: 11.5, lineHeight: 1.5 }}>
              Compra simulada: no se piden datos bancarios y no hay cargo real.
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {st === 'pendiente' ? (
              <MButton kind="primary" size="lg" icon="Loader" disabled>Procesando…</MButton>
            ) : done ? (
              <MButton kind="primary" size="lg" icon="Search" iconRight="ArrowRight">Ir a Oportunidades</MButton>
            ) : st === 'fallida' ? (
              <MButton kind="primary" size="lg" icon="RotateCcw" onClick={() => setSt('pendiente')}>Reintentar</MButton>
            ) : st === 'cancelada' ? (
              <MButton kind="secondary" size="lg" onClick={() => setSt('confirmar')}>Retomar la compra</MButton>
            ) : (
              <MButton kind="primary" size="lg" icon="ShieldCheck" onClick={() => setSt('pendiente')}>
                Confirmar · {mzmQ(pack.price)}
              </MButton>
            )}
            <MButton kind="ghost" size="md" disabled={st === 'pendiente'} onClick={() => setSt(done ? 'confirmar' : 'cancelada')}>
              {done ? 'Volver a Créditos' : 'Cancelar'}
            </MButton>
          </div>
        </div>
        <div style={{ height: 20 }} />
      </div>
    </MzmFrameRel>
  );
};

// ── 22-24 · Premium (3 estados) ────────────────────────────────────
// Beneficios: la versión móvil los declara aquí (los scripts Babel no comparten scope
// y este archivo se carga sin screens-6-monetizacion.jsx).
const MZM_BENEFITS = [
  { icon: 'Crown', title: 'Badge Premium en tu perfil', body: 'Se muestra junto a tu nombre en resultados, perfil y cotizaciones. Es distinto del sello de verificación.' },
  { icon: 'TrendingUp', title: 'Impulso de visibilidad', body: 'Un empujón limitado en los listados. No reemplaza la relevancia ni tu reputación.' },
  { icon: 'Coins', title: `${SGT_PREMIUM.creditos} créditos incluidos`, body: 'En cada activación y renovación. Se suman a tu saldo y no vencen.' },
  { icon: 'LayoutTemplate', title: 'Portada y perfil mejorado', body: 'Preparación visual: imagen de portada y bloques de presentación más amplios.' },
];
const MzmBenefit = ({ b, muted, lost, last }) => (
  <div style={{
    display: 'flex', gap: 12, alignItems: 'flex-start', padding: '13px 15px',
    borderBottom: last ? 'none' : mzmHair, opacity: muted ? .62 : 1,
  }}>
    <span style={{
      width: 34, height: 34, borderRadius: 11, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: muted ? 'var(--sgt-input-bg,#f1f0ec)' : 'rgba(194,129,11,.14)',
    }}>
      <Icon name={lost ? 'X' : b.icon} size={16} color={muted ? 'var(--sgt-faint,#9aa3af)' : '#c2810b'} />
    </span>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, textDecoration: lost ? 'line-through' : 'none' }}>{b.title}</div>
      <div style={{ ...mzmSub, fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>{b.body}</div>
    </div>
  </div>
);

const MScreenPremium = ({ estado = 'nunca' }) => {
  const ME = estado === 'activo' ? 'p1' : estado === 'vencido' ? 'p2' : 'p5';
  const me = SGT_PROVIDERS_BY_ID[ME];
  const pr = estado === 'nunca' ? { estado: 'nunca', diasRestantes: 0 } : sgtPremium(ME);
  const activo = estado === 'activo', vencido = estado === 'vencido';
  const pct = activo ? Math.max(0, Math.min(1, pr.diasRestantes / SGT_PREMIUM.dias)) : 0;
  const bens = MZM_BENEFITS;

  return (
    <MFrame tabBar={<MTabBar tabs={TABS_PROV} current="perfil" />}>
      <MAppBar title="Premium" onBack={() => {}} trailing={
        <button style={mzmIconBtn()}><Icon name="HelpCircle" size={19} color="var(--sgt-text,#0e1424)" /></button>} />
      <MScreen bg="transparent">
        <div style={{ padding: '12px 16px 22px', display: 'grid', gap: 14 }}>

          {activo && (
            <div style={{ borderRadius: 18, padding: 18, color: '#fff', background: M_GOLD_GRAD }}>
              <div style={{ ...mzmRow, gap: 12 }}>
                <Avatar idx={me.faceIdx} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700 }}>{me.name}</div>
                  <div style={{ fontSize: 11.5, opacity: .92, marginTop: 2 }}>Premium desde el {pr.desde}</div>
                </div>
                <PremiumBadge variant="icon" size={14} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 16 }}>
                <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, letterSpacing: '-.03em', ...mzmNum }}>{pr.diasRestantes}</span>
                <span style={{ fontSize: 13, opacity: .92 }}>días restantes · vence el {pr.hasta}</span>
              </div>
              <div style={{ marginTop: 12, height: 6, borderRadius: 999, background: 'rgba(255,255,255,.28)', overflow: 'hidden' }}>
                <div style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 999, background: '#fff' }} />
              </div>
              <div style={{ marginTop: 16 }}>
                <MButton kind="glass" icon="RefreshCw">Renovar por {mzmQ(SGT_PREMIUM.price)}</MButton>
              </div>
              <div style={{ fontSize: 11.5, opacity: .9, marginTop: 9, lineHeight: 1.5 }}>
                Renovación manual. Al renovar, la vigencia arranca de nuevo por {SGT_PREMIUM.dias} días y se acreditan
                otros {SGT_PREMIUM.creditos} créditos.
              </div>
            </div>
          )}

          {vencido && (
            <MCard padding={16}>
              <div style={{ ...mzmRow, gap: 12, alignItems: 'flex-start' }}>
                <span style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center', background: 'var(--sgt-input-bg,#f1f0ec)',
                }}>
                  <Icon name="CalendarX" size={19} color="var(--sgt-text-sub,#667085)" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>Venció el {pr.hasta}</div>
                  <div style={{ ...mzmSub, fontSize: 12.5, marginTop: 4, lineHeight: 1.5 }}>
                    El badge dejó de mostrarse y perdiste el impulso de visibilidad. Tus créditos siguen en el saldo:
                    los créditos no vencen.
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <MButton kind="primary" icon="RefreshCw">Reactivar por {mzmQ(SGT_PREMIUM.price)}</MButton>
              </div>
              <div style={{ ...mzmFaint, fontSize: 11.5, marginTop: 9, textAlign: 'center' }}>
                {pr.renovaciones} renovaciones previas · {pr.desde} → {pr.hasta}
              </div>
            </MCard>
          )}

          {!activo && !vencido && (
            <MCard padding={18}>
              <PremiumBadge variant="hero" />
              <h2 style={{ fontSize: 19, fontWeight: 800, margin: '12px 0 7px', letterSpacing: '-.02em', lineHeight: 1.25, textWrap: 'pretty' }}>
                Destacá quién sos, no cuántas cotizaciones mandás
              </h2>
              <p style={{ ...mzmSub, fontSize: 12.5, margin: 0, lineHeight: 1.55 }}>
                Badge, impulso de visibilidad y {SGT_PREMIUM.creditos} créditos por mes. Si buscás volumen de créditos,
                el paquete Impulso cuesta lo mismo y trae 30.
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 15 }}>
                <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.03em', ...mzmNum }}>{mzmQ(SGT_PREMIUM.price)}</span>
                <span style={{ ...mzmSub, fontSize: 13 }}>/ mes · {SGT_PREMIUM.dias} días</span>
              </div>
              <div style={{ marginTop: 15 }}><MButton kind="primary" size="lg" icon="Crown">Activar Premium</MButton></div>
            </MCard>
          )}

          <div>
            <MSectionTitle padding="0 0 0" action={vencido ? <span style={{ ...mzmFaint, fontSize: 11 }}>Lo que perdiste</span> : null}>
              {activo ? 'Tu Premium incluye' : 'Qué incluye'}
            </MSectionTitle>
            <MCard padding={0}>
              {bens.map((b, i, a) => <MzmBenefit key={b.title} b={b} muted={vencido} lost={vencido} last={i === a.length - 1} />)}
            </MCard>
          </div>

          <div>
            <MSectionTitle padding="0 0 0">Premium no es un paquete</MSectionTitle>
            <MCard padding={0}>
              <div style={{ padding: '13px 15px', borderBottom: mzmHair }}>
                <div style={{ ...mzmRow, justifyContent: 'space-between' }}>
                  <PremiumBadge />
                  <span style={{ fontSize: 16, fontWeight: 800, ...mzmNum }}>{mzmQ(SGT_PREMIUM.price)}</span>
                </div>
                <div style={{ marginTop: 11, display: 'grid', gap: 7 }}>
                  <MzmLine label="Créditos" value={`${SGT_PREMIUM.creditos} por mes`} />
                  <MzmLine label="Badge y visibilidad" value="Sí" accent="#8a5a08" />
                  <MzmLine label="Vigencia" value={`${SGT_PREMIUM.dias} días`} />
                </div>
              </div>
              <div style={{ padding: '13px 15px' }}>
                <div style={{ ...mzmRow, justifyContent: 'space-between' }}>
                  <span style={{ ...mzmRow, gap: 8 }}>
                    <Icon name="Coins" size={15} color={SGT.blue} />
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>Paquete Impulso</span>
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, ...mzmNum }}>{mzmQ(sgtPack('impulso').price)}</span>
                </div>
                <div style={{ marginTop: 11, display: 'grid', gap: 7 }}>
                  <MzmLine label="Créditos" value="30, una sola vez" />
                  <MzmLine label="Badge y visibilidad" value="No" />
                  <MzmLine label="Vigencia" value="No vencen" />
                </div>
              </div>
            </MCard>
          </div>

          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 14,
            border: '1px dashed var(--sgt-border,rgba(0,0,0,.16))',
          }}>
            <Icon name="Info" size={15} color="var(--sgt-faint,#9aa3af)" />
            <div style={{ ...mzmSub, fontSize: 11.5, lineHeight: 1.55 }}>
              Premium no cambia la regla de cotizaciones: {SGT_COT_GRATIS} gratis por pedido y un máximo
              de {SGT_MAX_COTIZACIONES}, para todos. Activación simulada, sin datos bancarios y sin renovación automática.
            </div>
          </div>
        </div>
      </MScreen>
    </MFrame>
  );
};

Object.assign(window, { MScreenCheckout, MScreenPremium, MZM_BENEFITS });
