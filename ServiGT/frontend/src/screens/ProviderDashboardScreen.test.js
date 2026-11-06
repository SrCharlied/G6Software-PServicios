import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProviderDashboardScreen from './ProviderDashboardScreen';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('../context/ToastContext', () => ({ useToast: () => jest.fn() }));
jest.mock('../services/api', () => ({
  aceptarServicio: jest.fn(),
  actualizarEstadoServicio: jest.fn(),
  descargarDocumento: jest.fn(),
  finalizarServicio: jest.fn(),
  getCalificacionesProveedor: jest.fn(),
  getCategorias: jest.fn(),
  getDocumentos: jest.fn(),
  getMiCredito: jest.fn(),
  getMiDisponibilidad: jest.fn(),
  getMiProveedor: jest.fn(),
  getPedidosAbiertos: jest.fn(),
  getPremiumMiEstado: jest.fn(),
  getSolicitudesProveedor: jest.fn(),
  iniciarServicio: jest.fn(),
  rechazarServicio: jest.fn(),
  saveDisponibilidad: jest.fn(),
  uploadDocumento: jest.fn(),
}));
jest.mock('./provider/ProviderHeader', () => () => null);
jest.mock('./provider/PerfilPublicoCard', () => () => null);
jest.mock('./provider/DocumentosPanel', () => () => null);
jest.mock('./provider/OportunidadesPanel', () => () => null);
jest.mock('./provider/MensajesPanel', () => () => null);
jest.mock('./provider/HistorialPanel', () => () => null);
jest.mock('./provider/CalificacionesPanel', () => () => null);
jest.mock('./provider/DisponibilidadPanel', () => () => null);
jest.mock('./provider/ProviderModals', () => ({
  FinalizarServicioModal: () => null,
  IniciarServicioModal: () => null,
}));
jest.mock('./provider/SolicitudesPanel', () => {
  const { Text, TouchableOpacity, View } = require('react-native');
  return ({ pendientes, onAccept }) => (
    <View>
      {pendientes.map((servicio) => (
        <TouchableOpacity key={servicio.id} onPress={() => onAccept(servicio)}>
          <Text>Abrir aceptacion</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const api = require('../services/api');

const solicitud = {
  id: 21,
  estado: 'pendiente',
  descripcion: 'Reparar una fuga de agua',
  cliente: { name: 'Cliente real' },
  categoria: { nombre: 'Plomeria' },
};

describe('ProviderDashboardScreen confirmacion de solicitud directa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getDocumentos.mockResolvedValue({ documentos: [] });
    api.getSolicitudesProveedor.mockResolvedValue({ servicios: [solicitud] });
    api.getCalificacionesProveedor.mockResolvedValue({ calificaciones: [] });
    api.getMiDisponibilidad.mockResolvedValue({ disponibilidad: [] });
    api.getPremiumMiEstado.mockResolvedValue({ estado: 'nunca' });
    api.getMiCredito.mockResolvedValue({ saldo: 0 });
    api.aceptarServicio.mockResolvedValue({});
  });

  const renderScreen = () => render(
    <ProviderDashboardScreen
      navigation={{ navigate: jest.fn() }}
      user={{ id: 90, role: 'proveedor' }}
      providerProfile={{ id: 9, nombre: 'Servicios Saz', total_calificaciones: 0 }}
      setProviderProfile={jest.fn()}
      onLogout={jest.fn()}
    />
  );

  it('cancelar no llama API y confirmar envia una sola vez con los datos visibles', async () => {
    const screen = renderScreen();
    fireEvent.press(await screen.findByText('Abrir aceptacion'));

    expect(screen.getByText('Aceptar solicitud directa')).toBeTruthy();
    expect(screen.getByText(/Cliente real.*Plomeria.*Reparar una fuga/)).toBeTruthy();
    expect(api.aceptarServicio).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Cancelar'));
    expect(api.aceptarServicio).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Abrir aceptacion'));
    fireEvent.press(screen.getByText('Aceptar solicitud'));

    await waitFor(() => expect(api.aceptarServicio).toHaveBeenCalledTimes(1));
    expect(api.aceptarServicio).toHaveBeenCalledWith(solicitud.id);
  });

  it('un error conserva el modal y el contexto de la solicitud', async () => {
    api.aceptarServicio.mockRejectedValueOnce(new Error('La solicitud ya cambio de estado.'));
    const screen = renderScreen();

    fireEvent.press(await screen.findByText('Abrir aceptacion'));
    fireEvent.press(screen.getByText('Aceptar solicitud'));

    expect(await screen.findByText('La solicitud ya cambio de estado.')).toBeTruthy();
    expect(screen.getByText('Aceptar solicitud directa')).toBeTruthy();
    expect(screen.getByText(/Cliente real.*Plomeria.*Reparar una fuga/)).toBeTruthy();
  });
});
