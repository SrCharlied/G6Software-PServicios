// Mobile screens 9-13: Provider dashboard, Edit profile, Chat, Notifs, Admin

// ─────────────────────────────────────────────────────────────
// 09 · Provider dashboard
// ─────────────────────────────────────────────────────────────
function MScreenProviderDashboard() {
  const [available, setAvailable] = React.useState(true);
  const { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } = window.Recharts || {};

  return (
    <MFrame>
      <div style={{
        background: 'var(--sgt-card-bg, white)', borderBottom: '1px solid var(--sgt-border, #eef0f4)',
        padding: '14px 16px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar idx={0} size={44} online />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--sgt-text-sub, #667085)' }}>Buenos días,</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Carlos Méndez</div>
              <PremiumBadge variant="icon" size={10} />
            </div>
          </div>
          <div onClick={() => setAvailable(!available)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px',
            background: available ? SGT.success + '20' : 'var(--sgt-border, #eef0f4)', borderRadius: 999, cursor: 'pointer',
          }}>
            <span style={{
              width: 28, height: 16, borderRadius: 999, background: available ? SGT.success : '#9ca3af',
              position: 'relative',
            }}>
              <span style={{
                position: 'absolute', top: 2, left: available ? 14 : 2,
                width: 12, height: 12, borderRadius: 999, background: 'white', transition: 'left .2s',
              }} />
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: available ? SGT.success : 'var(--sgt-text-sub, #667085)' }}>
              {available ? 'Disponible' : 'Ocupado'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 16px 100px' }}>
        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { lbl: 'Ingresos mes', val: 'Q8,650', delta: '+12%', icon: 'DollarSign', accent: SGT.success },
            { lbl: 'Trabajos', val: '23', delta: '+4', icon: 'Briefcase', accent: SGT.blue },
            { lbl: 'Rating', val: '4.9', delta: '+0.1', icon: 'Star', accent: SGT.warn },
            { lbl: 'Reseñas', val: '128', delta: '+8', icon: 'MessageSquare', accent: '#7c3aed' },
          ].map(k => (
            <MCard key={k.lbl} padding={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  width: 30, height: 30, borderRadius: 8, background: k.accent + '18', color: k.accent,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={k.icon} size={16} color={k.accent} />
                </span>
                <span style={{ fontSize: 11, color: 'var(--sgt-text-sub, #667085)', fontWeight: 600 }}>{k.lbl}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{k.val}</div>
              <div style={{ fontSize: 11, color: SGT.success, fontWeight: 600 }}>
                <Icon name="TrendingUp" size={11} color={SGT.success} /> {k.delta}
              </div>
            </MCard>
          ))}
        </div>

        {/* Chart */}
        <MCard padding={14} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Ingresos · 6 meses</div>
            <div style={{ fontSize: 11, color: SGT.success, fontWeight: 700 }}>+24% vs prom.</div>
          </div>
          <div style={{ height: 140 }}>
            {ResponsiveContainer && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SGT_INCOME_6M}>
                  <defs>
                    <linearGradient id="incgrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SGT.blue} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={SGT.blue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#667085' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="value" stroke={SGT.blue} strokeWidth={2.5} fill="url(#incgrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </MCard>

        {/* Solicitudes entrantes */}
        <MSectionTitle padding="0 0 0 0" action={<a style={{ fontSize: 12, color: SGT.blue, fontWeight: 600 }}>Ver todas</a>}>
          Solicitudes entrantes
        </MSectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {[
            { who: 'Lucía Pérez', faceIdx: 1, service: 'Reparación de fuga', when: 'Hoy · 14:00', addr: 'Zona 10', amt: 220 },
            { who: 'Diego Morales', faceIdx: 4, service: 'Destape de cañerías', when: 'Mañ · 10:00', addr: 'Zona 14', amt: 280 },
          ].map((r, i) => (
            <MCard key={i} padding={14}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Avatar idx={r.faceIdx} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{r.who}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--sgt-text, #1f2937)', marginTop: 2 }}>{r.service}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--sgt-text-sub, #667085)', marginTop: 2 }}>
                    <Icon name="Clock" size={10} color="currentColor" /> {r.when} · <Icon name="MapPin" size={10} color="currentColor" /> {r.addr}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: SGT.blue }}>Q{r.amt}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={{
                  flex: 1, height: 38, background: 'var(--sgt-card-bg, white)', color: SGT.error,
                  border: `1px solid ${SGT.error}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>Rechazar</button>
                <button style={{
                  flex: 2, height: 38, background: SGT.success, color: 'white',
                  border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>Aceptar</button>
              </div>
            </MCard>
          ))}
        </div>

        {/* Agenda hoy */}
        <MSectionTitle padding="0 0 0 0">Agenda de hoy</MSectionTitle>
        <MCard padding={0}>
          {[
            { t: '10:00', s: 'Reparación de grifería', addr: 'Zona 9', status: 'completado' },
            { t: '14:00', s: 'Fuga en cocina', addr: 'Zona 10', status: 'aceptado' },
            { t: '17:00', s: 'Cambio de tubería', addr: 'Mixco', status: 'pendiente' },
          ].map((it, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              borderBottom: i < 2 ? '1px solid var(--sgt-border, #eef0f4)' : 'none',
            }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: SGT.blue, width: 50 }}>{it.t}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{it.s}</div>
                <div style={{ fontSize: 11.5, color: 'var(--sgt-text-sub, #667085)' }}>
                  <Icon name="MapPin" size={10} color="currentColor" /> {it.addr}
                </div>
              </div>
              <StatusChip status={it.status} size="sm" />
            </div>
          ))}
        </MCard>
      </div>

      <MTabBar
        current="inicio" onChange={() => {}}
        tabs={[
          { id: 'inicio', icon: 'LayoutDashboard', label: 'Inicio' },
          { id: 'agenda', icon: 'Calendar', label: 'Agenda' },
          { id: 'pedidos', icon: 'ClipboardList', label: 'Pedidos', badge: 2 },
          { id: 'chat', icon: 'MessageCircle', label: 'Chat' },
          { id: 'perfil', icon: 'User', label: 'Perfil' },
        ]} />
    </MFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// 10 · Editar perfil
// ─────────────────────────────────────────────────────────────
function MScreenEditProfile() {
  return (
    <MFrame>
      <MAppBar onBack={() => {}} title="Editar perfil"
               trailing={<button style={{ ...mIconBtn(), color: SGT.blue, fontSize: 14, fontWeight: 700, width: 'auto', padding: '0 10px' }}>Guardar</button>} />
      <div style={{ padding: '12px 16px 24px' }}>
        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 18px' }}>
          <div style={{ position: 'relative' }}>
            <Avatar idx={0} size={92} />
            <button style={{
              position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: 999,
              background: SGT.blue, border: '3px solid var(--sgt-card-bg, white)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="Camera" size={14} color="white" />
            </button>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 10 }}>Carlos Méndez</div>
          <div style={{ fontSize: 12.5, color: 'var(--sgt-text-sub, #667085)', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
            <VerifiedBadge size={10} /> Proveedor verificado
            <PremiumBadge variant="inline" />
          </div>
        </div>

        {/* Acceso a monetización — el tab bar se queda en cinco slots */}
        <Section title="Cuenta" icon="Wallet">
          {[['Coins', 'Créditos', `${SGT_CREDITS.p1} disponibles · comprar paquetes`],
            ['Crown', 'Premium', `Activo · ${sgtPremium('p1').diasRestantes} días restantes`]].map(([ic, t, s]) => (
            <button key={t} style={{
              display: 'flex', alignItems: 'center', gap: 11, width: '100%', minHeight: 56, padding: '0 14px',
              background: 'var(--sgt-card-bg, white)', border: '1px solid var(--sgt-border, #e5e7eb)',
              borderRadius: 12, cursor: 'pointer', textAlign: 'left', color: 'inherit',
            }}>
              <span style={{
                width: 34, height: 34, borderRadius: 10, flex: 'none',
                background: ic === 'Crown' ? 'rgba(194,129,11,.14)' : 'var(--sgt-tint,#e6effa)',
                color: ic === 'Crown' ? '#c2810b' : SGT.blueText,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name={ic} size={17} color="currentColor" /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{t}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--sgt-text-sub, #667085)', marginTop: 2 }}>{s}</span>
              </span>
              <Icon name="ChevronRight" size={17} color="var(--sgt-text-sub, #98a2b3)" />
            </button>
          ))}
        </Section>

        {/* Sections */}
        <Section title="Información personal" icon="User">
          <Field label="Nombre completo" value="Carlos Méndez" icon="User" />
          <Field label="Correo" value="carlos@example.com" icon="Mail" />
          <Field label="Teléfono" value="+502 5555-1234" icon="Phone" />
        </Section>

        <Section title="Información profesional" icon="Briefcase">
          <Field label="Categoría" value="Plomería" icon="Wrench" chevron />
          <Field label="Experiencia" value="8 años" icon="Award" />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sgt-text-sub, #667085)', marginBottom: 6 }}>Bio</div>
            <textarea defaultValue={SGT_PROVIDERS[0].bio} style={{
              width: '100%', minHeight: 90, padding: 12, fontSize: 13.5, fontFamily: 'inherit',
              background: 'var(--sgt-card-bg, white)', color: 'var(--sgt-text, #1f2937)',
              border: '1px solid var(--sgt-border, #e5e7eb)', borderRadius: 12, resize: 'none', outline: 'none',
            }} />
          </div>
        </Section>

        <Section title="Servicios" icon="ListChecks" action={<a style={{ fontSize: 12, color: SGT.blue, fontWeight: 700 }}>+ Agregar</a>}>
          {SGT_PROVIDERS[0].services.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', background: 'var(--sgt-card-bg, white)',
              border: '1px solid var(--sgt-border, #eef0f4)', borderRadius: 12, marginBottom: 6,
            }}>
              <Icon name="Wrench" size={16} color={SGT.blue} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: SGT.blue }}>Q{s.price}</div>
              <Icon name="GripVertical" size={14} color="#cbd5e1" />
            </div>
          ))}
        </Section>

        <Section title="Zona de cobertura" icon="MapPin">
          <Field label="Zona principal" value="Zona 10, Guatemala" icon="MapPin" chevron />
          <div style={{
            padding: '12px 14px', background: 'var(--sgt-card-bg, white)',
            border: '1px solid var(--sgt-border, #eef0f4)', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Trabajo a domicilio</div>
              <div style={{ fontSize: 11.5, color: 'var(--sgt-text-sub, #667085)' }}>Hasta 10 km</div>
            </div>
            <Toggle on />
          </div>
        </Section>
      </div>
    </MFrame>
  );
}

const Section = ({ title, icon, action, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Icon name={icon} size={16} color={SGT.blue} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sgt-text, #1f2937)' }}>{title}</span>
      </div>
      {action}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
  </div>
);

const Field = ({ label, value, icon, chevron }) => (
  <div>
    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sgt-text-sub, #667085)', marginBottom: 6 }}>{label}</div>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 14px',
      background: 'var(--sgt-card-bg, white)', border: '1px solid var(--sgt-border, #e5e7eb)', borderRadius: 12,
    }}>
      {icon && <Icon name={icon} size={16} color="var(--sgt-text-sub, #667085)" />}
      <span style={{ flex: 1, fontSize: 14, color: 'var(--sgt-text, #1f2937)' }}>{value}</span>
      {chevron && <Icon name="ChevronRight" size={16} color="var(--sgt-text-sub, #667085)" />}
    </div>
  </div>
);

const Toggle = ({ on }) => (
  <span style={{
    width: 40, height: 24, borderRadius: 999, background: on ? SGT.blue : '#cbd5e1',
    position: 'relative', display: 'inline-block', flexShrink: 0,
  }}>
    <span style={{
      position: 'absolute', top: 2, left: on ? 18 : 2,
      width: 20, height: 20, borderRadius: 999, background: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .2s',
    }} />
  </span>
);

// ─────────────────────────────────────────────────────────────
// 11 · Chat
// ─────────────────────────────────────────────────────────────
function MScreenChat() {
  const [msgs, setMsgs] = React.useState(SGT_MESSAGES.c1);
  const [draft, setDraft] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const p = SGT_PROVIDERS[0];

  const send = () => {
    if (!draft.trim()) return;
    const newMsgs = [...msgs, { from: 'me', text: draft, time: 'Ahora', read: false }];
    setMsgs(newMsgs);
    setDraft('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs(m => [...m, { from: 'them', text: 'Recibido, gracias 👍', time: 'Ahora', read: true }]);
    }, 1800);
  };

  return (
    <MFrame bg="var(--sgt-bg, #f5f7fb)">
      {/* Custom header with avatar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30, background: 'var(--sgt-card-bg, white)',
        borderBottom: '1px solid var(--sgt-border, #eef0f4)', padding: '8px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button style={mIconBtn()}><Icon name="ChevronLeft" size={22} color="var(--sgt-text, #1f2937)" /></button>
        <Avatar idx={0} size={38} online />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            {p.name} {p.verified && <VerifiedBadge size={10} />} {sgtPremium(p.id).estado === 'activo' && <PremiumBadge variant="icon" size={9} />}
          </div>
          <div style={{ fontSize: 11.5, color: SGT.success }}>● En línea</div>
        </div>
        <button style={mIconBtn()}><Icon name="Phone" size={18} color={SGT.blue} /></button>
        <button style={mIconBtn()}><Icon name="Video" size={18} color={SGT.blue} /></button>
      </div>

      {/* Status banner */}
      <div style={{
        margin: 12, padding: 12, background: SGT.skyLight, borderRadius: 12,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Icon name="Wrench" size={18} color={SGT.blue} />
        <div style={{ flex: 1, fontSize: 12.5 }}>
          <div style={{ fontWeight: 700, color: SGT.blueDark }}>Reparación de fuga · Q220</div>
          <div style={{ color: SGT.blue }}>Hoy · 14:00 · Zona 10</div>
        </div>
        <StatusChip status="aceptado" size="sm" />
      </div>

      {/* Messages */}
      <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '78%', padding: '8px 12px', borderRadius: 16,
              background: m.from === 'me' ? SGT.blue : 'var(--sgt-card-bg, white)',
              color: m.from === 'me' ? 'white' : 'var(--sgt-text, #1f2937)',
              borderBottomRightRadius: m.from === 'me' ? 4 : 16,
              borderBottomLeftRadius: m.from === 'me' ? 16 : 4,
              fontSize: 14, lineHeight: 1.4,
              border: m.from === 'me' ? 'none' : '1px solid var(--sgt-border, #eef0f4)',
            }}>
              {m.text}
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2, textAlign: 'right' }}>
                {m.time} {m.from === 'me' && (m.read ? '✓✓' : '✓')}
              </div>
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 14px', borderRadius: 16, borderBottomLeftRadius: 4,
              background: 'var(--sgt-card-bg, white)', border: '1px solid var(--sgt-border, #eef0f4)',
              display: 'inline-flex', gap: 4,
            }}>
              {[0,1,2].map(i => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: 999, background: SGT.textSub,
                  animation: `sgt-typing 1.2s infinite`, animationDelay: `${i * 0.15}s`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div style={{
        position: 'sticky', bottom: 0, padding: '10px 10px 26px',
        background: 'var(--sgt-card-bg, white)', borderTop: '1px solid var(--sgt-border, #eef0f4)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button style={mIconBtn()}><Icon name="Plus" size={22} color={SGT.blue} /></button>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--sgt-bg, #f5f7fb)', borderRadius: 999, padding: '8px 14px',
        }}>
          <input value={draft} onChange={e => setDraft(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && send()}
                 placeholder="Escribe un mensaje…"
                 style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontFamily: 'inherit', color: 'var(--sgt-text, #1f2937)' }} />
          <Icon name="Smile" size={18} color={SGT.textSub} />
        </div>
        <button onClick={send} style={{
          width: 40, height: 40, borderRadius: 999, background: SGT.blue, border: 'none',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(26,115,232,.32)',
        }}>
          <Icon name="Send" size={18} color="white" />
        </button>
      </div>
    </MFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// 12 · Notificaciones
// ─────────────────────────────────────────────────────────────
function MScreenNotificaciones() {
  const groups = ['hoy', 'semana', 'anteriores'];
  const labels = { hoy: 'Hoy', semana: 'Esta semana', anteriores: 'Anteriores' };

  return (
    <MFrame>
      <MAppBar large title="Notificaciones" trailing={
        <button style={{ ...mIconBtn(), width: 'auto', padding: '0 10px', fontSize: 13, fontWeight: 600, color: SGT.blue }}>
          Marcar todo
        </button>
      } />

      <div style={{ padding: '4px 16px 16px' }}>
        {groups.map(g => {
          const items = SGT_NOTIFS.filter(n => n.group === g);
          if (!items.length) return null;
          return (
            <div key={g} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sgt-text-sub, #667085)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                {labels[g]}
              </div>
              <div style={{ background: 'var(--sgt-card-bg, white)', borderRadius: 16, border: '1px solid var(--sgt-border, #eef0f4)', overflow: 'hidden' }}>
                {items.map((n, i) => {
                  const colorMap = {
                    request: SGT.blue, message: SGT.success, review: SGT.warn,
                    payment: '#7c3aed', system: SGT.textSub,
                  };
                  const c = colorMap[n.type] || SGT.blue;
                  return (
                    <div key={n.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                      borderBottom: i < items.length - 1 ? '1px solid var(--sgt-border, #eef0f4)' : 'none',
                      background: n.unread ? SGT.skyLight + '40' : 'transparent',
                    }}>
                      <span style={{
                        width: 36, height: 36, borderRadius: 10, background: c + '18', color: c,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Icon name={n.icon} size={18} color={c} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ fontSize: 13.5, fontWeight: n.unread ? 700 : 600 }}>{n.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--sgt-text-sub, #667085)', whiteSpace: 'nowrap' }}>{n.time}</div>
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--sgt-text-sub, #667085)', marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>
                      </div>
                      {n.unread && (
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: SGT.blue, marginTop: 12, flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <MTabBar
        current="chat" onChange={() => {}}
        tabs={[
          { id: 'inicio', icon: 'Home', label: 'Inicio' },
          { id: 'buscar', icon: 'Search', label: 'Buscar' },
          { id: 'solicitudes', icon: 'ClipboardList', label: 'Pedidos' },
          { id: 'chat', icon: 'Bell', label: 'Avisos', badge: 2 },
          { id: 'perfil', icon: 'User', label: 'Perfil' },
        ]} />
    </MFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// 13 · Admin dashboard
// ─────────────────────────────────────────────────────────────
function MScreenAdmin() {
  const { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, PieChart, Pie, Cell } = window.Recharts || {};

  return (
    <MFrame>
      <MAppBar large title="Admin"
               trailing={<button style={mIconBtn()}><Icon name="Settings" size={20} color="var(--sgt-text, #1f2937)" /></button>} />
      <div style={{ padding: '4px 16px 100px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { lbl: 'Usuarios', val: '12,478', delta: '+8%', icon: 'Users', accent: SGT.blue },
            { lbl: 'Proveedores', val: '1,243', delta: '+12%', icon: 'Briefcase', accent: SGT.success },
            { lbl: 'Servicios', val: '3,872', delta: '+18%', icon: 'TrendingUp', accent: SGT.warn },
            { lbl: 'GMV mes', val: 'Q487K', delta: '+22%', icon: 'DollarSign', accent: '#7c3aed' },
          ].map(k => (
            <MCard key={k.lbl} padding={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 8, background: k.accent + '18', color: k.accent,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={k.icon} size={14} color={k.accent} />
                </span>
                <span style={{ fontSize: 11, color: 'var(--sgt-text-sub, #667085)', fontWeight: 600 }}>{k.lbl}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{k.val}</div>
              <div style={{ fontSize: 11, color: SGT.success, fontWeight: 600 }}>
                <Icon name="TrendingUp" size={11} color={SGT.success} /> {k.delta}
              </div>
            </MCard>
          ))}
        </div>

        {/* Bar chart */}
        <MCard padding={14} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Solicitudes / mes</div>
          <div style={{ height: 130 }}>
            {ResponsiveContainer && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SGT_REQ_BY_MONTH}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#667085' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="value" fill={SGT.blue} radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </MCard>

        {/* Donut + heatmap row */}
        <MCard padding={14} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Por categoría</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 110, height: 110, flexShrink: 0 }}>
              {ResponsiveContainer && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={SGT_REQ_BY_CAT} dataKey="value" innerRadius={32} outerRadius={52} paddingAngle={2}>
                      {SGT_REQ_BY_CAT.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SGT_REQ_BY_CAT.map(c => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: c.color }} />
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <span style={{ fontWeight: 700 }}>{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </MCard>

        {/* Pendientes verificación */}
        <MSectionTitle padding="0 0 0 0" action={<a style={{ fontSize: 12, color: SGT.blue, fontWeight: 600 }}>Ver todos</a>}>
          Verificaciones pendientes
        </MSectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SGT_PENDING_VERIF.map(v => {
            const cat = SGT_CATEGORIES.find(c => c.id === v.cat);
            return (
              <MCard key={v.id} padding={12}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar idx={v.faceIdx} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{v.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--sgt-text-sub, #667085)', marginTop: 1 }}>
                      <Icon name={cat.icon} size={10} color={cat.color} /> {cat.name} · {v.zone} · {v.applied}
                    </div>
                  </div>
                  <button style={{ width: 32, height: 32, borderRadius: 8, background: SGT.error + '18', color: SGT.error, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="X" size={16} color={SGT.error} />
                  </button>
                  <button style={{ width: 32, height: 32, borderRadius: 8, background: SGT.success, color: 'white', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="Check" size={16} color="white" strokeWidth={3} />
                  </button>
                </div>
              </MCard>
            );
          })}
        </div>
      </div>

      <MTabBar
        current="inicio" onChange={() => {}}
        tabs={[
          { id: 'inicio', icon: 'LayoutDashboard', label: 'Inicio' },
          { id: 'usuarios', icon: 'Users', label: 'Usuarios' },
          { id: 'verif', icon: 'ShieldCheck', label: 'Verif.', badge: 4 },
          { id: 'reportes', icon: 'BarChart3', label: 'Reportes' },
          { id: 'config', icon: 'Settings', label: 'Config.' },
        ]} />
    </MFrame>
  );
}

Object.assign(window, {
  MScreenProviderDashboard, MScreenEditProfile, MScreenChat,
  MScreenNotificaciones, MScreenAdmin,
});
