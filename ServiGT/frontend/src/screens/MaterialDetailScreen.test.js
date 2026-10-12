import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import MaterialDetailScreen from './MaterialDetailScreen';
import { getMaterialDetalle, solicitarReservaMaterial } from '../services/api';
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('../services/api', () => ({ getMaterialDetalle: jest.fn(), solicitarReservaMaterial: jest.fn(), storageUrl: (x) => x }));
jest.mock('../services/sessionStorage', () => ({ sessionStorage: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}) } }));
const lote = { id: 7, titulo: 'Tubos PVC', descripcion: 'Sobrante de servicio', cantidad: 10, unidad: 'metros', precio_referencial: 0, departamento: 'Guatemala', estado: 'disponible', imagenes: [], vendedor: { nombre: 'Vendedor', telefono: 'privado' } };
const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const props = { user: { id: 9, role: 'proveedor' }, materialId: 7, navigation };
beforeEach(() => { jest.clearAllMocks(); getMaterialDetalle.mockReset(); solicitarReservaMaterial.mockReset(); getMaterialDetalle.mockResolvedValue({ publicacion: lote }); });
it.each(['cliente', 'admin'])('bloquea el detalle para %s', (role) => {
  render(<MaterialDetailScreen {...props} user={{ role }} />);
  expect(getMaterialDetalle).not.toHaveBeenCalled();
});
it('carga, muestra error y reintenta', async () => {
  getMaterialDetalle.mockRejectedValueOnce(new Error('Sin conexion'));
  render(<MaterialDetailScreen {...props} />);
  expect(screen.getByText('Cargando lote...')).toBeTruthy();
  expect(await screen.findByText('Sin conexion')).toBeTruthy();
  fireEvent.press(screen.getByText('Reintentar'));
  expect(await screen.findByText('Tubos PVC')).toBeTruthy();
  expect(screen.queryByText('privado')).toBeNull();
  expect(screen.queryByText('Abrir chat')).toBeNull();
});
it('reserva confirmada habilita chat contextual y evita doble envio', async () => {
  let resolve;
  solicitarReservaMaterial.mockReturnValue(new Promise((r) => { resolve = r; }));
  render(<MaterialDetailScreen {...props} />);
  await screen.findByText('Tubos PVC');
  fireEvent.changeText(screen.getByLabelText('Mensaje inicial'), 'Me interesa el lote');
  const submit = screen.getByText('Solicitar reserva');
  fireEvent.press(submit);
  fireEvent.press(submit);
  await waitFor(() => expect(solicitarReservaMaterial).toHaveBeenCalledTimes(1));
  await act(async () => resolve({ reserva: { id: 12, estado: 'pendiente', chat: { tipo: 'reserva', id: 12 } } }));
  expect(await screen.findByText('Solicitud enviada correctamente.')).toBeTruthy();
  fireEvent.press(screen.getByText('Abrir chat'));
  expect(navigation.navigate).toHaveBeenCalledWith('ChatContexto', { tipo: 'reserva', id: 12 });
});
it('reutiliza la misma clave al reintentar una respuesta perdida', async () => {
  solicitarReservaMaterial.mockRejectedValueOnce(new Error('Conexion perdida')).mockResolvedValueOnce({ reserva: { id: 12, estado: 'pendiente' } });
  render(<MaterialDetailScreen {...props} />);
  await screen.findByText('Tubos PVC');
  fireEvent.changeText(screen.getByLabelText('Mensaje inicial'), 'Me interesa');
  fireEvent.press(screen.getByText('Solicitar reserva'));
  await screen.findByText('Conexion perdida');
  const first = solicitarReservaMaterial.mock.calls[0][1];
  fireEvent.press(screen.getByText('Solicitar reserva'));
  await screen.findByText('Solicitud enviada correctamente.');
  expect(solicitarReservaMaterial.mock.calls[1][1]).toEqual(first);
});
it('409 informa duplicado y recarga la reserva real', async () => {
  solicitarReservaMaterial.mockRejectedValue(Object.assign(new Error('Ya tienes una solicitud vigente'), { status: 409 }));
  render(<MaterialDetailScreen {...props} />);
  await screen.findByText('Tubos PVC');
  getMaterialDetalle.mockResolvedValue({ publicacion: { ...lote, mi_reserva: { id: 12, estado: 'pendiente' } } });
  fireEvent.changeText(screen.getByLabelText('Mensaje inicial'), 'Me interesa');
  fireEvent.press(screen.getByText('Solicitar reserva'));
  expect(await screen.findByText('Ya tienes una solicitud vigente')).toBeTruthy();
  expect(await screen.findByText('Abrir chat')).toBeTruthy();
});
it.each(['reservado', 'vendido', 'retirado'])('no permite reservar lote %s', async (estado) => {
  getMaterialDetalle.mockResolvedValue({ publicacion: { ...lote, estado } });
  render(<MaterialDetailScreen {...props} />);
  await screen.findByText('Tubos PVC');
  expect(screen.queryByText('Solicitar reserva')).toBeNull();
});
