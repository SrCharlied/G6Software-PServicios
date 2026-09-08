import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import SolicitudFormScreen from './SolicitudFormScreen';
import { createServicio } from '../services/api';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Feather: ({ name }) => <Text>{name}</Text> };
});

jest.mock('../context/ToastContext', () => ({ useToast: () => jest.fn() }));
jest.mock('../services/api', () => ({ createServicio: jest.fn() }));

const proveedor = {
  id: 7,
  nombre: 'Servicios Gomez',
  departamento: 'Guatemala',
  municipio: 'Mixco',
  categoria_id: 3,
  categoria: { id: 3, nombre: 'Electricidad' },
};

describe('SolicitudFormScreen desde publicacion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createServicio.mockResolvedValue({ servicio: { id: 1 } });
  });

  it('envia publicacion_id al flujo existente de crear servicio', async () => {
    const navigation = { navigate: jest.fn() };
    render(
      <SolicitudFormScreen
        navigation={navigation}
        user={{ id: 1, role: 'cliente' }}
        selectedProvider={proveedor}
        publicacionId="11"
      />
    );

    fireEvent.changeText(
      screen.getByPlaceholderText('Describe detalladamente lo que necesitas...'),
      'Necesito instalar una lampara en la sala'
    );
    fireEvent.press(screen.getByText('Enviar solicitud'));

    await waitFor(() => expect(createServicio).toHaveBeenCalledWith(expect.objectContaining({
      proveedor_id: proveedor.id,
      categoria_id: proveedor.categoria_id,
      publicacion_id: 11,
      descripcion: 'Necesito instalar una lampara en la sala',
    })));
  });
});
