import { Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { SessionProvider, useSession } from './SessionContext';
import {
  alInvalidarSesion,
  clearPrivateData,
  clearSession,
  getMe,
  getMiProveedor,
  inicializarSesion,
  loadStoredSession,
  logout,
} from '../services/api';

/**
 * Tasks 3.3 y 6.4 — la sesion se revalida contra el backend.
 *
 * El caso que importa: antes bastaba con editar `servigt_user` en el
 * almacenamiento del dispositivo y poner `role: "admin"` para que la app
 * montara la navegacion de administrador. Las peticiones seguian fallando, pero
 * la UI ya se habia abierto. Ahora el rol se vuelve a pedir a `/me`.
 */

jest.mock('../services/api', () => ({
  alInvalidarSesion: jest.fn(() => () => {}),
  clearPrivateData: jest.fn(async () => {}),
  clearSession: jest.fn(),
  getMe: jest.fn(),
  getMiProveedor: jest.fn(),
  inicializarSesion: jest.fn(async () => {}),
  loadStoredSession: jest.fn(),
  logout: jest.fn(async () => {}),
}));

function Sonda() {
  const { user, providerProfile, sessionLoading } = useSession();

  return (
    <>
      <Text>{sessionLoading ? 'cargando' : 'listo'}</Text>
      <Text>{`rol:${user?.role ?? 'ninguno'}`}</Text>
      <Text>{`perfil:${providerProfile?.id ?? 'ninguno'}`}</Text>
    </>
  );
}

const montar = () => render(
  <SessionProvider>
    <Sonda />
  </SessionProvider>
);

describe('SessionContext', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sin token guardado no consulta /me ni abre sesion', async () => {
    loadStoredSession.mockReturnValue(null);

    montar();

    await screen.findByText('listo');
    expect(getMe).not.toHaveBeenCalled();
    expect(screen.getByText('rol:ninguno')).toBeTruthy();
  });

  it('un rol manipulado en el dispositivo no habilita el dashboard: manda /me', async () => {
    loadStoredSession.mockReturnValue({
      token: 'token-123',
      user: { id: 1, role: 'admin', name: 'Manipulado' },
    });
    getMe.mockResolvedValue({ user: { id: 1, role: 'cliente', name: 'Real' } });

    montar();

    await screen.findByText('listo');

    expect(getMe).toHaveBeenCalledTimes(1);
    expect(screen.getByText('rol:cliente')).toBeTruthy();
    expect(screen.queryByText('rol:admin')).toBeNull();
  });

  it('hidrata el storage antes de leer la sesion', async () => {
    loadStoredSession.mockReturnValue(null);

    montar();

    await screen.findByText('listo');
    expect(inicializarSesion).toHaveBeenCalled();
  });

  it('carga el perfil de proveedor solo si /me dice que es proveedor', async () => {
    loadStoredSession.mockReturnValue({ token: 't', user: { id: 2, role: 'cliente' } });
    getMe.mockResolvedValue({ user: { id: 2, role: 'proveedor' } });
    getMiProveedor.mockResolvedValue({ proveedor: { id: 77 } });

    montar();

    await screen.findByText('listo');
    expect(screen.getByText('rol:proveedor')).toBeTruthy();
    expect(screen.getByText('perfil:77')).toBeTruthy();
  });

  it('un proveedor sin perfil todavia conserva la sesion', async () => {
    // 404 en /providers/me es el estado normal de un proveedor recien
    // registrado: cerrarle la sesion lo dejaria sin poder completar el perfil.
    loadStoredSession.mockReturnValue({ token: 't', user: { id: 3, role: 'proveedor' } });
    getMe.mockResolvedValue({ user: { id: 3, role: 'proveedor' } });
    getMiProveedor.mockRejectedValue(Object.assign(new Error('sin perfil'), { status: 404 }));

    montar();

    await screen.findByText('listo');
    expect(screen.getByText('rol:proveedor')).toBeTruthy();
    expect(screen.getByText('perfil:ninguno')).toBeTruthy();
  });

  it('si /me falla, la app queda desconectada en vez de con media sesion', async () => {
    loadStoredSession.mockReturnValue({ token: 't', user: { id: 4, role: 'cliente' } });
    getMe.mockRejectedValue(Object.assign(new Error('No autenticado'), { status: 401 }));

    montar();

    await screen.findByText('listo');
    expect(screen.getByText('rol:ninguno')).toBeTruthy();
    expect(clearSession).toHaveBeenCalled();
  });

  it('se suscribe a la invalidacion de sesion que emite el interceptor', async () => {
    loadStoredSession.mockReturnValue(null);

    montar();

    await screen.findByText('listo');
    expect(alInvalidarSesion).toHaveBeenCalledTimes(1);
  });

  it('un 401 posterior limpia el estado en memoria una sola vez', async () => {
    let avisar;
    alInvalidarSesion.mockImplementation((callback) => { avisar = callback; return () => {}; });

    loadStoredSession.mockReturnValue({ token: 't', user: { id: 5, role: 'cliente' } });
    getMe.mockResolvedValue({ user: { id: 5, role: 'cliente' } });

    montar();

    await screen.findByText('rol:cliente');

    await waitFor(() => expect(typeof avisar).toBe('function'));
    act(() => avisar());

    await waitFor(() => expect(screen.getByText('rol:ninguno')).toBeTruthy());
  });

  it('el logout borra los datos privados aunque el backend no conteste', async () => {
    loadStoredSession.mockReturnValue(null);
    logout.mockResolvedValue(undefined);

    let signOut;
    function Boton() {
      ({ signOut } = useSession());
      return null;
    }

    render(<SessionProvider><Boton /></SessionProvider>);

    await waitFor(() => expect(typeof signOut).toBe('function'));
    // `signOut` actualiza estado; se envuelve en act para que la limpieza no
    // quede fuera del render y ensucie la salida de la suite.
    await act(async () => { await signOut(); });

    expect(logout).toHaveBeenCalled();
    expect(clearPrivateData).toHaveBeenCalled();
  });
});
