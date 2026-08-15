import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../../theme';
import {
  Avatar,
  Button,
  Card,
  CreditBalance,
  ExpiryBar,
  KpiCard,
  PremiumBadge,
  Stars,
  VerifiedBadge,
} from '../../components/ui';
import { formatCurrency, getAvailabilityText, getGreeting, isAvailableNow } from './providerUtils';

/**
 * Cabecera del panel: saludo, disponibilidad, badges y accesos rapidos.
 * En desktop la cabecera y los accesos comparten fila; a 390px se apilan.
 */
function DashboardHeader({ profile, disponibilidad, premium, verificado, onEditarPerfil, onCreditos }) {
  const disponible = isAvailableNow(disponibilidad);

  return (
    <LinearGradient
      colors={['#1b5499', '#2d6cb8', '#4589d4']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.header}
    >
      <View style={s.headerTop}>
        <Avatar uri={profile?.foto_perfil} name={profile?.nombre} size={46} online={disponible} />
        <View style={s.headerTextBox}>
          <Text style={s.headerGreet}>{getGreeting()}</Text>
          <Text style={s.headerTitle} numberOfLines={1}>{profile?.nombre || 'Mi panel'}</Text>
        </View>
      </View>

      <View style={s.headerBadges}>
        <View style={[s.statusPill, !disponible && s.statusPillOff]}>
          <View style={[s.statusDot, !disponible && s.statusDotOff]} />
          <Text style={s.statusText}>{getAvailabilityText(disponibilidad)}</Text>
        </View>
        <PremiumBadge
          estado={premium?.estado ?? 'nunca'}
          diasRestantes={premium?.dias_restantes}
          size="sm"
        />
        <VerifiedBadge verificado={Boolean(verificado)} size="sm" />
      </View>

      <View style={s.headerActions}>
        <Button kind="secondary" size="sm" icon="edit-2" onPress={onEditarPerfil}>
          Editar perfil
        </Button>
        <Button kind="secondary" size="sm" icon="zap" onPress={onCreditos}>
          Créditos
        </Button>
      </View>
    </LinearGradient>
  );
}

/**
 * Panel superior del dashboard del proveedor: KPIs, saldo real, estado
 * Premium y resumen del perfil publico. Reune en un solo lugar lo que antes
 * estaba disperso entre la cabecera, las tarjetas de resumen y el perfil.
 */
export default function ProviderOverview({
  profile,
  disponibilidad,
  pendientes,
  activos,
  resenas,
  calificacion,
  saldo,
  saldoLoading,
  saldoError,
  onReintentarSaldo,
  premium,
  premiumLoading,
  verificado,
  desktop,
  onEditarPerfil,
  onCreditos,
  onVerPerfilPublico,
}) {
  const estadoPremium = premium?.estado ?? 'nunca';

  return (
    <View style={s.wrap}>
      <DashboardHeader
        profile={profile}
        disponibilidad={disponibilidad}
        premium={premium}
        verificado={verificado}
        onEditarPerfil={onEditarPerfil}
        onCreditos={onCreditos}
      />

      <View style={s.kpiRow}>
        <KpiCard label="Pendientes" value={pendientes} hint="Solicitudes por responder" icon="inbox" color={T.warn} />
        <KpiCard label="Activos"    value={activos}    hint="Trabajos en curso"          icon="activity" />
        <KpiCard label="Reseñas"    value={resenas}    hint={`${Number(calificacion || 0).toFixed(1)} de promedio`} icon="star" color={T.amber} />
      </View>

      <View style={[s.dosColumnas, desktop && s.dosColumnasDesktop]}>
        <View style={[s.col, desktop && s.colFlex]}>
          <CreditBalance
            saldo={saldo}
            loading={saldoLoading}
            error={saldoError}
            onRetry={onReintentarSaldo}
            onPress={onCreditos}
          />

          <Card style={s.premiumCard}>
            <View style={s.premiumHead}>
              <Text style={s.cardTitle}>Premium</Text>
              <PremiumBadge
                estado={estadoPremium}
                diasRestantes={premium?.dias_restantes}
                mostrarInactivo
              />
            </View>

            {premiumLoading ? (
              <Text style={s.cardText}>Consultando tu estado Premium…</Text>
            ) : estadoPremium === 'activo' ? (
              <>
                <Text style={s.cardText}>
                  Ciclo vigente. Renovaciones acumuladas: {premium.renovaciones}.
                </Text>
                <ExpiryBar
                  fecha={premium.vence_at}
                  totalDias={premium.dias_vigencia ?? 30}
                  label="Vigencia Premium"
                  vencidoLabel="Ciclo vencido"
                />
              </>
            ) : estadoPremium === 'vencido' ? (
              <Text style={s.cardText}>
                Tu ciclo Premium venció. Renuévalo desde Créditos para recuperar el badge,
                la visibilidad y los 10 créditos mensuales.
              </Text>
            ) : (
              <Text style={s.cardText}>
                Q{premium?.precio_gtq ?? 115} al mes: badge, impulso de visibilidad y
                {' '}{premium?.creditos_por_ciclo ?? 10} créditos incluidos por ciclo.
              </Text>
            )}

            <Button kind="ghost" size="sm" icon="award" onPress={onCreditos}>
              {estadoPremium === 'activo' ? 'Ver mi Premium' : 'Conocer Premium'}
            </Button>
          </Card>
        </View>

        <View style={[s.col, desktop && s.colFlex]}>
          <Card style={s.perfilCard}>
            <View style={s.perfilHead}>
              <Text style={s.cardTitle}>Perfil público</Text>
              <Button kind="ghost" size="sm" iconRight="external-link" onPress={onVerPerfilPublico}>
                Ver como cliente
              </Button>
            </View>

            {/* Superficie de portada: hoy es un degradado con la inicial y queda
                lista para recibir la imagen personalizada de Premium. */}
            <LinearGradient
              colors={estadoPremium === 'activo' ? ['#fcd34d', '#f59e0b'] : [T.soft, T.blue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.portada}
            >
              <Text style={s.portadaTexto}>
                {estadoPremium === 'activo' ? 'Portada Premium' : 'Portada estándar'}
              </Text>
            </LinearGradient>

            <View style={s.perfilInfo}>
              <Text style={s.perfilNombre} numberOfLines={1}>{profile?.nombre}</Text>
              <View style={s.perfilRating}>
                <Stars value={Number(calificacion || 0)} size={13} />
                <Text style={s.perfilRatingText}>
                  {Number(calificacion || 0).toFixed(1)} · {resenas} reseña(s)
                </Text>
              </View>
            </View>

            {profile?.descripcion ? (
              <Text style={s.perfilDesc} numberOfLines={3}>{profile.descripcion}</Text>
            ) : null}

            <View style={s.chipsWrap}>
              <Text style={s.chip}>{profile?.categoria?.nombre || 'Sin categoría'}</Text>
              <Text style={s.chip}>{profile?.departamento || 'Sin departamento'}</Text>
              {profile?.tarifa_hora ? (
                <Text style={s.chip}>Hora: {formatCurrency(profile.tarifa_hora)}</Text>
              ) : null}
              {profile?.tarifa_proyecto ? (
                <Text style={s.chip}>Proyecto: {formatCurrency(profile.tarifa_proyecto)}</Text>
              ) : null}
              {profile?.nivel ? <Text style={s.chip}>Nivel: {profile.nivel}</Text> : null}
            </View>

            {estadoPremium !== 'activo' ? (
              <View style={s.hintRow}>
                <Feather name="info" size={13} color={T.muted} />
                <Text style={s.hintText}>
                  Con Premium este perfil muestra badge, portada destacada y personalización.
                </Text>
              </View>
            ) : null}
          </Card>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: T.s4 },

  header: {
    borderRadius: T.rLg,
    paddingHorizontal: T.s5,
    paddingVertical: T.s5,
    gap: T.s3,
    overflow: 'hidden',
    ...T.sh1,
  },
  headerTop:     { flexDirection: 'row', alignItems: 'center', gap: T.s3 },
  headerTextBox: { flex: 1, minWidth: 0 },
  headerGreet:   { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.78)' },
  headerTitle:   { marginTop: 2, fontSize: 22, fontWeight: '800', color: T.white, letterSpacing: -0.4 },
  headerBadges:  { flexDirection: 'row', alignItems: 'center', gap: T.s2, flexWrap: 'wrap' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
  },
  statusPillOff: { backgroundColor: 'rgba(255,255,255,0.12)' },
  statusDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22d3a8' },
  statusDotOff:  { backgroundColor: '#fda4af' },
  statusText:    { fontSize: 12, fontWeight: '600', color: T.white },
  headerActions: { flexDirection: 'row', gap: T.s2, flexWrap: 'wrap' },

  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s3 },

  dosColumnas:        { gap: T.s4 },
  dosColumnasDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  col:      { gap: T.s4, minWidth: 0 },
  colFlex:  { flex: 1 },

  cardTitle: { fontSize: 15, fontWeight: '800', color: T.ink },
  cardText:  { fontSize: 13, color: T.muted, lineHeight: 20 },

  premiumCard: { gap: T.s3 },
  premiumHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: T.s2 },

  perfilCard: { gap: T.s3 },
  perfilHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: T.s2 },
  portada: {
    height: 72,
    borderRadius: T.rSm,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    padding: T.s3,
  },
  portadaTexto: { fontSize: 11, fontWeight: '800', color: T.white, letterSpacing: 0.4 },
  perfilInfo:   { gap: 4 },
  perfilNombre: { fontSize: 16, fontWeight: '800', color: T.ink },
  perfilRating: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  perfilRatingText: { fontSize: 12, color: T.muted, fontWeight: '600' },
  perfilDesc:   { fontSize: 13, color: T.text, lineHeight: 19, opacity: 0.85 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: 'rgba(69,137,212,0.10)', color: T.deep,
    fontSize: 12, fontWeight: '600',
    paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: 999, overflow: 'hidden',
  },

  hintRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  hintText: { flex: 1, fontSize: 11, color: T.muted, lineHeight: 16 },
});
