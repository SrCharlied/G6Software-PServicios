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

describe('api error handling', () => {
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
});
