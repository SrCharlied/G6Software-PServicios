import { render, screen, waitFor } from '@testing-library/react-native';
import MisPublicacionesScreen from './MisPublicacionesScreen';
import { getCategorias, getMisPublicaciones } from '../services/api';

jest.mock('../context/ToastContext', () => ({ useToast: () => jest.fn() }));

// Feather depende de carga de fuentes nativas, que no esta disponible en este
// entorno de test. Se mockea igual que cualquier otra dependencia de
// infraestructura ajena a lo que este test verifica.
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

jest.mock('../services/api', () => ({
  getMisPublicaciones: jest.fn(),
  getCategorias: jest.fn(),
  crearPublicacion: jest.fn(),
  actualizarPublicacion: jest.fn(),
  activarPublicacion: jest.fn(),
  desactivarPublicacion: jest.fn(),
  eliminarPublicacion: jest.fn(),
  storageUrl: (path) => (path ? `https://cdn.test${path}` : null),
}));

const publicacionBase = {
  id: 1,
  titulo: 'Instalación eléctrica residencial',
  descripcion: 'Revisión y reparación de instalaciones eléctricas en el hogar.',
  precio_referencial: 250,
  imagen: null,
  estado: 'activa',
  categoria: { id: 2, nombre: 'Electricidad' },
  proveedor: { id: 5, nombre: 'Juan Pérez' },
};

const navigation = { goBack: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  getCategorias.mockResolvedValue({ categorias: [{ id: 2, nombre: 'Electricidad' }] });
});

describe('MisPublicacionesScreen', () => {
  it('muestra el estado de carga mientras llega la respuesta', () => {
    getMisPublicaciones.mockReturnValue(new Promise(() => {})); // nunca resuelve

    render(<MisPublicacionesScreen navigation={navigation} />);

    expect(screen.getByText('Cargando tus publicaciones...')).toBeTruthy();
  });

  it('muestra el estado de error cuando falla la carga', async () => {
    getMisPublicaciones.mockRejectedValue(new Error('No se pudieron cargar tus publicaciones.'));

    render(<MisPublicacionesScreen navigation={navigation} />);

    expect(await screen.findByText('No se pudieron cargar tus publicaciones.')).toBeTruthy();
    expect(screen.getByText('Reintentar')).toBeTruthy();
  });

  it('muestra el estado vacio cuando el proveedor no tiene publicaciones', async () => {
    getMisPublicaciones.mockResolvedValue({
      publicaciones: [],
      total: 0,
      cupos: { activas: 0, limite: 1, disponibles: 1 },
    });

    render(<MisPublicacionesScreen navigation={navigation} />);

    expect(await screen.findByText('Aun no tienes publicaciones')).toBeTruthy();
  });

  it('refleja el limite alcanzado tal como lo entrega la API, sin recalcularlo', async () => {
    getMisPublicaciones.mockResolvedValue({
      publicaciones: [publicacionBase],
      total: 1,
      cupos: { activas: 1, limite: 1, disponibles: 0 },
    });

    render(<MisPublicacionesScreen navigation={navigation} />);

    expect(await screen.findByText('1/1')).toBeTruthy();
    expect(screen.getByText(/Alcanzaste tu limite de publicaciones activas/)).toBeTruthy();
  });

  it('muestra el listado con el contador de cupos cuando hay publicaciones y cupo disponible', async () => {
    getMisPublicaciones.mockResolvedValue({
      publicaciones: [publicacionBase],
      total: 1,
      cupos: { activas: 1, limite: 3, disponibles: 2 },
    });

    render(<MisPublicacionesScreen navigation={navigation} />);

    expect(await screen.findByText('Instalación eléctrica residencial')).toBeTruthy();
    expect(screen.getByText('1/3')).toBeTruthy();
    expect(screen.queryByText(/Alcanzaste tu limite/)).toBeNull();
  });
});
