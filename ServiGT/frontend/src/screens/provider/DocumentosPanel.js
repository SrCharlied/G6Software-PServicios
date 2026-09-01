import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from 'react-native';
import { T } from '../../theme';
import styles from './providerStyles';
import { StatusBadge } from './ProviderBadges';
import { TIPOS_DOCUMENTO } from './providerUtils';

/**
 * Carga y listado de documentos de identidad. La seleccion de archivo solo
 * existe en web; en nativo se explica en vez de mostrar un boton muerto.
 */
export default function DocumentosPanel({ documentos, loading, subiendo, onUpload, onDescargar }) {
  const [tipoDocumento, setTipoDocumento] = useState(TIPOS_DOCUMENTO[0]);
  const [showTipoSelector, setShowTipoSelector] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target?.files?.[0];
    if (file) onUpload(file, tipoDocumento);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Documentos de identidad</Text>
      <Text style={styles.cardSubtitle}>
        Sube documentos para validar tu identidad. Formatos: PDF, JPG, PNG.
      </Text>

      <TouchableOpacity style={styles.tipoSelector} onPress={() => setShowTipoSelector((p) => !p)}>
        <Text style={styles.tipoSelectorLabel}>Tipo:</Text>
        <Text style={styles.tipoSelectorValue} numberOfLines={1}>{tipoDocumento}</Text>
        <Text style={styles.tipoSelectorArrow}>{showTipoSelector ? '▴' : '▾'}</Text>
      </TouchableOpacity>

      {showTipoSelector ? (
        <View style={styles.tipoList}>
          {TIPOS_DOCUMENTO.map((tipo) => (
            <TouchableOpacity
              key={tipo}
              style={[styles.tipoOption, tipoDocumento === tipo && styles.tipoOptionActive]}
              onPress={() => { setTipoDocumento(tipo); setShowTipoSelector(false); }}
            >
              <Text style={[styles.tipoOptionText, tipoDocumento === tipo && styles.tipoOptionTextActive]}>
                {tipo}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {Platform.OS === 'web' ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => fileInputRef.current?.click()}
            disabled={subiendo}
          >
            {subiendo
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.uploadBtnText}>Subir documento</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.uploadInfo}>
          <Text style={styles.uploadInfoText}>
            La carga de archivos esta disponible en la version web.
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={T.blue} style={styles.sectionLoader} />
      ) : documentos.length === 0 ? (
        <Text style={styles.emptyInlineText}>Aun no has subido documentos.</Text>
      ) : (
        documentos.map((doc) => (
          <View key={doc.id} style={styles.documentRow}>
            <View style={styles.documentInfo}>
              <Text style={styles.documentType}>{doc.tipo_documento}</Text>
              <Text style={styles.documentName}>{doc.nombre_archivo}</Text>
            </View>
            {onDescargar ? (
              <TouchableOpacity onPress={() => onDescargar(doc)}>
                <Text style={styles.documentDownloadText}>Descargar</Text>
              </TouchableOpacity>
            ) : null}
            <StatusBadge estado={doc.estado_validacion} />
          </View>
        ))
      )}
    </View>
  );
}
