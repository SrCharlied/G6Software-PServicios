import { Platform } from 'react-native';

/**
 * Guarda un Blob como archivo descargado. Solo en web: en nativo no hay un
 * guardado de archivos soportado en este MVP y devuelve false para que quien
 * llama avise al usuario en lugar de simular una descarga.
 *
 * @returns {boolean} true si se disparo la descarga.
 */
export const guardarArchivo = (blob, nombre, { plataforma = Platform.OS } = {}) => {
  if (plataforma !== 'web' || typeof document === 'undefined') return false;

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  setTimeout(() => URL.revokeObjectURL(url), 0);

  return true;
};
