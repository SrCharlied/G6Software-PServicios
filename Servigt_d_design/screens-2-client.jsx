// Screens 5-8: Home Cliente, Provider Detail, Solicitud, Mis Solicitudes

// ─── 5. HOME CLIENTE ──────────────────────────────────────────────
function ScreenHomeCliente({ dark, setDark }) {
  const [view, setView] = React.useState('list'); // list | map
  const [filters, setFilters] = React.useState({ cat: 'all', minRating: 0, zone: 'all', maxPrice: 1000, availableNow: false, verified: false });
  const [hoveredPin, setHoveredPin] = React.useState(null);

  const filtered = SGT_PROVIDERS.filter(p =>
    (filters.cat === 'all' || p.cat === filters.cat) &&
    (p.rating >= filters.minRating) &&
    (filters.zone === 'all' || p.zone === filters.zone) &&
    (p.priceFrom <= filters.maxPrice) &&
    (!filters.availableNow || p.available) &&
    (!filters.verified || p.verified)
  );

  return (
    <SgtFrame mode="client" dark={dark} setDark={setDark} notifCount={3} padding={0}>
      <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
        {/* Filters sidebar */}
        <aside style={{ width: 260, flexShrink: 0, padding: 20, borderRight: '1px solid var(--sgt-border)', background: 'var(--sgt-card-bg)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Filtros</h3>
            <button onClick={() => setFilters({ cat: 'all', minRating: 0, zone: 'all', maxPrice: 1000, availableNow: false, verified: false })} style={{ fontSize: 12, color: SGT.blue, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Limpiar</button>
          </div>

          <FilterSection title="Categoría">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[{ id: 'all', name: 'Todas' }, ...SGT_CATEGORIES].map(c => {
                const active = filters.cat === c.id;
                return (
                  <button key={c.id} onClick={() => setFilters({ ...filters, cat: c.id })} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    background: active ? SGT.skyLight : 'transparent',
                    color: active ? SGT.blueDark : 'var(--sgt-text)',
                    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 500, textAlign: 'left',
                  }}>
                    {c.id !== 'all' ? <CatIcon catId={c.id} size={22} /> : <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--sgt-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="Grid3x3" size={12} color={SGT.textSub} /></span>}
                    <span style={{ flex: 1 }}>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </FilterSection>

          <FilterSection title="Calificación mínima">
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 3, 4, 4.5].map(r => (
                <button key={r} onClick={() => setFilters({ ...filters, minRating: r })} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8,
                  border: `1px solid ${filters.minRating === r ? SGT.blue : 'var(--sgt-border)'}`,
                  background: filters.minRating === r ? SGT.skyLight : 'var(--sgt-card-bg)',
                  color: filters.minRating === r ? SGT.blueDark : 'var(--sgt-text)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>{r === 0 ? 'Cualquiera' : `${r}+ ★`}</button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Zona">
            <select value={filters.zone} onChange={e => setFilters({ ...filters, zone: e.target.value })} style={selectStyle()}>
              <option value="all">Todas las zonas</option>
              {SGT_ZONES.map(z => <option key={z}>{z}</option>)}
            </select>
          </FilterSection>

          <FilterSection title={`Precio máximo: Q${filters.maxPrice}`}>
            <input type="range" min={50} max={1000} step={50} value={filters.maxPrice}
                   onChange={e => setFilters({ ...filters, maxPrice: +e.target.value })}
                   style={{ width: '100%', accentColor: SGT.blue }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--sgt-text-sub)', marginTop: 2 }}>
              <span>Q50</span><span>Q1000+</span>
            </div>
          </FilterSection>

          <FilterSection title="Otros">
            <Toggle label="Disponible ahora" value={filters.availableNow} onChange={v => setFilters({ ...filters, availableNow: v })} />
            <Toggle label="Solo verificados" value={filters.verified} onChange={v => setFilters({ ...filters, verified: v })} />
          </FilterSection>
        </aside>

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'auto' }}>
          <div style={{ padding: '20px 28px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                {filtered.length} proveedores encontrados
              </h1>
              <p style={{ fontSize: 13, color: 'var(--sgt-text-sub)', margin: '4px 0 0' }}>
                {filters.cat === 'all' ? 'Todas las categorías' : SGT_CATEGORIES.find(c => c.id === filters.cat)?.name} · ordenado por relevancia
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Tabs items={[{ id: 'list', label: 'Lista', icon: 'List' }, { id: 'map', label: 'Mapa', icon: 'Map' }]} value={view} onChange={setView} size="sm" />
            </div>
          </div>

          {view === 'list' ? (
            <div style={{ padding: '8px 28px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.length === 0 ? (
                <Card padding={48} style={{ textAlign: 'center' }}>
                  <Icon name="SearchX" size={32} color={SGT.textSub} />
                  <p style={{ marginTop: 10, color: 'var(--sgt-text-sub)' }}>No encontramos proveedores con esos filtros.</p>
                </Card>
              ) : filtered.map((p, i) => <ProviderRowCard key={p.id} p={p} idx={SGT_PROVIDERS.indexOf(p)} />)}
            </div>
          ) : (
            <div style={{ padding: '8px 28px 28px', display: 'flex', gap: 14, flex: 1, minHeight: 480 }}>
              <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 600 }}>
                {filtered.map((p) => (
                  <Card key={p.id} hoverable padding={12} style={{ display: 'flex', gap: 10, cursor: 'pointer', border: hoveredPin === p.id ? `2px solid ${SGT.blue}` : undefined }}
                        onClick={() => setHoveredPin(p.id)}>
                    <Avatar idx={SGT_PROVIDERS.indexOf(p)} size={48} online={p.available} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>{p.name} {p.verified && <VerifiedBadge size={10} />} {sgtPremium(p.id).estado === 'activo' && <PremiumBadge variant="icon" size={10} />}</div>
                      <div style={{ fontSize: 11, color: 'var(--sgt-text-sub)' }}>{SGT_CATEGORIES.find(c => c.id === p.cat).name} · {p.zone}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Stars value={p.rating} size={11} />
                        <span style={{ fontSize: 11 }}>{p.rating}</span>
                        <span style={{ fontSize: 11, color: 'var(--sgt-text-sub)' }}>· Q{p.priceFrom}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div style={{ flex: 1, position: 'relative', borderRadius: 12, overflow: 'hidden', minHeight: 480 }}>
                <OsmMap bbox="-90.62,14.55,-90.42,14.70" height="100%" marker="14.61,-90.51" style={{ height: '100%' }} />
                {/* overlay pins */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  {filtered.slice(0, 8).map((p, i) => {
                    const cat = SGT_CATEGORIES.find(c => c.id === p.cat);
                    const x = 18 + (i * 11) % 70 + (i % 3) * 4;
                    const y = 22 + (i * 9) % 55 + (i % 2) * 6;
                    return (
                      <div key={p.id} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -100%)', pointerEvents: 'auto' }}
                           onMouseEnter={() => setHoveredPin(p.id)} onMouseLeave={() => setHoveredPin(null)}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 36, height: 36, borderRadius: '50% 50% 50% 0',
                          background: cat.color, color: 'white', cursor: 'pointer',
                          transform: `rotate(-45deg) ${hoveredPin === p.id ? 'scale(1.15)' : ''}`,
                          boxShadow: '0 4px 12px rgba(0,0,0,.25)',
                          transition: 'transform .15s',
                        }}>
                          <span style={{ transform: 'rotate(45deg)' }}>
                            <Icon name={cat.icon} size={16} color="white" />
                          </span>
                        </span>
                        {hoveredPin === p.id && (
                          <div style={{ position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)', background: 'white', padding: 10, borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,.18)', minWidth: 200, color: SGT.text, zIndex: 10 }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: SGT.textSub, marginTop: 2 }}>{p.zone} · ★ {p.rating}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: SGT.blueDark, marginTop: 4 }}>Desde Q{p.priceFrom}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SgtFrame>
  );
}

const FilterSection = ({ title, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sgt-text-sub)', marginBottom: 8 }}>{title}</div>
    {children}
  </div>
);

const Toggle = ({ label, value, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', cursor: 'pointer', fontSize: 13 }}>
    <span>{label}</span>
    <span onClick={() => onChange(!value)} style={{
      width: 36, height: 20, borderRadius: 999, background: value ? SGT.blue : '#cbd5e1', position: 'relative', transition: 'background .15s',
    }}>
      <span style={{ position: 'absolute', top: 2, left: value ? 18 : 2, width: 16, height: 16, background: 'white', borderRadius: 999, transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
    </span>
  </label>
);

function ProviderRowCard({ p, idx }) {
  return (
    <Card padding={14} hoverable style={{ display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer' }}>
      <div style={{ width: 110, height: 110, borderRadius: 12, flexShrink: 0, position: 'relative', backgroundImage: `url(${sgtWork(p.cat, idx)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <span style={{ position: 'absolute', bottom: -6, right: -6 }}>
          <Avatar idx={idx} size={40} ring="white" online={p.available} />
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</span>
          {p.verified && <VerifiedBadge size={12} />}
          {sgtPremium(p.id).estado === 'activo' && <PremiumBadge variant="inline" />}
          {p.available && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: SGT.success, fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: SGT.success, animation: 'sgt-pulse 2s infinite' }} />Disponible ahora
          </span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--sgt-text-sub)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CatIcon catId={p.cat} size={16} />{SGT_CATEGORIES.find(c => c.id === p.cat).name}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="MapPin" size={12} color={SGT.textSub} />{p.zone}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="Briefcase" size={12} color={SGT.textSub} />{p.exp} años exp.</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--sgt-text)', marginTop: 8, marginBottom: 8, lineHeight: 1.4 }}>{p.bio}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Stars value={p.rating} size={13} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{p.rating}</span>
          <span style={{ fontSize: 12, color: 'var(--sgt-text-sub)' }}>({p.reviews} reseñas)</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--sgt-text-sub)' }}>Desde</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: SGT.blueDark, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>Q{p.priceFrom}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          <Button kind="primary" size="sm">Ver perfil</Button>
          <Button kind="ghost" size="sm" icon="MessageCircle">Chatear</Button>
        </div>
      </div>
    </Card>
  );
}

// ─── 6. PROVIDER DETAIL ────────────────────────────────────────────
function ScreenProviderDetail({ dark, setDark }) {
  const [tab, setTab] = React.useState('info');
  const p = SGT_PROVIDERS_BY_ID.p1;
  const reviews = SGT_REVIEWS.filter(r => r.provider === 'p1');

  return (
    <SgtFrame mode="client" dark={dark} setDark={setDark} notifCount={3} padding={0}>
      {/* Cover */}
      <div style={{ position: 'relative', height: 180, background: `linear-gradient(135deg, ${SGT.blueDark}, ${SGT.blue} 60%, ${SGT.sky})`, overflow: 'hidden' }}>
        <span style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: 999, background: 'rgba(255,255,255,.10)' }} />
      </div>

      <div style={{ padding: '0 28px 28px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        {/* Left col */}
        <div style={{ marginTop: -56 }}>
          <Card padding={20}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <Avatar idx={0} size={96} ring="white" online={p.available} />
              <div style={{ flex: 1, minWidth: 0, paddingTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 22, fontWeight: 700 }}>{p.name}</span>
                  {p.verified && <VerifiedBadge size={14} />}
                  {sgtPremium(p.id).estado === 'activo' && <PremiumBadge variant="hero" />}
                </div>
                <div style={{ fontSize: 13, color: 'var(--sgt-text-sub)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CatIcon catId={p.cat} size={16} />{SGT_CATEGORIES.find(c => c.id === p.cat).name}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="MapPin" size={13} color={SGT.textSub} />{p.zone}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="Briefcase" size={13} color={SGT.textSub} />{p.exp} años de experiencia</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <Stars value={p.rating} size={15} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{p.rating}</span>
                  <span style={{ fontSize: 13, color: 'var(--sgt-text-sub)' }}>({p.reviews} reseñas)</span>
                  {p.available && <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: SGT.success, fontWeight: 600 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: SGT.success }} /> Disponible ahora
                  </span>}
                </div>
              </div>
            </div>
          </Card>

          <div style={{ marginTop: 16, borderBottom: `1px solid var(--sgt-border)` }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { id: 'info', label: 'Información' },
                { id: 'services', label: 'Servicios y precios' },
                { id: 'reviews', label: `Reseñas (${p.reviews})` },
                { id: 'gallery', label: 'Galería' },
                { id: 'location', label: 'Ubicación' },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600,
                  color: tab === t.id ? SGT.blueDark : 'var(--sgt-text-sub)',
                  borderBottom: `2px solid ${tab === t.id ? SGT.blue : 'transparent'}`,
                  marginBottom: -1,
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            {tab === 'info' && (
              <Card padding={20}>
                <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>Sobre {p.name.split(' ')[0]}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--sgt-text)', margin: 0 }}>{p.bio}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18 }}>
                  {[
                    { icon: 'Briefcase', label: 'Trabajos', value: '320+' },
                    { icon: 'Clock', label: 'Tiempo respuesta', value: '< 1 h' },
                    { icon: 'Languages', label: 'Idiomas', value: 'Español' },
                  ].map(s => (
                    <div key={s.label} style={{ padding: 12, borderRadius: 10, background: 'var(--sgt-bg)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon name={s.icon} size={18} color={SGT.blue} />
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--sgt-text-sub)' }}>{s.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{s.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {tab === 'services' && (
              <Card padding={0}>
                {p.services.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: i < p.services.length - 1 ? `1px solid ${SGT.borderSoft}` : 'none' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--sgt-text-sub)', marginTop: 2 }}>Precio referencial · puede variar según trabajo</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: SGT.blueDark }}>
                      {s.price === 0 ? 'Gratis' : `Q${s.price}`}
                    </div>
                  </div>
                ))}
              </Card>
            )}

            {tab === 'reviews' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Card padding={20} style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 44, fontWeight: 800, color: SGT.blueDark, lineHeight: 1 }}>{p.rating}</div>
                    <Stars value={p.rating} size={16} />
                    <div style={{ fontSize: 12, color: 'var(--sgt-text-sub)', marginTop: 4 }}>{p.reviews} reseñas</div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[5,4,3,2,1].map(n => {
                      const pct = n === 5 ? 78 : n === 4 ? 16 : n === 3 ? 4 : n === 2 ? 1 : 1;
                      return (
                        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                          <span style={{ width: 14 }}>{n}★</span>
                          <div style={{ flex: 1, height: 6, background: 'var(--sgt-bg)', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: SGT.warn }} />
                          </div>
                          <span style={{ width: 30, textAlign: 'right', color: 'var(--sgt-text-sub)' }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
                {reviews.map((r, i) => (
                  <Card key={i} padding={16}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <Avatar idx={r.faceIdx} size={40} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{r.author}</span>
                          <span style={{ fontSize: 12, color: 'var(--sgt-text-sub)' }}>{r.date}</span>
                        </div>
                        <Stars value={r.rating} size={12} />
                        <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.5 }}>{r.text}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {tab === 'gallery' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[0,1,2,0,1,2].map((j, i) => (
                  <div key={i} style={{ height: 140, borderRadius: 12, backgroundImage: `url(${sgtWork(p.cat, j, 400)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                ))}
              </div>
            )}

            {tab === 'location' && (
              <Card padding={16}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Zona de cobertura</div>
                <div style={{ fontSize: 12, color: 'var(--sgt-text-sub)', marginBottom: 12 }}>Radio de 8 km desde {p.zone}, Ciudad de Guatemala</div>
                <OsmMap bbox="-90.55,14.58,-90.45,14.66" height={280} marker="14.62,-90.51" />
              </Card>
            )}
          </div>
        </div>

        {/* Right CTA col (sticky-ish — sits at top of column) */}
        <div style={{ marginTop: -56, display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 80 }}>
          <Card padding={18}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--sgt-text-sub)' }}>Tarifa desde</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: SGT.blueDark, lineHeight: 1 }}>Q{p.priceFrom}</div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--sgt-text-sub)' }}>por servicio</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              <Button kind="primary" full icon="CalendarPlus">Solicitar servicio</Button>
              <Button kind="secondary" full icon="MessageCircle">Chatear</Button>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${SGT.borderSoft}`, fontSize: 12, color: 'var(--sgt-text-sub)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="ShieldCheck" size={14} color={SGT.success} />Pago protegido</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="Clock" size={14} color={SGT.success} />Respuesta &lt; 1h</span>
            </div>
          </Card>
          <Card padding={16}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Cobertura</div>
            <OsmMap bbox="-90.55,14.58,-90.45,14.66" height={140} marker="14.62,-90.51" />
            <div style={{ fontSize: 12, color: 'var(--sgt-text-sub)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="MapPin" size={12} color={SGT.textSub} /> {p.zone} y zonas aledañas (radio 8km)
            </div>
          </Card>
        </div>
      </div>
    </SgtFrame>
  );
}

// ─── 7. SOLICITUD FORM ─────────────────────────────────────────────
function ScreenSolicitud({ dark, setDark }) {
  const [step, setStep] = React.useState(0);
  const [urgency, setUrgency] = React.useState('semana');
  const [budget, setBudget] = React.useState(300);
  const [payment, setPayment] = React.useState('efectivo');
  const [photos, setPhotos] = React.useState(['plomeria-0', 'plomeria-1']);
  const p = SGT_PROVIDERS_BY_ID.p1;

  const steps = ['Detalle del servicio', 'Fecha y lugar', 'Confirmar'];

  return (
    <SgtFrame mode="client" dark={dark} setDark={setDark} notifCount={3}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--sgt-text-sub)', marginBottom: 14 }}>
          <span style={{ cursor: 'pointer' }}>Inicio</span>
          <Icon name="ChevronRight" size={14} color={SGT.textSub} />
          <span style={{ cursor: 'pointer' }}>{p.name}</span>
          <Icon name="ChevronRight" size={14} color={SGT.textSub} />
          <span style={{ color: 'var(--sgt-text)', fontWeight: 600 }}>Nueva solicitud</span>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Solicitar servicio a {p.name}</h1>
        <p style={{ fontSize: 14, color: 'var(--sgt-text-sub)', marginTop: 4 }}>Completa los datos para enviar tu solicitud</p>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 22px' }}>
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 999,
                  background: i < step ? SGT.success : i === step ? SGT.blue : 'var(--sgt-border)',
                  color: i <= step ? 'white' : 'var(--sgt-text-sub)',
                  fontSize: 13, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i < step ? <Icon name="Check" size={16} color="white" strokeWidth={3} /> : i + 1}
                </span>
                <span style={{ fontSize: 13, fontWeight: i === step ? 700 : 500, color: i === step ? 'var(--sgt-text)' : 'var(--sgt-text-sub)' }}>{s}</span>
              </div>
              {i < steps.length - 1 && <span style={{ flex: 1, height: 2, background: i < step ? SGT.success : 'var(--sgt-border)' }} />}
            </React.Fragment>
          ))}
        </div>

        <Card padding={24}>
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Field label="Servicio que necesitas">
                <select style={selectStyle()} defaultValue="Reparación de fugas">
                  {p.services.map(s => <option key={s.name}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Describe el problema">
                <textarea defaultValue="Hay una fuga de agua bajo el lavatrastos de la cocina. Empezó esta mañana y está goteando constante."
                  style={{ width: '100%', minHeight: 100, padding: 12, border: '1px solid var(--sgt-border)', borderRadius: 12, background: 'var(--sgt-input-bg)', color: 'var(--sgt-text)', fontFamily: 'inherit', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
              </Field>
              <Field label="¿Qué tan urgente es?">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { id: 'hoy', label: 'Hoy mismo', sub: 'Atención inmediata', icon: 'Zap' },
                    { id: 'semana', label: 'Esta semana', sub: 'En los próximos 7 días', icon: 'Calendar' },
                    { id: 'flexible', label: 'Flexible', sub: 'Sin prisa', icon: 'Clock' },
                  ].map(u => {
                    const active = urgency === u.id;
                    return (
                      <button key={u.id} onClick={() => setUrgency(u.id)} style={{
                        padding: 14, borderRadius: 12, cursor: 'pointer',
                        border: `1.5px solid ${active ? SGT.blue : 'var(--sgt-border)'}`,
                        background: active ? SGT.skyLight : 'var(--sgt-card-bg)',
                        textAlign: 'left',
                      }}>
                        <Icon name={u.icon} size={18} color={active ? SGT.blue : SGT.textSub} />
                        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6, color: active ? SGT.blueDark : 'var(--sgt-text)' }}>{u.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--sgt-text-sub)', marginTop: 2 }}>{u.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Adjuntar fotos (opcional)">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {photos.map((ph, i) => (
                    <div key={i} style={{ position: 'relative', height: 90, borderRadius: 10, backgroundImage: `url(${sgtWork('plomeria', i, 250)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 999, background: 'rgba(0,0,0,.6)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="X" size={12} color="white" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => setPhotos([...photos, 'new'])} style={{
                    height: 90, borderRadius: 10, border: '2px dashed var(--sgt-border)',
                    background: 'transparent', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, color: 'var(--sgt-text-sub)',
                  }}>
                    <Icon name="ImagePlus" size={20} color={SGT.textSub} />
                    <span style={{ fontSize: 11, fontWeight: 600 }}>Subir foto</span>
                  </button>
                </div>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Field label="Dirección">
                <Input icon="MapPin" placeholder="6a Avenida 12-34, Zona 10" value="6a Avenida 12-34, Zona 10" onChange={()=>{}} />
              </Field>
              <OsmMap bbox="-90.52,14.59,-90.49,14.62" height={180} marker="14.605,-90.51" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Fecha">
                  <Input icon="Calendar" value="06 May, 2026" onChange={()=>{}} />
                </Field>
                <Field label="Hora">
                  <Input icon="Clock" value="14:00 - 16:00" onChange={()=>{}} />
                </Field>
              </div>
              <Field label={`Presupuesto estimado: Q${budget}`}>
                <input type="range" min={50} max={2000} step={25} value={budget}
                       onChange={e => setBudget(+e.target.value)}
                       style={{ width: '100%', accentColor: SGT.blue }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--sgt-text-sub)' }}>
                  <span>Q50</span>
                  <span style={{ color: SGT.blue, fontWeight: 600 }}>Tarifa promedio: Q220</span>
                  <span>Q2000</span>
                </div>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 14, padding: 14, borderRadius: 12, background: 'var(--sgt-bg)' }}>
                <Avatar idx={0} size={56} online={p.available} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</span>
                    {p.verified && <VerifiedBadge size={12} />}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--sgt-text-sub)', marginTop: 2 }}>{SGT_CATEGORIES.find(c => c.id === p.cat).name} · ★ {p.rating} ({p.reviews})</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SummaryRow icon="Wrench" label="Servicio" value="Reparación de fugas" />
                <SummaryRow icon="Calendar" label="Fecha" value="06 May, 2026 · 14:00 - 16:00" />
                <SummaryRow icon="MapPin" label="Dirección" value="6a Avenida 12-34, Zona 10" />
                <SummaryRow icon="Zap" label="Urgencia" value={urgency === 'hoy' ? 'Hoy mismo' : urgency === 'semana' ? 'Esta semana' : 'Flexible'} />
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Método de pago</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { id: 'efectivo', label: 'Efectivo', icon: 'Banknote' },
                    { id: 'transferencia', label: 'Transferencia', icon: 'Landmark' },
                    { id: 'tarjeta', label: 'Tarjeta', icon: 'CreditCard' },
                  ].map(m => {
                    const active = payment === m.id;
                    return (
                      <button key={m.id} onClick={() => setPayment(m.id)} style={{
                        padding: 14, borderRadius: 12, cursor: 'pointer',
                        border: `1.5px solid ${active ? SGT.blue : 'var(--sgt-border)'}`,
                        background: active ? SGT.skyLight : 'var(--sgt-card-bg)',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <Icon name={m.icon} size={18} color={active ? SGT.blue : SGT.textSub} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: active ? SGT.blueDark : 'var(--sgt-text)' }}>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ padding: 16, borderRadius: 12, background: SGT.skyLight, border: `1px solid ${SGT.sky}33` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: SGT.text }}>
                  <span>Tarifa estimada</span>
                  <span>Q{budget}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: SGT.text, marginTop: 6 }}>
                  <span>Comisión ServiGT</span>
                  <span>Q{Math.round(budget * 0.08)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${SGT.sky}55`, fontSize: 16, fontWeight: 700, color: SGT.blueDark }}>
                  <span>Total estimado</span>
                  <span>Q{budget + Math.round(budget * 0.08)}</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <Button kind="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Atrás</Button>
            <Button kind="primary" onClick={() => setStep(Math.min(2, step + 1))} icon={step === 2 ? 'Send' : null}>
              {step === 2 ? 'Enviar solicitud' : 'Continuar'}
            </Button>
          </div>
        </Card>
      </div>
    </SgtFrame>
  );
}

const SummaryRow = ({ icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--sgt-bg)', borderRadius: 10 }}>
    <Icon name={icon} size={16} color={SGT.blue} />
    <span style={{ fontSize: 12, color: 'var(--sgt-text-sub)', flexShrink: 0, width: 90 }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
  </div>
);

// ─── 8. MIS SOLICITUDES ────────────────────────────────────────────
function ScreenMisSolicitudes({ dark, setDark }) {
  const [tab, setTab] = React.useState('todas');
  const [reviewModal, setReviewModal] = React.useState(null);

  const tabItems = [
    { id: 'todas',     label: 'Todas',     count: SGT_REQUESTS.length },
    { id: 'pendiente',     label: 'Pendientes',    count: SGT_REQUESTS.filter(r => r.status === 'pendiente').length },
    { id: 'aceptado',      label: 'Aceptados',     count: SGT_REQUESTS.filter(r => r.status === 'aceptado').length },
    { id: 'en_progreso',   label: 'En progreso',   count: SGT_REQUESTS.filter(r => r.status === 'en_progreso').length },
    { id: 'por_confirmar', label: 'Por confirmar', count: SGT_REQUESTS.filter(r => r.status === 'por_confirmar').length },
    { id: 'completado',    label: 'Completados',   count: SGT_REQUESTS.filter(r => r.status === 'completado').length },
    { id: 'cancelado',     label: 'Cancelados',    count: SGT_REQUESTS.filter(r => r.status === 'cancelado').length },
  ];

  const filtered = tab === 'todas' ? SGT_REQUESTS : SGT_REQUESTS.filter(r => r.status === tab);

  return (
    <SgtFrame mode="client" dark={dark} setDark={setDark} notifCount={3}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Mis solicitudes</h1>
        <p style={{ fontSize: 14, color: 'var(--sgt-text-sub)', marginTop: 4, marginBottom: 20 }}>Gestiona tus servicios contratados</p>

        <div style={{ marginBottom: 18 }}>
          <Tabs items={tabItems} value={tab} onChange={setTab} size="sm" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(req => {
            const provider = SGT_PROVIDERS_BY_ID[req.provider];
            const idx = SGT_PROVIDERS.findIndex(p => p.id === req.provider);
            return (
              <Card key={req.id} padding={16} hoverable>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <CatIcon catId={provider.cat} size={42} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{req.service}</div>
                    <div style={{ fontSize: 12, color: 'var(--sgt-text-sub)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar idx={idx} size={20} />{provider.name}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="Calendar" size={12} color={SGT.textSub} />{req.date}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="MapPin" size={12} color={SGT.textSub} />{req.address}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <StatusChip status={req.status} />
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--sgt-text-sub)' }}>Total</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: SGT.blueDark }}>Q{req.amount}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${SGT.borderSoft}`, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Button kind="ghost" size="sm" icon="Eye">Ver detalle</Button>
                  <Button kind="ghost" size="sm" icon="MessageCircle">Chatear</Button>
                  {req.status === 'completado' && (
                    <Button kind="primary" size="sm" icon="Star" onClick={() => setReviewModal(req)}>Calificar</Button>
                  )}
                  {(req.status === 'pendiente' || req.status === 'aceptado') && (
                    <Button kind="danger" size="sm" icon="X">Cancelar</Button>
                  )}
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Card padding={48} style={{ textAlign: 'center' }}>
              <Icon name="ClipboardList" size={32} color={SGT.textSub} />
              <p style={{ marginTop: 10, color: 'var(--sgt-text-sub)' }}>No tienes solicitudes en este estado.</p>
            </Card>
          )}
        </div>
      </div>

      {reviewModal && <ReviewModal req={reviewModal} onClose={() => setReviewModal(null)} />}
    </SgtFrame>
  );
}

function ReviewModal({ req, onClose }) {
  const [stars, setStars] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const provider = SGT_PROVIDERS_BY_ID[req.provider];
  const idx = SGT_PROVIDERS.findIndex(p => p.id === req.provider);

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 440, maxWidth: '92%', background: 'var(--sgt-card-bg)', color: 'var(--sgt-text)', borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Califica a {provider.name.split(' ')[0]}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <Icon name="X" size={20} color={SGT.textSub} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--sgt-bg)', borderRadius: 10, marginBottom: 16 }}>
          <Avatar idx={idx} size={40} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{provider.name}</div>
            <div style={{ fontSize: 12, color: 'var(--sgt-text-sub)' }}>{req.service}</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', margin: '14px 0' }}>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setStars(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <Icon name="Star" size={36} color={(hover || stars) >= n ? SGT.warn : '#e5e7eb'}
                      style={{ color: (hover || stars) >= n ? SGT.warn : '#e5e7eb' }} />
              </button>
            ))}
          </div>
          <div style={{ fontSize: 13, color: 'var(--sgt-text-sub)', marginTop: 6 }}>
            {(hover || stars) === 0 ? 'Selecciona estrellas' :
             (hover || stars) === 5 ? 'Excelente' :
             (hover || stars) === 4 ? 'Muy bueno' :
             (hover || stars) === 3 ? 'Aceptable' :
             (hover || stars) === 2 ? 'Regular' : 'Mejorable'}
          </div>
        </div>
        <textarea placeholder="Cuéntanos cómo fue tu experiencia (opcional)" style={{
          width: '100%', minHeight: 90, padding: 12, border: '1px solid var(--sgt-border)', borderRadius: 12,
          background: 'var(--sgt-input-bg)', color: 'var(--sgt-text)', fontFamily: 'inherit', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box',
        }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Button kind="ghost" full onClick={onClose}>Cancelar</Button>
          <Button kind="primary" full disabled={stars === 0} onClick={onClose}>Enviar reseña</Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenHomeCliente, ScreenProviderDetail, ScreenSolicitud, ScreenMisSolicitudes,
  FilterSection, Toggle, ProviderRowCard, SummaryRow, ReviewModal,
});
