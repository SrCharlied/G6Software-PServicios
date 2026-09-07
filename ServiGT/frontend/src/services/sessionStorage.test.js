const buildWebLocalStorage = () => {
  const values = {};
  return {
    get length() {
      return Object.keys(values).length;
    },
    key: jest.fn((index) => Object.keys(values)[index] ?? null),
    getItem: jest.fn((key) => values[key] ?? null),
    setItem: jest.fn((key, value) => { values[key] = value; }),
    removeItem: jest.fn((key) => { delete values[key]; }),
    values,
  };
};

const loadStorageModule = ({ os, localStorage, asyncStorage }) => {
  jest.resetModules();
  jest.doMock('react-native', () => ({ Platform: { OS: os } }));
  jest.doMock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: asyncStorage,
  }));
  Object.defineProperty(global, 'window', {
    value: localStorage ? { localStorage } : undefined,
    configurable: true,
  });
  return require('./sessionStorage');
};

describe('sessionStorage adapter', () => {
  afterEach(() => {
    jest.dontMock('react-native');
    jest.dontMock('@react-native-async-storage/async-storage');
  });

  it('web lee, escribe y borra mediante localStorage solo dentro del adapter', async () => {
    const localStorage = buildWebLocalStorage();
    const asyncStorage = {};
    const { sessionStorage } = loadStorageModule({ os: 'web', localStorage, asyncStorage });

    await sessionStorage.setItem('servigt_token', 'token-web');
    await expect(sessionStorage.getItem('servigt_token')).resolves.toBe('token-web');
    await sessionStorage.removeItem('servigt_token');

    expect(localStorage.values.servigt_token).toBeUndefined();
  });

  it('native usa AsyncStorage en lugar de window.localStorage', async () => {
    const localStorage = buildWebLocalStorage();
    const values = {};
    const asyncStorage = {
      getItem: jest.fn(async (key) => values[key] ?? null),
      setItem: jest.fn(async (key, value) => { values[key] = value; }),
      removeItem: jest.fn(async (key) => { delete values[key]; }),
      getAllKeys: jest.fn(async () => Object.keys(values)),
    };
    const { sessionStorage } = loadStorageModule({ os: 'ios', localStorage, asyncStorage });

    await sessionStorage.setItem('servigt_token', 'token-native');
    await expect(sessionStorage.getItem('servigt_token')).resolves.toBe('token-native');

    expect(asyncStorage.setItem).toHaveBeenCalledWith('servigt_token', 'token-native');
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('limpia token, usuario y cache privada de chat sin borrar preferencias publicas', async () => {
    const localStorage = buildWebLocalStorage();
    localStorage.values.servigt_token = 'token';
    localStorage.values.servigt_user = '{"id":1}';
    localStorage.values.chat_1_2 = '[{"id":1}]';
    localStorage.values.servigt_public_theme = 'light';
    const asyncStorage = {};
    const { clearPrivateSessionStorage } = loadStorageModule({ os: 'web', localStorage, asyncStorage });

    await clearPrivateSessionStorage();

    expect(localStorage.values.servigt_token).toBeUndefined();
    expect(localStorage.values.servigt_user).toBeUndefined();
    expect(localStorage.values.chat_1_2).toBeUndefined();
    expect(localStorage.values.servigt_public_theme).toBe('light');
  });

  it('mantiene migracion idempotente cuando no hay claves legacy reales', async () => {
    const localStorage = buildWebLocalStorage();
    const asyncStorage = {};
    const { migrateLegacySession } = loadStorageModule({ os: 'web', localStorage, asyncStorage });

    await expect(migrateLegacySession()).resolves.toBe(false);
    await expect(migrateLegacySession()).resolves.toBe(false);
  });
});
