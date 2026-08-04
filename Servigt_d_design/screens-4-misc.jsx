// Screens 11-13: Chat, Notificaciones, Admin

// ─── 11. CHAT ──────────────────────────────────────────────────────
function ScreenChat({ dark, setDark }) {
  const [activeId, setActiveId] = React.useState('c1');
  const [draft, setDraft] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [messages, setMessages] = React.useState(SGT_MESSAGES);

  const active = SGT_CHATS.find(c => c.id === activeId);
  const provider = SGT_PROVIDERS_BY_ID[active.with];
  const idx = SGT_PROVIDERS.findIndex(p => p.id === active.with);
  const msgs = messages[activeId] || [];
  const filteredChats = SGT_CHATS.filter(c => {
    const p = SGT_PROVIDERS_BY_ID[c.with];
    return p.name.toLowerCase().includes(search.toLowerCase());
  });

  const send = () => {
    if (!draft.trim()) return;
    const next = { ...messages, [activeId]: [...msgs, { from: 'me', text: draft, time: 'ahora', read: false }] };
    setMessages(next);
    setDraft('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(m => ({ ...m, [activeId]: [...(m[activeId]||[]), { from: 'them', text: 'Recibido, gracias por avisar 👍', time: 'ahora', read: false }] }));
    }, 1800);
  };

  return (
    <SgtFrame mode="client" dark={dark} setDark={setDark} notifCount={3} padding={0}>
      <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
        {/* Conversations list */}
        <aside style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--sgt-border)', background: 'var(--sgt-card-bg)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 16, borderBottom: `1px solid ${SGT.borderSoft}` }}>
            <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700 }}>Mensajes</h2>
            <Input icon="Search" placeholder="Buscar conversación…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredChats.map(c => {
              const cp = SGT_PROVIDERS_BY_ID[c.with];
              const cidx = SGT_PROVIDERS.findIndex(p => p.id === c.with);
              const isActive = c.id === activeId;
              return (
                <div key={c.id} onClick={() => setActiveId(c.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer',
                  background: isActive ? SGT.skyLight : 'transparent',
                  borderLeft: `3px solid ${isActive ? SGT.blue : 'transparent'}`,
                }}>
                  <Avatar idx={cidx} size={44} online={cp.available} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: c.unread ? 700 : 600, color: 'var(--sgt-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cp.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--sgt-text-sub)', flexShrink: 0 }}>{c.time}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, gap: 8 }}>
                      <span style={{ fontSize: 12, color: c.unread ? 'var(--sgt-text)' : 'var(--sgt-text-sub)', fontWeight: c.unread ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.last}</span>
                      {c.unread > 0 && <span style={{ minWidth: 18, height: 18, padding: '0 6px', background: SGT.blue, color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.unread}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Active conversation */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--sgt-bg)', minWidth: 0 }}>
          {/* Header */}
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${SGT.borderSoft}`, background: 'var(--sgt-card-bg)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar idx={idx} size={42} online={provider.available} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{provider.name}</span>
                {provider.verified && <VerifiedBadge size={11} />}
              </div>
              <div style={{ fontSize: 12, color: provider.available ? SGT.success : 'var(--sgt-text-sub)', marginTop: 2 }}>
                {provider.available ? '● En línea' : 'Desconectado'}
              </div>
            </div>
            <StatusChip status={active.status} size="sm" />
            <button style={iconBtn()}><Icon name="Phone" size={16} color="var(--sgt-text)" /></button>
            <button style={iconBtn()}><Icon name="User" size={16} color="var(--sgt-text)" /></button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ alignSelf: 'center', padding: '4px 12px', borderRadius: 999, background: 'var(--sgt-card-bg)', fontSize: 11, color: 'var(--sgt-text-sub)', border: '1px solid var(--sgt-border)' }}>
              Solicitud creada · 04 May 2026
            </div>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '70%' }}>
                  <div style={{
                    padding: '10px 14px',
                    background: m.from === 'me' ? SGT.blue : 'var(--sgt-card-bg)',
                    color: m.from === 'me' ? 'white' : 'var(--sgt-text)',
                    borderRadius: m.from === 'me' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    fontSize: 14, lineHeight: 1.4,
                    boxShadow: m.from !== 'me' ? '0 1px 2px rgba(0,0,0,.05)' : 'none',
                    border: m.from !== 'me' ? '1px solid var(--sgt-border)' : 'none',
                  }}>{m.text}</div>
                  <div style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start', alignItems: 'center', gap: 4, marginTop: 3, fontSize: 10, color: 'var(--sgt-text-sub)' }}>
                    <span>{m.time}</span>
                    {m.from === 'me' && <Icon name={m.read ? 'CheckCheck' : 'Check'} size={12} color={m.read ? SGT.blue : SGT.textSub} />}
                  </div>
                </div>
              </div>
            ))}
            {typing && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '12px 16px', background: 'var(--sgt-card-bg)', borderRadius: '14px 14px 14px 4px', display: 'inline-flex', gap: 4, border: '1px solid var(--sgt-border)' }}>
                  {[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: 999, background: SGT.textSub, animation: `sgt-typing 1.2s ${i*0.15}s infinite` }} />)}
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div style={{ padding: 14, borderTop: `1px solid ${SGT.borderSoft}`, background: 'var(--sgt-card-bg)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={iconBtn()}><Icon name="Paperclip" size={16} color="var(--sgt-text-sub)" /></button>
            <button style={iconBtn()}><Icon name="MapPin" size={16} color="var(--sgt-text-sub)" /></button>
            <button style={iconBtn()}><Icon name="Image" size={16} color="var(--sgt-text-sub)" /></button>
            <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Escribe un mensaje…"
                   rightSlot={<button onClick={send} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}><Icon name="Smile" size={16} color={SGT.textSub} /></button>} />
            <Button kind="primary" icon="Send" onClick={send}>Enviar</Button>
          </div>
        </div>
      </div>
    </SgtFrame>
  );
}

// ─── 12. NOTIFICACIONES ────────────────────────────────────────────
function ScreenNotificaciones({ dark, setDark }) {
  const [items, setItems] = React.useState(SGT_NOTIFS);
  const groups = [
    { id: 'hoy', label: 'Hoy' },
    { id: 'semana', label: 'Esta semana' },
    { id: 'anteriores', label: 'Anteriores' },
  ];
  const typeColor = {
    request: SGT.blue, message: '#7c3aed', review: SGT.warn, payment: SGT.success, system: SGT.textSub,
  };

  const markAllRead = () => setItems(items.map(i => ({ ...i, unread: false })));
  const markRead = (id) => setItems(items.map(i => i.id === id ? { ...i, unread: false } : i));

  const unreadCount = items.filter(i => i.unread).length;

  return (
    <SgtFrame mode="client" dark={dark} setDark={setDark} notifCount={unreadCount}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Notificaciones</h1>
            <p style={{ fontSize: 13, color: 'var(--sgt-text-sub)', marginTop: 4, margin: 0 }}>{unreadCount} sin leer</p>
          </div>
          {unreadCount > 0 && <Button kind="ghost" size="sm" icon="CheckCheck" onClick={markAllRead}>Marcar todas como leídas</Button>}
        </div>

        {groups.map(g => {
          const groupItems = items.filter(i => i.group === g.id);
          if (groupItems.length === 0) return null;
          return (
            <div key={g.id} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sgt-text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{g.label}</div>
              <Card padding={0}>
                {groupItems.map((n, i) => {
                  const c = typeColor[n.type] || SGT.blue;
                  return (
                    <div key={n.id} onClick={() => markRead(n.id)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14,
                      borderTop: i > 0 ? `1px solid ${SGT.borderSoft}` : 'none',
                      cursor: 'pointer', position: 'relative',
                      background: n.unread ? 'rgba(78,168,255,0.05)' : 'transparent',
                    }}>
                      {n.unread && <span style={{ position: 'absolute', left: 6, top: '50%', width: 6, height: 6, borderRadius: 999, background: SGT.blue, transform: 'translateY(-50%)' }} />}
                      <span style={{ width: 38, height: 38, borderRadius: 10, background: c + '18', color: c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name={n.icon} size={18} color={c} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: n.unread ? 700 : 600 }}>{n.title}</span>
                          <span style={{ fontSize: 11, color: 'var(--sgt-text-sub)', flexShrink: 0 }}>{n.time}</span>
                        </div>
                        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--sgt-text-sub)', lineHeight: 1.45 }}>{n.body}</p>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>
          );
        })}
      </div>
    </SgtFrame>
  );
}

// ─── 13. ADMIN DASHBOARD ───────────────────────────────────────────
function ScreenAdmin({ dark, setDark }) {
  const [current, setCurrent] = React.useState('resumen');
  const sidebar = [
    { id: 'resumen', label: 'Resumen', icon: 'LayoutDashboard' },
    { id: 'usuarios', label: 'Usuarios', icon: 'Users' },
    { id: 'proveedores', label: 'Proveedores', icon: 'Briefcase', badge: 4 },
    { id: 'solicitudes', label: 'Solicitudes', icon: 'ClipboardList' },
    { id: 'categorias', label: 'Categorías', icon: 'Tag' },
    { id: 'resenas', label: 'Reseñas', icon: 'Star' },
    { id: 'reportes', label: 'Reportes', icon: 'AlertTriangle' },
    { id: 'config', label: 'Configuración', icon: 'Settings' },
  ];

  // Sort zones for heatmap
  const maxHeat = Math.max(...SGT_ZONE_HEAT.map(z => z.value));

  return (
    <SgtFrame mode="admin" sidebar={sidebar} current={current} onNav={setCurrent} dark={dark} setDark={setDark} notifCount={6}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Resumen general</h1>
      <p style={{ fontSize: 13, color: 'var(--sgt-text-sub)', marginTop: 4, marginBottom: 20 }}>Datos al cierre de Abril 2026</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPI label="Total usuarios"      value="12,486" delta="+8.4%"  icon="Users"        accent={SGT.blue} />
        <KPI label="Total proveedores"   value="847"    delta="+5.1%"  icon="Briefcase"    accent="#7c3aed" />
        <KPI label="Solicitudes (mes)"   value="3,290"  delta="+18.2%" icon="ClipboardList" accent={SGT.success} />
        <KPI label="Ingresos plataforma" value="Q142K"  delta="+22%"   icon="Wallet"        accent={SGT.warn} />
        <KPI label="Conversión"          value="68.4%"  delta="+2.1%"  icon="TrendingUp"    accent={SGT.error} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginBottom: 20 }}>
        <Card padding={20}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Solicitudes por mes</h3>
          <div style={{ width: '100%', height: 220 }}>
            <Recharts.ResponsiveContainer>
              <Recharts.BarChart data={SGT_REQ_BY_MONTH} margin={{ left: -16, top: 6, right: 6, bottom: 0 }}>
                <Recharts.CartesianGrid strokeDasharray="3 3" stroke="var(--sgt-border)" vertical={false} />
                <Recharts.XAxis dataKey="month" stroke="var(--sgt-text-sub)" fontSize={11} tickLine={false} axisLine={false} />
                <Recharts.YAxis stroke="var(--sgt-text-sub)" fontSize={11} tickLine={false} axisLine={false} />
                <Recharts.Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 6px 20px rgba(0,0,0,.15)', background: 'var(--sgt-card-bg)' }} />
                <Recharts.Bar dataKey="value" fill={SGT.blue} radius={[8, 8, 0, 0]} />
              </Recharts.BarChart>
            </Recharts.ResponsiveContainer>
          </div>
        </Card>

        <Card padding={20}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Por categoría</h3>
          <div style={{ width: '100%', height: 220 }}>
            <Recharts.ResponsiveContainer>
              <Recharts.PieChart>
                <Recharts.Pie data={SGT_REQ_BY_CAT} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2}>
                  {SGT_REQ_BY_CAT.map((e, i) => <Recharts.Cell key={i} fill={e.color} />)}
                </Recharts.Pie>
                <Recharts.Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 6px 20px rgba(0,0,0,.15)', background: 'var(--sgt-card-bg)' }} formatter={v => `${v}%`} />
              </Recharts.PieChart>
            </Recharts.ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, justifyContent: 'center' }}>
            {SGT_REQ_BY_CAT.map(c => (
              <span key={c.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--sgt-text-sub)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                {c.name} {c.value}%
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 14, marginBottom: 20 }}>
        <Card padding={20}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Mapa de calor por zona</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SGT_ZONE_HEAT.map(z => (
              <div key={z.zone} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 100, fontSize: 12, color: 'var(--sgt-text-sub)' }}>{z.zone}</span>
                <div style={{ flex: 1, height: 22, background: 'var(--sgt-bg)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: `${(z.value/maxHeat)*100}%`, height: '100%', background: `linear-gradient(90deg, ${SGT.sky}, ${SGT.blue})`, borderRadius: 6 }} />
                  <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: SGT.text }}>{z.value}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding={0}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: `1px solid ${SGT.borderSoft}` }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Proveedores pendientes de verificación</h3>
            <span style={{ fontSize: 11, padding: '3px 10px', background: SGT.warn + '22', color: SGT.warn, fontWeight: 700, borderRadius: 999 }}>{SGT_PENDING_VERIF.length} pendientes</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontSize: 11, fontWeight: 700, color: 'var(--sgt-text-sub)', textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'left' }}>
                <th style={{ padding: '10px 18px' }}>Proveedor</th>
                <th style={{ padding: '10px 12px' }}>Zona</th>
                <th style={{ padding: '10px 12px' }}>Solicitado</th>
                <th style={{ padding: '10px 18px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {SGT_PENDING_VERIF.map(pv => (
                <tr key={pv.id} style={{ borderTop: `1px solid ${SGT.borderSoft}` }}>
                  <td style={{ padding: '12px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar idx={pv.faceIdx} size={32} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{pv.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--sgt-text-sub)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CatIcon catId={pv.cat} size={14} />
                          {SGT_CATEGORIES.find(c => c.id === pv.cat).name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 12px', fontSize: 13 }}>{pv.zone}</td>
                  <td style={{ padding: '12px 12px', fontSize: 13, color: 'var(--sgt-text-sub)' }}>{pv.applied}</td>
                  <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <Button kind="ghost" size="sm" icon="Eye">Ver</Button>
                      <Button kind="success" size="sm" icon="ShieldCheck">Aprobar</Button>
                      <Button kind="danger" size="sm" icon="X">Rechazar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </SgtFrame>
  );
}

Object.assign(window, { ScreenChat, ScreenNotificaciones, ScreenAdmin });
