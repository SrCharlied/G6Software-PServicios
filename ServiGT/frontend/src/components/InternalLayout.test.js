import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import InternalLayout from './InternalLayout';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('expo-router', () => ({
  usePathname: () => '/home',
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));
jest.mock('./NotificationBell', () => () => null);
jest.mock('../context/SessionContext', () => ({
  useSession: () => ({
    user: { id: 1, name: 'Usuario', email: 'usuario@example.test', role: 'cliente' },
    signOut: mockSignOut,
  }),
}));

const confirmarLogout = (screen) => {
  const labels = screen.getAllByText('Cerrar sesion');
  fireEvent.press(labels.at(-1));
};

const setWindowWidth = (width) => {
  const metrics = { width, height: 900, scale: 1, fontScale: 1 };
  Dimensions.set({ window: metrics, screen: metrics });
};

describe('InternalLayout confirmacion de logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
  });

  it('sidebar desktop permite cancelar sin llamar API y luego confirmar', async () => {
    setWindowWidth(1440);
    const screen = render(<InternalLayout><></></InternalLayout>);

    fireEvent.press(screen.getByText('Cerrar sesion'));
    fireEvent.press(screen.getByText('Cancelar'));
    expect(mockSignOut).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Cerrar sesion'));
    confirmarLogout(screen);

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith('/home');
  });

  it('menu movil tambien exige confirmacion', async () => {
    setWindowWidth(390);
    const screen = render(<InternalLayout><></></InternalLayout>);

    fireEvent.press(screen.getByLabelText('Abrir menu'));
    fireEvent.press(screen.getByText('Cerrar sesion'));
    expect(mockSignOut).not.toHaveBeenCalled();

    confirmarLogout(screen);
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
  });
});
