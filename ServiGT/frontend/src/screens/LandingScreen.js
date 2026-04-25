// Landing page — uses the ServiGT design system from Logo Exploration.
// Color tokens:
//   GT Blue  #4589d4  (oklch 0.62 0.16 240) — Guatemalan sky blue
//   GT Deep  #1b5499  (oklch 0.46 0.15 250) — gradient depth
//   Ink      #0e1424  — near-black type
//   Paper    #f6f4ee  — warm off-white surface
//   Canvas   #f0eee9  — warm gray page bg (same as design canvas)

import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import ServiGTLogo from '../components/ServiGTLogo';

// Design tokens (matching Logo Exploration file)
const C = {
  blue:    '#4589d4',
  deep:    '#1b5499',
  soft:    '#b3cfe8',
  ink:     '#0e1424',
  paper:   '#f6f4ee',
  canvas:  '#f0eee9',
  muted:   '#64748b',
  border:  'rgba(14,20,36,0.09)',
  heroBg:  '#0e1424',
};

const MD = 768; // breakpoint: web vs mobile

// ── Shared buttons ─────────────────────────────────────────────────────────
function SolidBtn({ label, onPress, style }) {
  return (
    <TouchableOpacity style={[s.solidBtn, style]} onPress={onPress} activeOpacity={0.86}>
      <Text style={s.solidBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function OutlineBtn({ label, onPress, style, textStyle }) {
  return (
    <TouchableOpacity style={[s.outlineBtn, style]} onPress={onPress} activeOpacity={0.86}>
      <Text style={[s.outlineBtnText, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Web header ─────────────────────────────────────────────────────────────
function WebHeader({ onLogin, onRegister }) {
  return (
    <View style={s.webHeader}>
      <ServiGTLogo size={22} mode="dark" />
      <View style={s.webNav}>
        {['Inicio', 'Servicios', 'Nosotros'].map((item) => (
          <Text key={item} style={s.navLink}>{item}</Text>
        ))}
      </View>
      <View style={s.webCtas}>
        <OutlineBtn label="Iniciar Sesión" onPress={onLogin} />
        <SolidBtn label="Crear Cuenta" onPress={onRegister} />
      </View>
    </View>
  );
}

// ── Mobile header + drawer ─────────────────────────────────────────────────
function MobileHeader({ onLogin, onRegister }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <View style={s.mobileHeader}>
        <ServiGTLogo size={20} mode="dark" />
        <TouchableOpacity
          onPress={() => setOpen(true)}
          style={s.hamburger}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        >
          <View style={s.hLine} />
          <View style={[s.hLine, { width: 17 }]} />
          <View style={s.hLine} />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent>
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <Pressable style={s.drawer} onPress={() => {}}>
            <View style={s.drawerTop}>
              <ServiGTLogo size={20} mode="dark" />
              <TouchableOpacity
                onPress={() => setOpen(false)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Text style={s.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={s.drawerNav}>
              {['Inicio', 'Servicios', 'Nosotros'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={s.drawerItem}
                  onPress={() => setOpen(false)}
                >
                  <Text style={s.drawerItemText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <SolidBtn label="Crear Cuenta" onPress={() => { setOpen(false); onRegister(); }} />
            <OutlineBtn
              label="Iniciar Sesión"
              style={{ marginTop: 12 }}
              onPress={() => { setOpen(false); onLogin(); }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, web }) {
  return (
    <View style={[s.featureCard, web && s.featureCardWeb]}>
      <View style={s.featureIconWrap}>
        <Text style={s.featureIcon}>{icon}</Text>
      </View>
      <Text style={s.featureTitle}>{title}</Text>
      <Text style={s.featureDesc}>{desc}</Text>
    </View>
  );
}

// ── Stat item ─────────────────────────────────────────────────────────────
function Stat({ value, label }) {
  return (
    <View style={s.statItem}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ── Landing screen ────────────────────────────────────────────────────────
export default function LandingScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWeb = width >= MD;

  const onLogin    = () => navigation?.navigate('Login');
  const onRegister = () => navigation?.navigate('Register');

  return (
    <ScrollView style={s.root} stickyHeaderIndices={[0]}>

      {/* ── Sticky header ── */}
      <View>
        {isWeb
          ? <WebHeader onLogin={onLogin} onRegister={onRegister} />
          : <MobileHeader onLogin={onLogin} onRegister={onRegister} />}
      </View>

      {/* ── Hero ── */}
      <View style={s.hero}>
        {/* Subtle blue overlay — same layering as design */}
        <View style={s.heroOverlay} />
        <View style={[s.heroContent, isWeb && s.heroContentWeb]}>
          <ServiGTLogo size={isWeb ? 32 : 26} mode="light" layout="horizontal" />
          <Text style={[s.heroTitle, isWeb && s.heroTitleWeb]}>
            {'Encuentra el servicio\nque necesitas'}
          </Text>
          <Text style={[s.heroSub, isWeb && s.heroSubWeb]}>
            Conectamos profesionales de confianza con quienes los necesitan
            en Guatemala. Rápido, seguro y fácil.
          </Text>
          <View style={[s.heroCtas, !isWeb && s.heroCtasMobile]}>
            <TouchableOpacity
              style={[s.heroAccent, !isWeb && { width: '100%' }]}
              onPress={onRegister}
              activeOpacity={0.88}
            >
              <Text style={s.heroAccentText}>Crear Cuenta Gratis</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.heroGhost, !isWeb && { width: '100%' }]}
              onPress={onLogin}
              activeOpacity={0.88}
            >
              <Text style={s.heroGhostText}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Stats bar ── */}
      <View style={[s.statsBar, isWeb && s.statsBarWeb]}>
        <Stat value="500+" label="Proveedores" />
        {isWeb && <View style={s.statDivider} />}
        <Stat value="3,000+" label="Servicios realizados" />
        {isWeb && <View style={s.statDivider} />}
        <Stat value="22" label="Departamentos" />
        {isWeb && <View style={s.statDivider} />}
        <Stat value="4.8 ★" label="Calificación promedio" />
      </View>

      {/* ── Features ── */}
      <View style={s.features}>
        <Text style={[s.sectionTitle, isWeb && s.sectionTitleWeb]}>
          ¿Por qué elegir ServiGT?
        </Text>
        <Text style={s.sectionSub}>
          La plataforma más completa para servicios profesionales en Guatemala
        </Text>
        <View style={[s.featureGrid, isWeb && s.featureGridWeb]}>
          <FeatureCard
            web={isWeb}
            icon="🔍"
            title="Encuentra Proveedores"
            desc="Busca entre cientos de profesionales verificados cerca de ti, filtrados por categoría y ubicación."
          />
          <FeatureCard
            web={isWeb}
            icon="📋"
            title="Solicita Servicios"
            desc="Envía tu solicitud con todos los detalles y recibe cotizaciones de proveedores interesados."
          />
          <FeatureCard
            web={isWeb}
            icon="⭐"
            title="Califica y Confía"
            desc="Lee reseñas reales de usuarios y califica a los proveedores después de cada servicio."
          />
        </View>
      </View>

      {/* ── Bottom CTA ── */}
      <View style={s.ctaSection}>
        <Text style={[s.ctaTitle, isWeb && { fontSize: 34 }]}>
          ¿Listo para empezar?
        </Text>
        <Text style={s.ctaSub}>
          Únete a miles de guatemaltecos que ya usan ServiGT
        </Text>
        <View style={[s.heroCtas, !isWeb && s.heroCtasMobile]}>
          <TouchableOpacity
            style={[s.heroAccent, !isWeb && { width: '100%' }]}
            onPress={onRegister}
            activeOpacity={0.88}
          >
            <Text style={s.heroAccentText}>Crear Cuenta Gratis</Text>
          </TouchableOpacity>
          <OutlineBtn
            label="Ya tengo cuenta"
            onPress={onLogin}
            style={[s.ctaOutline, !isWeb && { width: '100%' }]}
            textStyle={{ color: C.deep }}
          />
        </View>
      </View>

      {/* ── Footer ── */}
      <View style={s.footer}>
        <ServiGTLogo size={18} mode="light" />
        <Text style={s.footerText}>
          © 2026 ServiGT · Guatemala · Todos los derechos reservados
        </Text>
      </View>

    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.canvas },

  // Web header
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
    paddingVertical: 14,
    backgroundColor: C.paper,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    shadowColor: C.ink,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  webNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 36,
  },
  navLink: {
    fontSize: 14,
    color: 'rgba(14,20,36,0.65)',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  webCtas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Mobile header
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: C.paper,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    shadowColor: C.ink,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  hamburger: {
    paddingVertical: 4,
    alignItems: 'flex-end',
  },
  hLine: {
    width: 22,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: C.ink,
    marginVertical: 3,
  },

  // Drawer
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(14,20,36,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  drawer: {
    width: '78%',
    maxWidth: 300,
    height: '100%',
    backgroundColor: C.paper,
    padding: 24,
    paddingTop: 56,
  },
  drawerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
  },
  closeX: { fontSize: 18, color: C.muted, fontWeight: '600' },
  drawerNav: { marginBottom: 36 },
  drawerItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  drawerItemText: {
    fontSize: 16,
    color: C.ink,
    fontWeight: '500',
  },

  // Buttons
  solidBtn: {
    backgroundColor: C.blue,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  solidBtnText: { color: C.paper, fontWeight: '600', fontSize: 14 },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: C.blue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  outlineBtnText: { color: C.blue, fontWeight: '600', fontSize: 14 },

  // Hero
  hero: {
    backgroundColor: C.heroBg,
    paddingHorizontal: 24,
    paddingVertical: 88,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.deep,
    opacity: 0.28,
  },
  heroContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 620,
    zIndex: 1,
  },
  heroContentWeb: { maxWidth: 740 },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: C.paper,
    textAlign: 'center',
    marginTop: 28,
    marginBottom: 16,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  heroTitleWeb: { fontSize: 50, lineHeight: 62 },
  heroSub: {
    fontSize: 16,
    color: 'rgba(246,244,238,0.75)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
  },
  heroSubWeb: { fontSize: 19, lineHeight: 30, maxWidth: 580 },
  heroCtas: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  heroCtasMobile: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'stretch',
  },
  heroAccent: {
    backgroundColor: '#e07b18', // warm amber — contrast on dark hero
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 200,
  },
  heroAccentText: { color: C.paper, fontWeight: '700', fontSize: 16 },
  heroGhost: {
    borderWidth: 2,
    borderColor: 'rgba(246,244,238,0.55)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 180,
  },
  heroGhostText: { color: C.paper, fontWeight: '600', fontSize: 16 },

  // Stats
  statsBar: {
    flexDirection: 'column',
    backgroundColor: C.paper,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  statsBarWeb: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 0,
  },
  statItem: { alignItems: 'center', minWidth: 130, paddingHorizontal: 28 },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: C.blue,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statLabel: { fontSize: 12, color: C.muted, textAlign: 'center', letterSpacing: 0.2 },
  statDivider: {
    width: 1,
    height: 44,
    backgroundColor: C.border,
    alignSelf: 'center',
  },

  // Features
  features: {
    paddingVertical: 72,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: C.canvas,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  sectionTitleWeb: { fontSize: 32 },
  sectionSub: {
    fontSize: 15,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 48,
    maxWidth: 480,
    lineHeight: 24,
  },
  featureGrid: {
    flexDirection: 'column',
    width: '100%',
    maxWidth: 1040,
    gap: 20,
  },
  featureGridWeb: { flexDirection: 'row', alignItems: 'stretch' },
  featureCard: {
    backgroundColor: C.paper,
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    shadowColor: C.ink,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },
  featureCardWeb: { flex: 1, marginHorizontal: 8 },
  featureIconWrap: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: C.soft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  featureIcon: { fontSize: 28 },
  featureTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  featureDesc: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Bottom CTA
  ctaSection: {
    backgroundColor: '#e8e6df', // design canvas bg — same as LogoContext card
    paddingVertical: 72,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  ctaSub: {
    fontSize: 16,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 26,
  },
  ctaOutline: {
    borderWidth: 1.5,
    borderColor: C.deep,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 180,
  },

  // Footer
  footer: {
    backgroundColor: C.ink,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  footerText: {
    color: 'rgba(246,244,238,0.4)',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
