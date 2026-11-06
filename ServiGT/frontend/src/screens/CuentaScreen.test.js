import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import CuentaScreen from './CuentaScreen';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('../services/api', () => ({
  getImpactoEliminacion: jest.fn(),
  solicitarEliminacionCuenta: jest.fn(),
}));

const { getImpactoEliminacion, solicitarEliminacionCuenta } = require('../services/api');

// El primer render de ScrollView en un contenedor sin cache de Jest tarda ~5 s
// en transformarse; mismo margen que NotificationBell.test.
jest.setTimeout(20000);

const USER = { id: 41, name: 'Cliente Prueba', email: 'cliente@example.test', role: 'cliente' };
const SIN_BLOQUEOS = { puede_eliminar: true, bloqueos: [], se_cerrara: { pedidos_abiertos: 2, cotizaciones_enviadas: 0 } };
const BLOQUEO = { codigo: 'servicios_activos', mensaje: 'Tienes servicios en curso.', cantidad: 2 };

const apiError = (status, message, data = null) =>
  Object.assign(new Error(message), { status, data, isApiError: true });

const renderScreen = (onAccountDeleted = jest.fn()) => ({
  onAccountDeleted,
  ...render(<CuentaScreen user={USER} onAccountDeleted={onAccountDeleted} />),
});

const completar = (screen, { password = 'Secreta123', palabra = 'ELIMINAR' } = {}) => {
  fireEvent.changeText(screen.getByLabelText('Contraseña actual'), password);
  fireEvent.changeText(screen.getByLabelText('Confirmación'), palabra);
};

describe('CuentaScreen eliminacion de cuenta (HU 3.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getImpactoEliminacion.mockResolvedValue(SIN_BLOQUEOS);
  });

  it('muestra los datos de la cuenta y lo que se cerrara', async () => {
    const screen = renderScreen();
    expect(screen.getByText('Revisando si tienes operaciones pendientes…')).toBeTruthy();
    expect(await screen.findByText(/Se cerrarán 2 pedidos abiertos/)).toBeTruthy();
    expect(screen.getByText('cliente@example.test')).toBeTruthy();
    expect(screen.getByText('Cliente')).toBeTruthy();
  });

  it('con bloqueos no ofrece el formulario ni envia nada', async () => {
    getImpactoEliminacion.mockResolvedValue({ puede_eliminar: false, bloqueos: [BLOQUEO], se_cerrara: {} });
    const screen = renderScreen();

    expect(await screen.findByText('• Tienes servicios en curso. (2)')).toBeTruthy();
    expect(screen.queryByLabelText('Contraseña actual')).toBeNull();
    fireEvent.press(screen.getByText('Eliminar mi cuenta'));
    expect(solicitarEliminacionCuenta).not.toHaveBeenCalled();
  });

  it('un error al consultar el impacto se muestra y se puede reintentar', async () => {
    getImpactoEliminacion.mockRejectedValueOnce(apiError(500, 'Fallo del servidor.'));
    const screen = renderScreen();

    expect(await screen.findByText('Fallo del servidor.')).toBeTruthy();
    expect(screen.queryByText('Eliminar mi cuenta')).toBeNull();
    fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByLabelText('Contraseña actual')).toBeTruthy();
    expect(getImpactoEliminacion).toHaveBeenCalledTimes(2);
  });

  it('exige contraseña y la palabra ELIMINAR exacta', async () => {
    const screen = renderScreen();
    await screen.findByLabelText('Contraseña actual');

    completar(screen, { palabra: 'eliminar' });
    fireEvent.press(screen.getByText('Eliminar mi cuenta'));
    completar(screen, { password: '' });
    fireEvent.press(screen.getByText('Eliminar mi cuenta'));
    expect(solicitarEliminacionCuenta).not.toHaveBeenCalled();
  });

  it('un doble toque envia una sola solicitud y el exito avisa una vez', async () => {
    let resolver;
    solicitarEliminacionCuenta.mockImplementation(() => new Promise((r) => { resolver = r; }));
    const screen = renderScreen();
    await screen.findByLabelText('Contraseña actual');
    completar(screen);

    // Dos toques en el mismo frame, antes de que el boton pase a "cargando":
    // solo el candado interno puede frenar el segundo.
    const boton = screen.getByText('Eliminar mi cuenta');
    act(() => {
      fireEvent.press(boton);
      fireEvent.press(boton);
    });
    expect(solicitarEliminacionCuenta).toHaveBeenCalledTimes(1);
    expect(solicitarEliminacionCuenta).toHaveBeenCalledWith(expect.objectContaining({
      password: 'Secreta123',
      confirmacion: 'ELIMINAR',
      idempotencyKey: expect.stringMatching(/^eliminar-41-/),
    }));

    await act(async () => resolver({ success: true, solicitud: { id: 7, estado: 'completada' } }));
    expect(screen.onAccountDeleted).toHaveBeenCalledTimes(1);
  });

  it('contraseña incorrecta: muestra el error real y no cierra la sesion', async () => {
    solicitarEliminacionCuenta.mockRejectedValueOnce(apiError(422, 'La contraseña es incorrecta.', {
      errors: { password: ['La contraseña es incorrecta.'] },
    }));
    const screen = renderScreen();
    await screen.findByLabelText('Contraseña actual');
    completar(screen);

    fireEvent.press(screen.getByText('Eliminar mi cuenta'));
    expect(await screen.findByText('La contraseña es incorrecta.')).toBeTruthy();
    expect(screen.onAccountDeleted).not.toHaveBeenCalled();
  });

  it('un 409 muestra los bloqueos actuales y el siguiente intento usa otra clave', async () => {
    solicitarEliminacionCuenta.mockRejectedValueOnce(apiError(409, 'No puedes eliminar tu cuenta todavía.', {
      bloqueos: [BLOQUEO],
    }));
    const screen = renderScreen();
    await screen.findByLabelText('Contraseña actual');
    completar(screen);

    fireEvent.press(screen.getByText('Eliminar mi cuenta'));
    expect(await screen.findByText('• Tienes servicios en curso. (2)')).toBeTruthy();
    expect(screen.getByText('No puedes eliminar tu cuenta todavía.')).toBeTruthy();
    expect(screen.queryByLabelText('Contraseña actual')).toBeNull();
    expect(screen.onAccountDeleted).not.toHaveBeenCalled();

    // Se resolvio el bloqueo: volver a revisar habilita un intento nuevo.
    solicitarEliminacionCuenta.mockResolvedValueOnce({ success: true });
    fireEvent.press(screen.getByText('Volver a revisar'));
    await screen.findByLabelText('Contraseña actual');
    completar(screen);
    fireEvent.press(screen.getByText('Eliminar mi cuenta'));
    await waitFor(() => expect(screen.onAccountDeleted).toHaveBeenCalledTimes(1));

    const [primera, segunda] = solicitarEliminacionCuenta.mock.calls.map(([args]) => args.idempotencyKey);
    expect(segunda).not.toBe(primera);
  });

  it('un error de red conserva la sesion y reintenta con la misma clave', async () => {
    solicitarEliminacionCuenta
      .mockRejectedValueOnce(apiError(null, 'No se pudo conectar con el servidor.'))
      .mockResolvedValueOnce({ success: true });
    const screen = renderScreen();
    await screen.findByLabelText('Contraseña actual');
    completar(screen);

    fireEvent.press(screen.getByText('Eliminar mi cuenta'));
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeTruthy();
    expect(screen.onAccountDeleted).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Eliminar mi cuenta'));
    await waitFor(() => expect(screen.onAccountDeleted).toHaveBeenCalledTimes(1));
    const [primera, segunda] = solicitarEliminacionCuenta.mock.calls.map(([args]) => args.idempotencyKey);
    expect(segunda).toBe(primera);
  });

  it('un 429 informa cuanto esperar', async () => {
    solicitarEliminacionCuenta.mockRejectedValueOnce(Object.assign(apiError(429, 'Too Many Attempts.'), { retryAfter: 42 }));
    const screen = renderScreen();
    await screen.findByLabelText('Contraseña actual');
    completar(screen);

    fireEvent.press(screen.getByText('Eliminar mi cuenta'));
    expect(await screen.findByText('Demasiados intentos. Intenta de nuevo en 42 segundos.')).toBeTruthy();
  });
});
