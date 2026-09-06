import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Almacenamiento de sesion por plataforma (task 3.4).
 *
 * POR QUE EXISTE ESTE ARCHIVO
 * ---------------------------
 * `api.js` guardaba token y perfil en `window.localStorage` directamente. En
 * web eso funciona; en Android/iOS `window` no existe, asi que cada `get`
 * caia al `catch` y devolvia `null`: la app nativa simplemente no recordaba la
 * sesion, y el bug quedaba invisible porque el error estaba silenciado.
 *
 * QUE HACE CADA PLATAFORMA
 * ------------------------
 * - Nativo: el token va a `expo-secure-store` (Keychain en iOS, EncryptedSharedPreferences
 *   en Android) y el resto a `AsyncStorage`. No se toca `localStorage`.
 * - Web: todo va a `localStorage`, que es lo unico disponible sin cambiar el
 *   backend a cookies `httpOnly`.
 *
 * RIESGO RESIDUAL EN WEB — documentado a proposito
 * ------------------------------------------------
 * En web el bearer sigue siendo legible por cualquier script del mismo origen,
 * asi que un XSS puede robarlo. Cerrarlo de verdad exige mover la sesion a una
 * cookie `httpOnly` + CSRF, que cambia Sanctum, CORS y todo el cliente: es un
 * cambio de alcance propio, no parte de esta task. Lo que si se hace aqui es
 * reducir la ventana (limpieza completa al cerrar sesion) y, en la task 4.2,
 * poner CSP para que sea mas dificil inyectar ese script.
 *
 * POR QUE HAY UNA CACHE EN MEMORIA
 * --------------------------------
 * `SecureStore` y `AsyncStorage` son asincronos, pero el interceptor de request
 * de axios es sincrono y necesita el token en el momento. La cache se hidrata
 * una vez al arrancar (`hidratarStorage()`, que `SessionContext` espera antes
 * de renderizar) y a partir de ahi las lecturas son sincronas. Las escrituras
 * actualizan la memoria de inmediato y persisten en segundo plano.
 */

export const TOKEN_KEY = 'servigt_token';
export const USER_KEY = 'servigt_user';

// Claves privadas que deben desaparecer al cerrar sesion. El chat y los
// parametros de navegacion guardan nombres y mensajes de terceros: dejarlos en
// el dispositivo despues del logout expone conversaciones al siguiente usuario.
export const CHAT_CACHE_PREFIX = 'servigt_chat_';
// Prefijo que usaba el chat antes de esta task. Se sigue barriendo para que el
// logout tambien limpie las conversaciones que quedaron de la version anterior.
const CHAT_CACHE_PREFIX_LEGADO = 'chat_';
const CLAVES_PRIVADAS = [TOKEN_KEY, USER_KEY, 'servigt_provider_profile', 'servigt_chat_params'];

// SecureStore solo acepta [A-Za-z0-9._-] en el nombre de la clave.
const SECURE_TOKEN_KEY = 'servigt_token';

const esWeb = Platform.OS === 'web';

const memoria = new Map();
let hidratado = false;

// ── Backends ───────────────────────────────────────────────────────────────

const backendWeb = {
  async get(clave) {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(clave) : null;
    } catch {
      return null;
    }
  },
  async set(clave, valor) {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(clave, valor);
    } catch { /* modo privado o cuota llena: la sesion vive solo en memoria */ }
  },
  async remove(clave) {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(clave);
    } catch { /* ignorar */ }
  },
  async keys() {
    try {
      if (typeof window === 'undefined') return [];
      return Object.keys(window.localStorage);
    } catch {
      return [];
    }
  },
};

const backendNativo = {
  async get(clave) {
    try {
      if (clave === TOKEN_KEY) return await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
      return await AsyncStorage.getItem(clave);
    } catch {
      return null;
    }
  },
  async set(clave, valor) {
    try {
      if (clave === TOKEN_KEY) {
        await SecureStore.setItemAsync(SECURE_TOKEN_KEY, valor);
        return;
      }
      await AsyncStorage.setItem(clave, valor);
    } catch { /* ignorar: la sesion sigue viva en memoria hasta cerrar la app */ }
  },
  async remove(clave) {
    try {
      if (clave === TOKEN_KEY) {
        await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
        return;
      }
      await AsyncStorage.removeItem(clave);
    } catch { /* ignorar */ }
  },
  async keys() {
    try {
      return await AsyncStorage.getAllKeys();
    } catch {
      return [];
    }
  },
};

const backend = esWeb ? backendWeb : backendNativo;

// ── Migracion del token legado ─────────────────────────────────────────────

/**
 * Antes de esta task el token vivia en `AsyncStorage` (o en ningun lado, en
 * nativo). Si aparece ahi, se mueve a SecureStore y se borra el original: sin
 * esto, quien ya tenia sesion iniciada quedaria deslogueado al actualizar, y
 * el token viejo se quedaria en claro en el dispositivo para siempre.
 */
const migrarTokenLegado = async () => {
  if (esWeb) return null;

  try {
    const legado = await AsyncStorage.getItem(TOKEN_KEY);
    if (!legado) return null;

    await SecureStore.setItemAsync(SECURE_TOKEN_KEY, legado);
    await AsyncStorage.removeItem(TOKEN_KEY);
    return legado;
  } catch {
    return null;
  }
};

// ── API publica ────────────────────────────────────────────────────────────

/**
 * Carga token y perfil a memoria. Idempotente: llamarla dos veces no repite
 * trabajo ni pierde escrituras hechas entre medio.
 */
export const hidratarStorage = async () => {
  if (hidratado) return;

  const migrado = await migrarTokenLegado();

  const [token, user] = await Promise.all([
    migrado ? Promise.resolve(migrado) : backend.get(TOKEN_KEY),
    backend.get(USER_KEY),
  ]);

  if (token != null) memoria.set(TOKEN_KEY, token);
  if (user != null) memoria.set(USER_KEY, user);

  hidratado = true;
};

/** Lectura sincrona desde memoria. Requiere `hidratarStorage()` previo. */
export const leer = (clave) => (memoria.has(clave) ? memoria.get(clave) : null);

export const guardar = (clave, valor) => {
  memoria.set(clave, valor);
  // No se espera a propósito: la memoria ya quedo consistente y bloquear aqui
  // congelaria la UI en cada escritura.
  void backend.set(clave, valor);
};

export const borrar = (clave) => {
  memoria.delete(clave);
  void backend.remove(clave);
};

/**
 * Borra todo lo privado: token, perfil, parametros de navegacion y la cache de
 * conversaciones. Se ejecuta aunque el `POST /logout` falle por red, porque el
 * objetivo es que el dispositivo quede limpio incluso sin conexion.
 */
export const limpiarDatosPrivados = async () => {
  memoria.clear();

  const claves = await backend.keys();
  const aBorrar = new Set(CLAVES_PRIVADAS);

  for (const clave of claves) {
    if (typeof clave !== 'string') continue;

    if (clave.startsWith(CHAT_CACHE_PREFIX) || clave.startsWith(CHAT_CACHE_PREFIX_LEGADO)) {
      aBorrar.add(clave);
    }
  }

  await Promise.all([...aBorrar].map((clave) => backend.remove(clave)));
};

// ── Cache de conversaciones ────────────────────────────────────────────────
//
// El chat guarda los mensajes ya descargados para que la pantalla abra sin
// esperar a la red. No pasa por la cache en memoria a proposito: son cientos
// de mensajes y solo se leen al entrar a una conversacion. Lo que si importa es
// que use el mismo backend por plataforma, para que `limpiarDatosPrivados()`
// los encuentre y los borre en web y en nativo por igual.

export const claveCacheChat = (usuarioId, otroUsuarioId) =>
  `${CHAT_CACHE_PREFIX}${usuarioId}_${otroUsuarioId}`;

export const leerCacheChat = async (clave) => backend.get(clave);

export const guardarCacheChat = async (clave, valor) => backend.set(clave, valor);

/** Solo para pruebas: devuelve el estado de hidratacion al valor inicial. */
export const _reiniciarStoragePorPruebas = () => {
  memoria.clear();
  hidratado = false;
};
