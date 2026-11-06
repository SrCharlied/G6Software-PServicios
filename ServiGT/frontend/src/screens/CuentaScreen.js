import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getImpactoEliminacion, solicitarEliminacionCuenta } from '../services/api';
import { Button, Card, Input, ScreenHeader } from '../components/ui';
import { T } from '../theme';

// HU 3.2: datos de la cuenta y eliminacion (anonimizacion) de la propia
// cuenta. Contrato del backend: docs/sprint10/eliminacion-api.md.
//
// La sesion local NO se toca aqui: solo tras un 200 se llama a
// `onAccountDeleted`, y la ruta limpia token/usuario/chat y navega.

export const PALABRA_CONFIRMACION = 'ELIMINAR';

const ROLE_LABEL = { cliente: 'Cliente', proveedor: 'Proveedor' };

const nuevaClave = (userId) =>
  `eliminar-${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Un error sin respuesta (red, timeout) o un 5xx deja el resultado en duda:
// se reintenta con la misma clave para que el backend no lo procese dos veces.
const resultadoIncierto = (error) => !error?.status || error.status >= 500;

function resumenCierre(seCerrara) {
  const partes = [];
  const pedidos = seCerrara?.pedidos_abiertos ?? 0;
  const cotizaciones = seCerrara?.cotizaciones_enviadas ?? 0;
  if (pedidos > 0) {
    partes.push(`Se cerrará${pedidos === 1 ? '' : 'n'} ${pedidos} pedido${pedidos === 1 ? '' : 's'} abierto${pedidos === 1 ? '' : 's'} y se rechazarán sus cotizaciones pendientes.`);
  }
  if (cotizaciones > 0) {
    partes.push(`Se retirará${cotizaciones === 1 ? '' : 'n'} ${cotizaciones} cotización${cotizaciones === 1 ? '' : 'es'} que enviaste y siguen pendientes. Los créditos gastados no se devuelven.`);
  }
  return partes;
}

export default function CuentaScreen({ user, onAccountDeleted }) {
  const [impacto, setImpacto] = useState(null);
  const [cargandoImpacto, setCargandoImpacto] = useState(true);
  const [errorImpacto, setErrorImpacto] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const bloqueoEnvio = useRef(false);
  const claveIntento = useRef(null);

  const cargarImpacto = useCallback(async () => {
    setCargandoImpacto(true);
    setErrorImpacto('');
    try {
      const data = await getImpactoEliminacion();
      setImpacto({
        puede_eliminar: Boolean(data?.puede_eliminar),
        bloqueos: Array.isArray(data?.bloqueos) ? data.bloqueos : [],
        se_cerrara: data?.se_cerrara ?? {},
      });
    } catch (error) {
      setImpacto(null);
      setErrorImpacto(error.message);
    } finally {
      setCargandoImpacto(false);
    }
  }, []);

  useEffect(() => { cargarImpacto(); }, [cargarImpacto]);

  const confirmacionValida = confirmacion.trim() === PALABRA_CONFIRMACION;
  const puedeEnviar = Boolean(impacto?.puede_eliminar) && password.length > 0 && confirmacionValida && !enviando;

  const handleEliminar = async () => {
    if (bloqueoEnvio.current || !puedeEnviar) return;
    bloqueoEnvio.current = true;
    setEnviando(true);
    setErrores({});
    setErrorGeneral('');
    if (!claveIntento.current) claveIntento.current = nuevaClave(user?.id);

    try {
      const data = await solicitarEliminacionCuenta({
        password,
        confirmacion: confirmacion.trim(),
        idempotencyKey: claveIntento.current,
      });
      claveIntento.current = null;
      setPassword('');
      await onAccountDeleted?.(data);
      return;
    } catch (error) {
      if (!resultadoIncierto(error)) claveIntento.current = null;

      if (error.status === 409) {
        const bloqueos = Array.isArray(error.data?.bloqueos) ? error.data.bloqueos : [];
        setImpacto((prev) => ({ ...(prev ?? {}), puede_eliminar: false, bloqueos }));
        setErrorGeneral(error.message);
      } else if (error.status === 422 && error.data?.errors) {
        const campos = error.data.errors;
        const primero = (v) => (Array.isArray(v) ? v[0] : v);
        setErrores({
          password: campos.password ? primero(campos.password) : null,
          confirmacion: campos.confirmacion ? primero(campos.confirmacion) : null,
        });
        if (!campos.password && !campos.confirmacion) setErrorGeneral(error.message);
      } else if (error.status === 429) {
        const espera = error.retryAfter ? ` Intenta de nuevo en ${error.retryAfter} segundos.` : ' Espera un momento antes de reintentar.';
        setErrorGeneral(`Demasiados intentos.${espera}`);
      } else if (error.status !== 401) {
        // 401: el manejador global ya cerro la sesion local.
        setErrorGeneral(error.message);
      }
    }
    bloqueoEnvio.current = false;
    setEnviando(false);
  };

  const cierre = resumenCierre(impacto?.se_cerrara);

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      <View style={s.inner}>
        <ScreenHeader title="Mi cuenta" subtitle="Datos y eliminación" />

        <Card style={s.card}>
          <Text style={s.cardTitle}>Datos de la cuenta</Text>
          <View style={s.dato}><Text style={s.datoLabel}>Nombre</Text><Text style={s.datoValor}>{user?.name}</Text></View>
          <View style={s.dato}><Text style={s.datoLabel}>Correo</Text><Text style={s.datoValor}>{user?.email}</Text></View>
          <View style={s.dato}><Text style={s.datoLabel}>Rol</Text><Text style={s.datoValor}>{ROLE_LABEL[user?.role] ?? user?.role}</Text></View>
        </Card>

        <Card style={[s.card, s.cardPeligro]}>
          <Text style={s.cardTitle}>Eliminar cuenta</Text>
          <Text style={s.texto}>
            Se borran tus datos personales (nombre, correo, teléfono, fotos y perfil público) y se
            cierran todas tus sesiones en todos los dispositivos. Tu historial de servicios, pagos,
            calificaciones y mensajes se conserva sin tus datos. Esta acción no se puede deshacer.
          </Text>

          {cargandoImpacto ? (
            <View style={s.estado}>
              <ActivityIndicator color={T.blue} />
              <Text style={s.textoSuave}>Revisando si tienes operaciones pendientes…</Text>
            </View>
          ) : errorImpacto ? (
            <View style={s.estado}>
              <Text style={s.error}>{errorImpacto}</Text>
              <Button kind="secondary" onPress={cargarImpacto}>Reintentar</Button>
            </View>
          ) : impacto?.bloqueos?.length > 0 ? (
            <View style={s.bloqueos} accessibilityRole="alert">
              <Text style={s.bloqueosTitulo}>Antes de eliminar tu cuenta debes resolver:</Text>
              {impacto.bloqueos.map((b) => (
                <Text key={b.codigo} style={s.bloqueo}>
                  • {b.mensaje}{b.cantidad > 1 ? ` (${b.cantidad})` : ''}
                </Text>
              ))}
              <Button kind="secondary" onPress={cargarImpacto} style={s.revisar}>Volver a revisar</Button>
            </View>
          ) : cierre.length > 0 ? (
            <View style={s.aviso}>
              {cierre.map((linea) => <Text key={linea} style={s.texto}>{linea}</Text>)}
            </View>
          ) : null}

          {!cargandoImpacto && impacto?.puede_eliminar ? (
            <View style={s.form}>
              <Text style={s.label}>Contraseña actual</Text>
              <Input
                value={password}
                onChangeText={(v) => { setPassword(v); setErrores((e) => ({ ...e, password: null })); }}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                placeholder="Tu contraseña"
                accessibilityLabel="Contraseña actual"
                editable={!enviando}
                error={errores.password}
              />
              <Text style={s.label}>Escribe {PALABRA_CONFIRMACION} para confirmar</Text>
              <Input
                value={confirmacion}
                onChangeText={(v) => { setConfirmacion(v); setErrores((e) => ({ ...e, confirmacion: null })); }}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder={PALABRA_CONFIRMACION}
                accessibilityLabel="Confirmación"
                editable={!enviando}
                error={errores.confirmacion}
              />
            </View>
          ) : null}

          {errorGeneral ? <Text style={s.error} accessibilityRole="alert">{errorGeneral}</Text> : null}

          {!cargandoImpacto && impacto ? (
            <Button
              kind="danger"
              full
              loading={enviando}
              disabled={!puedeEnviar}
              onPress={handleEliminar}
              style={s.boton}
            >
              Eliminar mi cuenta
            </Button>
          ) : null}
        </Card>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.canvas },
  content: { padding: 16, paddingBottom: 40 },
  inner: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 16 },
  card: { padding: 18, gap: 10 },
  cardPeligro: { borderColor: T.danger, borderWidth: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: T.text },
  dato: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  datoLabel: { width: 80, fontSize: 13, color: T.muted },
  datoValor: { flexShrink: 1, fontSize: 13, color: T.text, fontWeight: '600' },
  texto: { fontSize: 13, color: T.text, lineHeight: 19 },
  textoSuave: { fontSize: 13, color: T.muted },
  estado: { gap: 8, alignItems: 'flex-start' },
  bloqueos: { gap: 6, padding: 12, borderRadius: T.rMd, backgroundColor: T.inputBg },
  bloqueosTitulo: { fontSize: 13, fontWeight: '700', color: T.warn },
  bloqueo: { fontSize: 13, color: T.text, lineHeight: 19 },
  revisar: { marginTop: 6, alignSelf: 'flex-start' },
  aviso: { gap: 4, padding: 12, borderRadius: T.rMd, backgroundColor: T.inputBg },
  form: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: T.text, marginTop: 4 },
  error: { fontSize: 13, color: T.danger },
  boton: { marginTop: 6 },
});
