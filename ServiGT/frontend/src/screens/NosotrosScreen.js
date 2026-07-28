import React from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import PublicHeader from '../components/PublicHeader';
import { C, MD, PublicFooter, ScaleBtn } from '../components/publicUI';

// NOTA PARA EL EQUIPO: los textos de esta pantalla son un punto de partida
// editable. Se redactaron sin datos verificables (fecha de fundacion, tamano
// del equipo, premios) para no publicar afirmaciones que nadie ha validado.
// Sustituyanlos por el mensaje oficial cuando este definido.

const VALORES = [
  {
    icon: '🤝',
    titulo: 'Confianza verificable',
    desc: 'Cada proveedor pasa por validación de documentos y acumula calificaciones reales de clientes. La reputación se gana trabajo por trabajo.',
  },
  {
    icon: '💡',
    titulo: 'Transparencia en el precio',
    desc: 'El cliente compara cotizaciones antes de decidir. Sin cobros ocultos ni intermediación que infle el costo del servicio.',
  },
  {
    icon: '🇬🇹',
    titulo: 'Oportunidad local',
    desc: 'Damos visibilidad a técnicos y profesionales de los 22 departamentos, no solo de la capital.',
  },
  {
    icon: '⭐',
    titulo: 'Calidad sostenida',
    desc: 'El sistema de niveles reconoce a quienes mantienen buen servicio en el tiempo, no a quienes pagan por aparecer primero.',
  },
];

function ValorCard({ icon, titulo, desc, wide }) {
  return (
    <View style={[s.valorCard, wide && s.valorCardWide]}>
      <View style={s.valorIconWrap}>
        <Text style={s.valorIcon}>{icon}</Text>
      </View>
      <View style={s.valorTexto}>
        <Text style={s.valorTitle}>{titulo}</Text>
        <Text style={s.valorDesc}>{desc}</Text>
      </View>
    </View>
  );
}

export default function NosotrosScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const wide = width >= MD;

  const onRegister = () => navigation?.navigate('Register');
  const onServicios = () => navigation?.navigate('Servicios');

  return (
    <ScrollView style={s.root} stickyHeaderIndices={[0]}>
      <View>
        <PublicHeader active="Nosotros" navigation={navigation} />
      </View>

      {/* ── Encabezado ── */}
      <View style={s.hero}>
        <View style={[s.heroContent, wide && s.heroContentWide]}>
          <Text style={[s.heroTitle, wide && s.heroTitleWide]}>
            Conectamos a Guatemala con quien sabe hacer el trabajo
          </Text>
          <Text style={[s.heroSub, wide && s.heroSubWide]}>
            ServiGT nació de una idea simple: encontrar un buen técnico no debería
            depender de la suerte ni de a quién conoces.
          </Text>
        </View>
      </View>

      {/* ── El problema ── */}
      <View style={s.section}>
        <View style={[s.prosa, wide && s.prosaWide]}>
          <Text style={[s.sectionTitle, wide && s.sectionTitleWide]}>Por qué existimos</Text>
          <Text style={s.parrafo}>
            Contratar un servicio en Guatemala suele empezar con una pregunta en un grupo
            de vecinos o una recomendación de segunda mano. El cliente no sabe si el precio
            es justo ni si el trabajo va a quedar bien. Del otro lado, hay técnicos
            excelentes cuya única forma de conseguir clientes es el boca a boca.
          </Text>
          <Text style={s.parrafo}>
            ServiGT existe para cerrar esa brecha: un lugar donde el cliente describe lo
            que necesita y recibe propuestas de proveedores verificados, y donde el buen
            trabajo se traduce en reputación medible.
          </Text>
        </View>
      </View>

      {/* ── Mision y vision ── */}
      <View style={[s.section, s.sectionAlt]}>
        <View style={[s.mvGrid, wide && s.mvGridWide]}>
          <View style={[s.mvCard, wide && s.mvCardWide]}>
            <Text style={s.mvEtiqueta}>Misión</Text>
            <Text style={s.mvTexto}>
              Facilitar el acceso a servicios profesionales confiables en todo el país,
              con precios transparentes y proveedores verificados.
            </Text>
          </View>
          <View style={[s.mvCard, wide && s.mvCardWide]}>
            <Text style={s.mvEtiqueta}>Visión</Text>
            <Text style={s.mvTexto}>
              Ser la plataforma de referencia en Guatemala para contratar servicios,
              y una fuente real de ingresos para miles de profesionales independientes.
            </Text>
          </View>
        </View>
      </View>

      {/* ── Valores ── */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, wide && s.sectionTitleWide]}>En qué creemos</Text>
        <Text style={s.sectionSub}>
          Los principios que guían cómo construimos la plataforma.
        </Text>
        <View style={[s.valorGrid, wide && s.valorGridWide]}>
          {VALORES.map((v) => <ValorCard key={v.titulo} {...v} wide={wide} />)}
        </View>
      </View>

      {/* ── CTA ── */}
      <View style={s.cta}>
        <Text style={[s.ctaTitle, wide && { fontSize: 34 }]}>¿Quieres ser parte?</Text>
        <Text style={s.ctaSub}>
          Regístrate como cliente para contratar, o como proveedor para ofrecer tus servicios.
        </Text>
        <View style={[s.ctaBtns, !wide && s.ctaBtnsMobile]}>
          <ScaleBtn
            label="Crear Cuenta Gratis"
            onPress={onRegister}
            style={[s.btnAccent, !wide && { width: '100%' }]}
            textStyle={s.btnAccentText}
          />
          <ScaleBtn
            label="Ver servicios"
            onPress={onServicios}
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
  heroContentWide: { maxWidth: 760 },
  heroTitle: {
    fontSize: 30, fontWeight: '800', color: C.paper,
    textAlign: 'center', marginBottom: 14, lineHeight: 40, letterSpacing: -0.5,
  },
  heroTitleWide: { fontSize: 44, lineHeight: 54 },
  heroSub: {
    fontSize: 16, color: 'rgba(246,244,238,0.75)',
    textAlign: 'center', lineHeight: 26,
  },
  heroSubWide: { fontSize: 18, lineHeight: 29, maxWidth: 600 },

  section: { paddingVertical: 64, paddingHorizontal: 24, alignItems: 'center', backgroundColor: C.canvas },
  sectionAlt: { backgroundColor: C.paper },
  sectionTitle: {
    fontSize: 26, fontWeight: '800', color: C.ink,
    marginBottom: 10, letterSpacing: -0.3, textAlign: 'center',
  },
  sectionTitleWide: { fontSize: 32 },
  sectionSub: {
    fontSize: 15, color: C.muted, textAlign: 'center',
    marginBottom: 44, maxWidth: 520, lineHeight: 24,
  },

  prosa: { width: '100%', maxWidth: 620 },
  prosaWide: { maxWidth: 720 },
  parrafo: { fontSize: 16, color: C.muted, lineHeight: 28, marginBottom: 18 },

  mvGrid: { width: '100%', maxWidth: 1040, gap: 20 },
  mvGridWide: { flexDirection: 'row', alignItems: 'stretch' },
  mvCard: {
    backgroundColor: C.canvas,
    borderRadius: 14,
    padding: 32,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 4,
    borderLeftColor: C.blue,
  },
  mvCardWide: { flex: 1, marginHorizontal: 8 },
  mvEtiqueta: {
    fontSize: 12, fontWeight: '800', color: C.blue,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12,
  },
  mvTexto: { fontSize: 16, color: C.ink, lineHeight: 27 },

  valorGrid: { width: '100%', maxWidth: 1040, gap: 18 },
  valorGridWide: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  valorCard: {
    flexDirection: 'row',
    backgroundColor: C.paper,
    borderRadius: 14,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.ink,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  valorCardWide: { width: 480, marginHorizontal: 9, marginBottom: 18 },
  valorIconWrap: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: C.soft,
    justifyContent: 'center', alignItems: 'center',
  },
  valorIcon: { fontSize: 22 },
  valorTexto: { flex: 1 },
  valorTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 6 },
  valorDesc: { fontSize: 14, color: C.muted, lineHeight: 22 },

  cta: { backgroundColor: '#e8e6df', paddingVertical: 64, paddingHorizontal: 24, alignItems: 'center' },
  ctaTitle: { fontSize: 28, fontWeight: '800', color: C.ink, textAlign: 'center', marginBottom: 12, letterSpacing: -0.3 },
  ctaSub: { fontSize: 16, color: C.muted, textAlign: 'center', marginBottom: 36, lineHeight: 26, maxWidth: 460 },
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
