import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { T } from '../../theme';
import { Button, Card, StatusChip } from '../../components/ui';
import { ESTADO_VARIANT, estadoLabel, TIPOS_DOCUMENTO } from './providerUtils';

/**
 * Carga y listado de documentos de identidad. La seleccion de archivo solo
 * existe en web: en nativo se explica en vez de mostrar un boton muerto.
 */
export default function DocumentosPanel({ documentos, loading, subiendo, onUpload }) {
  const [tipo, setTipo] = useState(TIPOS_DOCUMENTO[0]);
  const [abierto, setAbierto] = useState(false);
  const inputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target?.files?.[0];
    if (file) onUpload(file, tipo);
  };

  return (
    <Card style={s.card}>
      <Text style={s.title}>Documentos de identidad</Text>
      <Text style={s.subtitle}>
        Sube documentos para validar tu identidad. Formatos: PDF, JPG, PNG.
      </Text>

      <TouchableOpacity style={s.selector} onPress={() => setAbierto((p) => !p)}>
        <Text style={s.selectorLabel}>Tipo:</Text>
        <Text style={s.selectorValue} numberOfLines={1}>{tipo}</Text>
        <Text style={s.selectorArrow}>{abierto ? '▴' : '▾'}</Text>
      </TouchableOpacity>

      {abierto ? (
        <View style={s.lista}>
          {TIPOS_DOCUMENTO.map((opcion) => (
            <TouchableOpacity
              key={opcion}
              style={[s.opcion, tipo === opcion && s.opcionActiva]}
              onPress={() => { setTipo(opcion); setAbierto(false); }}
            >
              <Text style={[s.opcionTexto, tipo === opcion && s.opcionTextoActivo]}>{opcion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {Platform.OS === 'web' ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <Button
            kind="primary"
            icon="upload"
            loading={subiendo}
            onPress={() => inputRef.current?.click()}
          >
            Subir documento
          </Button>
        </>
      ) : (
        <View style={s.aviso}>
          <Text style={s.avisoTexto}>La carga de archivos está disponible en la versión web.</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={T.blue} style={s.loader} />
      ) : documentos.length === 0 ? (
        <Text style={s.vacio}>Aún no has subido documentos.</Text>
      ) : (
        documentos.map((doc) => (
          <View key={doc.id} style={s.fila}>
            <View style={s.filaInfo}>
              <Text style={s.filaTipo}>{doc.tipo_documento}</Text>
              <Text style={s.filaNombre} numberOfLines={1}>{doc.nombre_archivo}</Text>
            </View>
            <StatusChip
              variant={ESTADO_VARIANT[doc.estado_validacion] ?? 'neutral'}
              label={estadoLabel(doc.estado_validacion)}
              size="sm"
            />
          </View>
        ))
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  card:     { gap: T.s3 },
  title:    { fontSize: 15, fontWeight: '800', color: T.ink },
  subtitle: { fontSize: 13, color: T.muted, lineHeight: 19, marginTop: -6 },

  selector: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.paper, borderWidth: 1, borderColor: T.inputBorder,
    borderRadius: T.rSm, paddingHorizontal: 13, paddingVertical: 11,
  },
  selectorLabel: { fontSize: 13, fontWeight: '600', color: T.muted },
  selectorValue: { flex: 1, fontSize: 13, color: T.text },
  selectorArrow: { fontSize: 12, color: T.faint },

  lista:  { backgroundColor: T.white, borderWidth: 1, borderColor: T.inputBorder, borderRadius: T.rSm, overflow: 'hidden' },
  opcion: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.paper },
  opcionActiva: { backgroundColor: 'rgba(69,137,212,0.08)' },
  opcionTexto:  { fontSize: 13, color: T.text },
  opcionTextoActivo: { color: T.deep, fontWeight: '600' },

  aviso:      { borderWidth: 1, borderColor: T.inputBorder, borderRadius: T.rSm, padding: 12, backgroundColor: T.paper },
  avisoTexto: { color: T.muted, fontSize: 13 },

  loader: { marginVertical: 12 },
  vacio:  { fontSize: 13, color: T.faint, textAlign: 'center', paddingVertical: 12 },

  fila:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.paper },
  filaInfo:   { flex: 1, minWidth: 0 },
  filaTipo:   { fontSize: 12, fontWeight: '700', color: T.ink, marginBottom: 3 },
  filaNombre: { fontSize: 13, color: T.muted },
});
