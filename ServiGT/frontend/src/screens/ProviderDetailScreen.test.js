import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ProviderDetailScreen from './ProviderDetailScreen';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Feather: ({ name }) => <Text>{name}</Text> };
});

jest.mock('../context/ToastContext', () => ({ useToast: () => jest.fn() }));

jest.mock('../services/api', () => ({
  getProvider: jest.fn(),
  getCalificacionesProveedor: jest.fn(),
  getDisponibilidadProveedor: jest.fn(),
  getPublicaciones: jest.fn(),
  storageUrl: (path) => (path ? `https://cdn.test${path}` : null),
}));

const {
  getProvider,
  getCalificacionesProveedor,
  getDisponibilidadProveedor,
  getPublicaciones,
} = require('../services/api');

const proveedor = {
  id: 7,
  user_id: 70,
  nombre: 'Servicios Gomez',
  departamento: 'Guatemala',
  municipio: 'Mixco',
  categoria_id: 3,
  categoria: { id: 3, nombre: 'Electricidad' },
  categorias: [{ id: 3, nombre: 'Electricidad' }],
};

const publicacion = {
  id: 11,
  titulo: 'Instalacion electrica residencial',
  descripcion: 'Revision y reparacion de instalaciones electricas en el hogar.',
  precio_referencial: 250,
  imagen: null,
  estado: 'activa',
  categoria: { id: 3, nombre: 'Electricidad' },
  proveedor: { id: proveedor.id, nombre: proveedor.nombre },
};

const renderScreen = (overrides = {}) => {
  const navigation = { navigate: jest.fn() };
  const result = render(
    <ProviderDetailScreen
      navigation={navigation}
      user={{ id: 1, role: 'cliente' }}
      providerProfile={null}
      selectedProvider={proveedor}
      {...overrides}
    />
  );
  return { ...result, navigation };
};

describe('ProviderDetailScreen publicaciones', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getProvider.mockResolvedValue({ proveedor });
    getCalificacionesProveedor.mockResolvedValue({ calificaciones: [] });
    getDisponibilidadProveedor.mockResolvedValue({ disponibilidad: [] });
    getPublicaciones.mockResolvedValue({ publicaciones: [publicacion] });
  });

  it('carga publicaciones visibles del proveedor y reutiliza PublicacionCard', async () => {
    renderScreen();

    expect(await screen.findByText('Instalacion electrica residencial')).toBeTruthy();
    expect(screen.getByText('Q250.00')).toBeTruthy();
    expect(getPublicaciones).toHaveBeenCalledWith({ proveedorId: proveedor.id, perPage: 50 });
  });

  it('muestra loading, vacio y error sin convertir fallos en lista vacia silenciosa', async () => {
    let resolver;
    getPublicaciones.mockReturnValueOnce(new Promise((resolve) => { resolver = resolve; }));
    renderScreen();

    await waitFor(() => expect(screen.getByText('Cargando publicaciones...')).toBeTruthy());
    resolver({ publicaciones: [] });
    expect(await screen.findByText('Este proveedor aun no tiene publicaciones visibles.')).toBeTruthy();

    getPublicaciones.mockRejectedValueOnce(new Error('No se pudieron cargar las publicaciones.'));
    renderScreen();
    expect(await screen.findByText('No se pudieron cargar las publicaciones.')).toBeTruthy();
  });

  it('permite solicitar desde una publicacion y ya no ofrece chat directo', async () => {
    const { navigation } = renderScreen();

    await screen.findByText('Instalacion electrica residencial');
    fireEvent.press(screen.getAllByText('Solicitar servicio').at(-1));

    expect(navigation.navigate).toHaveBeenCalledWith('SolicitudForm', {
      provider: proveedor,
      publicacionId: publicacion.id,
    });
    expect(screen.queryByText('Chat')).toBeNull();
    expect(screen.queryByText('Contactar')).toBeNull();
    expect(screen.queryByText('Enviar mensaje')).toBeNull();
  });
});
