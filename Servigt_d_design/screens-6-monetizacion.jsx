// Monetización — compra simulada de créditos (checkout) y Premium.
// Compra simulada = acreditación inmediata, sin aprobación del admin y sin datos bancarios.
// Premium = Q115/mes, 30 días, 10 créditos por activación o renovación. NO cambia la regla
// de cotizaciones (3 gratis, máximo 6 por pedido) para nadie.

const mzRow = { display: 'flex', alignItems: 'center', gap: 10 };
const mzSub = { color: 'var(--sgt-text-sub, #667085)' };
const mzFaint = { color: 'var(--sgt-faint, #9aa3af)' };
const mzMoney = (n) => 'Q' + n.toLocaleString('es-GT');
const mzNum = { fontVariantNumeric: 'tabular-nums' };
const mzHair = '1px solid var(--sgt-border,rgba(0,0,0,.08))';

const MzLine = ({ label, value, strong, accent }) => (
  <div style={{ ...mzRow, justifyContent: 'space-between', gap: 16 }}>
    <span style={{ ...mzSub, fontSize: 13.5 }}>{label}</span>
    <span style={{ ...mzNum, fontSize: strong ? 16 : 13.5, fontWeight: strong ? 700 : 600, color: accent || 'inherit' }}>{value}</span>
  </div>
);

// Aviso de compra simulada — mismo tratamiento en checkout y en Premium.
const MzSimNote = ({ children }) => (
  <div style={{
    display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12,
    border: '1px dashed var(--sgt-border,rgba(0,0,0,.16))', background: 'var(--sgt-input-bg,#f6f4ee)',
  }}>
    <Icon name="FlaskConical" size={16} color="var(--sgt-faint,#9aa3af)" />
    <div style={{ ...mzSub, fontSize: 12.5, lineHeight: 1.55 }}>{children}</div>
  </div>
);

// ── 21 · Checkout de créditos ──────────────────────────────────────
const ScreenCheckout = ({ dark, setDark, packId = 'impulso', initial = 'confirmar' }) => {
  const ME = 'p1';
  const [packSel, setPackSel] = React.useState(packId);
  const [st, setSt] = React.useState(initial);
  const pack = sgtPack(packSel);
  const bal = SGT_CREDITS[ME];
  const after = bal + pack.n;
  const done = st === 'completada';

  React.useEffect(() => {
    if (st !== 'pendiente') return;
    const id = setTimeout(() => setSt('completada'), 1600);
    return () => clearTimeout(id);
  }, [st]);

  const estados = [
    { id: 'confirmar', label: 'Por confirmar' },
    { id: 'pendiente', label: 'Procesando' },
    { id: 'completada', label: 'Completada' },
    { id: 'fallida', label: 'Fallida' },
    { id: 'cancelada', label: 'Cancelada' },
  ];

  const banner = {
    pendiente: { icon: 'Loader', color: SGT.amber, title: 'Procesando la compra…', body: 'No cierres esta ventana. La acreditación es inmediata al confirmarse.' },
    completada: { icon: 'CheckCircle2', color: SGT.success, title: `Se acreditaron ${pack.n} créditos`, body: `Tu saldo pasó de ${bal} a ${after}. El movimiento ya aparece en tu historial.` },
    fallida: { icon: 'XCircle', color: SGT.danger, title: 'No se pudo completar el cargo', body: 'El emisor rechazó el cargo simulado. No se acreditaron créditos ni se descontó nada.' },
    cancelada: { icon: 'MinusCircle', color: 'var(--sgt-faint,#9aa3af)', title: 'Compra cancelada', body: 'Saliste antes de confirmar. Tu saldo quedó igual: ' + bal + ' créditos.' },
  }[st];

  return (
    <SgtFrame mode="provider" sidebar={SB_PROV} current="creditos" dark={dark} setDark={setDark} notifCount={4}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <a style={{ ...mzRow, gap: 6, ...mzSub, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>
          <Icon name="ArrowLeft" size={15} color="currentColor" />Volver a Créditos
        </a>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 5px', letterSpacing: '-.02em' }}>Confirmar compra</h1>
            <p style={{ ...mzSub, margin: 0, fontSize: 13.5 }}>Un paso. Al confirmar, los créditos se acreditan al instante.</p>
          </div>
          {st !== 'confirmar' && <StatusChip kind="compra" status={st} />}
        </div>

        {/* Selector de estado — solo del prototipo, para revisar los cuatro tratamientos */}
        <div style={{ ...mzRow, gap: 7, flexWrap: 'wrap', marginBottom: 18 }}>
          <span style={{ ...mzFaint, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Estado</span>
          {estados.map(e => (
            <button key={e.id} onClick={() => setSt(e.id)} style={{
              height: 28, padding: '0 11px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: st === e.id ? SGT.blue : 'var(--sgt-card-bg,#fff)',
              color: st === e.id ? '#fff' : 'var(--sgt-text-sub,#667085)',
              border: `1px solid ${st === e.id ? SGT.blue : 'var(--sgt-border,rgba(0,0,0,.09))'}`,
            }}>{e.label}</button>
          ))}
        </div>

        {banner && (
          <Card padding={18} style={{ marginBottom: 16, borderColor: banner.color, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', background: 'var(--sgt-input-bg,#f6f4ee)',
            }}>
              <Icon name={banner.icon} size={20} color={banner.color} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700 }}>{banner.title}</div>
              <div style={{ ...mzSub, fontSize: 13, marginTop: 4, lineHeight: 1.55 }}>{banner.body}</div>
              {st === 'fallida' && (
                <div style={{ ...mzRow, gap: 10, marginTop: 13 }}>
                  <Button kind="primary" size="sm" icon="RotateCcw" onClick={() => setSt('pendiente')}>Reintentar</Button>
                  <Button kind="ghost" size="sm">Usar otro paquete</Button>
                </div>
              )}
              {st === 'cancelada' && (
                <div style={{ ...mzRow, gap: 10, marginTop: 13 }}>
                  <Button kind="secondary" size="sm" onClick={() => setSt('confirmar')}>Retomar la compra</Button>
                </div>
              )}
              {done && (
                <div style={{ ...mzRow, gap: 10, marginTop: 13 }}>
                  <Button kind="primary" size="sm" icon="Search" iconRight="ArrowRight">Ir a Oportunidades</Button>
                  <Button kind="ghost" size="sm" icon="Receipt">Ver el movimiento</Button>
                </div>
              )}
            </div>
          </Card>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 16, alignItems: 'start' }}>
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '17px 20px', borderBottom: mzHair, ...mzRow, justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Paquete elegido</span>
              {pack.tag && <StatusChip kind="etiqueta" status={pack.tag} size="sm" />}
            </div>
            <div style={{ padding: 20, display: 'grid', gap: 16 }}>
              <div style={{ ...mzRow, gap: 15 }}>
                <span style={{
                  width: 62, height: 62, borderRadius: 16, flexShrink: 0, background: 'var(--sgt-tint,#e6effa)',
                  color: SGT.blueText, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1, ...mzNum }}>{pack.n}</span>
                  <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>créd.</span>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{pack.name}</div>
                  <div style={{ ...mzSub, fontSize: 13, marginTop: 3 }}>{pack.n} créditos · Q{pack.unit.toFixed(2)} por crédito</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-.02em', ...mzNum }}>{mzMoney(pack.price)}</div>
                  <div style={{ ...mzFaint, fontSize: 11.5, marginTop: 2 }}>≈ US${(pack.price / SGT_USD).toFixed(0)} aprox.</div>
                </div>
              </div>

              {/* Cambiar de paquete sin salir del checkout */}
              <div>
                <div style={{ ...mzFaint, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Cambiar de paquete</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8 }}>
                  {SGT_PACKS.map(p => {
                    const on = p.id === packSel;
                    return (
                      <button key={p.id} disabled={done || st === 'pendiente'} onClick={() => setPackSel(p.id)} style={{
                        textAlign: 'left', padding: '10px 12px', borderRadius: 12, cursor: done ? 'not-allowed' : 'pointer',
                        opacity: done || st === 'pendiente' ? .5 : 1,
                        background: on ? 'var(--sgt-tint,#e6effa)' : 'var(--sgt-card-bg,#fff)',
                        border: `1.5px solid ${on ? SGT.blue : 'var(--sgt-border,rgba(0,0,0,.09))'}`,
                        color: 'var(--sgt-text,#1f2937)',
                      }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{p.name}</div>
                        <div style={{ ...mzSub, fontSize: 11.5, marginTop: 2, ...mzNum }}>{p.n} créd. · {mzMoney(p.price)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ borderTop: mzHair, paddingTop: 15, display: 'grid', gap: 10 }}>
                <MzLine label="Saldo actual" value={`${bal} créditos`} />
                <MzLine label={`${pack.name} · ${pack.n} créditos`} value={`+${pack.n}`} accent={SGT.success} />
                <div style={{ borderTop: mzHair, paddingTop: 11 }}>
                  <MzLine label={done ? 'Saldo actualizado' : 'Saldo después de la compra'} value={`${after} créditos`} strong />
                </div>
              </div>

              <div style={{ ...mzRow, justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: 'var(--sgt-input-bg,#f6f4ee)' }}>
                <span style={{ ...mzRow, gap: 9 }}>
                  <Icon name="CreditCard" size={16} color="var(--sgt-text-sub,#667085)" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Método simulado</span>
                </span>
                <span style={{ ...mzFaint, fontSize: 12.5 }}>Sin cobro real · no editable</span>
              </div>

              <MzSimNote>
                Esta es una <strong>compra simulada</strong>: no se pide ni se procesa ningún dato bancario y no
                hay cargo real. Sirve para probar el flujo de acreditación inmediata.
              </MzSimNote>
            </div>
          </Card>

          <div style={{ display: 'grid', gap: 14 }}>
            <Card padding={20}>
              <div style={{ ...mzFaint, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Total a pagar</div>
              <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-.03em', marginTop: 6, lineHeight: 1, ...mzNum }}>{mzMoney(pack.price)}</div>
              <div style={{ ...mzFaint, fontSize: 12, marginTop: 5 }}>≈ US${(pack.price / SGT_USD).toFixed(0)} aprox. · referencia</div>

              <div style={{ marginTop: 17, display: 'grid', gap: 9 }}>
                {st === 'pendiente' ? (
                  <Button kind="primary" size="lg" full disabled icon="Loader">Procesando…</Button>
                ) : done ? (
                  <Button kind="success" size="lg" full icon="Check" disabled>Créditos acreditados</Button>
                ) : (
                  <Button kind="primary" size="lg" full icon="ShieldCheck" onClick={() => setSt('pendiente')}>
                    Confirmar compra
                  </Button>
                )}
                {!done && (
                  <Button kind="ghost" size="md" full onClick={() => setSt('cancelada')} disabled={st === 'pendiente'}>Cancelar</Button>
                )}
              </div>
              {st === 'pendiente' && (
                <div style={{ marginTop: 14, height: 4, borderRadius: 999, overflow: 'hidden', background: 'var(--sgt-input-bg,#eceae4)' }}>
                  <div style={{ width: '62%', height: '100%', borderRadius: 999, background: SGT.amber }} />
                </div>
              )}
            </Card>

            <Card padding={18}>
              <div style={{ ...mzFaint, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Referencia</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <MzLine label="Nº de orden" value={<span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5 }}>SGT-40186</span>} />
                <MzLine label="Proveedor" value={SGT_PROVIDERS_BY_ID[ME].name} />
                <MzLine label="Acreditación" value="Inmediata" />
              </div>
              <div style={{ borderTop: mzHair, marginTop: 14, paddingTop: 13, ...mzSub, fontSize: 12.5, lineHeight: 1.55 }}>
                Los créditos no vencen. Se consumen al cotizar en pedidos que ya recibieron {SGT_COT_GRATIS} ofertas.
              </div>
            </Card>
          </div>
        </div>
      </div>
    </SgtFrame>
  );
};

// ── 22-24 · Premium ────────────────────────────────────────────────
const SGT_PREMIUM_BENEFITS = [
  { icon: 'Crown', title: 'Badge Premium en tu perfil', body: 'Se muestra junto a tu nombre en resultados, perfil y cotizaciones. Es distinto del sello de verificación.' },
  { icon: 'TrendingUp', title: 'Impulso de visibilidad', body: 'Un empujón limitado en los listados. No reemplaza la relevancia de la categoría ni tu reputación.' },
  { icon: 'Coins', title: `${SGT_PREMIUM.creditos} créditos incluidos`, body: 'Se acreditan en cada activación y en cada renovación. Se suman a tu saldo y no vencen.' },
  { icon: 'LayoutTemplate', title: 'Portada y perfil mejorado', body: 'Preparación visual: imagen de portada y bloques de presentación más amplios.' },
];

const MzBenefit = ({ b, muted, lost }) => (
  <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', opacity: muted ? .62 : 1 }}>
    <span style={{
      width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: muted ? 'var(--sgt-input-bg,#f1f0ec)' : 'rgba(194,129,11,.14)',
    }}>
      <Icon name={lost ? 'X' : b.icon} size={18} color={muted ? 'var(--sgt-faint,#9aa3af)' : '#c2810b'} />
    </span>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 700, textDecoration: lost ? 'line-through' : 'none' }}>{b.title}</div>
      <div style={{ ...mzSub, fontSize: 12.5, marginTop: 3, lineHeight: 1.55 }}>{b.body}</div>
    </div>
  </div>
);

const ScreenPremium = ({ dark, setDark, estado = 'nunca' }) => {
  const ME = estado === 'activo' ? 'p1' : estado === 'vencido' ? 'p2' : 'p5';
  const me = SGT_PROVIDERS_BY_ID[ME];
  const pr = estado === 'nunca' ? { estado: 'nunca', diasRestantes: 0 } : sgtPremium(ME);
  const activo = estado === 'activo', vencido = estado === 'vencido';
  const pct = activo ? Math.max(0, Math.min(1, pr.diasRestantes / SGT_PREMIUM.dias)) : 0;

  return (
    <SgtFrame mode="provider" sidebar={SB_PROV} current="premium" dark={dark} setDark={setDark} notifCount={4}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 5px', letterSpacing: '-.02em' }}>Premium</h1>
            <p style={{ ...mzSub, margin: 0, fontSize: 13.5 }}>
              {mzMoney(SGT_PREMIUM.price)} al mes · {SGT_PREMIUM.dias} días de vigencia desde la activación o renovación.
            </p>
          </div>
          <StatusChip kind="premium" status={pr.estado === 'nunca' ? 'nunca' : pr.estado} />
        </div>

        {/* Encabezado de estado */}
        <Card padding={0} style={{ overflow: 'hidden', marginBottom: 18, borderColor: activo ? '#c2810b' : undefined }}>
          <div style={{
            padding: 24, color: activo ? '#fff' : 'var(--sgt-text,#1f2937)',
            background: activo ? SGT_GOLD_GRAD : 'var(--sgt-card-bg,#fff)',
            borderBottom: activo ? 'none' : mzHair,
          }}>
            {activo ? (
              <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                <Avatar idx={me.faceIdx} size={62} />
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ ...mzRow, gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 20, fontWeight: 700 }}>{me.name}</span>
                    <PremiumBadge variant="hero" />
                    {me.verified && <VerifiedBadge size={12} />}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6, opacity: .92 }}>
                    Premium activo desde el {pr.desde} · {pr.renovaciones} renovaciones
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 150 }}>
                  <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, letterSpacing: '-.03em', ...mzNum }}>{pr.diasRestantes}</div>
                  <div style={{ fontSize: 12.5, opacity: .92, marginTop: 4 }}>días restantes</div>
                  <div style={{ fontSize: 12.5, opacity: .92, marginTop: 2 }}>vence el {pr.hasta}</div>
                </div>
                <div style={{ width: '100%', height: 6, borderRadius: 999, background: 'rgba(255,255,255,.28)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 999, background: '#fff' }} />
                </div>
              </div>
            ) : vencido ? (
              <div style={{ display: 'flex', gap: 15, alignItems: 'flex-start' }}>
                <span style={{
                  width: 46, height: 46, borderRadius: 13, flexShrink: 0, display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center', background: 'var(--sgt-input-bg,#f1f0ec)',
                }}>
                  <Icon name="CalendarX" size={22} color="var(--sgt-text-sub,#667085)" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>Tu Premium venció el {pr.hasta}</div>
                  <div style={{ ...mzSub, fontSize: 13.5, marginTop: 5, lineHeight: 1.55 }}>
                    El badge dejó de mostrarse y perdiste el impulso de visibilidad. Los {SGT_PREMIUM.creditos} créditos
                    de tus activaciones anteriores siguen en tu saldo: los créditos no vencen.
                  </div>
                  <div style={{ ...mzRow, gap: 14, flexWrap: 'wrap', marginTop: 14 }}>
                    <Button kind="primary" size="md" icon="RefreshCw">Reactivar por {mzMoney(SGT_PREMIUM.price)}</Button>
                    <span style={{ ...mzFaint, fontSize: 12.5 }}>{pr.renovaciones} renovaciones previas · última vigencia {pr.desde} → {pr.hasta}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <PremiumBadge variant="hero" label="Premium" />
                  <h2 style={{ fontSize: 23, fontWeight: 700, margin: '13px 0 8px', letterSpacing: '-.02em', textWrap: 'pretty' }}>
                    Destacá quién sos, no cuántas cotizaciones mandás
                  </h2>
                  <p style={{ ...mzSub, fontSize: 13.5, margin: 0, lineHeight: 1.6, maxWidth: 460, textWrap: 'pretty' }}>
                    Premium te da badge, impulso de visibilidad y {SGT_PREMIUM.creditos} créditos por mes.
                    Si lo que buscás es volumen de créditos, el paquete Impulso cuesta lo mismo y trae 30.
                  </p>
                </div>
                <div style={{ textAlign: 'right', minWidth: 210 }}>
                  <div style={{ ...mzRow, gap: 6, justifyContent: 'flex-end', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-.03em', ...mzNum }}>{mzMoney(SGT_PREMIUM.price)}</span>
                    <span style={{ ...mzSub, fontSize: 14 }}>/ mes</span>
                  </div>
                  <div style={{ ...mzFaint, fontSize: 12, marginTop: 4 }}>{SGT_PREMIUM.dias} días por activación</div>
                  <div style={{ marginTop: 15 }}><Button kind="primary" size="lg" icon="Crown">Activar Premium</Button></div>
                </div>
              </div>
            )}
          </div>

          {activo && (
            <div style={{ padding: '16px 24px', ...mzRow, gap: 14, justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span style={{ ...mzSub, fontSize: 12.5, maxWidth: 460, lineHeight: 1.55 }}>
                La renovación es manual: al renovar, la vigencia arranca de nuevo por {SGT_PREMIUM.dias} días y se
                acreditan otros {SGT_PREMIUM.creditos} créditos.
              </span>
              <div style={{ ...mzRow, gap: 10 }}>
                <Button kind="ghost" size="sm">Cancelar Premium</Button>
                <Button kind="primary" size="sm" icon="RefreshCw">Renovar por {mzMoney(SGT_PREMIUM.price)}</Button>
              </div>
            </div>
          )}
        </Card>

        {/* Beneficios */}
        <SectionTitle action={vencido ? <span style={{ ...mzFaint, fontSize: 12 }}>Lo que dejaste de tener</span> : null}>
          {activo ? 'Lo que incluye tu Premium' : 'Qué incluye'}
        </SectionTitle>
        <Card padding={22} style={{ marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 22 }}>
            {SGT_PREMIUM_BENEFITS.map(b => <MzBenefit key={b.title} b={b} muted={vencido} lost={vencido} />)}
          </div>
        </Card>

        {/* Premium vs créditos — la aclaración de precio */}
        <SectionTitle>Premium no es un paquete de créditos</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
          <Card padding={20} style={{ borderColor: '#c2810b' }}>
            <div style={{ ...mzRow, justifyContent: 'space-between' }}>
              <PremiumBadge />
              <span style={{ fontSize: 19, fontWeight: 800, ...mzNum }}>{mzMoney(SGT_PREMIUM.price)}</span>
            </div>
            <div style={{ marginTop: 14, display: 'grid', gap: 9 }}>
              <MzLine label="Créditos" value={`${SGT_PREMIUM.creditos} por mes`} />
              <MzLine label="Badge y visibilidad" value="Sí" accent="#8a5a08" />
              <MzLine label="Vigencia" value={`${SGT_PREMIUM.dias} días`} />
              <MzLine label="Cotizaciones gratis por pedido" value={`${SGT_COT_GRATIS} · igual que todos`} />
            </div>
          </Card>
          <Card padding={20}>
            <div style={{ ...mzRow, justifyContent: 'space-between' }}>
              <span style={{ ...mzRow, gap: 8 }}>
                <Icon name="Coins" size={16} color={SGT.blue} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>Paquete Impulso</span>
              </span>
              <span style={{ fontSize: 19, fontWeight: 800, ...mzNum }}>{mzMoney(sgtPack('impulso').price)}</span>
            </div>
            <div style={{ marginTop: 14, display: 'grid', gap: 9 }}>
              <MzLine label="Créditos" value="30, una sola vez" />
              <MzLine label="Badge y visibilidad" value="No" />
              <MzLine label="Vigencia" value="Los créditos no vencen" />
              <MzLine label="Cotizaciones gratis por pedido" value={`${SGT_COT_GRATIS} · igual que todos`} />
            </div>
          </Card>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Card padding={18} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Icon name="Info" size={17} color="var(--sgt-text-sub,#667085)" />
            <div style={{ ...mzSub, fontSize: 12.5, lineHeight: 1.6 }}>
              Premium <strong>no cambia la regla de cotizaciones</strong>: {SGT_COT_GRATIS} gratis por pedido y un
              máximo de {SGT_MAX_COTIZACIONES}, para todos los proveedores. Tampoco habilita publicar varios servicios
              a la vez ni da descuento en los paquetes.
            </div>
          </Card>
          <MzSimNote>
            La activación es una <strong>compra simulada</strong>: sin datos bancarios y sin renovación automática.
            Cuando se cumplen los {SGT_PREMIUM.dias} días, el badge se apaga hasta que renovés a mano.
          </MzSimNote>
        </div>
      </div>
    </SgtFrame>
  );
};

Object.assign(window, { ScreenCheckout, ScreenPremium, SGT_PREMIUM_BENEFITS });
