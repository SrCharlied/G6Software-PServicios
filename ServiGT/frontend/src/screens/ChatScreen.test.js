import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ChatScreen from './ChatScreen';
import { getMensajesContexto, enviarMensajeContexto, getReservaMaterial } from '../services/api';
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('../services/api', () => ({ getMensajesContexto: jest.fn(), enviarMensajeContexto: jest.fn(), getReservaMaterial: jest.fn() }));
const response = (id, extra = {}) => ({ mensajes: [{ id, emisor_id: 9, contenido: `Mensaje ${id}` }], contexto: { tipo: 'servicio', id, estado: 'aceptado', solo_lectura: false }, contraparte: { id: 9, name: 'Nombre del backend' }, ...extra });
const navigation = { navigate: jest.fn() };
const props = { user: { id: 1 }, navigation, context: { tipo: 'servicio', id: 21 } };
beforeEach(() => { jest.clearAllMocks(); getMensajesContexto.mockReset().mockResolvedValue(response(21)); enviarMensajeContexto.mockReset(); });
it('usa nombre y permiso autoritativos y envia solo contenido al contexto', async () => {
  enviarMensajeContexto.mockResolvedValue({ mensaje: { id: 50, emisor_id: 1, contenido: 'Hola' } });
  render(<ChatScreen {...props} chatWithName="Nombre arbitrario" />);
  expect(await screen.findByText('Nombre del backend')).toBeTruthy();
  fireEvent.changeText(screen.getByPlaceholderText('Escribe un mensaje'), 'Hola');
  fireEvent.press(screen.getByLabelText('Enviar mensaje'));
  expect(await screen.findByText('Hola')).toBeTruthy();
  expect(enviarMensajeContexto).toHaveBeenCalledWith({ tipo: 'servicio', id: 21 }, 'Hola');
});
it('ignora respuesta antigua al cambiar rapido de hilo', async () => {
  let resolve;
  getMensajesContexto.mockReturnValueOnce(new Promise((r) => { resolve = r; })).mockResolvedValue(response(22));
  const { rerender } = render(<ChatScreen {...props} />);
  rerender(<ChatScreen {...props} context={{ tipo: 'servicio', id: 22 }} />);
  await screen.findByText('Mensaje 22');
  await act(async () => resolve(response(21)));
  expect(screen.queryByText('Mensaje 21')).toBeNull();
});
it('una reserva distinta no comparte mensajes ni texto pendiente', async () => {
  const { rerender } = render(<ChatScreen {...props} />);
  await screen.findByText('Mensaje 21');
  fireEvent.changeText(screen.getByPlaceholderText('Escribe un mensaje'), 'Borrador servicio');
  getMensajesContexto.mockResolvedValue(response(31, { contexto: { tipo: 'reserva', id: 31, solo_lectura: false } }));
  rerender(<ChatScreen {...props} context={{ tipo: 'reserva', id: 31 }} />);
  await screen.findByText('Mensaje 31');
  expect(screen.queryByText('Mensaje 21')).toBeNull();
  expect(screen.getByPlaceholderText('Escribe un mensaje').props.value).toBe('');
});
it('el polling tardio de otro contexto no contamina el nuevo', async () => {
  jest.useFakeTimers();
  try {
    const { rerender, unmount } = render(<ChatScreen {...props} />);
    await act(async () => {});
    let resolve;
    getMensajesContexto.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    await act(async () => jest.advanceTimersByTime(5000));
    getMensajesContexto.mockResolvedValue(response(22));
    rerender(<ChatScreen {...props} context={{ tipo: 'servicio', id: 22 }} />);
    await act(async () => {});
    await act(async () => resolve(response(99)));
    expect(screen.getByText('Mensaje 22')).toBeTruthy();
    expect(screen.queryByText('Mensaje 99')).toBeNull();
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  } finally { jest.useRealTimers(); }
});
it('409 legacy muestra ambiguedad y no envia ni escoge servicio', async () => {
  getMensajesContexto.mockRejectedValue(Object.assign(new Error('Varios servicios'), { status: 409 }));
  render(<ChatScreen {...props} context={undefined} chatWithUserId={9} />);
  expect(await screen.findByText('Hay varios contextos con esta persona. Abre el hilo desde la bandeja.')).toBeTruthy();
  expect(screen.queryByPlaceholderText('Escribe un mensaje')).toBeNull();
  expect(enviarMensajeContexto).not.toHaveBeenCalled();
});
it.each(['legado', 'legacy'])('historial %s permanece solo lectura', async (tipo) => {
  getMensajesContexto.mockResolvedValue(response(21));
  render(<ChatScreen {...props} context={{ tipo, contraparteId: 9 }} />);
  await screen.findByText('Mensaje 21');
  expect(screen.queryByPlaceholderText('Escribe un mensaje')).toBeNull();
});
it('servicio interrumpido conserva historial y bloquea envio', async () => {
  getMensajesContexto.mockResolvedValue(response(21, { contexto: { tipo: 'servicio', id: 21, estado: 'interrumpido_seguridad', solo_lectura: true } }));
  render(<ChatScreen {...props} />);
  await screen.findByText('Mensaje 21');
  expect(screen.getByText('Servicio interrumpido por seguridad. Chat de solo lectura.')).toBeTruthy();
  expect(screen.queryByPlaceholderText('Escribe un mensaje')).toBeNull();
});
it('error de API permite reintentar y no oculta el fallo', async () => {
  getMensajesContexto.mockRejectedValueOnce(new Error('Sin conexion'));
  render(<ChatScreen {...props} />);
  await screen.findByText('Sin conexion');
  fireEvent.press(screen.getByText('Reintentar'));
  expect(await screen.findByText('Mensaje 21')).toBeTruthy();
});
it('conserva borrador ante fallo al enviar', async () => {
  enviarMensajeContexto.mockRejectedValue(new Error('No enviado'));
  render(<ChatScreen {...props} />);
  await screen.findByText('Mensaje 21');
  fireEvent.changeText(screen.getByPlaceholderText('Escribe un mensaje'), 'Mi mensaje');
  fireEvent.press(screen.getByLabelText('Enviar mensaje'));
  await screen.findByText('No enviado');
  expect(screen.getByPlaceholderText('Escribe un mensaje').props.value).toBe('Mi mensaje');
});
it('abre el lote autoritativo de la reserva', async () => {
  getMensajesContexto.mockResolvedValue(response(31, { contexto: { tipo: 'reserva', id: 31, solo_lectura: false } }));
  getReservaMaterial.mockResolvedValue({ reserva: { publicacion: { id: 71 } } });
  render(<ChatScreen {...props} context={{ tipo: 'reserva', id: 31 }} />);
  fireEvent.press(await screen.findByText('Ver lote'));
  await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('MaterialDetail', { id: 71 }));
});
