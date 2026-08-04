// Screens 9-10: Provider Dashboard + Edit Profile

// ─── 9. PROVIDER DASHBOARD ─────────────────────────────────────────
function ScreenProviderDashboard({ dark, setDark }) {
  const [available, setAvailable] = React.useState(true);
  const [current, setCurrent] = React.useState('inicio');
  const sidebar = [
    { id: 'inicio',     label: 'Inicio',        icon: 'LayoutDashboard' },
    { id: 'solicitudes', label: 'Solicitudes',  icon: 'ClipboardList', badge: 4 },
    { id: 'mensajes',   label: 'Mensajes',      icon: 'MessageCircle', badge: 2 },
    { id: 'calendario', label: 'Calendario',    icon: 'Calendar' },
    { id: 'perfil',     label: 'Mi perfil',     icon: 'User' },
    { id: 'stats',      label: 'Estadísticas',  icon: 'BarChart3' },
    { id: 'pagos',      label: 'Pagos',         icon: 'Wallet' },
  ];

  const incoming = [
    { id: 'i1', client: 'Andrea P.', faceIdx: 1, service: 'Reparación de fuga', zone: 'Zona 14', date: 'Hoy 16:00', amount: 220, status: 'pendiente' },
    { id: 'i2', client: 'Roberto G.', faceIdx: 4, service: 'Destape de cañería', zone: 'Mixco', date: 'Mañ. 09:00', amount: 280, status: 'pendiente' },
    { id: 'i3', client: 'Lucía M.', faceIdx: 3, service: 'Instalación de grifería', zone: 'Zona 10', date: '06 May 14:00', amount: 220, status: 'aceptado' },
    { id: 'i4', client: 'Daniel S.', faceIdx: 0, service: 'Cambio de tubería', zone: 'Antigua', date: '07 May 10:00', amount: 450, status: 'aceptado' },
  ];

  return (
    <SgtFrame mode="provider" sidebar={sidebar} current={current} onNav={setCurrent}
              dark={dark} setDark={setDark} notifCount={4}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 10 }}>Hola, Carlos 👋 <PremiumBadge variant="inline" /></h1>
          <p style={{ fontSize: 13, color: 'var(--sgt-text-sub)', marginTop: 4, margin: 0 }}>Resumen de tu actividad este mes</p>
        </div>
        <Card padding={10} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: available ? SGT.success : '#94a3b8', animation: available ? 'sgt-pulse 2s infinite' : 'none' }} />
            {available ? 'Disponible ahora' : 'No disponible'}
          </span>
          <Toggle label="" value={available} onChange={setAvailable} />
        </Card>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <KPI label="Solicitudes activas" value="8"     delta="+2 vs sem pasada" icon="ClipboardList" accent={SGT.blue} />
        <KPI label="Completadas (mes)"   value="34"    delta="+12% vs abr"      icon="CheckCircle2" accent={SGT.success} />
        <KPI label="★ Promedio"          value="4.9"   delta="+0.1"             icon="Star"          accent={SGT.warn} />
        <KPI label="Ingresos (mes)"      value="Q8,650" delta="+24%"            icon="Wallet"        accent={SGT.blueDark} />
      </div>

      {/* Chart + tasks side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 20 }}>
        <Card padding={20}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Ingresos últimos 6 meses</h3>
            <span style={{ fontSize: 12, color: 'var(--sgt-text-sub)' }}>Total: Q37,350</span>
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <Recharts.ResponsiveContainer>
              <Recharts.AreaChart data={SGT_INCOME_6M} margin={{ left: -16, top: 6, right: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SGT.blue} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={SGT.blue} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Recharts.CartesianGrid strokeDasharray="3 3" stroke="var(--sgt-border)" vertical={false} />
                <Recharts.XAxis dataKey="month" stroke="var(--sgt-text-sub)" fontSize={11} tickLine={false} axisLine={false} />
                <Recharts.YAxis stroke="var(--sgt-text-sub)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `Q${v/1000}k`} />
                <Recharts.Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 6px 20px rgba(0,0,0,.15)', background: 'var(--sgt-card-bg)' }} formatter={v => [`Q${v.toLocaleString()}`, 'Ingresos']} />
                <Recharts.Area type="monotone" dataKey="value" stroke={SGT.blue} strokeWidth={2.5} fill="url(#incGrad)" />
              </Recharts.AreaChart>
            </Recharts.ResponsiveContainer>
          </div>
        </Card>

        <Card padding={20}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Hoy</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { time: '14:00', service: 'Reparación de fuga', zone: 'Zona 10', status: 'aceptado' },
              { time: '16:30', service: 'Instalación grifería', zone: 'Mixco', status: 'aceptado' },
              { time: '18:00', service: 'Diagnóstico', zone: 'Zona 14', status: 'pendiente' },
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: 'var(--sgt-bg)', borderRadius: 10 }}>
                <div style={{ width: 44, textAlign: 'center', fontWeight: 700, fontSize: 13, color: SGT.blueDark }}>{t.time}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.service}</div>
                  <div style={{ fontSize: 11, color: 'var(--sgt-text-sub)' }}>{t.zone}</div>
                </div>
                <StatusChip status={t.status} size="sm" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Incoming requests */}
      <Card padding={0}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: `1px solid ${SGT.borderSoft}` }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Solicitudes entrantes</h3>
          <a style={{ fontSize: 13, color: SGT.blue, fontWeight: 600, cursor: 'pointer' }}>Ver todas →</a>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ fontSize: 11, fontWeight: 700, color: 'var(--sgt-text-sub)', textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'left' }}>
              <th style={{ padding: '10px 18px' }}>Cliente</th>
              <th style={{ padding: '10px 12px' }}>Servicio</th>
              <th style={{ padding: '10px 12px' }}>Fecha</th>
              <th style={{ padding: '10px 12px' }}>Monto</th>
              <th style={{ padding: '10px 12px' }}>Estado</th>
              <th style={{ padding: '10px 18px', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {incoming.map(r => (
              <tr key={r.id} style={{ borderTop: `1px solid ${SGT.borderSoft}` }}>
                <td style={{ padding: '12px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar idx={r.faceIdx} size={32} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.client}</div>
                      <div style={{ fontSize: 11, color: 'var(--sgt-text-sub)' }}>{r.zone}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 12px', fontSize: 13 }}>{r.service}</td>
                <td style={{ padding: '12px 12px', fontSize: 13 }}>{r.date}</td>
                <td style={{ padding: '12px 12px', fontSize: 14, fontWeight: 700, color: SGT.blueDark }}>Q{r.amount}</td>
                <td style={{ padding: '12px 12px' }}><StatusChip status={r.status} size="sm" /></td>
                <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                  {r.status === 'pendiente' ? (
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <Button kind="success" size="sm" icon="Check">Aceptar</Button>
                      <Button kind="ghost" size="sm" icon="X">Rechazar</Button>
                    </div>
                  ) : (
                    <Button kind="ghost" size="sm" icon="Eye">Ver</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </SgtFrame>
  );
}

// ─── 10. PROVIDER EDIT PROFILE ─────────────────────────────────────
function ScreenEditProfile({ dark, setDark }) {
  const [open, setOpen] = React.useState({ basics: true, services: true, zones: false, hours: false, gallery: false, payment: false });
  const [zones, setZones] = React.useState(['Zona 10', 'Zona 14', 'Mixco']);
  const [bio, setBio] = React.useState('Plomero certificado con experiencia en residencial y comercial. Trabajos garantizados.');
  const sidebar = [
    { id: 'inicio', label: 'Inicio', icon: 'LayoutDashboard' },
    { id: 'solicitudes', label: 'Solicitudes', icon: 'ClipboardList' },
    { id: 'mensajes', label: 'Mensajes', icon: 'MessageCircle' },
    { id: 'calendario', label: 'Calendario', icon: 'Calendar' },
    { id: 'perfil', label: 'Mi perfil', icon: 'User' },
    { id: 'stats', label: 'Estadísticas', icon: 'BarChart3' },
    { id: 'pagos', label: 'Pagos', icon: 'Wallet' },
  ];

  const toggleSection = k => setOpen({ ...open, [k]: !open[k] });
  const days = ['L','M','M','J','V','S','D'];
  const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7..18

  return (
    <SgtFrame mode="provider" sidebar={sidebar} current="perfil" dark={dark} setDark={setDark} notifCount={4}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Editar perfil</h1>
          <p style={{ fontSize: 13, color: 'var(--sgt-text-sub)', marginTop: 4, marginBottom: 20 }}>Los cambios se reflejan en tu perfil público</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Section title="Datos básicos" icon="User" open={open.basics} onToggle={() => toggleSection('basics')}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
                <Avatar idx={0} size={64} />
                <Button kind="secondary" size="sm" icon="Camera">Cambiar foto</Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Nombre"><Input value="Carlos Méndez" onChange={()=>{}} /></Field>
                <Field label="Teléfono"><Input icon="Phone" value="+502 5512-3456" onChange={()=>{}} /></Field>
                <Field label="Correo" wide><Input icon="Mail" value="carlos.mendez@email.com" onChange={()=>{}} /></Field>
                <Field label="Descripción profesional" wide>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} style={{ width: '100%', minHeight: 80, padding: 12, border: '1px solid var(--sgt-border)', borderRadius: 12, background: 'var(--sgt-input-bg)', color: 'var(--sgt-text)', fontFamily: 'inherit', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                </Field>
              </div>
            </Section>

            <Section title="Servicios y tarifas" icon="Wrench" open={open.services} onToggle={() => toggleSection('services')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SGT_PROVIDERS_BY_ID.p1.services.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--sgt-bg)', borderRadius: 10 }}>
                    <Icon name="GripVertical" size={16} color={SGT.textSub} />
                    <input value={s.name} onChange={()=>{}} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontWeight: 500, color: 'var(--sgt-text)' }} />
                    <span style={{ fontSize: 12, color: 'var(--sgt-text-sub)' }}>Q</span>
                    <input value={s.price} onChange={()=>{}} style={{ width: 70, padding: '6px 8px', border: '1px solid var(--sgt-border)', borderRadius: 8, background: 'var(--sgt-card-bg)', color: 'var(--sgt-text)', fontSize: 13, textAlign: 'right' }} />
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Icon name="Trash2" size={16} color={SGT.error} /></button>
                  </div>
                ))}
                <Button kind="ghost" size="sm" icon="Plus">Añadir servicio</Button>
              </div>
            </Section>

            <Section title="Zonas de cobertura" icon="MapPin" open={open.zones} onToggle={() => toggleSection('zones')}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', minHeight: 44, border: '1px solid var(--sgt-border)', borderRadius: 12, background: 'var(--sgt-input-bg)' }}>
                {zones.map(z => (
                  <span key={z} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: SGT.skyLight, color: SGT.blueDark, borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                    {z}
                    <span onClick={() => setZones(zones.filter(zz => zz !== z))} style={{ cursor: 'pointer', display: 'flex' }}>
                      <Icon name="X" size={12} color={SGT.blueDark} />
                    </span>
                  </span>
                ))}
                <select onChange={e => { if (e.target.value && !zones.includes(e.target.value)) setZones([...zones, e.target.value]); e.target.value = ''; }} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--sgt-text-sub)' }}>
                  <option value="">+ agregar zona</option>
                  {SGT_ZONES.filter(z => !zones.includes(z)).map(z => <option key={z}>{z}</option>)}
                </select>
              </div>
            </Section>

            <Section title="Horarios" icon="Clock" open={open.hours} onToggle={() => toggleSection('hours')}>
              <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${days.length}, 1fr)`, gap: 4, fontSize: 11 }}>
                <div />
                {days.map((d, i) => <div key={i} style={{ textAlign: 'center', fontWeight: 700, color: 'var(--sgt-text-sub)' }}>{d}</div>)}
                {hours.map(h => (
                  <React.Fragment key={h}>
                    <div style={{ fontSize: 11, color: 'var(--sgt-text-sub)', textAlign: 'right', paddingRight: 6 }}>{h}:00</div>
                    {days.map((_, di) => {
                      const active = di < 5 && h >= 8 && h <= 17;
                      return <div key={di} style={{ height: 18, background: active ? SGT.blue : 'var(--sgt-bg)', borderRadius: 4, cursor: 'pointer' }} />;
                    })}
                  </React.Fragment>
                ))}
              </div>
            </Section>

            <Section title="Galería" icon="Image" open={open.gallery} onToggle={() => toggleSection('gallery')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ position: 'relative', height: 80, borderRadius: 8, backgroundImage: `url(${sgtWork('plomeria', i, 200)})`, backgroundSize: 'cover' }}>
                    <button style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 999, background: 'rgba(0,0,0,.6)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="X" size={12} color="white" />
                    </button>
                  </div>
                ))}
                <div style={{ height: 80, borderRadius: 8, border: '2px dashed var(--sgt-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--sgt-text-sub)' }}>
                  <Icon name="UploadCloud" size={18} color={SGT.textSub} />
                  <span style={{ fontSize: 10, marginTop: 2 }}>Subir</span>
                </div>
              </div>
            </Section>

            <Section title="Métodos de pago aceptados" icon="CreditCard" open={open.payment} onToggle={() => toggleSection('payment')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { id: 'efectivo', label: 'Efectivo', icon: 'Banknote', on: true },
                  { id: 'transf',   label: 'Transferencia bancaria', icon: 'Landmark', on: true },
                  { id: 'tarj',     label: 'Tarjeta de crédito/débito', icon: 'CreditCard', on: false },
                ].map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: 'var(--sgt-bg)', borderRadius: 10 }}>
                    <Icon name={m.icon} size={16} color={SGT.blue} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{m.label}</span>
                    <Toggle label="" value={m.on} onChange={()=>{}} />
                  </div>
                ))}
              </div>
            </Section>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Button kind="ghost" full>Cancelar</Button>
              <Button kind="primary" full icon="Save">Guardar cambios</Button>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div style={{ position: 'sticky', top: 80, alignSelf: 'flex-start' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sgt-text-sub)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Vista previa pública
          </div>
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <div style={{ height: 70, background: `linear-gradient(135deg, ${SGT.blueDark}, ${SGT.sky})` }} />
            <div style={{ padding: 16, marginTop: -32 }}>
              <Avatar idx={0} size={64} ring="white" online />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Carlos Méndez</span>
                <VerifiedBadge size={12} />
                <PremiumBadge variant="inline" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Stars value={4.9} size={12} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>4.9</span>
                <span style={{ fontSize: 12, color: 'var(--sgt-text-sub)' }}>(128)</span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.5, marginTop: 10, color: 'var(--sgt-text)' }}>{bio}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {zones.slice(0, 4).map(z => <span key={z} style={{ fontSize: 11, padding: '3px 8px', background: 'var(--sgt-bg)', borderRadius: 999, color: 'var(--sgt-text-sub)' }}>{z}</span>)}
              </div>
              <Button kind="primary" full size="sm" style={{ marginTop: 12 }}>Solicitar servicio</Button>
            </div>
          </Card>
        </div>
      </div>
    </SgtFrame>
  );
}

const Section = ({ title, icon, open, onToggle, children }) => (
  <Card padding={0}>
    <button onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
      <Icon name={icon} size={18} color={SGT.blue} />
      <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 700 }}>{title}</span>
      <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={16} color={SGT.textSub} />
    </button>
    {open && (
      <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${SGT.borderSoft}` }}>
        <div style={{ paddingTop: 14 }}>{children}</div>
      </div>
    )}
  </Card>
);

Object.assign(window, { ScreenProviderDashboard, ScreenEditProfile, Section });
