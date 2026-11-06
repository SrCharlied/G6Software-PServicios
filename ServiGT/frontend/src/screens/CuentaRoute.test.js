import { fireEvent, render, waitFor } from '@testing-library/react-native';
import CuentaRoute from '../../app/(protected)/cuenta';

// HU 3.2.b: la ruta solo limpia la sesion local tras un 200 y navega fuera
// del area protegida; ante un error la sesion queda intacta.

const mockEndSession = jest.fn();
const mockReplace = jest.fn();
const mockToast = jest.fn();
let mockUser;

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('expo-router', () => ({
  Redirect: ({ href }) => {
    const { Text } = require('react-native');
    return <Text>{`redirect:${href}`}</Text>;
  },
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));
jest.mock('../components/InternalLayout', () => ({ children }) => children);
jest.mock('../context/SessionContext', () => ({
  useSession: () => ({ user: mockUser, endSession: mockEndSession }),
}));
jest.mock('../context/ToastContext', () => ({ useToast: () => mockToast }));
jest.mock('../services/api', () => ({
  getImpactoEliminacion: jest.fn(),
  solicitarEliminacionCuenta: jest.fn(),
}));

const { getImpactoEliminacion, solicitarEliminacionCuenta } = require('../services/api');

// Primer render de ScrollView sin cache de Jest: ver CuentaScreen.test.
jest.setTimeout(20000);

const enviar = async (screen) => {
  await screen.findByLabelText('Contraseña actual');
  fireEvent.changeText(screen.getByLabelText('Contraseña actual'), 'Secreta123');
  fireEvent.changeText(screen.getByLabelText('Confirmación'), 'ELIMINAR');
  fireEvent.press(screen.getByText('Eliminar mi cuenta'));
};

describe('ruta /cuenta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 5, name: 'Prov', email: 'prov@example.test', role: 'proveedor' };
    getImpactoEliminacion.mockResolvedValue({ puede_eliminar: true, bloqueos: [], se_cerrara: {} });
    mockEndSession.mockResolvedValue(undefined);
  });

  it('tras un 200 limpia la sesion local y sale del area protegida', async () => {
    solicitarEliminacionCuenta.mockResolvedValue({ success: true, solicitud: { id: 1, estado: 'completada' } });
    const screen = render(<CuentaRoute />);
    await enviar(screen);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/landing'));
    expect(mockEndSession).toHaveBeenCalledTimes(1);
    expect(mockEndSession.mock.invocationCallOrder[0]).toBeLessThan(mockReplace.mock.invocationCallOrder[0]);
    expect(mockToast).toHaveBeenCalledWith(expect.stringMatching(/eliminada/), 'success');
  });

  it('ante un error conserva la sesion y no navega', async () => {
    solicitarEliminacionCuenta.mockRejectedValue(Object.assign(new Error('La contraseña es incorrecta.'), {
      status: 422, data: { errors: { password: ['La contraseña es incorrecta.'] } },
    }));
    const screen = render(<CuentaRoute />);
    await enviar(screen);

    expect(await screen.findByText('La contraseña es incorrecta.')).toBeTruthy();
    expect(mockEndSession).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('un admin no ve el flujo', () => {
    mockUser = { id: 1, role: 'admin' };
    const screen = render(<CuentaRoute />);
    expect(screen.getByText('redirect:/admin')).toBeTruthy();
    expect(getImpactoEliminacion).not.toHaveBeenCalled();
  });
});
