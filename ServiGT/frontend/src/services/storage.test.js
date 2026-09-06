/**
 * Task 3.4 — almacenamiento seguro por plataforma.
 *
 * Estas pruebas fuerzan `Platform.OS === 'web'` con un mock, asi que
 * verifican el camino de localStorage, la migracion y, sobre todo, que el
 * logout deje el dispositivo limpio. El camino nativo se cubre por inspeccion
 * del adapter: la seleccion de backend es un `Platform.OS === 'web'` y las dos
 * ramas comparten la misma interfaz.
 */

// `storage.js` solo usa `Platform` de react-native. Se fuerza a 'web' para
// ejercitar esa rama sin depender de en que plataforma corra jest-expo.
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
  getAllKeys: jest.fn(async () => []),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

// jest-expo corre en entorno node: no hay `window.localStorage`. Se instala un
// doble en memoria con la misma interfaz que usa el adapter.
const instalarLocalStorage = () => {
  const datos = new Map();

  const almacen = {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
    clear: () => datos.clear(),
    key: (i) => [...datos.keys()][i] ?? null,
    get length() { return datos.size; },
  };

  // `Object.keys(localStorage)` es lo que usa el adapter para enumerar, asi que
  // el doble expone las claves como propiedades propias enumerables.
  const proxy = new Proxy(almacen, {
    ownKeys: () => [...datos.keys()],
    getOwnPropertyDescriptor: (_, k) => (
      datos.has(k) ? { enumerable: true, configurable: true, value: datos.get(k) } : undefined
    ),
    has: (destino, k) => k in destino || datos.has(k),
  });

  global.window = global.window || {};
  global.window.localStorage = proxy;

  return proxy;
};

const cargarStorage = () => {
  let modulo;
  jest.isolateModules(() => {
    modulo = require('./storage');
  });
  return modulo;
};

describe('adapter de storage en web', () => {
  beforeEach(() => {
    instalarLocalStorage();
    jest.resetModules();
  });

  it('hidrata token y perfil a memoria antes de la primera lectura sincrona', async () => {
    window.localStorage.setItem('servigt_token', 'token-123');
    window.localStorage.setItem('servigt_user', '{"id":1}');

    const storage = cargarStorage();

    // Sin hidratar, la lectura sincrona no puede inventar nada.
    expect(storage.leer(storage.TOKEN_KEY)).toBeNull();

    await storage.hidratarStorage();

    expect(storage.leer(storage.TOKEN_KEY)).toBe('token-123');
    expect(storage.leer(storage.USER_KEY)).toBe('{"id":1}');
  });

  it('guarda en memoria y en el backend', async () => {
    const storage = cargarStorage();
    await storage.hidratarStorage();

    storage.guardar(storage.TOKEN_KEY, 'nuevo-token');

    expect(storage.leer(storage.TOKEN_KEY)).toBe('nuevo-token');
    expect(window.localStorage.getItem('servigt_token')).toBe('nuevo-token');
  });

  it('borra token y perfil de memoria y del backend', async () => {
    const storage = cargarStorage();
    await storage.hidratarStorage();
    storage.guardar(storage.TOKEN_KEY, 'token-123');

    storage.borrar(storage.TOKEN_KEY);

    expect(storage.leer(storage.TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem('servigt_token')).toBeNull();
  });

  it('el logout borra token, perfil y las conversaciones cacheadas', async () => {
    const storage = cargarStorage();

    window.localStorage.setItem('servigt_token', 'token-123');
    window.localStorage.setItem('servigt_user', '{"id":1}');
    window.localStorage.setItem('servigt_chat_params', '{"userId":9}');
    window.localStorage.setItem(storage.claveCacheChat(1, 9), '[{"contenido":"privado"}]');
    // Cache con el nombre viejo, de una version anterior de la app.
    window.localStorage.setItem('chat_1_9', '[{"contenido":"tambien privado"}]');
    // Algo que NO es privado y debe sobrevivir.
    window.localStorage.setItem('servigt_tema', 'claro');

    await storage.hidratarStorage();
    await storage.limpiarDatosPrivados();

    expect(window.localStorage.getItem('servigt_token')).toBeNull();
    expect(window.localStorage.getItem('servigt_user')).toBeNull();
    expect(window.localStorage.getItem('servigt_chat_params')).toBeNull();
    expect(window.localStorage.getItem(storage.claveCacheChat(1, 9))).toBeNull();
    expect(window.localStorage.getItem('chat_1_9')).toBeNull();

    expect(window.localStorage.getItem('servigt_tema')).toBe('claro');
    expect(storage.leer(storage.TOKEN_KEY)).toBeNull();
  });

  it('la cache de chat se lee y escribe por el mismo backend que se limpia', async () => {
    const storage = cargarStorage();
    const clave = storage.claveCacheChat(7, 12);

    await storage.guardarCacheChat(clave, '[]');

    expect(await storage.leerCacheChat(clave)).toBe('[]');
    expect(clave.startsWith(storage.CHAT_CACHE_PREFIX)).toBe(true);
  });

  it('no revienta si localStorage lanza (modo privado, cuota llena)', async () => {
    const original = window.localStorage.getItem;
    window.localStorage.getItem = () => { throw new Error('bloqueado'); };

    try {
      const storage = cargarStorage();
      await expect(storage.hidratarStorage()).resolves.toBeUndefined();
      expect(storage.leer(storage.TOKEN_KEY)).toBeNull();
    } finally {
      window.localStorage.getItem = original;
    }
  });
});
