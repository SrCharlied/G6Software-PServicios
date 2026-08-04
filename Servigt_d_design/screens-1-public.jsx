// Screens 1-4: Landing, Login, Register, Recover Password.

// ─── 1. LANDING ────────────────────────────────────────────────────
function ScreenLanding({ dark, setDark }) {
  const [search, setSearch] = React.useState('');
  const [openCat, setOpenCat] = React.useState(null);
  const featured = SGT_PROVIDERS.slice(0, 4);

  const suggestions = SGT_CATEGORIES
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 5);

  return (
    <SgtFrame mode="public" dark={dark} setDark={setDark} notifCount={0} padding={0}>
      {/* Hero */}
      <section style={{ position: 'relative', padding: '64px 40px 80px', overflow: 'hidden' }}
               className="sgt-grad">
        {/* Decorative blobs */}
        <span style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: 999, background: 'rgba(255,255,255,.10)' }} />
        <span style={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, borderRadius: 999, background: 'rgba(255,255,255,.08)' }} />

        <div style={{ maxWidth: 880, margin: '0 auto', position: 'relative', textAlign: 'center', color: 'white' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(255,255,255,.18)', fontSize: 12, fontWeight: 600, marginBottom: 18 }}>
            <Icon name="Sparkles" size={14} color="white" /> +500 proveedores verificados en Guatemala
          </span>
          <h1 style={{ fontSize: 46, lineHeight: 1.05, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Conectando servicios en Guatemala
          </h1>
          <p style={{ fontSize: 17, opacity: 0.92, margin: '14px auto 28px', maxWidth: 600 }}>
            Encuentra plomeros, electricistas, niñeras y más. Profesionales verificados, cerca de ti, al precio justo.
          </p>

          {/* Search */}
          <div style={{ position: 'relative', maxWidth: 580, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 8, padding: 8, background: 'white', borderRadius: 16, boxShadow: '0 12px 40px rgba(11,61,145,.25)' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px' }}>
                <Icon name="Search" size={18} color={SGT.textSub} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="¿Qué servicio necesitas hoy?"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: SGT.text, background: 'transparent' }} />
              </div>
              <Button kind="primary" icon="Search" size="md">Buscar</Button>
            </div>
            {/* Autocomplete */}
            {search && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 8, right: 8, marginTop: 8, background: 'white', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,.18)', overflow: 'hidden', textAlign: 'left' }}>
                {suggestions.map(s => (
                  <div key={s.id} onClick={() => setSearch(s.name)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', color: SGT.text }}
                       onMouseEnter={e => e.currentTarget.style.background = SGT.skyLight}
                       onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <CatIcon catId={s.id} size={28} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: SGT.textSub }}>{s.count} proveedores</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 22 }}>
            {['Plomería urgente','Limpieza de oficina','Niñera fin de semana','Reparación PC'].map(t =>
              <span key={t} style={{ padding: '8px 14px', borderRadius: 999, background: 'rgba(255,255,255,.16)', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid rgba(255,255,255,.24)' }}>{t}</span>)}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section style={{ padding: '52px 40px', maxWidth: 1280, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <SectionTitle action={<a style={{ fontSize: 14, fontWeight: 600, color: SGT.blue, cursor: 'pointer' }}>Ver todas →</a>}>
          Explora por categoría
        </SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {SGT_CATEGORIES.map(c => (
            <Card key={c.id} hoverable padding={20} style={{ cursor: 'pointer', textAlign: 'center' }}>
              <CatIcon catId={c.id} size={48} />
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: SGT.textSub, marginTop: 2 }}>{c.count} proveedores</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured providers */}
      <section style={{ padding: '20px 40px 52px', maxWidth: 1280, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <SectionTitle action={<a style={{ fontSize: 14, fontWeight: 600, color: SGT.blue, cursor: 'pointer' }}>Ver todos →</a>}>
          Proveedores destacados
        </SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {featured.map((p, i) => <ProviderCard key={p.id} p={p} idx={i} />)}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '52px 40px', background: SGT.skyLight }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, margin: 0, color: SGT.blueDark, letterSpacing: '-0.01em' }}>Cómo funciona</h2>
          <p style={{ textAlign: 'center', color: SGT.textSub, marginTop: 8, marginBottom: 36 }}>Tres pasos simples para resolver lo que necesitas</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { icon: 'Search',    t: 'Busca el servicio',     d: 'Filtra por categoría, zona y precio. Compara perfiles y reseñas.' },
              { icon: 'CalendarCheck2', t: 'Solicita y agenda', d: 'Envía tu solicitud con detalles y fotos. El proveedor confirma.' },
              { icon: 'Star',      t: 'Califica el trabajo',    d: 'Comparte tu experiencia y ayuda a otros guatemaltecos.' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, margin: '0 auto', borderRadius: 16, background: 'white', boxShadow: '0 4px 14px rgba(26,115,232,.18)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <Icon name={s.icon} size={26} color={SGT.blue} />
                  <span style={{ position: 'absolute', top: -8, right: -8, width: 28, height: 28, borderRadius: 999, background: SGT.blueDark, color: 'white', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i+1}</span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginTop: 16, marginBottom: 6, color: SGT.text }}>{s.t}</h3>
                <p style={{ fontSize: 14, color: SGT.textSub, margin: 0, maxWidth: 260, marginLeft: 'auto', marginRight: 'auto' }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '52px 40px', maxWidth: 1280, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <SectionTitle>Lo que dicen nuestros usuarios</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { name: 'Karla R.', zone: 'Zona 14', text: 'Encontré una niñera de confianza en menos de un día. La verificación me da mucha tranquilidad.', faceIdx: 3 },
            { name: 'Jorge M.', zone: 'Mixco',   text: 'El plomero llegó puntual y el precio fue exacto al cotizado. Super recomendado.', faceIdx: 0 },
            { name: 'Andrea S.', zone: 'Antigua', text: 'Como proveedora, ServiGT me ha traído clientes constantes. La plataforma es muy fácil de usar.', faceIdx: 7 },
          ].map((t, i) => (
            <Card key={i} padding={20}>
              <Stars value={5} size={14} />
              <p style={{ fontSize: 14, lineHeight: 1.55, color: SGT.text, marginTop: 10 }}>"{t.text}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${SGT.borderSoft}` }}>
                <Avatar idx={t.faceIdx} size={36} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: SGT.textSub }}>{t.zone}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0a1628', color: '#cbd5e1', padding: '40px 40px 28px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${SGT.blue}, ${SGT.sky})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="Wrench" size={16} color="white" strokeWidth={2.5} />
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>ServiGT</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.55, marginTop: 14, maxWidth: 280 }}>
              El marketplace #1 de servicios del hogar en Guatemala. Conectamos clientes con profesionales verificados.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {['Facebook','Instagram','Twitter'].map(s =>
                <span key={s} style={{ width: 36, height: 36, borderRadius: 999, background: 'rgba(255,255,255,.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Icon name={s === 'Facebook' ? 'Facebook' : s === 'Instagram' ? 'Instagram' : 'Twitter'} size={16} color="white" />
                </span>)}
            </div>
          </div>
          {[
            { t: 'Producto', items: ['Buscar servicios','Categorías','Cómo funciona','Precios'] },
            { t: 'Para proveedores', items: ['Registrarme','Centro de ayuda','Términos','Comisiones'] },
            { t: 'Empresa', items: ['Sobre nosotros','Blog','Contacto','Prensa'] },
          ].map(col =>
            <div key={col.t}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 14 }}>{col.t}</div>
              {col.items.map(i => <div key={i} style={{ fontSize: 13, padding: '5px 0', cursor: 'pointer' }}>{i}</div>)}
            </div>)}
        </div>
        <div style={{ maxWidth: 1280, margin: '32px auto 0', paddingTop: 22, borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>
          <span>© 2026 ServiGT · Todos los derechos reservados</span>
          <span style={{ display: 'flex', gap: 18 }}>
            <span style={{ cursor: 'pointer' }}>Privacidad</span>
            <span style={{ cursor: 'pointer' }}>Términos</span>
            <span style={{ cursor: 'pointer' }}>Cookies</span>
          </span>
        </div>
      </footer>
    </SgtFrame>
  );
}

// Reusable provider card
function ProviderCard({ p, idx }) {
  return (
    <Card hoverable padding={0} style={{ overflow: 'hidden', cursor: 'pointer' }}>
      <div style={{ position: 'relative', height: 130, background: `url(${sgtWork(p.cat, idx)}) center/cover`, backgroundColor: '#ddd' }}>
        <span style={{ position: 'absolute', bottom: -22, left: 16 }}>
          <Avatar idx={idx} size={56} ring="white" online={p.available} />
        </span>
        <span style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
          {sgtPremium(p.id).estado === 'activo' && <PremiumBadge variant="inline" />}
          {p.verified && <VerifiedBadge size={14} />}
        </span>
      </div>
      <div style={{ padding: '28px 16px 16px' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</div>
        <div style={{ fontSize: 12, color: SGT.textSub, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CatIcon catId={p.cat} size={16} />
          {SGT_CATEGORIES.find(c => c.id === p.cat).name} · {p.zone}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Stars value={p.rating} size={13} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{p.rating}</span>
          <span style={{ fontSize: 12, color: SGT.textSub }}>({p.reviews})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${SGT.borderSoft}` }}>
          <div>
            <div style={{ fontSize: 11, color: SGT.textSub }}>Desde</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: SGT.blueDark }}>Q{p.priceFrom}</div>
          </div>
          <Button kind="secondary" size="sm">Ver perfil</Button>
        </div>
      </div>
    </Card>
  );
}

// ─── 2. LOGIN ──────────────────────────────────────────────────────
function ScreenLogin({ dark, setDark }) {
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [showPwd, setShowPwd] = React.useState(false);
  const [remember, setRemember] = React.useState(true);

  return (
    <div data-sgt-frame style={{ width: '100%', height: '100%', display: 'flex', background: 'var(--sgt-bg, #f5f7fb)', color: 'var(--sgt-text, #1f2937)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Left visual */}
      <div className="sgt-grad" style={{ flex: 1, position: 'relative', padding: 48, color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
        <span style={{ position: 'absolute', top: -100, right: -100, width: 320, height: 320, borderRadius: 999, background: 'rgba(255,255,255,.08)' }} />
        <span style={{ position: 'absolute', bottom: -80, left: -60, width: 220, height: 220, borderRadius: 999, background: 'rgba(255,255,255,.10)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.18)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="Wrench" size={18} color="white" strokeWidth={2.5} />
          </span>
          <span style={{ fontSize: 19, fontWeight: 700 }}>ServiGT</span>
        </div>
        <div style={{ position: 'relative' }}>
          <h1 style={{ fontSize: 38, fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em' }}>Bienvenido<br />de vuelta 👋</h1>
          <p style={{ fontSize: 16, opacity: 0.92, marginTop: 14, maxWidth: 380 }}>
            Encuentra los mejores profesionales de Guatemala o gestiona tus servicios desde un solo lugar.
          </p>
          <div style={{ display: 'flex', gap: 18, marginTop: 28 }}>
            {[
              { n: '500+', l: 'Proveedores' },
              { n: '12K+', l: 'Servicios completados' },
              { n: '4.8★', l: 'Calificación promedio' },
            ].map(s => (
              <div key={s.l}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{s.n}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', fontSize: 12, opacity: 0.85 }}>© 2026 ServiGT · Conectando servicios en Guatemala</div>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 20 }}>
          <button onClick={() => setDark(!dark)} style={{ ...iconBtn(), background: 'transparent' }}>
            <Icon name={dark ? 'Sun' : 'Moon'} size={18} color="var(--sgt-text)" />
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Iniciar sesión</h2>
            <p style={{ fontSize: 14, color: 'var(--sgt-text-sub)', marginTop: 6, marginBottom: 26 }}>
              Ingresa con tu cuenta de ServiGT
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Correo electrónico</label>
                <Input icon="Mail" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Contraseña</label>
                <Input
                  icon="Lock"
                  type={showPwd ? 'text' : 'password'}
                  value={pwd} onChange={e => setPwd(e.target.value)}
                  placeholder="••••••••"
                  rightSlot={
                    <button onClick={() => setShowPwd(!showPwd)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                      <Icon name={showPwd ? 'EyeOff' : 'Eye'} size={16} color="var(--sgt-text-sub)" />
                    </button>
                  } />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: SGT.blue, width: 16, height: 16 }} />
                  Recordarme
                </label>
                <a style={{ fontSize: 13, fontWeight: 600, color: SGT.blue, cursor: 'pointer' }}>¿Olvidaste tu contraseña?</a>
              </div>

              <Button kind="primary" full>Ingresar</Button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0' }}>
                <span style={{ flex: 1, height: 1, background: 'var(--sgt-border)' }} />
                <span style={{ fontSize: 12, color: 'var(--sgt-text-sub)' }}>o continúa con</span>
                <span style={{ flex: 1, height: 1, background: 'var(--sgt-border)' }} />
              </div>

              <button style={{
                height: 44, borderRadius: 12, border: '1px solid var(--sgt-border)',
                background: 'var(--sgt-card-bg)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontSize: 14, fontWeight: 600, color: 'var(--sgt-text)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continuar con Google
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--sgt-text-sub)', marginTop: 24 }}>
              ¿No tienes cuenta? <a style={{ fontWeight: 600, color: SGT.blue, cursor: 'pointer' }}>Regístrate gratis</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 3. REGISTER ───────────────────────────────────────────────────
function ScreenRegister({ dark, setDark }) {
  const [role, setRole] = React.useState('cliente');
  const [pwd, setPwd] = React.useState('');
  const [zones, setZones] = React.useState(['Zona 10']);
  const [accept, setAccept] = React.useState(false);

  const strength = pwd.length === 0 ? 0 : pwd.length < 6 ? 1 : pwd.length < 10 ? 2 : /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) ? 4 : 3;
  const strLabel = ['','Débil','Aceptable','Buena','Fuerte'][strength];
  const strColor = ['#e5e7eb', SGT.error, SGT.warn, '#84cc16', SGT.success][strength];

  return (
    <SgtFrame mode="public" dark={dark} setDark={setDark} notifCount={0} padding={0}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 28px', width: '100%', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Crear cuenta</h1>
        <p style={{ fontSize: 14, color: 'var(--sgt-text-sub)', marginTop: 6 }}>Únete a la comunidad de ServiGT en menos de 2 minutos</p>

        {/* Role segmented */}
        <div style={{ display: 'flex', padding: 4, background: 'var(--sgt-bg)', border: '1px solid var(--sgt-border)', borderRadius: 12, marginTop: 20, marginBottom: 24 }}>
          {[{ id: 'cliente', label: 'Soy cliente', icon: 'User' },
            { id: 'proveedor', label: 'Soy proveedor', icon: 'Briefcase' }].map(r => {
            const active = role === r.id;
            return (
              <button key={r.id} onClick={() => setRole(r.id)} style={{
                flex: 1, height: 44, border: 'none', borderRadius: 9, cursor: 'pointer',
                background: active ? 'var(--sgt-card-bg)' : 'transparent',
                color: active ? SGT.blueDark : 'var(--sgt-text-sub)',
                fontSize: 14, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: active ? '0 1px 2px rgba(16,24,40,.06)' : 'none',
              }}>
                <Icon name={r.icon} size={16} color="currentColor" />
                {r.label}
              </button>
            );
          })}
        </div>

        <Card padding={24}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Nombre completo">
              <Input icon="User" placeholder="Juan Pérez" value="" onChange={()=>{}} />
            </Field>
            <Field label="Teléfono">
              <Input icon="Phone" placeholder="+502 5555-5555" value="" onChange={()=>{}} />
            </Field>
            <Field label="Correo electrónico" wide>
              <Input icon="Mail" placeholder="tu@correo.com" value="" onChange={()=>{}} />
            </Field>
            <Field label="Contraseña">
              <Input icon="Lock" type="password" placeholder="••••••••" value={pwd} onChange={e => setPwd(e.target.value)} />
              {pwd && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <div style={{ flex: 1, height: 4, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${(strength/4)*100}%`, height: '100%', background: strColor, transition: 'width .2s' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: strColor }}>{strLabel}</span>
                </div>
              )}
            </Field>
            <Field label="Confirmar contraseña">
              <Input icon="Lock" type="password" placeholder="••••••••" value="" onChange={()=>{}} />
            </Field>

            {role === 'proveedor' && (
              <>
                <Field label="Categoría principal" wide>
                  <select style={selectStyle()}>
                    {SGT_CATEGORIES.map(c => <option key={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Zonas de cobertura" wide>
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
                </Field>
                <Field label="Tarifa estimada (Q/h)">
                  <Input icon="DollarSign" placeholder="150" value="" onChange={()=>{}} />
                </Field>
                <Field label="NIT (opcional)">
                  <Input icon="FileText" placeholder="1234567-8" value="" onChange={()=>{}} />
                </Field>
                <Field label="Descripción de tus servicios" wide>
                  <textarea placeholder="Cuéntanos sobre tu experiencia y servicios..." style={{ width: '100%', minHeight: 88, padding: 12, border: '1px solid var(--sgt-border)', borderRadius: 12, background: 'var(--sgt-input-bg)', color: 'var(--sgt-text)', fontFamily: 'inherit', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                </Field>
                <Field label="Documento de identificación" wide>
                  <div style={{ border: '2px dashed var(--sgt-border)', borderRadius: 12, padding: 18, textAlign: 'center', cursor: 'pointer' }}>
                    <Icon name="UploadCloud" size={28} color={SGT.textSub} />
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>Subir DPI o licencia</div>
                    <div style={{ fontSize: 12, color: 'var(--sgt-text-sub)', marginTop: 2 }}>PNG, JPG o PDF · max 5MB</div>
                  </div>
                </Field>
              </>
            )}

            <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} style={{ accentColor: SGT.blue, marginTop: 2, width: 16, height: 16 }} />
                <span>Acepto los <a style={{ color: SGT.blue, fontWeight: 600 }}>términos y condiciones</a> y la <a style={{ color: SGT.blue, fontWeight: 600 }}>política de privacidad</a> de ServiGT.</span>
              </label>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, marginTop: 8 }}>
              <Button kind="ghost" size="lg" full>Cancelar</Button>
              <Button kind="primary" size="lg" full disabled={!accept}>Crear cuenta</Button>
            </div>
          </div>
        </Card>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--sgt-text-sub)', marginTop: 18 }}>
          ¿Ya tienes cuenta? <a style={{ fontWeight: 600, color: SGT.blue, cursor: 'pointer' }}>Inicia sesión</a>
        </p>
      </div>
    </SgtFrame>
  );
}

const Field = ({ label, children, wide }) => (
  <div style={{ gridColumn: wide ? '1 / -1' : 'auto', display: 'flex', flexDirection: 'column' }}>
    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</label>
    {children}
  </div>
);

const selectStyle = () => ({
  height: 44, padding: '0 14px',
  border: '1px solid var(--sgt-border)', borderRadius: 12,
  background: 'var(--sgt-input-bg)', color: 'var(--sgt-text)',
  fontSize: 14, fontFamily: 'inherit', outline: 'none', cursor: 'pointer', width: '100%',
});

// ─── 4. RECOVER PASSWORD ───────────────────────────────────────────
function ScreenRecover({ dark, setDark }) {
  const [step, setStep] = React.useState(0);
  const [code, setCode] = React.useState(['', '', '', '', '', '']);
  const refs = React.useRef([]);

  const stepInfo = [
    { title: 'Recupera tu contraseña', sub: 'Ingresa el correo asociado a tu cuenta y te enviaremos un código.', icon: 'Mail' },
    { title: 'Verifica tu identidad',  sub: 'Ingresa el código de 6 dígitos que enviamos a tu correo.',           icon: 'KeyRound' },
    { title: 'Crea una nueva contraseña', sub: 'Tu contraseña debe tener al menos 8 caracteres.',                 icon: 'Lock' },
    { title: '¡Listo!',                sub: 'Tu contraseña fue actualizada correctamente.',                       icon: 'CheckCircle2' },
  ][step];

  return (
    <SgtFrame mode="public" dark={dark} setDark={setDark} notifCount={0} padding={0}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 28px', width: '100%', boxSizing: 'border-box' }}>
        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          {[0,1,2,3].map(i => (
            <React.Fragment key={i}>
              <span style={{
                width: 30, height: 30, borderRadius: 999,
                background: i < step ? SGT.success : i === step ? SGT.blue : 'var(--sgt-border)',
                color: i <= step ? 'white' : 'var(--sgt-text-sub)',
                fontSize: 12, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .18s',
              }}>
                {i < step ? <Icon name="Check" size={14} color="white" strokeWidth={3} /> : i + 1}
              </span>
              {i < 3 && <span style={{ flex: 1, height: 2, background: i < step ? SGT.success : 'var(--sgt-border)', transition: 'background .18s' }} />}
            </React.Fragment>
          ))}
        </div>

        <Card padding={28}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: SGT.skyLight, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Icon name={stepInfo.icon} size={26} color={SGT.blue} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{stepInfo.title}</h2>
          <p style={{ fontSize: 14, color: 'var(--sgt-text-sub)', marginTop: 6, marginBottom: 22 }}>{stepInfo.sub}</p>

          {step === 0 && (
            <Input icon="Mail" placeholder="tu@correo.com" value="" onChange={()=>{}} />
          )}

          {step === 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              {code.map((d, i) => (
                <input
                  key={i} ref={el => refs.current[i] = el}
                  value={d}
                  onChange={e => {
                    const v = e.target.value.slice(-1).replace(/[^0-9]/g, '');
                    const nc = [...code]; nc[i] = v; setCode(nc);
                    if (v && i < 5) refs.current[i+1]?.focus();
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i-1]?.focus();
                  }}
                  maxLength={1}
                  style={{
                    width: 48, height: 56,
                    border: `1.5px solid ${d ? SGT.blue : 'var(--sgt-border)'}`,
                    borderRadius: 10, textAlign: 'center', fontSize: 22, fontWeight: 700,
                    background: 'var(--sgt-input-bg)', color: 'var(--sgt-text)', outline: 'none',
                    transition: 'border-color .12s',
                  }}
                />
              ))}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input icon="Lock" type="password" placeholder="Nueva contraseña" value="" onChange={()=>{}} />
              <Input icon="Lock" type="password" placeholder="Confirmar contraseña" value="" onChange={()=>{}} />
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ width: 84, height: 84, borderRadius: 999, background: SGT.success + '22', margin: '0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="Check" size={44} color={SGT.success} strokeWidth={3} />
              </div>
              <p style={{ marginTop: 16, fontSize: 14, color: 'var(--sgt-text-sub)' }}>Ya puedes iniciar sesión con tu nueva contraseña.</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            {step > 0 && step < 3 && (
              <Button kind="ghost" full onClick={() => setStep(step - 1)}>Atrás</Button>
            )}
            <Button kind="primary" full onClick={() => setStep(Math.min(step + 1, 3))}>
              {step === 3 ? 'Ir a iniciar sesión' : step === 2 ? 'Cambiar contraseña' : 'Continuar'}
            </Button>
          </div>

          {step === 1 && (
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--sgt-text-sub)' }}>
              ¿No recibiste el código? <a style={{ color: SGT.blue, fontWeight: 600, cursor: 'pointer' }}>Reenviar</a>
            </p>
          )}
        </Card>
      </div>
    </SgtFrame>
  );
}

Object.assign(window, { ScreenLanding, ScreenLogin, ScreenRegister, ScreenRecover, ProviderCard, Field, selectStyle });
