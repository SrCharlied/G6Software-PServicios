import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import MyMaterialReservationsScreen from './MyMaterialReservationsScreen';
import { cancelarReservaMaterial, getMisReservasMaterial } from '../services/api';

const mockToast = jest.fn();
jest.mock('../context/ToastContext', () => ({ useToast: () => mockToast }));
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

jest.mock('../services/api', () => ({
  getMisReservasMaterial: jest.fn(),
  cancelarReservaMaterial: jest.fn(),
  storageUrl: (path) => (path ? `https://cdn.test${path}` : null),
}));

const reserva = (id, estado, acciones, extra = {}) => ({
  id,
  publicacion_id: 100 + id,
  estado,
  mensaje_inicial: `Quiero el lote ${id}`,
  rol: 'comprador',
  acciones,
  chat: { tipo: 'reserva', id },
  publicacion: {
    id: 100 + id,
    titulo: `Lote ${id}`,
    estado: 'disponible',
    cantidad: 5,
    unidad: 'sacos',
    precio_referencial: 80,
    departamento: 'Escuintla',
    municipio: null,
    imagen_principal: '/storage/materiales/1/a.jpg',
    vendedor: { id: 9, nombre: `Vendedor ${id}` },
  },
  ...extra,
});

const meta = (total = 1, lastPage = 1, currentPage = 1) => ({ total, per_page: 20, current_page: currentPage, last_page: lastPage });

const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const renderScreen = () => render(<MyMaterialReservationsScreen navigation={navigation} />);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MyMaterialReservationsScreen — estados de la lista', () => {
  it('muestra loading', () => {
    getMisReservasMaterial.mockReturnValue(new Promise(() => {}));

    renderScreen();

    expect(screen.getByText('Cargando tus reservas...')).toBeTruthy();
  });

  it('muestra el error con reintento y nunca como lista vacia', async () => {
    getMisReservasMaterial.mockRejectedValueOnce(new Error('No se pudieron cargar tus reservas de materiales.'));

    renderScreen();

    expect(await screen.findByText('No se pudieron cargar tus reservas de materiales.')).toBeTruthy();
    expect(screen.queryByText('Aún no tienes reservas')).toBeNull();

    getMisReservasMaterial.mockResolvedValueOnce({ reservas: [reserva(1, 'pendiente', ['cancelar'])], meta: meta() });
    fireEvent.press(screen.getByText('Reintentar'));

    expect(await screen.findByText('Lote 1')).toBeTruthy();
  });

  it('muestra el estado vacio', async () => {
    getMisReservasMaterial.mockResolvedValue({ reservas: [], meta: meta(0) });

    renderScreen();

    expect(await screen.findByText('Aún no tienes reservas')).toBeTruthy();
  });

  it('muestra solo las reservas que devuelve el backend, con su estado y datos', async () => {
    getMisReservasMaterial.mockResolvedValue({
      reservas: [reserva(1, 'pendiente', ['cancelar']), reserva(2, 'aceptada', ['cancelar'])],
      meta: meta(2),
    });

    renderScreen();

    expect(await screen.findByText('Lote 1')).toBeTruthy();
    expect(screen.getByText('Lote 2')).toBeTruthy();
    expect(screen.getByText('Pendiente')).toBeTruthy();
    expect(screen.getByText('Aceptada')).toBeTruthy();
    expect(screen.getByText('Vendedor 1')).toBeTruthy();
    expect(screen.getAllByText(/5 sacos/).length).toBe(2);
    expect(screen.getByText('Quiero el lote 1')).toBeTruthy();
  });
});

describe('MyMaterialReservationsScreen — acciones', () => {
  it('ofrece cancelar solo cuando el backend lo permite', async () => {
    getMisReservasMaterial.mockResolvedValue({
      reservas: [
        reserva(1, 'pendiente', ['cancelar']),
        reserva(2, 'rechazada', []),
        reserva(3, 'cancelada', []),
      ],
      meta: meta(3),
    });

    renderScreen();
    await screen.findByText('Lote 1');

    expect(within(screen.getByTestId('reserva-1')).getByText('Cancelar reserva')).toBeTruthy();
    expect(within(screen.getByTestId('reserva-2')).queryByText('Cancelar reserva')).toBeNull();
    expect(within(screen.getByTestId('reserva-3')).queryByText('Cancelar reserva')).toBeNull();
  });

  it('cancelar pide confirmacion, llama al backend y refresca; la accion terminal desaparece', async () => {
    getMisReservasMaterial
      .mockResolvedValueOnce({ reservas: [reserva(1, 'aceptada', ['cancelar'])], meta: meta() })
      .mockResolvedValueOnce({ reservas: [reserva(1, 'cancelada', [])], meta: meta() });
    cancelarReservaMaterial.mockResolvedValue({ success: true });

    renderScreen();
    await screen.findByText('Lote 1');

    fireEvent.press(screen.getByText('Cancelar reserva'));
    expect(cancelarReservaMaterial).not.toHaveBeenCalled();
    expect(screen.getByText('Sí, cancelar')).toBeTruthy();

    fireEvent.press(screen.getByText('Sí, cancelar'));

    await waitFor(() => expect(cancelarReservaMaterial).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.getByText('Cancelada')).toBeTruthy());
    expect(screen.queryByText('Cancelar reserva')).toBeNull();
    expect(mockToast).toHaveBeenCalledWith('Reserva cancelada.', 'success');
    expect(getMisReservasMaterial).toHaveBeenCalledTimes(2);
  });

  it('volver en la confirmacion no llama al backend', async () => {
    getMisReservasMaterial.mockResolvedValue({ reservas: [reserva(1, 'pendiente', ['cancelar'])], meta: meta() });

    renderScreen();
    await screen.findByText('Lote 1');

    fireEvent.press(screen.getByText('Cancelar reserva'));
    fireEvent.press(screen.getByText('No, volver'));

    expect(cancelarReservaMaterial).not.toHaveBeenCalled();
  });

  it('un error del backend no se presenta como exito ni altera la reserva mostrada', async () => {
    getMisReservasMaterial.mockResolvedValue({ reservas: [reserva(1, 'pendiente', ['cancelar'])], meta: meta() });
    cancelarReservaMaterial.mockRejectedValue(new Error('Esta reserva ya no se puede cancelar.'));

    renderScreen();
    await screen.findByText('Lote 1');

    fireEvent.press(screen.getByText('Cancelar reserva'));
    fireEvent.press(screen.getByText('Sí, cancelar'));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Esta reserva ya no se puede cancelar.', 'error'));
    expect(mockToast).not.toHaveBeenCalledWith('Reserva cancelada.', 'success');
    expect(screen.getByText('Pendiente')).toBeTruthy();
    expect(screen.getByText('Cancelar reserva')).toBeTruthy();
    expect(getMisReservasMaterial).toHaveBeenCalledTimes(1);
  });

  it('abre el hilo contextual de la reserva', async () => {
    getMisReservasMaterial.mockResolvedValue({ reservas: [reserva(7, 'aceptada', ['cancelar'])], meta: meta() });

    renderScreen();
    await screen.findByText('Lote 7');

    fireEvent.press(screen.getByText('Abrir chat'));

    expect(navigation.navigate).toHaveBeenCalledWith('ChatContexto', { tipo: 'reserva', id: 7 });
  });
});

describe('MyMaterialReservationsScreen — paginacion y navegacion', () => {
  it('carga la siguiente pagina y la agrega sin perder la primera', async () => {
    getMisReservasMaterial
      .mockResolvedValueOnce({ reservas: [reserva(1, 'pendiente', ['cancelar'])], meta: meta(2, 2, 1) })
      .mockResolvedValueOnce({ reservas: [reserva(2, 'aceptada', ['cancelar'])], meta: meta(2, 2, 2) });

    renderScreen();
    await screen.findByText('Lote 1');

    fireEvent.press(screen.getByText('Ver más'));

    expect(await screen.findByText('Lote 2')).toBeTruthy();
    expect(screen.getByText('Lote 1')).toBeTruthy();
    expect(getMisReservasMaterial).toHaveBeenLastCalledWith({ page: 2 });
    expect(screen.queryByText('Ver más')).toBeNull();
  });

  it('un error al cargar mas no borra lo ya mostrado', async () => {
    getMisReservasMaterial
      .mockResolvedValueOnce({ reservas: [reserva(1, 'pendiente', ['cancelar'])], meta: meta(2, 2, 1) })
      .mockRejectedValueOnce(new Error('No se pudieron cargar tus reservas de materiales.'));

    renderScreen();
    await screen.findByText('Lote 1');

    fireEvent.press(screen.getByText('Ver más'));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('No se pudieron cargar tus reservas de materiales.', 'error'));
    expect(screen.getByText('Lote 1')).toBeTruthy();
    expect(screen.getByText('Ver más')).toBeTruthy();
  });

  it('lleva a Mis lotes', async () => {
    getMisReservasMaterial.mockResolvedValue({ reservas: [], meta: meta(0) });

    renderScreen();
    await screen.findByText('Aún no tienes reservas');

    fireEvent.press(screen.getByText('Mis lotes'));

    expect(navigation.navigate).toHaveBeenCalledWith('MisLotesMaterial');
  });
});
