const buildStorage = () => {
  const values = {};
  return {
    getItem: jest.fn(async (key) => values[key] ?? null),
    setItem: jest.fn(async (key, value) => { values[key] = value; }),
    removeItem: jest.fn(async (key) => { delete values[key]; }),
    getAllKeys: jest.fn(async () => Object.keys(values)),
    values,
  };
};

const buildApiModule = () => {
  jest.resetModules();

  const client = {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const axiosMock = { create: jest.fn(() => client) };
  jest.doMock('axios', () => ({ __esModule: true, default: axiosMock }));

  const storage = buildStorage();
  jest.doMock('./sessionStorage', () => ({
    STORAGE_KEYS: { token: 'servigt_token', user: 'servigt_user' },
    sessionStorage: storage,
    migrateLegacySession: jest.fn(async () => false),
    clearPrivateSessionStorage: jest.fn(async () => {
      delete storage.values.servigt_token;
      delete storage.values.servigt_user;
      Object.keys(storage.values)
        .filter((key) => key.startsWith('chat_'))
        .forEach((key) => { delete storage.values[key]; });
    }),
  }));

  const apiModule = require('./api');
  const requestHandler = client.interceptors.request.use.mock.calls[0][0];
  const responseErrorHandler = client.interceptors.response.use.mock.calls[0][1];

  return { apiModule, client, requestHandler, responseErrorHandler, storage };
};

describe('multipart de materiales', () => {
  const originalFormData = global.FormData;
  beforeEach(() => { global.FormData = require('react-native/Libraries/Network/FormData'); });
  afterEach(() => { global.FormData = originalFormData; jest.dontMock('axios'); jest.dontMock('./sessionStorage'); });
  it('envia creacion multipart con precio cero y archivo nativo', async () => {
    const { apiModule, client } = buildApiModule();
    client.post.mockResolvedValue({ data: { publicacion: { id: 7 } } });
    await apiModule.crearLoteMaterial({ servicio_id: 21, precio_referencial: 0, imagenes: [{ uri: 'file:///a.jpg', fileName: 'a.jpg', mimeType: 'image/jpeg' }] });
    const [url, form, config] = client.post.mock.calls[0];
    expect(url).toBe('/materiales');
    expect(form.getParts()).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldName: 'precio_referencial', string: '0' }),
      expect.objectContaining({ fieldName: 'imagenes[]', uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' }),
    ]));
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
  });
  it('edita con POST y _method=PUT sin borrar archivos implicitamente', async () => {
    const { apiModule, client } = buildApiModule();
    client.post.mockResolvedValue({ data: { publicacion: { id: 7 } } });
    await apiModule.actualizarLoteMaterial(7, { titulo: 'Tubos', imagenes: [], eliminar_imagenes: [9] });
    const [url, form] = client.post.mock.calls[0];
    expect(url).toBe('/materiales/7');
    expect(form.getParts()).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldName: '_method', string: 'PUT' }),
      expect.objectContaining({ fieldName: 'eliminar_imagenes[]', string: '9' }),
    ]));
    expect(form.getParts().some((part) => part.fieldName === 'imagenes[]')).toBe(false);
  });
});

describe('api error handling', () => {
  it('envia por contexto sin receptor arbitrario', async () => {
    const { apiModule, client } = buildApiModule();
    client.post.mockResolvedValue({ data: { mensaje: { id: 1 } } });
    await apiModule.enviarMensajeContexto({ tipo: 'reserva', id: 12, contraparteId: 999 }, 'Hola');
    expect(client.post).toHaveBeenCalledWith('/mensajes/reservas/12', { contenido: 'Hola' });
  });
  it('consulta hilos y preserva 409 legacy', async () => {
    const { apiModule, client } = buildApiModule();
    client.get.mockResolvedValueOnce({ data: { hilos: [] } });
    await apiModule.getHilosMensajes({ page: 2 });
    expect(client.get).toHaveBeenCalledWith('/mensajes/hilos', { params: { page: 2 } });
    client.get.mockRejectedValueOnce({ response: { status: 409, data: { message: 'Ambiguo' } } });
    await expect(apiModule.getMensajesContexto({ tipo: 'legacy', contraparteId: 9 })).rejects.toMatchObject({ status: 409 });
  });
  afterEach(() => {
    jest.dontMock('axios');
    jest.dontMock('./sessionStorage');
  });

  it('inyecta Authorization con el token del adapter', async () => {
    const { requestHandler, storage } = buildApiModule();
    storage.values.servigt_token = 'token-real';

    await expect(requestHandler({ headers: {} })).resolves.toMatchObject({
      headers: { Authorization: 'Bearer token-real' },
    });
  });

  it('preserva status 401 en funciones exportadas', async () => {
    const { apiModule, client } = buildApiModule();
    client.get.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'No autenticado' }, headers: {} },
    });

    await expect(apiModule.getMe()).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'No autenticado',
      data: { message: 'No autenticado' },
    });
  });

  it('preserva status 403 sin disparar limpieza global', async () => {
    const { apiModule, responseErrorHandler } = buildApiModule();
    const onUnauthorized = jest.fn();
    apiModule.setUnauthorizedHandler(onUnauthorized);

    await expect(responseErrorHandler({
      response: { status: 403, data: { message: 'Prohibido' }, headers: {} },
    })).rejects.toMatchObject({ status: 403, message: 'Prohibido' });

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('preserva status 429 y retry_after', async () => {
    const { apiModule, client } = buildApiModule();
    client.get.mockRejectedValueOnce({
      response: {
        status: 429,
        data: { message: 'Demasiados intentos', retry_after: 45 },
        headers: {},
      },
    });

    await expect(apiModule.getCategorias()).rejects.toMatchObject({
      status: 429,
      retryAfter: 45,
      message: 'Demasiados intentos',
    });
  });

  it('ejecuta el handler de 401 una sola vez si llegan varios 401 simultaneos', async () => {
    const { apiModule, responseErrorHandler } = buildApiModule();
    let finishHandler;
    const onUnauthorized = jest.fn(() => new Promise((resolve) => { finishHandler = resolve; }));
    apiModule.setUnauthorizedHandler(onUnauthorized);

    const error401 = {
      response: { status: 401, data: { message: 'Token expirado' }, headers: {} },
    };
    const first = responseErrorHandler(error401);
    const second = responseErrorHandler(error401);

    finishHandler();

    await expect(first).rejects.toMatchObject({ status: 401 });
    await expect(second).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('restaura una sesion con solo token para obligar revalidacion por /me', async () => {
    const { apiModule, storage } = buildApiModule();
    storage.values.servigt_token = 'token-real';

    await expect(apiModule.loadStoredSession()).resolves.toEqual({ token: 'token-real', user: null });
  });

  it('limpia datos locales aunque falle el logout remoto', async () => {
    const { apiModule, client, storage } = buildApiModule();
    storage.values.servigt_token = 'token-real';
    storage.values.servigt_user = '{"id":1}';
    storage.values.chat_1_2 = '[{"id":1}]';
    client.post.mockRejectedValueOnce(new Error('Network'));

    await apiModule.logout();

    expect(storage.values.servigt_token).toBeUndefined();
    expect(storage.values.servigt_user).toBeUndefined();
    expect(storage.values.chat_1_2).toBeUndefined();
  });

  it('cancela un servicio mediante el endpoint autenticado', async () => {
    const { apiModule, client } = buildApiModule();
    client.post.mockResolvedValueOnce({
      data: { message: 'Servicio cancelado', servicio: { id: 17, estado: 'cancelado' } },
    });

    await expect(apiModule.cancelarServicio(17)).resolves.toMatchObject({
      servicio: { id: 17, estado: 'cancelado' },
    });
    expect(client.post).toHaveBeenCalledWith('/servicios/17/cancelar');
  });
});

describe('api de materiales (Sprint 9)', () => {
  afterEach(() => {
    jest.dontMock('axios');
    jest.dontMock('./sessionStorage');
  });

  it.each([
    ['getMisLotesMateriales', [], 'get', '/materiales/mias', undefined],
    ['getReservasDeLote', [7], 'get', '/materiales/7/reservas', undefined],
    ['retirarLoteMaterial', [7], 'post', '/materiales/7/retirar', undefined],
    ['marcarLoteVendido', [7], 'post', '/materiales/7/vendido', undefined],
    ['aceptarReservaMaterial', [12], 'post', '/reservas-material/12/aceptar', undefined],
    ['rechazarReservaMaterial', [12], 'post', '/reservas-material/12/rechazar', undefined],
    ['cancelarReservaMaterial', [12], 'post', '/reservas-material/12/cancelar', undefined],
  ])('%s llama al endpoint correcto sin body', async (fn, args, metodo, ruta) => {
    const { apiModule, client } = buildApiModule();
    client[metodo].mockResolvedValueOnce({ data: { success: true } });

    await expect(apiModule[fn](...args)).resolves.toEqual({ success: true });

    expect(client[metodo]).toHaveBeenCalledTimes(1);
    expect(client[metodo].mock.calls[0][0]).toBe(ruta);
    if (metodo === 'post') expect(client.post.mock.calls[0]).toHaveLength(1);
  });

  it('getMisReservasMaterial pagina con page y per_page', async () => {
    const { apiModule, client } = buildApiModule();
    client.get.mockResolvedValueOnce({ data: { reservas: [] } });

    await apiModule.getMisReservasMaterial({ page: 2, perPage: 5 });

    expect(client.get).toHaveBeenCalledWith('/reservas-material', { params: { page: 2, per_page: 5 } });
  });

  it('propaga el mensaje y el status del backend en vez de devolver un valor de negocio', async () => {
    const { apiModule, client } = buildApiModule();
    client.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 422, data: { message: 'Solo se pueden aceptar solicitudes pendientes.' } },
    });

    await expect(apiModule.aceptarReservaMaterial(12)).rejects.toMatchObject({
      message: 'Solo se pueden aceptar solicitudes pendientes.',
      status: 422,
    });
  });
});

describe('api del panel de seguridad (Sprint 9)', () => {
  afterEach(() => {
    jest.dontMock('axios');
    jest.dontMock('./sessionStorage');
  });

  it('lista reportes enviando solo los filtros definidos', async () => {
    const { apiModule, client } = buildApiModule();
    client.get.mockResolvedValue({ data: { reportes: [] } });

    await apiModule.getReportesSeguridadAdmin();
    await apiModule.getReportesSeguridadAdmin({ estado: 'en_revision', interrumpio: true, page: 2, perPage: 5 });
    await apiModule.getReportesSeguridadAdmin({ interrumpio: false });

    expect(client.get.mock.calls[0]).toEqual(['/admin/reportes-seguridad', { params: { page: 1, per_page: 20 } }]);
    expect(client.get.mock.calls[1]).toEqual(['/admin/reportes-seguridad', { params: { page: 2, per_page: 5, estado: 'en_revision', interrumpio: 1 } }]);
    expect(client.get.mock.calls[2][1].params).toEqual({ page: 1, per_page: 20, interrumpio: 0 });
  });

  it('lee el detalle de un reporte', async () => {
    const { apiModule, client } = buildApiModule();
    client.get.mockResolvedValueOnce({ data: { reporte: { id: 8 } } });

    await expect(apiModule.getReporteSeguridadAdmin(8)).resolves.toEqual({ reporte: { id: 8 } });
    expect(client.get).toHaveBeenCalledWith('/admin/reportes-seguridad/8');
  });

  it('cambia el estado enviando la nota solo si existe', async () => {
    const { apiModule, client } = buildApiModule();
    client.post.mockResolvedValue({ data: { success: true } });

    await apiModule.cambiarEstadoReporteSeguridad(8, { estado: 'en_revision' });
    await apiModule.cambiarEstadoReporteSeguridad(8, { estado: 'resuelto', notaInterna: 'Cierre' });

    expect(client.post.mock.calls[0]).toEqual(['/admin/reportes-seguridad/8/estado', { estado: 'en_revision' }]);
    expect(client.post.mock.calls[1]).toEqual(['/admin/reportes-seguridad/8/estado', { estado: 'resuelto', nota_interna: 'Cierre' }]);
  });

  it('propaga el mensaje del backend cuando el cambio de estado falla', async () => {
    const { apiModule, client } = buildApiModule();
    client.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 422, data: { message: 'No se puede pasar un reporte de «resuelto» a «en_revision».' } },
    });

    await expect(apiModule.cambiarEstadoReporteSeguridad(8, { estado: 'en_revision' })).rejects.toMatchObject({
      message: 'No se puede pasar un reporte de «resuelto» a «en_revision».',
      status: 422,
    });
  });

  it('descarga una evidencia como blob y devuelve su tipo', async () => {
    const { apiModule, client } = buildApiModule();
    const blob = { size: 4 };
    client.get.mockResolvedValueOnce({ data: blob, headers: { 'content-type': 'image/png' } });

    await expect(apiModule.descargarEvidenciaSeguridad(8, 3)).resolves.toEqual({ blob, contentType: 'image/png' });
    expect(client.get).toHaveBeenCalledWith('/seguridad/reportes/8/evidencias/3/descargar', { responseType: 'blob' });
  });

  it('conserva el mensaje real cuando el error de la descarga llega como blob', async () => {
    const { apiModule, client } = buildApiModule();
    client.get.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404, data: { text: async () => JSON.stringify({ message: 'El archivo ya no está disponible.' }) } },
    });

    await expect(apiModule.descargarEvidenciaSeguridad(8, 3)).rejects.toMatchObject({
      message: 'El archivo ya no está disponible.',
      status: 404,
    });
  });

  it('si el blob de error no es JSON usa el mensaje por defecto', async () => {
    const { apiModule, client } = buildApiModule();
    client.get.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: { text: async () => '<html>error</html>' } },
    });

    await expect(apiModule.descargarEvidenciaSeguridad(8, 3)).rejects.toMatchObject({
      message: 'No se pudo descargar la evidencia.',
      status: 500,
    });
  });
});
