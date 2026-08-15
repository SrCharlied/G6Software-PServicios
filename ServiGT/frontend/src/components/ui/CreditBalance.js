import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { T } from '../../theme';

/**
 * Saldo real de creditos del proveedor.
 *
 * Distingue los tres casos que antes se veian iguales como "Saldo: 0":
 * cargando, error de API (con reintento visible) y saldo cero legitimo. Un
 * fallo de red nunca se dibuja como un cero.
 */
export default function CreditBalance({
  saldo,
  loading,
  error,
  onRetry,
  onPress,
  compact,
  actionLabel = 'Comprar créditos',
  style,
}) {
  const Wrapper = onPress && !loading && !error ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[styles.wrap, compact && styles.wrapCompact, style]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={styles.iconBox}>
        <Feather name="zap" size={compact ? 14 : 18} color={T.blue} />
      </View>

      <View style={styles.textBox}>
        <Text style={styles.label}>Saldo de créditos</Text>

        {loading ? (
          <View style={styles.row}>
            <ActivityIndicator size="small" color={T.blue} />
            <Text style={styles.loadingText}>Consultando…</Text>
          </View>
        ) : error ? (
          <View style={styles.row}>
            <Feather name="alert-triangle" size={13} color={T.danger} />
            <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
          </View>
        ) : typeof saldo === 'number' ? (
          <Text style={[styles.value, compact && styles.valueCompact]}>
            {saldo} {saldo === 1 ? 'crédito' : 'créditos'}
          </Text>
        ) : (
          // Sin saldo, sin error y sin carga: aun no se consulto. Un guion es
          // mas honesto que imprimir "null creditos" o inventar un cero.
          <Text style={[styles.value, compact && styles.valueCompact]}>—</Text>
        )}
      </View>

      {error && onRetry ? (
        <TouchableOpacity onPress={onRetry} style={styles.retry} accessibilityRole="button">
          <Feather name="refresh-cw" size={13} color={T.blue} />
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      ) : onPress && !loading && !error ? (
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{actionLabel}</Text>
          <Feather name="chevron-right" size={14} color={T.blue} />
        </View>
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: T.s3,
    padding: T.s4,
    borderRadius: T.rMd,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.white,
    ...T.sh1,
  },
  wrapCompact: { padding: T.s3 },
  iconBox: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  textBox: { flex: 1, minWidth: 0 },
  label:   { fontSize: 11, color: T.muted, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  value:   { fontSize: 20, fontWeight: '800', color: T.ink, marginTop: 2 },
  valueCompact: { fontSize: 16 },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  loadingText: { fontSize: 13, color: T.muted },
  errorText:   { flex: 1, fontSize: 12, color: T.danger, fontWeight: '600' },
  retry:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  retryText: { fontSize: 12, color: T.blue, fontWeight: '700' },
  cta:       { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ctaText:   { fontSize: 12, color: T.blue, fontWeight: '700' },
});
