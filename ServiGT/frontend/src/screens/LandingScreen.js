import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import ServiGTLogo from '../components/ServiGTLogo';
import PublicHeader from '../components/PublicHeader';
import { C, MD, PublicFooter, ScaleBtn } from '../components/publicUI';

// ── Feature card (accepts entrance animation value) ────────────────────────
function FeatureCard({ icon, title, desc, web, anim }) {
  const style = anim
    ? {
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
      }
    : null;
  return (
    <Animated.View style={[s.featureCard, web && s.featureCardWeb, style]}>
      <View style={s.featureIconWrap}>
        <Text style={s.featureIcon}>{icon}</Text>
      </View>
      <Text style={s.featureTitle}>{title}</Text>
      <Text style={s.featureDesc}>{desc}</Text>
    </Animated.View>
  );
}

// ── Stat item ──────────────────────────────────────────────────────────────
function Stat({ value, label }) {
  return (
    <View style={s.statItem}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ── Landing screen ─────────────────────────────────────────────────────────
export default function LandingScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWeb = width >= MD;

  // Hero entrance — staggered: logo, title, subtitle, CTAs
  const a0 = useRef(new Animated.Value(0)).current;
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const a3 = useRef(new Animated.Value(0)).current;

  // Stats bar
  const statsAnim = useRef(new Animated.Value(0)).current;

  // Feature cards
  const f0 = useRef(new Animated.Value(0)).current;
  const f1 = useRef(new Animated.Value(0)).current;
  const f2 = useRef(new Animated.Value(0)).current;

  // CTA section
  const ctaAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spring = (val) =>
      Animated.spring(val, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true });

    // Hero: staggered spring entrance
    Animated.stagger(110, [a0, a1, a2, a3].map(spring)).start();

    // Stats: delayed fade
    Animated.timing(statsAnim, { toValue: 1, duration: 500, delay: 350, useNativeDriver: true }).start();

    // Feature cards: staggered after hero settles
    Animated.stagger(140, [f0, f1, f2].map(spring)).start();

    // CTA section fade
    Animated.timing(ctaAnim, { toValue: 1, duration: 500, delay: 500, useNativeDriver: true }).start();
  }, []);

  // Helper: opacity + slide-up from animated value
  const entrance = (anim, offsetY = 22) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [offsetY, 0] }) }],
  });

  const onLogin    = () => navigation?.navigate('Login');
  const onRegister = () => navigation?.navigate('Register');

  return (
    <ScrollView style={s.root} stickyHeaderIndices={[0]}>

      {/* ── Sticky header ── */}
      <View>
        <PublicHeader active="Inicio" navigation={navigation} />
      </View>

      {/* ── Hero ── */}
      <View style={s.hero}>
        <View style={s.heroOverlay} />
        <View style={[s.heroContent, isWeb && s.heroContentWeb]}>

          <Animated.View style={entrance(a0)}>
            <ServiGTLogo size={isWeb ? 32 : 26} mode="light" layout="horizontal" />
          </Animated.View>

          <Animated.Text style={[s.heroTitle, isWeb && s.heroTitleWeb, entrance(a1)]}>
            {'Encuentra el servicio\nque necesitas'}
          </Animated.Text>

          <Animated.Text style={[s.heroSub, isWeb && s.heroSubWeb, entrance(a2)]}>
            Conectamos profesionales de confianza con quienes los necesitan
            en Guatemala. Rápido, seguro y fácil.
          </Animated.Text>

          <Animated.View style={[s.heroCtas, !isWeb && s.heroCtasMobile, entrance(a3)]}>
            <ScaleBtn
              label="Crear Cuenta Gratis"
              onPress={onRegister}
              style={[s.heroAccent, !isWeb && { width: '100%' }]}
              textStyle={s.heroAccentText}
            />
            <ScaleBtn
              label="Iniciar Sesión"
              onPress={onLogin}
              style={[s.heroGhost, !isWeb && { width: '100%' }]}
              textStyle={s.heroGhostText}
            />
          </Animated.View>

        </View>
      </View>

      {/* ── Stats bar ── */}
      <Animated.View style={[s.statsBar, isWeb && s.statsBarWeb, { opacity: statsAnim }]}>
        <Stat value="500+"   label="Proveedores" />
        {isWeb && <View style={s.statDivider} />}
        <Stat value="3,000+" label="Servicios realizados" />
        {isWeb && <View style={s.statDivider} />}
        <Stat value="22"     label="Departamentos" />
        {isWeb && <View style={s.statDivider} />}
        <Stat value="4.8 ★"  label="Calificación promedio" />
      </Animated.View>

      {/* ── Features ── */}
      <View style={s.features}>
        <Text style={[s.sectionTitle, isWeb && s.sectionTitleWeb]}>
          ¿Por qué elegir ServiGT?
        </Text>
        <Text style={s.sectionSub}>
          La plataforma más completa para servicios profesionales en Guatemala
        </Text>
        <View style={[s.featureGrid, isWeb && s.featureGridWeb]}>
          <FeatureCard web={isWeb} anim={f0} icon="🔍" title="Encuentra Proveedores"
            desc="Busca entre cientos de profesionales verificados cerca de ti, filtrados por categoría y ubicación." />
          <FeatureCard web={isWeb} anim={f1} icon="📋" title="Solicita Servicios"
            desc="Envía tu solicitud con todos los detalles y recibe cotizaciones de proveedores interesados." />
          <FeatureCard web={isWeb} anim={f2} icon="⭐" title="Califica y Confía"
            desc="Lee reseñas reales de usuarios y califica a los proveedores después de cada servicio." />
        </View>
      </View>

      {/* ── Bottom CTA ── */}
      <Animated.View style={[s.ctaSection, { opacity: ctaAnim }]}>
        <Text style={[s.ctaTitle, isWeb && { fontSize: 34 }]}>
          ¿Listo para empezar?
        </Text>
        <Text style={s.ctaSub}>
          Únete a miles de guatemaltecos que ya usan ServiGT
        </Text>
        <View style={[s.heroCtas, !isWeb && s.heroCtasMobile]}>
          <ScaleBtn
            label="Crear Cuenta Gratis"
            onPress={onRegister}
            style={[s.heroAccent, !isWeb && { width: '100%' }]}
            textStyle={s.heroAccentText}
          />
          <ScaleBtn
            label="Ya tengo cuenta"
            onPress={onLogin}
            style={[s.ctaOutline, !isWeb && { width: '100%' }]}
            textStyle={s.ctaOutlineText}
          />
        </View>
      </Animated.View>

      <PublicFooter />

    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
// El header, los botones base y el footer viven en components/publicUI.js y
// components/PublicHeader.js, compartidos con las pantallas de servicios y
// nosotros.
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.canvas },

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
  heroContent: { alignItems: 'center', width: '100%', maxWidth: 620, zIndex: 1 },
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
  heroCtasMobile: { flexDirection: 'column', gap: 12, alignItems: 'stretch' },
  heroAccent: {
    backgroundColor: C.accent,
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 200,
    height: 52,
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
    height: 52,
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
  statsBarWeb: { flexDirection: 'row', justifyContent: 'center', gap: 0 },
  statItem: { alignItems: 'center', minWidth: 130, paddingHorizontal: 28 },
  statValue: { fontSize: 28, fontWeight: '800', color: C.blue, letterSpacing: -0.5, marginBottom: 4 },
  statLabel: { fontSize: 12, color: C.muted, textAlign: 'center', letterSpacing: 0.2 },
  statDivider: { width: 1, height: 44, backgroundColor: C.border, alignSelf: 'center' },

  // Features
  features: {
    paddingVertical: 72,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: C.canvas,
  },
  sectionTitle: {
    fontSize: 26, fontWeight: '800', color: C.ink,
    textAlign: 'center', marginBottom: 10, letterSpacing: -0.3,
  },
  sectionTitleWeb: { fontSize: 32 },
  sectionSub: {
    fontSize: 15, color: C.muted, textAlign: 'center',
    marginBottom: 48, maxWidth: 480, lineHeight: 24,
  },
  featureGrid: { flexDirection: 'column', width: '100%', maxWidth: 1040, gap: 20 },
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
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: C.soft,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 18,
  },
  featureIcon: { fontSize: 28 },
  featureTitle: { fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 8, textAlign: 'center', letterSpacing: -0.2 },
  featureDesc: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 22 },

  // Bottom CTA
  ctaSection: {
    backgroundColor: '#e8e6df',
    paddingVertical: 72,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ctaTitle: { fontSize: 28, fontWeight: '800', color: C.ink, textAlign: 'center', marginBottom: 12, letterSpacing: -0.3 },
  ctaSub: { fontSize: 16, color: C.muted, textAlign: 'center', marginBottom: 40, lineHeight: 26 },
  ctaOutline: {
    borderWidth: 1.5,
    borderColor: C.deep,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 180,
    height: 52,
  },
  ctaOutlineText: { color: C.deep, fontWeight: '600', fontSize: 14 },
});
