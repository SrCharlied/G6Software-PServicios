// Mobile screens 5-8: Home cliente, Provider detail, Solicitud, Mis solicitudes

// ─────────────────────────────────────────────────────────────
// 05 · Home cliente
// ─────────────────────────────────────────────────────────────
function MScreenHomeCliente() {
  const [tab, setTab] = React.useState('inicio');
  const [view, setView] = React.useState('lista');
  const [search, setSearch] = React.useState('');
  const [activeCat, setActiveCat] = React.useState(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const filtered = activeCat ? SGT_PROVIDERS.filter(p => p.cat === activeCat) : SGT_PROVIDERS;

  return (
    <MFrame>
      {/* Custom hero header */}
      <div style={{
        background: 'var(--sgt-card-bg, white)', borderBottom: '1px solid var(--sgt-border, #eef0f4)',
        padding: '14px 16px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Avatar idx={9} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--sgt-text-sub, #667085)' }}>
              <Icon name="MapPin" size={11} color={SGT.blue} /> Zona 10, Guatemala
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sgt-text, #1f2937)' }}>Hola, Andrea 👋</div>
          </div>
          <button style={{ ...mIconBtn(), border: '1px solid var(--sgt-border, #eef0f4)', position: 'relative' }}>
            <Icon name="Bell" size={18} color="var(--sgt-text, #1f2937)" />
            <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 999, background: SGT.error }} />
          </button>
        </div>
        <MInput icon="Search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar servicios o proveedores"
                rightSlot={<button onClick={() => setFiltersOpen(!filtersOpen)} style={{
                  width: 32, height: 32, borderRadius: 8, background: SGT.skyLight, border: 'none',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}><Icon name="SlidersHorizontal" size={14} color={SGT.blue} /></button>} />
      </div>

      {/* Categorías chips */}
      <div style={{ padding: '12px 0 8px', background: 'var(--sgt-card-bg, white)', borderBottom: '1px solid var(--sgt-border, #eef0f4)' }}>
        <div style={{ display: 'flex', gap: 8, padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <MChip active={!activeCat} onClick={() => setActiveCat(null)}>Todos</MChip>
          {SGT_CATEGORIES.slice(0, 7).map(c => (
            <MChip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)} icon={c.icon}>{c.name}</MChip>
          ))}
        </div>
      </div>

      {/* Toggle Lista/Mapa */}
      <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: 'var(--sgt-text-sub, #667085)' }}>
          <b style={{ color: 'var(--sgt-text, #1f2937)' }}>{filtered.length}</b> proveedores cerca
        </div>
        <div style={{ width: 140 }}>
          <MSegment
            items={[{ id: 'lista', label: 'Lista', icon: 'List' }, { id: 'mapa', label: 'Mapa', icon: 'Map' }]}
            value={view} onChange={setView} />
        </div>
      </div>

      {view === 'lista' ? (
        <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((p, i) => {
            const cat = SGT_CATEGORIES.find(c => c.id === p.cat);
            return (
              <MCard key={p.id} padding={12}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ position: 'relative' }}>
                    <Avatar idx={i} size={56} />
                    {p.available && <span style={{
                      position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, borderRadius: 999,
                      background: SGT.success, boxShadow: '0 0 0 2px var(--sgt-card-bg, white)',
                    }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--sgt-text, #1f2937)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      {p.verified && <VerifiedBadge size={11} />}
                      {sgtPremium(p.id).estado === 'activo' && <PremiumBadge variant="icon" size={10} />}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--sgt-text-sub, #667085)', marginTop: 2 }}>
                      <Icon name={cat.icon} size={11} color={cat.color} /> {cat.name} · {p.zone}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                      <Stars value={p.rating} size={11} />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{p.rating}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--sgt-text-sub, #667085)' }}>({p.reviews})</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: SGT.blue }}>Q{p.priceFrom}+</div>
                    <button style={{
                      height: 30, padding: '0 12px', background: SGT.blue, color: 'white',
                      border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>Contratar</button>
                  </div>
                </div>
              </MCard>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '4px 16px 16px', position: 'relative' }}>
          <OsmMap height={460} bbox="-90.55,14.55,-90.45,14.65" marker="14.6,-90.5" />
          {/* mini card overlay */}
          <div style={{
            position: 'absolute', left: 24, right: 24, bottom: 24,
            background: 'var(--sgt-card-bg, white)', borderRadius: 16, padding: 12,
            boxShadow: '0 12px 30px rgba(0,0,0,.18)', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Avatar idx={0} size={42} online />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{SGT_PROVIDERS[0].name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--sgt-text-sub, #667085)' }}>
                <Stars value={SGT_PROVIDERS[0].rating} size={10} /> {SGT_PROVIDERS[0].rating} · 0.4 km
              </div>
            </div>
            <button style={{
              height: 32, padding: '0 12px', background: SGT.blue, color: 'white',
              border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>Ver</button>
          </div>
        </div>
      )}

      <MTabBar
        current={tab} onChange={setTab}
        tabs={[
          { id: 'inicio', icon: 'Home', label: 'Inicio' },
          { id: 'buscar', icon: 'Search', label: 'Buscar' },
          { id: 'solicitudes', icon: 'ClipboardList', label: 'Pedidos', badge: 2 },
          { id: 'chat', icon: 'MessageCircle', label: 'Chat', badge: 3 },
          { id: 'perfil', icon: 'User', label: 'Perfil' },
        ]} />
    </MFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// 06 · Detalle de proveedor
// ─────────────────────────────────────────────────────────────
function MScreenProviderDetail() {
  const p = SGT_PROVIDERS[0];
  const cat = SGT_CATEGORIES.find(c => c.id === p.cat);
  const [tab, setTab] = React.useState('servicios');
  const reviews = SGT_REVIEWS.filter(r => r.provider === p.id);

  return (
    <MFrame bg="var(--sgt-card-bg, white)">
      {/* Hero with cover image */}
      <div style={{ position: 'relative', height: 200 }}>
        <img src={sgtWork(p.cat, 0, 800)} alt=""
             style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,.3) 0%, transparent 40%, rgba(0,0,0,.4) 100%)',
        }} />
        <div style={{ position: 'absolute', top: 8, left: 0, right: 0, padding: '0 12px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button style={glassBtn()}>
            <Icon name="ChevronLeft" size={20} color="white" />
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={glassBtn()}><Icon name="Heart" size={18} color="white" /></button>
            <button style={glassBtn()}><Icon name="Share2" size={18} color="white" /></button>
          </div>
        </div>
      </div>

      {/* Profile card overlapping */}
      <div style={{ padding: '0 16px', marginTop: -40, position: 'relative', zIndex: 1 }}>
        <MCard padding={16}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Avatar idx={0} size={64} ring="white" online />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{p.name}</div>
                {p.verified && <VerifiedBadge size={12} />}
                {sgtPremium(p.id).estado === 'activo' && <PremiumBadge variant="inline" />}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--sgt-text-sub, #667085)', marginTop: 2 }}>
                <Icon name={cat.icon} size={11} color={cat.color} /> {cat.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                <Stars value={p.rating} size={12} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>{p.rating}</span>
                <span style={{ fontSize: 11.5, color: 'var(--sgt-text-sub, #667085)' }}>· {p.reviews} reseñas</span>
              </div>
            </div>
          </div>

          {/* mini stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14, padding: '12px 0', borderTop: '1px solid var(--sgt-border, #eef0f4)' }}>
            {[['MapPin', p.zone], ['Briefcase', `${p.exp} años`], ['Clock', p.available ? 'Disponible' : 'Ocupado']].map(([icon, txt], i) => (
              <div key={i} style={{ textAlign: 'center', borderRight: i < 2 ? '1px solid var(--sgt-border, #eef0f4)' : 'none' }}>
                <Icon name={icon} size={14} color={SGT.blue} />
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--sgt-text, #1f2937)', marginTop: 2 }}>{txt}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 13, color: 'var(--sgt-text-sub, #667085)', marginTop: 10, lineHeight: 1.5 }}>
            {p.bio}
          </div>
        </MCard>
      </div>

      {/* Tabs */}
      <div style={{ padding: '14px 16px 4px' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--sgt-border, #eef0f4)' }}>
          {[['servicios','Servicios'],['galeria','Galería'],['resenas','Reseñas']].map(([id, l]) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? SGT.blue : 'var(--sgt-text-sub, #667085)',
                borderBottom: active ? `2px solid ${SGT.blue}` : '2px solid transparent',
              }}>{l}</button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '12px 16px 100px' }}>
        {tab === 'servicios' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {p.services.map((s, i) => (
              <MCard key={i} padding={14}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    width: 38, height: 38, borderRadius: 10, background: cat.color + '18', color: cat.color,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={cat.icon} size={18} color={cat.color} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sgt-text, #1f2937)' }}>{s.name}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: SGT.blue }}>
                    {s.price === 0 ? 'Gratis' : `Q${s.price}`}
                  </div>
                </div>
              </MCard>
            ))}
          </div>
        )}
        {tab === 'galeria' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[0,1,2,3,4,5].map(i => (
              <img key={i} src={sgtWork(p.cat, i, 400)} alt=""
                   style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 12 }} />
            ))}
          </div>
        )}
        {tab === 'resenas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reviews.map((r, i) => (
              <MCard key={i} padding={14}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Avatar idx={r.faceIdx} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{r.author}</div>
                      <div style={{ fontSize: 11, color: 'var(--sgt-text-sub, #667085)' }}>{r.date}</div>
                    </div>
                    <Stars value={r.rating} size={11} />
                    <div style={{ fontSize: 13, color: 'var(--sgt-text, #1f2937)', marginTop: 6, lineHeight: 1.45 }}>{r.text}</div>
                  </div>
                </div>
              </MCard>
            ))}
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div style={{
        position: 'sticky', bottom: 0, background: 'var(--sgt-card-bg, white)',
        borderTop: '1px solid var(--sgt-border, #eef0f4)', padding: '12px 16px 30px',
        display: 'flex', gap: 10,
      }}>
        <button style={{
          width: 50, height: 50, borderRadius: 14, border: '1.5px solid var(--sgt-border, #e5e7eb)',
          background: 'var(--sgt-card-bg, white)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Icon name="MessageCircle" size={20} color={SGT.blue} />
        </button>
        <div style={{ flex: 1 }}>
          <MButton kind="primary" size="lg" iconRight="ArrowRight">Contratar — desde Q{p.priceFrom}</MButton>
        </div>
      </div>
    </MFrame>
  );
}

const glassBtn = () => ({
  width: 38, height: 38, borderRadius: 999, background: 'rgba(0,0,0,.32)',
  backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
});

// ─────────────────────────────────────────────────────────────
// 07 · Nueva solicitud (3 pasos)
// ─────────────────────────────────────────────────────────────
function MScreenSolicitud() {
  const [step, setStep] = React.useState(2);
  const p = SGT_PROVIDERS[0];

  return (
    <MFrame bg="var(--sgt-bg, #f5f7fb)">
      <MAppBar onBack={() => {}} title={`Paso ${step} de 3`} />
      {/* progress */}
      <div style={{ padding: '0 16px 12px', background: 'var(--sgt-card-bg, white)', borderBottom: '1px solid var(--sgt-border, #eef0f4)' }}>
        <div style={{ height: 4, background: 'var(--sgt-border, #eef0f4)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${(step / 3) * 100}%`, height: '100%', background: SGT.blue, transition: 'width .25s' }} />
        </div>
      </div>

      <div style={{ padding: '16px', flex: 1 }}>
        {step === 1 && (
          <>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>¿Qué necesitas?</div>
            <div style={{ fontSize: 13, color: 'var(--sgt-text-sub, #667085)', marginBottom: 18 }}>
              Cuéntanos sobre el trabajo
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sgt-text-sub, #667085)', marginBottom: 6 }}>Servicio</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {p.services.map((s, i) => (
                    <button key={i} style={{
                      padding: 14, borderRadius: 12, textAlign: 'left',
                      background: i === 0 ? SGT.skyLight : 'var(--sgt-card-bg, white)',
                      border: `1.5px solid ${i === 0 ? SGT.blue : 'var(--sgt-border, #eef0f4)'}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 999,
                        border: `2px solid ${i === 0 ? SGT.blue : '#cbd5e1'}`,
                        background: i === 0 ? SGT.blue : 'transparent', flexShrink: 0,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {i === 0 && <Icon name="Check" size={12} color="white" strokeWidth={3} />}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: SGT.blue }}>Q{s.price}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sgt-text-sub, #667085)', marginBottom: 6 }}>Descripción</div>
                <textarea placeholder="Describe el trabajo con detalle…" style={{
                  width: '100%', minHeight: 100, padding: 12, fontSize: 14, fontFamily: 'inherit',
                  background: 'var(--sgt-card-bg, white)', color: 'var(--sgt-text, #1f2937)',
                  border: '1px solid var(--sgt-border, #e5e7eb)', borderRadius: 12, resize: 'none', outline: 'none',
                }} />
              </div>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>¿Cuándo?</div>
            <div style={{ fontSize: 13, color: 'var(--sgt-text-sub, #667085)', marginBottom: 18 }}>
              Elige día y hora
            </div>
            {/* date pills */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4, marginBottom: 16 }}>
              {[
                { d: 'Hoy', n: '4', m: 'May' }, { d: 'Mañ', n: '5', m: 'May' }, { d: 'Mié', n: '6', m: 'May' },
                { d: 'Jue', n: '7', m: 'May' }, { d: 'Vie', n: '8', m: 'May' }, { d: 'Sáb', n: '9', m: 'May' },
                { d: 'Dom', n: '10', m: 'May' },
              ].map((d, i) => {
                const active = i === 1;
                return (
                  <button key={i} style={{
                    flex: '0 0 60px', padding: '10px 0', borderRadius: 14,
                    background: active ? SGT.blue : 'var(--sgt-card-bg, white)',
                    color: active ? 'white' : 'var(--sgt-text, #1f2937)',
                    border: `1.5px solid ${active ? SGT.blue : 'var(--sgt-border, #eef0f4)'}`,
                    cursor: 'pointer',
                  }}>
                    <div style={{ fontSize: 11, opacity: active ? 0.9 : 0.6 }}>{d.d}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, margin: '2px 0' }}>{d.n}</div>
                    <div style={{ fontSize: 10, opacity: active ? 0.9 : 0.6 }}>{d.m}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sgt-text-sub, #667085)', marginBottom: 8 }}>Horario disponible</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {['09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00','19:00'].map((t, i) => {
                const active = i === 3;
                const disabled = i === 5;
                return (
                  <button key={t} disabled={disabled} style={{
                    padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                    background: active ? SGT.blue : disabled ? 'var(--sgt-border, #eef0f4)' : 'var(--sgt-card-bg, white)',
                    color: active ? 'white' : disabled ? '#9ca3af' : 'var(--sgt-text, #1f2937)',
                    border: `1.5px solid ${active ? SGT.blue : 'var(--sgt-border, #eef0f4)'}`,
                    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
                  }}>{t}</button>
                );
              })}
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sgt-text-sub, #667085)', marginBottom: 6 }}>Dirección</div>
              <MInput icon="MapPin" placeholder="Zona 10, 6a Av 12-34" value="Zona 10, 6a Av 12-34" onChange={() => {}} />
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Confirma tu pedido</div>
            <div style={{ fontSize: 13, color: 'var(--sgt-text-sub, #667085)', marginBottom: 18 }}>
              Revisa los datos antes de enviar
            </div>
            <MCard padding={16} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Avatar idx={0} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--sgt-text-sub, #667085)' }}>
                    <Stars value={p.rating} size={11} /> {p.rating} · {p.reviews} reseñas
                  </div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--sgt-border, #eef0f4)', marginTop: 12, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Servicio', 'Reparación de fugas'],
                  ['Fecha', '5 May, 2026'],
                  ['Hora', '14:00'],
                  ['Dirección', 'Zona 10, 6a Av 12-34'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--sgt-text-sub, #667085)' }}>{k}</span>
                    <span style={{ fontWeight: 600, color: 'var(--sgt-text, #1f2937)', textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
            </MCard>
            <MCard padding={16}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--sgt-text-sub, #667085)' }}>Subtotal</span>
                <span>Q150</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--sgt-text-sub, #667085)' }}>Comisión ServiGT</span>
                <span>Q15</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, paddingTop: 10, borderTop: '1px solid var(--sgt-border, #eef0f4)' }}>
                <span>Total</span>
                <span style={{ color: SGT.blue }}>Q165</span>
              </div>
            </MCard>
            <div style={{ marginTop: 12, padding: 12, background: SGT.warn + '15', borderRadius: 12, fontSize: 12, color: '#92400e', display: 'flex', gap: 8 }}>
              <Icon name="Info" size={14} color={SGT.warn} />
              El pago se realiza al finalizar el servicio.
            </div>
          </>
        )}
      </div>

      {/* sticky bottom */}
      <div style={{
        position: 'sticky', bottom: 0, background: 'var(--sgt-card-bg, white)',
        borderTop: '1px solid var(--sgt-border, #eef0f4)', padding: '12px 16px 30px',
        display: 'flex', gap: 10,
      }}>
        {step > 1 && (
          <div style={{ flex: 1 }}>
            <MButton kind="ghost" size="lg" onClick={() => setStep(step - 1)}>Atrás</MButton>
          </div>
        )}
        <div style={{ flex: 2 }}>
          <MButton kind="primary" size="lg" onClick={() => setStep(Math.min(3, step + 1))}
                   iconRight={step < 3 ? 'ArrowRight' : 'Check'}>
            {step < 3 ? 'Continuar' : 'Confirmar pedido'}
          </MButton>
        </div>
      </div>
    </MFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// 08 · Mis solicitudes (cliente)
// ─────────────────────────────────────────────────────────────
function MScreenMisSolicitudes() {
  const [filter, setFilter] = React.useState('todos');
  const filtered = filter === 'todos' ? SGT_REQUESTS : SGT_REQUESTS.filter(r => r.status === filter);

  return (
    <MFrame>
      <MAppBar large title="Mis pedidos" trailing={
        <button style={mIconBtn()}><Icon name="Filter" size={20} color="var(--sgt-text, #1f2937)" /></button>
      } />
      {/* filter chips */}
      <div style={{ padding: '4px 0 12px', background: 'var(--sgt-card-bg, white)', borderBottom: '1px solid var(--sgt-border, #eef0f4)' }}>
        <div style={{ display: 'flex', gap: 8, padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { id: 'todos', label: `Todos (${SGT_REQUESTS.length})` },
            { id: 'pendiente', label: 'Pendientes' },
            { id: 'aceptado', label: 'Aceptados' },
            { id: 'en_progreso', label: 'En progreso' },
            { id: 'por_confirmar', label: 'Por confirmar' },
            { id: 'completado', label: 'Completados' },
          ].map(f => (
            <MChip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</MChip>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((r, i) => {
          const p = SGT_PROVIDERS_BY_ID[r.provider];
          const cat = SGT_CATEGORIES.find(c => c.id === p.cat);
          return (
            <MCard key={r.id} padding={14}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: cat.color + '18', color: cat.color,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon name={cat.icon} size={20} color={cat.color} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>{r.service}</div>
                    <StatusChip status={r.status} size="sm" />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--sgt-text-sub, #667085)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Avatar idx={p.faceIdx} size={16} /> {p.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--sgt-text-sub, #667085)', marginTop: 4 }}>
                    <Icon name="Calendar" size={11} color="currentColor" /> {r.date}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--sgt-text-sub, #667085)', marginTop: 2 }}>
                    <Icon name="MapPin" size={11} color="currentColor" /> {r.address}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: SGT.blue }}>Q{r.amount}</div>
                    {r.status === 'completado' && (
                      <button style={{
                        height: 32, padding: '0 12px', background: SGT.skyLight, color: SGT.blue,
                        border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        <Icon name="Star" size={12} color={SGT.blue} /> Calificar
                      </button>
                    )}
                    {r.status === 'pendiente' && (
                      <button style={{
                        height: 32, padding: '0 12px', background: 'var(--sgt-card-bg, white)', color: SGT.error,
                        border: `1px solid ${SGT.error}`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}>Cancelar</button>
                    )}
                    {(r.status === 'aceptado' || r.status === 'en_progreso') && (
                      <button style={{
                        height: 32, padding: '0 12px', background: SGT.blue, color: 'white',
                        border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        <Icon name="MessageCircle" size={12} color="white" /> Chatear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </MCard>
          );
        })}
      </div>

      <MTabBar
        current="solicitudes" onChange={() => {}}
        tabs={[
          { id: 'inicio', icon: 'Home', label: 'Inicio' },
          { id: 'buscar', icon: 'Search', label: 'Buscar' },
          { id: 'solicitudes', icon: 'ClipboardList', label: 'Pedidos', badge: 2 },
          { id: 'chat', icon: 'MessageCircle', label: 'Chat', badge: 3 },
          { id: 'perfil', icon: 'User', label: 'Perfil' },
        ]} />
    </MFrame>
  );
}

Object.assign(window, {
  MScreenHomeCliente, MScreenProviderDetail, MScreenSolicitud, MScreenMisSolicitudes,
});
