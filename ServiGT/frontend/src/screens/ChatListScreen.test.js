import { fireEvent, render, screen } from '@testing-library/react-native';
import ChatListScreen from './ChatListScreen';
import { getHilosMensajes } from '../services/api';
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('../services/api', () => ({ getHilosMensajes: jest.fn() }));
jest.mock('./ChatScreen', () => ({ __esModule: true, default: () => null }));
const navigation = { navigate: jest.fn() };
const hilo = (tipo, id, no_leidos) => ({ tipo, contexto_id: id, contexto: { titulo: `${tipo} ${id}` }, contraparte: { id: 9, name: 'Misma persona' }, ultimo_mensaje: { contenido: `Mensaje ${tipo} ${id}` }, no_leidos });
beforeEach(() => { jest.clearAllMocks(); getHilosMensajes.mockReset(); });
it('mantiene dos servicios y una reserva con la misma persona separados', async () => {
  getHilosMensajes.mockResolvedValue({ hilos: [hilo('servicio', 21, 2), hilo('servicio', 22, 4), hilo('reserva', 31, 1)] });
  render(<ChatListScreen user={{ id: 1 }} navigation={navigation} />);
  await screen.findByText('Mensaje servicio 21');
  expect(screen.getByText('Mensaje servicio 22')).toBeTruthy();
  expect(screen.getByText('Mensaje reserva 31')).toBeTruthy();
  fireEvent.press(screen.getByText('Mensaje servicio 22'));
  expect(navigation.navigate).toHaveBeenCalledWith('ChatDetail', { tipo: 'servicio', contexto: 22, userId: 9 });
  fireEvent.press(screen.getByText('Mensaje reserva 31'));
  expect(navigation.navigate).toHaveBeenCalledWith('ChatDetail', { tipo: 'reserva', contexto: 31, userId: 9 });
  expect(screen.getByText('4')).toBeTruthy();
});
it('muestra loading, error y reintento sin convertirlo en vacio', async () => {
  getHilosMensajes.mockRejectedValueOnce(new Error('Sin conexion')).mockResolvedValueOnce({ hilos: [] });
  render(<ChatListScreen user={{ id: 1 }} navigation={navigation} />);
  expect(screen.getByText('Cargando mensajes...')).toBeTruthy();
  await screen.findByText('Sin conexion');
  expect(screen.queryByText('Bandeja vacia')).toBeNull();
  fireEvent.press(screen.getByText('Reintentar'));
  expect(await screen.findByText('Bandeja vacia')).toBeTruthy();
});
it('presenta legado solo lectura', async () => {
  getHilosMensajes.mockResolvedValue({ hilos: [{ ...hilo('legado', null, 0), solo_lectura: true }] });
  render(<ChatListScreen user={{ id: 1 }} navigation={navigation} />);
  expect(await screen.findByText('Solo lectura')).toBeTruthy();
});
