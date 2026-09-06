/**
 * Task 3.3 — sesion, 401/403/429 y ausencia de fallbacks silenciosos.
 *
 * Se ejercita el interceptor real de `api.js` sustituyendo unicamente el
 * adapter de axios: asi la prueba pasa por el mismo codigo que corre en la app
 * (interceptor de request, interceptor de respuesta, conversion a `ApiError`)
 * y no por una imitacion.
 */

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

// El adapter devuelve lo que la prueba programe para cada ruta y registra las
// solicitudes que salieron, incluidas sus cabeceras.
let mockRespuestas;
let mockSolicitudes;

jest.mock('axios', () => {
  const real = jest.requireActual('axios');

  return {
    __esModule: true,
    ...real,
    default: {
      ...real.default,
      create: (config) => real.default.create({
        ...config,
        adapter: (solicitud) => {
          mockSolicitudes.push(solicitud);

          const clave = `${(solicitud.method || 'get').toUpperCase()} ${solicitud.url}`;
          const programada = mockRespuestas[clave] || mockRespuestas[solicitud.url];

          if (!programada) {
            return Promise.resolve({
              status: 200, data: { ok: true }, headers: {}, config: solicitud,
            });
          }

          const respuesta = {
            status: programada.status,
            data: programada.data ?? {},
            headers: programada.headers ?? {},
            config: solicitud,
          };

          if (programada.status >= 400) {
            const error = new Error('request failed');
            error.response = respuesta;
            error.config = solicitud;
            return Promise.reject(error);
          }

          return Promise.resolve(respuesta);
        },
      }),
    },
  };
});

const instalarLocalStorage = () => {
  const datos = new Map();
  const almacen = {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
    clear: () => datos.clear(),
    get length() { return datos.size; },
  };
  const proxy = new Proxy(almacen, {
    ownKeys: () => [...datos.keys()],
    getOwnPropertyDescriptor: (_, k) => (
      datos.has(k) ? { enumerable: true, configurable: true, value: datos.get(k) } : undefined
    ),
    has: (destino, k) => k in destino || datos.has(k),
  });

  global.window = global.window || {};
  global.window.localStorage = proxy;
};

const cargarApi = () => {
  let modulo;
  jest.isolateModules(() => { modulo = require('./api'); });
  return modulo;
};

describe('api.js — contrato de sesion y errores', () => {
  beforeEach(() => {
    mockRespuestas = {};
    mockSolicitudes = [];
    instalarLocalStorage();
    jest.resetModules();
  });

  it('adjunta el bearer despues de hidratar el storage', async () => {
    window.localStorage.setItem('servigt_token', 'token-123');
    window.localStorage.setItem('servigt_user', '{"id":1,"role":"cliente"}');

    const api = cargarApi();
    await api.inicializarSesion();
    await api.getCategorias();

    expect(mockSolicitudes[0].headers.Authorization).toBe('Bearer token-123');
  });

  it('preserva el status HTTP en todas las funciones exportadas', async () => {
    const api = cargarApi();
    await api.inicializarSesion();

    mockRespuestas['/providers/1'] = { status: 403, data: { message: 'Sin permiso' } };
    mockRespuestas['/servicios'] = { status: 422, data: { errors: { descripcion: ['Requerida'] } } };
    mockRespuestas['/mensajes'] = { status: 429, data: {}, headers: { 'retry-after': '30' } };

    await expect(api.getProvider(1)).rejects.toMatchObject({ status: 403, message: 'Sin permiso' });
    await expect(api.createServicio({})).rejects.toMatchObject({ status: 422 });
    await expect(api.sendMensaje(2, 'hola')).rejects.toMatchObject({ status: 429, retryAfter: 30 });
  });

  it('un 401 limpia la sesion una sola vez y avisa una sola vez', async () => {
    window.localStorage.setItem('servigt_token', 'token-123');
    window.localStorage.setItem('servigt_user', '{"id":1,"role":"cliente"}');

    const api = cargarApi();
    await api.inicializarSesion();

    const avisos = jest.fn();
    api.alInvalidarSesion(avisos);

    mockRespuestas['/providers/me'] = { status: 401, data: { message: 'No autenticado' } };
    mockRespuestas['/notificaciones'] = { status: 401, data: { message: 'No autenticado' } };

    await expect(api.getMiProveedor()).rejects.toMatchObject({ status: 401 });
    await expect(api.getNotificaciones()).rejects.toMatchObject({ status: 401 });

    expect(avisos).toHaveBeenCalledTimes(1);
    expect(api.loadStoredSession()).toBeNull();
    expect(window.localStorage.getItem('servigt_token')).toBeNull();
  });

  it('un 403 conserva la sesion', async () => {
    window.localStorage.setItem('servigt_token', 'token-123');
    window.localStorage.setItem('servigt_user', '{"id":1,"role":"proveedor"}');

    const api = cargarApi();
    await api.inicializarSesion();

    const avisos = jest.fn();
    api.alInvalidarSesion(avisos);

    mockRespuestas['/providers/9'] = { status: 403, data: { message: 'Sin permiso' } };

    await expect(api.getProvider(9)).rejects.toMatchObject({ status: 403 });

    expect(avisos).not.toHaveBeenCalled();
    expect(api.loadStoredSession()).not.toBeNull();
  });

  it('un 429 conserva la sesion y trae los segundos de espera', async () => {
    window.localStorage.setItem('servigt_token', 'token-123');
    window.localStorage.setItem('servigt_user', '{"id":1,"role":"cliente"}');

    const api = cargarApi();
    await api.inicializarSesion();

    mockRespuestas['/mensajes'] = {
      status: 429,
      data: { message: 'Demasiados intentos.' },
      headers: { 'retry-after': '45' },
    };

    await expect(api.sendMensaje(2, 'hola')).rejects.toMatchObject({
      status: 429,
      retryAfter: 45,
    });

    expect(api.loadStoredSession()).not.toBeNull();
  });

  it('un 401 de login no dispara la invalidacion de sesion', async () => {
    // Si lo hiciera, fallar el login mandaria a "tu sesion expiro" y podria
    // dejar la app rebotando entre la pantalla de login y si misma.
    const api = cargarApi();
    await api.inicializarSesion();

    const avisos = jest.fn();
    api.alInvalidarSesion(avisos);

    mockRespuestas['/login'] = { status: 401, data: { message: 'Credenciales incorrectas' } };

    await expect(api.login('a@b.gt', 'x')).rejects.toMatchObject({ status: 401 });

    expect(avisos).not.toHaveBeenCalled();
  });

  it('un fallo del API no se convierte en datos validos', async () => {
    const api = cargarApi();
    await api.inicializarSesion();

    mockRespuestas['/providers'] = { status: 500, data: {} };

    // Lo importante es que rechace: si devolviera `[]` o `{}`, la pantalla
    // pintaria "no hay proveedores" cuando en realidad el backend fallo.
    await expect(api.getProviders()).rejects.toBeInstanceOf(Error);
  });

  it('el logout borra token, perfil y cache de chat aunque falle la red', async () => {
    window.localStorage.setItem('servigt_token', 'token-123');
    window.localStorage.setItem('servigt_user', '{"id":1,"role":"cliente"}');
    window.localStorage.setItem('servigt_chat_1_9', '[{"contenido":"privado"}]');

    const api = cargarApi();
    await api.inicializarSesion();

    mockRespuestas['POST /logout'] = { status: 500, data: {} };

    await api.logout();

    expect(window.localStorage.getItem('servigt_token')).toBeNull();
    expect(window.localStorage.getItem('servigt_user')).toBeNull();
    expect(window.localStorage.getItem('servigt_chat_1_9')).toBeNull();
  });

  it('iniciar sesion de nuevo rearma el aviso de invalidacion', async () => {
    const api = cargarApi();
    await api.inicializarSesion();

    const avisos = jest.fn();
    api.alInvalidarSesion(avisos);

    mockRespuestas['/notificaciones'] = { status: 401, data: {} };
    await expect(api.getNotificaciones()).rejects.toMatchObject({ status: 401 });
    expect(avisos).toHaveBeenCalledTimes(1);

    mockRespuestas['/login'] = {
      status: 200,
      data: { user: { id: 1, role: 'cliente' }, token: 'token-nuevo' },
    };
    await api.login('a@b.gt', 'ClaveSegura2026');

    await expect(api.getNotificaciones()).rejects.toMatchObject({ status: 401 });
    expect(avisos).toHaveBeenCalledTimes(2);
  });
});
