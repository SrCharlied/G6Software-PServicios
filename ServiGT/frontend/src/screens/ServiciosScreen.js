import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import PublicHeader from '../components/PublicHeader';
import { C, MD, PublicFooter, ScaleBtn } from '../components/publicUI';
import { getCategorias } from '../services/api';

// La BD guarda `icono` con nombres de lucide; aqui se traducen al emoji que
// usa el resto del sitio. Si llega uno desconocido cae en el comodin.
const ICONOS = {
  wrench: '🔧', zap: '⚡', brush: '🖌️', hammer: '🔨', sparkles: '✨',
  leaf: '🌿', building: '🏗️', settings: '⚙️', monitor: '💻', book: '📚',
};
const ICONO_DEFAULT = '🛠️';

const PASOS = [
  {
    n: '1',
    titulo: 'Publica lo que necesitas',
    desc: 'Describe el trabajo, la ubicación y qué tan urgente es. Publicar tu solicitud no tiene costo.',
  },
  {
    n: '2',
    titulo: 'Recibe cotizaciones',
    desc: 'Los proveedores de la categoría te envían su precio y su propuesta. Compara antes de decidir.',
  },
  {
    n: '3',
    titulo: 'Contrata y califica',
    desc: 'Eliges al proveedor, se coordina el servicio y al terminar lo calificas para orientar a los demás.',
  },
];

function CategoriaCard({ icono, nombre, descripcion, wide }) {
  return (
    <View style={[s.catCard, wide && s.catCardWide]}>
      <View style={s.catIconWrap}>
        <Text style={s.catIcon}>{ICONOS[icono] ?? ICONO_DEFAULT}</Text>
      </View>
      <Text style={s.catTitle}>{nombre}</Text>
      {!!descripcion && <Text style={s.catDesc}>{descripcion}</Text>}
    </View>
  );
}

function PasoCard({ n, titulo, desc, wide }) {
  return (
    <View style={[s.pasoCard, wide && s.pasoCardWide]}>
      <View style={s.pasoNumWrap}>
        <Text style={s.pasoNum}>{n}</Text>
      </View>
      <Text style={s.pasoTitle}>{titulo}</Text>
      <Text style={s.pasoDesc}>{desc}</Text>
    </View>
  );
}

export default function ServiciosScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const wide = width >= MD;

  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando]     = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    let activo = true;

    getCategorias()
      .then((data) => {
        if (!activo) return;
        // El controlador responde { message, categorias: [...] }.
        setCategorias(Array.isArray(data) ? data : (data?.categorias ?? []));
        setError(null);
      })
      .catch((e) => {
        if (activo) setError(e.message ?? 'No se pudieron cargar las categorías.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => { activo = false; };
  }, []);

  const onRegister = () => navigation?.navigate('Register');
  const onLogin    = () => navigation?.navigate('Login');

  return (
    <ScrollView style={s.root} stickyHeaderIndices={[0]}>
      <View>
        <PublicHeader active="Servicios" navigation={navigation} />
      </View>

      {/* ── Encabezado ── */}
      <View style={s.hero}>
        <View style={[s.heroContent, wide && s.heroContentWide]}>
          <Text style={[s.heroTitle, wide && s.heroTitleWide]}>
            Servicios para tu hogar y tu negocio
          </Text>
          <Text style={[s.heroSub, wide && s.heroSubWide]}>
            Conecta con proveedores verificados en toda Guatemala. Estas son las
            categorías disponibles hoy en la plataforma.
          </Text>
        </View>
      </View>

      {/* ── Categorias ── */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, wide && s.sectionTitleWide]}>Categorías disponibles</Text>
        <Text style={s.sectionSub}>
          Cada categoría agrupa a los proveedores registrados que ofrecen ese tipo de trabajo.
        </Text>

        {cargando && (
          <View style={s.estado}>
            <ActivityIndicator size="large" color={C.blue} />
            <Text style={s.estadoText}>Cargando categorías…</Text>
          </View>
        )}

        {!cargando && error && (
          <View style={s.estado}>
            <Text style={s.errorTitle}>No se pudieron cargar las categorías</Text>
            <Text style={s.estadoText}>{error}</Text>
          </View>
        )}

        {!cargando && !error && categorias.length === 0 && (
          <View style={s.estado}>
            <Text style={s.estadoText}>Todavía no hay categorías registradas.</Text>
          </View>
        )}

        {!cargando && !error && categorias.length > 0 && (
          <View style={[s.catGrid, wide && s.catGridWide]}>
            {categorias.map((c) => (
              <CategoriaCard
                key={c.id ?? c.nombre}
                icono={c.icono}
                nombre={c.nombre}
                descripcion={c.descripcion}
                wide={wide}
              />
            ))}
          </View>
        )}
      </View>

      {/* ── Como funciona ── */}
      <View style={[s.section, s.sectionAlt]}>
        <Text style={[s.sectionTitle, wide && s.sectionTitleWide]}>¿Cómo funciona?</Text>
        <Text style={s.sectionSub}>Tres pasos desde que publicas hasta que calificas.</Text>
        <View style={[s.pasoGrid, wide && s.pasoGridWide]}>
          {PASOS.map((p) => <PasoCard key={p.n} {...p} wide={wide} />)}
        </View>
      </View>

      {/* ── CTA ── */}
      <View style={s.cta}>
        <Text style={[s.ctaTitle, wide && { fontSize: 34 }]}>¿Necesitas uno de estos servicios?</Text>
        <Text style={s.ctaSub}>Crea tu cuenta y publica tu primera solicitud.</Text>
        <View style={[s.ctaBtns, !wide && s.ctaBtnsMobile]}>
          <ScaleBtn
            label="Crear Cuenta Gratis"
            onPress={onRegister}
            style={[s.btnAccent, !wide && { width: '100%' }]}
            textStyle={s.btnAccentText}
          />
          <ScaleBtn
            label="Ya tengo cuenta"
            onPress={onLogin}
            style={[s.btnOutline, !wide && { width: '100%' }]}
            textStyle={s.btnOutlineText}
          />
        </View>
      </View>

      <PublicFooter />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.canvas },

  hero: {
    backgroundColor: C.heroBg,
    paddingHorizontal: 24,
    paddingVertical: 64,
    alignItems: 'center',
  },
  heroContent: { alignItems: 'center', width: '100%', maxWidth: 620 },
  heroContentWide: { maxWidth: 740 },
  heroTitle: {
    fontSize: 30, fontWeight: '800', color: C.paper,
    textAlign: 'center', marginBottom: 14, lineHeight: 40, letterSpacing: -0.5,
  },
  heroTitleWide: { fontSize: 44, lineHeight: 54 },
  heroSub: {
    fontSize: 16, color: 'rgba(246,244,238,0.75)',
    textAlign: 'center', lineHeight: 26,
  },
  heroSubWide: { fontSize: 18, lineHeight: 29, maxWidth: 580 },

  section: { paddingVertical: 64, paddingHorizontal: 24, alignItems: 'center', backgroundColor: C.canvas },
  sectionAlt: { backgroundColor: C.paper },
  sectionTitle: {
    fontSize: 26, fontWeight: '800', color: C.ink,
    textAlign: 'center', marginBottom: 10, letterSpacing: -0.3,
  },
  sectionTitleWide: { fontSize: 32 },
  sectionSub: {
    fontSize: 15, color: C.muted, textAlign: 'center',
    marginBottom: 44, maxWidth: 520, lineHeight: 24,
  },

  estado: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  estadoText: { fontSize: 14, color: C.muted, textAlign: 'center' },
  errorTitle: { fontSize: 16, fontWeight: '700', color: C.ink, textAlign: 'center' },

  catGrid: { width: '100%', maxWidth: 1040, gap: 16 },
  catGridWide: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  catCard: {
    backgroundColor: C.paper,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.ink,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  catCardWide: { width: 232, marginHorizontal: 8, marginBottom: 16 },
  catIconWrap: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: C.soft,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  catIcon: { fontSize: 25 },
  catTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 6, textAlign: 'center' },
  catDesc: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },

  pasoGrid: { width: '100%', maxWidth: 1040, gap: 20 },
  pasoGridWide: { flexDirection: 'row', alignItems: 'stretch' },
  pasoCard: {
    backgroundColor: C.canvas,
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  pasoCardWide: { flex: 1, marginHorizontal: 8 },
  pasoNumWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.blue,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  pasoNum: { fontSize: 19, fontWeight: '800', color: C.paper },
  pasoTitle: { fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 8, textAlign: 'center' },
  pasoDesc: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 22 },

  cta: { backgroundColor: '#e8e6df', paddingVertical: 64, paddingHorizontal: 24, alignItems: 'center' },
  ctaTitle: { fontSize: 28, fontWeight: '800', color: C.ink, textAlign: 'center', marginBottom: 12, letterSpacing: -0.3 },
  ctaSub: { fontSize: 16, color: C.muted, textAlign: 'center', marginBottom: 36, lineHeight: 26 },
  ctaBtns: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', justifyContent: 'center', width: '100%' },
  ctaBtnsMobile: { flexDirection: 'column', gap: 12, alignItems: 'stretch' },
  btnAccent: {
    backgroundColor: C.accent,
    paddingHorizontal: 28, paddingVertical: 15,
    borderRadius: 10, alignItems: 'center', minWidth: 200, height: 52,
  },
  btnAccentText: { color: C.paper, fontWeight: '700', fontSize: 16 },
  btnOutline: {
    borderWidth: 1.5, borderColor: C.deep,
    paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 10, alignItems: 'center', minWidth: 180, height: 52,
  },
  btnOutlineText: { color: C.deep, fontWeight: '600', fontSize: 16 },
});
