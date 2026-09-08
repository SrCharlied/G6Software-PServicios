import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import LoginScreen from './LoginScreen';
import { login, getMiProveedor } from '../services/api';

// Feather depende de carga de fuentes nativas, no disponible en este entorno de test.
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

jest.mock('../services/api', () => ({
  login: jest.fn(),
  getMiProveedor: jest.fn(),
}));

const mockToast = jest.fn();
jest.mock('../context/ToastContext', () => ({ useToast: () => mockToast }));

const fillAndSubmit = async () => {
  fireEvent.changeText(screen.getByPlaceholderText('correo@ejemplo.com'), 'user@servigt.test');
  fireEvent.changeText(screen.getByPlaceholderText('Contrasena'), 'clave-valida');
  fireEvent.press(screen.getByText('Ingresar'));
  await waitFor(() => expect(login).toHaveBeenCalled());
};

describe('LoginScreen manejo de errores de API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('en 429 muestra el mensaje de espera del backend sin iniciar sesion', async () => {
    const onLogin = jest.fn();
    login.mockRejectedValue({
      isApiError: true,
      name: 'ApiError',
      status: 429,
      retryAfter: 30,
      message: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
    });

    render(<LoginScreen onLogin={onLogin} />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith('Demasiados intentos. Espera un momento e intenta de nuevo.', 'error')
    );
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('un fallo de red no se trata como login valido', async () => {
    const onLogin = jest.fn();
    login.mockRejectedValue({
      isApiError: true,
      name: 'ApiError',
      status: null,
      message: 'No se pudo conectar con el servidor. Verifica que el backend este corriendo.',
    });

    render(<LoginScreen onLogin={onLogin} />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        'No se pudo conectar con el servidor. Verifica que el backend este corriendo.',
        'error'
      )
    );
    expect(onLogin).not.toHaveBeenCalled();
    expect(getMiProveedor).not.toHaveBeenCalled();
  });
});