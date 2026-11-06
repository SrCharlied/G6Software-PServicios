import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProviderEditProfileScreen from './ProviderEditProfileScreen';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('../context/ToastContext', () => ({ useToast: () => jest.fn() }));
jest.mock('../services/api', () => ({
  createProvider: jest.fn(),
  deletePortada: jest.fn(),
  getCategorias: jest.fn(),
  storageUrl: (path) => (path ? `https://cdn.test${path}` : null),
  updateProvider: jest.fn(),
  uploadFotoPerfil: jest.fn(),
  uploadPortada: jest.fn(),
}));

const {
  deletePortada,
  getCategorias,
  updateProvider,
} = require('../services/api');

const profile = {
  id: 9,
  nombre: 'Servicios Saz',
  telefono: '55550199',
  descripcion: 'Descripcion suficientemente larga del servicio.',
  experiencia_resumen: 'Experiencia inicial',
  departamento: 'Guatemala',
  municipio: 'Mixco',
  tarifa_hora: 75,
  tarifa_proyecto: 400,
  nivel: 'experto',
  categoria_id: 3,
  categorias: [{ id: 3, nombre: 'Electricidad' }],
  premium_estado: 'vencido',
  color_acento: '#1b5499',
  portada: '/storage/portadas/historica.jpg',
};

const renderScreen = (overrides = {}) => render(
  <ProviderEditProfileScreen
    navigation={{ navigate: jest.fn() }}
    user={{ id: 90, name: 'Antony', email: 'antony@example.test' }}
    providerProfile={{ ...profile, ...overrides }}
    onProfileUpdated={jest.fn()}
  />
);

describe('ProviderEditProfileScreen personalizacion y experiencia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCategorias.mockResolvedValue({ categorias: profile.categorias });
    updateProvider.mockResolvedValue({ proveedor: profile });
    deletePortada.mockResolvedValue({ portada: null });
  });

  it('omite el color historico sin cambios al guardar con Premium vencido', async () => {
    const { getByText, getByLabelText } = renderScreen();

    expect(getByLabelText('Verde jade').props.accessibilityState.disabled).toBe(true);
    fireEvent.press(getByText('Guardar cambios'));

    await waitFor(() => expect(updateProvider).toHaveBeenCalledTimes(1));
    const payload = updateProvider.mock.calls[0][1];
    expect(payload).not.toHaveProperty('color_acento');
    expect(payload.experiencia_resumen).toBe('Experiencia inicial');
  });

  it('permite quitar color y portada aunque Premium este vencido', async () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Quitar'));
    await waitFor(() => expect(deletePortada).toHaveBeenCalledWith(profile.id));

    fireEvent.press(getByText('Sin color'));
    fireEvent.press(getByText('Guardar cambios'));

    await waitFor(() => expect(updateProvider).toHaveBeenCalledTimes(1));
    expect(updateProvider.mock.calls[0][1]).toEqual(expect.objectContaining({ color_acento: null }));
  });

  it('Premium activo puede reemplazar el color y publica el contador de experiencia', async () => {
    const { getByText, getByLabelText } = renderScreen({ premium_estado: 'activo' });

    expect(getByText('19/1000')).toBeTruthy();
    fireEvent.press(getByLabelText('Verde jade'));
    fireEvent.press(getByText('Guardar cambios'));

    await waitFor(() => expect(updateProvider).toHaveBeenCalledTimes(1));
    expect(updateProvider.mock.calls[0][1]).toEqual(expect.objectContaining({ color_acento: '#0f766e' }));
  });
});

describe('ProviderEditProfileScreen telefono y descripcion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCategorias.mockResolvedValue({ categorias: profile.categorias });
    updateProvider.mockResolvedValue({ proveedor: profile });
  });

  it('guarda perfil ordinario sin enviar un color que no cambio', async () => {
    const screen = renderScreen({ color_acento: null });
    await screen.findByText(/Electricidad$/);
    fireEvent.press(screen.getByText('Guardar cambios'));
    await waitFor(() => expect(updateProvider).toHaveBeenCalledWith(profile.id,
      expect.objectContaining({ telefono: profile.telefono, descripcion: profile.descripcion })));
    expect(updateProvider.mock.calls[0][1]).not.toHaveProperty('color_acento');
  });

  it.each(['', '5555-0101', '+50255550101', '1234567', '123456789'])('rechaza telefono %s sin enviar API', async (phone) => {
    const screen = renderScreen();
    await screen.findByText(/Electricidad$/);
    fireEvent.changeText(screen.getByPlaceholderText('Ej: 55551234'), phone);
    fireEvent.press(screen.getByText('Guardar cambios'));
    expect(screen.getByText('Ingresa un telefono local de 8 digitos.')).toBeTruthy();
    expect(updateProvider).not.toHaveBeenCalled();
  });

  it.each([19, 20, 500, 501])('valida descripcion de %s y muestra contador', async (length) => {
    const screen = renderScreen();
    await screen.findByText(/Electricidad$/);
    fireEvent.changeText(screen.getByPlaceholderText('Describe los servicios que ofreces, tu experiencia, horarios...'), 'a'.repeat(length));
    expect(screen.getByText(`${length}/500 caracteres`)).toBeTruthy();
    fireEvent.press(screen.getByText('Guardar cambios'));
    if (length === 20 || length === 500) await waitFor(() => expect(updateProvider).toHaveBeenCalledTimes(1));
    else expect(updateProvider).not.toHaveBeenCalled();
  });

  it.each([1000, 1001])('conserva el limite de experiencia de %s caracteres', async (length) => {
    const screen = renderScreen();
    await screen.findByText(/Electricidad$/);
    fireEvent.changeText(screen.getByPlaceholderText('Resume tu trayectoria, especialidades y logros relevantes (opcional)'), 'a'.repeat(length));
    expect(screen.getByText(`${length}/1000`)).toBeTruthy();
    fireEvent.press(screen.getByText('Guardar cambios'));
    if (length === 1000) await waitFor(() => expect(updateProvider).toHaveBeenCalledWith(profile.id,
      expect.objectContaining({ experiencia_resumen: 'a'.repeat(length) })));
    else {
      expect(screen.getByText('El resumen no puede superar 1000 caracteres.')).toBeTruthy();
      expect(updateProvider).not.toHaveBeenCalled();
    }
  });
});

describe('ProviderEditProfileScreen categorias (HU 1.6.c)', () => {
  const CATALOGO = [
    { id: 1, nombre: 'Albanileria' },
    { id: 3, nombre: 'Electricidad' },
    { id: 5, nombre: 'Plomeria' },
    { id: 7, nombre: 'Pintura' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    getCategorias.mockResolvedValue({ categorias: CATALOGO });
    updateProvider.mockResolvedValue({ proveedor: profile });
  });

  it('envia la principal elegida como categoria_id y primera del conjunto', async () => {
    const screen = renderScreen({
      categoria_id: 3,
      categorias: [{ id: 5, nombre: 'Plomeria' }, { id: 3, nombre: 'Electricidad' }],
    });
    await screen.findByLabelText('Principal: Plomeria');
    fireEvent.press(screen.getByLabelText('Principal: Plomeria'));
    fireEvent.press(screen.getByText('Guardar cambios'));

    await waitFor(() => expect(updateProvider).toHaveBeenCalledTimes(1));
    expect(updateProvider.mock.calls[0][1]).toEqual(expect.objectContaining({
      categoria_id: 5,
      categoria_ids: [5, 3],
    }));
  });

  it('un perfil historico con cuatro categorias no se guarda hasta dejar tres', async () => {
    const screen = renderScreen({ categoria_id: 1, categorias: CATALOGO });
    await screen.findByText(/Tu perfil tiene 4 categorías/);

    fireEvent.press(screen.getByText('Guardar cambios'));
    expect(screen.getByText(/máximo 3 categorías; quita 1/)).toBeTruthy();
    expect(updateProvider).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Categoría Pintura'));
    fireEvent.press(screen.getByText('Guardar cambios'));
    await waitFor(() => expect(updateProvider).toHaveBeenCalledTimes(1));
    expect(updateProvider.mock.calls[0][1]).toEqual(expect.objectContaining({
      categoria_id: 1,
      categoria_ids: [1, 3, 5],
    }));
  });
});
