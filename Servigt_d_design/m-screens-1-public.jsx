// Mobile screens 1-4: Landing, Login, Register, Recover
// All Spanish (es-GT). Designed for 390×844 viewport (iPhone 14/15).

// ─────────────────────────────────────────────────────────────
// 01 · Landing pública (mobile)
// ─────────────────────────────────────────────────────────────
function MScreenLanding() {
  const [search, setSearch] = React.useState('');
  return (
    <MFrame bg="var(--sgt-bg, #f5f7fb)">
      {/* Hero */}
      <div className="sgt-grad" style={{
        padding: '64px 20px 28px', color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        {/* status-bar safe area handled by IOSDevice. We add our own gradient blob. */}
        <div style={{
          position: 'absolute', top: -80, right: -80, width: 240, height: 240, borderRadius: 999,
          background: 'rgba(255,255,255,.12)', filter: 'blur(8px)',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,.2)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="Wrench" size={16} color="white" strokeWidth={2.5} />
            </span>
            <span style={{ fontSize: 18, fontWeight: 800 }}>ServiGT</span>
          </div>
          <button style={{
            width: 36, height: 36, borderRadius: 999, background: 'rgba(255,255,255,.18)',
            border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="Globe" size={16} color="white" />
          </button>
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 8 }}>
          Servicios de confianza<br/>en Guatemala
        </div>
        <div style={{ fontSize: 14, opacity: 0.92, marginBottom: 18, lineHeight: 1.45 }}>
          Plomeros, electricistas, niñeras y más.<br/>
          Disponibles cerca de ti.
        </div>
        {/* search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, height: 50,
          background: 'white', borderRadius: 14, padding: '0 14px',
          boxShadow: '0 8px 28px rgba(0,0,0,.18)',
        }}>
          <Icon name="Search" size={18} color={SGT.textSub} />
          <input value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="¿Qué necesitas hoy?"
                 style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: SGT.text, fontFamily: 'inherit' }} />
          <button style={{
            width: 36, height: 36, borderRadius: 10, background: SGT.blue, border: 'none',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="ArrowRight" size={18} color="white" />
          </button>
        </div>
        {/* mini stats */}
        <div style={{ display: 'flex', gap: 16, marginTop: 22 }}>
          {[['1,200+','Proveedores'],['18','Categorías'],['4.8★','Rating']].map(([v,l]) => (
            <div key={l} style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{v}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Categorías */}
      <div style={{ padding: '20px 0' }}>
        <MSectionTitle action={<a style={{ fontSize: 13, color: SGT.blue, fontWeight: 600 }}>Ver todo</a>}>Categorías</MSectionTitle>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '0 16px',
        }}>
          {SGT_CATEGORIES.slice(0, 8).map(c => (
            <button key={c.id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: 10, background: 'transparent', border: 'none', cursor: 'pointer',
            }}>
              <span style={{
                width: 56, height: 56, borderRadius: 16,
                background: c.color + '18', color: c.color,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={c.icon} size={26} color={c.color} strokeWidth={2} />
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sgt-text, #1f2937)', textAlign: 'center', lineHeight: 1.2 }}>
                {c.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Top proveedores */}
      <div style={{ padding: '4px 0 20px' }}>
        <MSectionTitle>Mejor calificados</MSectionTitle>
        <div style={{
          display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px 8px',
          scrollbarWidth: 'none',
        }}>
          {SGT_PROVIDERS.slice(0, 5).map((p, i) => {
            const cat = SGT_CATEGORIES.find(c => c.id === p.cat);
            return (
              <div key={p.id} style={{
                flex: '0 0 220px', background: 'var(--sgt-card-bg, white)',
                borderRadius: 16, overflow: 'hidden',
                border: '1px solid var(--sgt-border, #eef0f4)',
              }}>
                <div style={{ height: 110, background: '#eee', position: 'relative' }}>
                  <img src={sgtWork(p.cat, i, 400)} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {p.verified && (
                    <span style={{ position: 'absolute', top: 8, right: 8 }}><VerifiedBadge size={12} /></span>
                  )}
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar idx={i} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sgt-text, #1f2937)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--sgt-text-sub, #667085)' }}>{cat.name}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                    <Stars value={p.rating} size={11} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sgt-text, #1f2937)' }}>{p.rating}</span>
                    <span style={{ fontSize: 11, color: 'var(--sgt-text-sub, #667085)' }}>({p.reviews})</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: SGT.blue }}>Q{p.priceFrom}+</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cómo funciona */}
      <div style={{ padding: '4px 16px 20px' }}>
        <MSectionTitle padding="0 0 0 0">Cómo funciona</MSectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { n: 1, icon: 'Search',   t: 'Busca el servicio',  s: 'Encuentra el proveedor ideal cerca de ti' },
            { n: 2, icon: 'CalendarCheck', t: 'Reserva en 3 pasos', s: 'Elige día, hora y describe el trabajo' },
            { n: 3, icon: 'Star',     t: 'Califica al final',  s: 'Tu reseña ayuda a la comunidad' },
          ].map(s => (
            <MCard key={s.n} padding={14}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: SGT.skyLight, color: SGT.blue,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={s.icon} size={20} color={SGT.blue} />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sgt-text, #1f2937)' }}>{s.t}</div>
                  <div style={{ fontSize: 12, color: 'var(--sgt-text-sub, #667085)', marginTop: 2 }}>{s.s}</div>
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: 999, background: SGT.blue, color: 'white',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800,
                }}>{s.n}</div>
              </div>
            </MCard>
          ))}
        </div>
      </div>

      {/* CTA proveedor */}
      <div style={{ padding: '4px 16px 20px' }}>
        <div style={{
          background: 'var(--sgt-card-bg, white)', borderRadius: 18,
          border: '1px solid var(--sgt-border, #eef0f4)', padding: 18,
          display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden',
        }}>
          <span style={{
            position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 999,
            background: SGT.skyLight,
          }} />
          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
              background: SGT.skyLight, color: SGT.blueDark, borderRadius: 999, fontSize: 11,
              fontWeight: 700, marginBottom: 10,
            }}>
              <Icon name="Briefcase" size={11} color={SGT.blueDark} /> Para proveedores
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--sgt-text, #1f2937)', lineHeight: 1.2 }}>
              Genera ingresos<br/>con tu oficio
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--sgt-text-sub, #667085)', margin: '8px 0 12px', lineHeight: 1.45 }}>
              Recibe solicitudes en tu zona y crea tu reputación.
            </div>
            <MButton kind="primary" size="md" full={false} iconRight="ArrowRight">Empezar gratis</MButton>
          </div>
        </div>
      </div>
    </MFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// 02 · Login (mobile)
// ─────────────────────────────────────────────────────────────
function MScreenLogin() {
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  return (
    <MFrame bg="var(--sgt-card-bg, #fff)">
      <div style={{ padding: '60px 24px 24px', flex: 1 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, marginBottom: 20,
          background: `linear-gradient(135deg, ${SGT.blueDark}, ${SGT.blue}, ${SGT.sky})`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 22px rgba(26,115,232,.32)',
        }}>
          <Icon name="Wrench" size={26} color="white" strokeWidth={2.5} />
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--sgt-text, #1f2937)', letterSpacing: '-0.02em' }}>
          Bienvenido
        </div>
        <div style={{ fontSize: 14, color: 'var(--sgt-text-sub, #667085)', marginTop: 6, marginBottom: 28 }}>
          Inicia sesión para continuar
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sgt-text-sub, #667085)', marginBottom: 6 }}>Correo electrónico</div>
            <MInput icon="Mail" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="tu@correo.com" type="email" />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sgt-text-sub, #667085)', marginBottom: 6 }}>Contraseña</div>
            <MInput icon="Lock" value={pw} onChange={e => setPw(e.target.value)}
                    placeholder="••••••••" type="password"
                    rightSlot={<Icon name="Eye" size={18} color="var(--sgt-text-sub, #667085)" />} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--sgt-text, #1f2937)' }}>
              <span style={{
                width: 18, height: 18, borderRadius: 5, background: SGT.blue,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="Check" size={12} color="white" strokeWidth={3} />
              </span>
              Recordarme
            </label>
            <a style={{ color: SGT.blue, fontWeight: 600 }}>¿Olvidaste tu contraseña?</a>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <MButton kind="primary" size="lg">Iniciar sesión</MButton>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--sgt-border, #eef0f4)' }} />
          <span style={{ fontSize: 12, color: 'var(--sgt-text-sub, #667085)' }}>o continúa con</span>
          <div style={{ flex: 1, height: 1, background: 'var(--sgt-border, #eef0f4)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button style={socialBtn()}>
            <span style={{ fontWeight: 700, color: '#4285F4' }}>G</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Google</span>
          </button>
          <button style={socialBtn()}>
            <Icon name="Apple" size={16} color="var(--sgt-text, #1f2937)" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Apple</span>
          </button>
        </div>

        <div style={{ marginTop: 28, textAlign: 'center', fontSize: 13, color: 'var(--sgt-text-sub, #667085)' }}>
          ¿No tienes cuenta?{' '}
          <a style={{ color: SGT.blue, fontWeight: 700 }}>Regístrate</a>
        </div>
      </div>
    </MFrame>
  );
}

const socialBtn = () => ({
  height: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  background: 'var(--sgt-card-bg, #fff)', color: 'var(--sgt-text, #1f2937)',
  border: '1px solid var(--sgt-border, #e5e7eb)', borderRadius: 14, fontSize: 13,
  cursor: 'pointer',
});

// ─────────────────────────────────────────────────────────────
// 03 · Registro (mobile)
// ─────────────────────────────────────────────────────────────
function MScreenRegister() {
  const [tipo, setTipo] = React.useState('cliente');
  return (
    <MFrame bg="var(--sgt-bg, #f5f7fb)">
      <MAppBar onBack={() => {}} title="Crear cuenta" />
      <div style={{ padding: '12px 16px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sgt-text-sub, #667085)', marginBottom: 8 }}>
          Tipo de cuenta
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {[
            { id: 'cliente', icon: 'User', label: 'Cliente', sub: 'Quiero contratar' },
            { id: 'proveedor', icon: 'Briefcase', label: 'Proveedor', sub: 'Quiero ofrecer' },
          ].map(o => {
            const active = tipo === o.id;
            return (
              <button key={o.id} onClick={() => setTipo(o.id)} style={{
                padding: 14, borderRadius: 16, textAlign: 'left',
                background: active ? SGT.skyLight : 'var(--sgt-card-bg, white)',
                border: `1.5px solid ${active ? SGT.blue : 'var(--sgt-border, #eef0f4)'}`,
                cursor: 'pointer',
              }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: active ? SGT.blue : SGT.skyLight, color: active ? 'white' : SGT.blue,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                }}>
                  <Icon name={o.icon} size={18} color={active ? 'white' : SGT.blue} />
                </span>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sgt-text, #1f2937)' }}>{o.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--sgt-text-sub, #667085)', marginTop: 2 }}>{o.sub}</div>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { lbl: 'Nombre completo', icon: 'User', ph: 'Juan Pérez' },
            { lbl: 'Correo electrónico', icon: 'Mail', ph: 'tu@correo.com', type: 'email' },
            { lbl: 'Teléfono', icon: 'Phone', ph: '+502 5555-1234', type: 'tel' },
            { lbl: 'Contraseña', icon: 'Lock', ph: '••••••••', type: 'password' },
          ].map(f => (
            <div key={f.lbl}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sgt-text-sub, #667085)', marginBottom: 6 }}>{f.lbl}</div>
              <MInput icon={f.icon} placeholder={f.ph} type={f.type} value="" onChange={() => {}} />
            </div>
          ))}

          {tipo === 'proveedor' && (
            <>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sgt-text-sub, #667085)', marginBottom: 6 }}>Categoría principal</div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {SGT_CATEGORIES.slice(0, 6).map(c => (
                    <MChip key={c.id} icon={c.icon}>{c.name}</MChip>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sgt-text-sub, #667085)', marginBottom: 6 }}>Zona donde trabajas</div>
                <MInput icon="MapPin" placeholder="Selecciona una zona" value="" onChange={() => {}} />
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16, fontSize: 12, color: 'var(--sgt-text-sub, #667085)', lineHeight: 1.45 }}>
          <span style={{
            width: 18, height: 18, borderRadius: 5, background: SGT.blue, marginTop: 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="Check" size={12} color="white" strokeWidth={3} />
          </span>
          Acepto los <a style={{ color: SGT.blue, fontWeight: 600 }}>términos</a> y la <a style={{ color: SGT.blue, fontWeight: 600 }}>política de privacidad</a>.
        </div>

        <div style={{ marginTop: 18 }}>
          <MButton kind="primary" size="lg">Crear cuenta</MButton>
        </div>
      </div>
    </MFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// 04 · Recuperar contraseña (mobile, stepper)
// ─────────────────────────────────────────────────────────────
function MScreenRecover() {
  const [step, setStep] = React.useState(1);
  return (
    <MFrame bg="var(--sgt-card-bg, #fff)">
      <MAppBar onBack={() => {}} title="Recuperar contraseña" />
      <div style={{ padding: '8px 16px 24px' }}>
        {/* stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          {[1,2,3,4].map(i => (
            <React.Fragment key={i}>
              <div style={{
                width: 26, height: 26, borderRadius: 999,
                background: i <= step ? SGT.blue : 'var(--sgt-border, #eef0f4)',
                color: i <= step ? 'white' : 'var(--sgt-text-sub, #667085)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {i < step ? <Icon name="Check" size={12} color="white" strokeWidth={3} /> : i}
              </div>
              {i < 4 && (
                <div style={{ flex: 1, height: 2, background: i < step ? SGT.blue : 'var(--sgt-border, #eef0f4)' }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sgt-text, #1f2937)', marginBottom: 6 }}>
              Recuperar acceso
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--sgt-text-sub, #667085)', marginBottom: 22, lineHeight: 1.45 }}>
              Ingresa el correo asociado a tu cuenta.<br/>Te enviaremos un código de 6 dígitos.
            </div>
            <MInput icon="Mail" placeholder="tu@correo.com" value="" onChange={() => {}} type="email" />
            <div style={{ marginTop: 20 }}>
              <MButton kind="primary" size="lg" onClick={() => setStep(2)}>Enviar código</MButton>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sgt-text, #1f2937)', marginBottom: 6 }}>
              Verifica tu correo
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--sgt-text-sub, #667085)', marginBottom: 22, lineHeight: 1.45 }}>
              Enviamos un código a <b>tu@correo.com</b>.<br/>Pega los 6 dígitos abajo.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              {['4','7','2','9','—','—'].map((d, i) => (
                <div key={i} style={{
                  flex: 1, height: 56, borderRadius: 12, fontSize: 22, fontWeight: 800,
                  background: 'var(--sgt-bg, #f5f7fb)', color: 'var(--sgt-text, #1f2937)',
                  border: `1.5px solid ${i === 4 ? SGT.blue : 'var(--sgt-border, #e5e7eb)'}`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{d === '—' ? '' : d}</div>
              ))}
            </div>
            <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--sgt-text-sub, #667085)', margin: '20px 0' }}>
              ¿No recibiste el código? <a style={{ color: SGT.blue, fontWeight: 600 }}>Reenviar (32s)</a>
            </div>
            <MButton kind="primary" size="lg" onClick={() => setStep(3)}>Verificar código</MButton>
          </>
        )}
        {step === 3 && (
          <>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sgt-text, #1f2937)', marginBottom: 6 }}>
              Nueva contraseña
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--sgt-text-sub, #667085)', marginBottom: 22, lineHeight: 1.45 }}>
              Crea una nueva contraseña segura.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <MInput icon="Lock" placeholder="Nueva contraseña" type="password" value="" onChange={() => {}} />
              <MInput icon="Lock" placeholder="Confirmar contraseña" type="password" value="" onChange={() => {}} />
            </div>
            <div style={{ marginTop: 14, padding: 12, background: 'var(--sgt-bg, #f5f7fb)', borderRadius: 12 }}>
              {['8 caracteres', 'Una mayúscula', 'Un número'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--sgt-text-sub, #667085)', padding: '4px 0' }}>
                  <Icon name="CheckCircle2" size={14} color={SGT.success} /> {t}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20 }}>
              <MButton kind="primary" size="lg" onClick={() => setStep(4)}>Guardar contraseña</MButton>
            </div>
          </>
        )}
        {step === 4 && (
          <div style={{ textAlign: 'center', padding: '40px 12px' }}>
            <div style={{
              width: 88, height: 88, borderRadius: 999, background: SGT.success + '20',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
            }}>
              <Icon name="CheckCircle2" size={44} color={SGT.success} strokeWidth={2} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sgt-text, #1f2937)', marginBottom: 8 }}>
              ¡Contraseña actualizada!
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--sgt-text-sub, #667085)', marginBottom: 26, lineHeight: 1.45 }}>
              Ya puedes iniciar sesión con tu nueva contraseña.
            </div>
            <MButton kind="primary" size="lg" onClick={() => setStep(1)}>Volver al inicio</MButton>
          </div>
        )}
      </div>
    </MFrame>
  );
}

Object.assign(window, {
  MScreenLanding, MScreenLogin, MScreenRegister, MScreenRecover,
});
