import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import MyMaterialListingsScreen from './MyMaterialListingsScreen';
import {
  aceptarReservaMaterial,
  cancelarReservaMaterial,
  getMisLotesMateriales,
  getReservasDeLote,
  marcarLoteVendido,
  rechazarReservaMaterial,
  retirarLoteMaterial,
} from '../services/api';

const mockToast = jest.fn();
jest.mock('../context/ToastContext', () => ({ useToast: () => mockToast }));
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

jest.mock('../services/api', () => ({
  getMisLotesMateriales: jest.fn(),
  getReservasDeLote: jest.fn(),
  retirarLoteMaterial: jest.fn(),
  marcarLoteVendido: jest.fn(),
  aceptarReservaMaterial: jest.fn(),
  rechazarReservaMaterial: jest.fn(),
  cancelarReservaMaterial: jest.fn(),
  storageUrl: (path) => (path ? `https://cdn.test${path}` : null),
}));

const lote = (id, estado, extra = {}) => ({
  id,
  titulo: `Lote ${id}`,
  descripcion: 'Material sobrante de un trabajo cancelado.',
  cantidad: 10,
  unidad: 'metros',
  precio_referencial: 150,
  departamento: 'Guatemala',
  municipio: 'Mixco',
  estado,
  es_mio: true,
  reservas_pendientes: 0,
  imagenes: [{ id: 1, url: '/storage/materiales/1/a.jpg', orden: 1 }],
  ...extra,
});

const reserva = (id, estado, acciones, extra = {}) => ({
  id,
  publicacion_id: 1,
  estado,
  mensaje_inicial: `Me interesa el lote (${id})`,
  rol: 'vendedor',
  acciones,
  chat: { tipo: 'reserva', id },
  comprador: { id: 40 + id, nombre: `Comprador ${id}`, foto_perfil: null, calificacion_promedio: 4.5 },
  ...extra,
});

const navigation = { goBack: jest.fn(), navigate: jest.fn() };

const renderScreen = () => render(<MyMaterialListingsScreen navigation={navigation} />);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MyMaterialListingsScreen — estados de la lista', () => {
  it('muestra loading mientras llega la respuesta', () => {
    getMisLotesMateriales.mockReturnValue(new Promise(() => {}));

    renderScreen();

    expect(screen.getByText('Cargando tus lotes...')).toBeTruthy();
  });

  it('muestra el error y reintenta; un error nunca se presenta como lista vacia', async () => {
    getMisLotesMateriales.mockRejectedValueOnce(new Error('No se pudieron cargar tus lotes de materiales.'));

    renderScreen();

    expect(await screen.findByText('No se pudieron cargar tus lotes de materiales.')).toBeTruthy();
    expect(screen.queryByText('Aún no tienes lotes publicados')).toBeNull();

    getMisLotesMateriales.mockResolvedValueOnce({ publicaciones: [lote(1, 'disponible')], total: 1 });
    fireEvent.press(screen.getByText('Reintentar'));

    expect(await screen.findByText('Lote 1')).toBeTruthy();
    expect(getMisLotesMateriales).toHaveBeenCalledTimes(2);
  });

  it('muestra el estado vacio', async () => {
    getMisLotesMateriales.mockResolvedValue({ publicaciones: [], total: 0 });

    renderScreen();

    expect(await screen.findByText('Aún no tienes lotes publicados')).toBeTruthy();
  });

  it('muestra los datos del lote y las solicitudes pendientes que informa el backend', async () => {
    getMisLotesMateriales.mockResolvedValue({
      publicaciones: [lote(1, 'disponible', { reservas_pendientes: 2 })],
      total: 1,
    });

    renderScreen();

    expect(await screen.findByText('Lote 1')).toBeTruthy();
    expect(screen.getByText('Disponible')).toBeTruthy();
    expect(screen.getByText(/10 metros/)).toBeTruthy();
    expect(screen.getByText(/Q150\.00/)).toBeTruthy();
    expect(screen.getByText(/Mixco, Guatemala/)).toBeTruthy();
    expect(screen.getByText('2 solicitudes pendientes')).toBeTruthy();
  });
});

describe('MyMaterialListingsScreen — acciones por estado del lote', () => {
  it('lote disponible: permite retirar y marcar vendido', async () => {
    getMisLotesMateriales.mockResolvedValue({ publicaciones: [lote(1, 'disponible')], total: 1 });

    renderScreen();
    await screen.findByText('Lote 1');

    expect(screen.getByText('Retirar')).toBeTruthy();
    expect(screen.getByText('Marcar vendido')).toBeTruthy();
  });

  it('lote reservado: no ofrece retirar (exige cancelar la reserva) y si marcar vendido', async () => {
    getMisLotesMateriales.mockResolvedValue({ publicaciones: [lote(1, 'reservado')], total: 1 });

    renderScreen();
    await screen.findByText('Lote 1');

    expect(screen.queryByText('Retirar')).toBeNull();
    expect(screen.getByText('Marcar vendido')).toBeTruthy();
    expect(screen.getByText(/cancela primero la reserva aceptada/i)).toBeTruthy();
  });

  it.each(['vendido', 'retirado'])('lote %s es terminal: no tiene acciones', async (estado) => {
    getMisLotesMateriales.mockResolvedValue({ publicaciones: [lote(1, estado)], total: 1 });

    renderScreen();
    await screen.findByText('Lote 1');

    expect(screen.queryByText('Retirar')).toBeNull();
    expect(screen.queryByText('Marcar vendido')).toBeNull();
  });
});

describe('MyMaterialListingsScreen — confirmar y refrescar', () => {
  it('retirar pide confirmacion, llama al backend y refresca; la accion terminal desaparece', async () => {
    getMisLotesMateriales
      .mockResolvedValueOnce({ publicaciones: [lote(1, 'disponible')], total: 1 })
      .mockResolvedValueOnce({ publicaciones: [lote(1, 'retirado')], total: 1 });
    retirarLoteMaterial.mockResolvedValue({ success: true });

    renderScreen();
    await screen.findByText('Lote 1');

    fireEvent.press(screen.getByText('Retirar'));
    expect(retirarLoteMaterial).not.toHaveBeenCalled(); // aun no confirma
    expect(screen.getByText('Retirar lote')).toBeTruthy();

    fireEvent.press(screen.getByText('Sí, retirar'));

    await waitFor(() => expect(retirarLoteMaterial).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.getByText('Retirado')).toBeTruthy());
    expect(screen.queryByText('Retirar')).toBeNull();
    expect(screen.queryByText('Marcar vendido')).toBeNull();
    expect(getMisLotesMateriales).toHaveBeenCalledTimes(2);
    expect(mockToast).toHaveBeenCalledWith('Lote retirado.', 'success');
  });

  it('volver en la confirmacion no llama al backend', async () => {
    getMisLotesMateriales.mockResolvedValue({ publicaciones: [lote(1, 'disponible')], total: 1 });

    renderScreen();
    await screen.findByText('Lote 1');

    fireEvent.press(screen.getByText('Marcar vendido'));
    fireEvent.press(screen.getByText('No, volver'));

    expect(marcarLoteVendido).not.toHaveBeenCalled();
  });

  it('un error del backend no se presenta como exito ni altera el estado mostrado', async () => {
    getMisLotesMateriales.mockResolvedValue({ publicaciones: [lote(1, 'disponible')], total: 1 });
    marcarLoteVendido.mockRejectedValue(new Error('Este lote ya no se puede marcar como vendido.'));

    renderScreen();
    await screen.findByText('Lote 1');

    fireEvent.press(screen.getByText('Marcar vendido'));
    fireEvent.press(screen.getByText('Sí, marcar vendido'));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Este lote ya no se puede marcar como vendido.', 'error'));
    expect(mockToast).not.toHaveBeenCalledWith('Lote marcado como vendido.', 'success');
    expect(screen.getByText('Disponible')).toBeTruthy();
    expect(screen.getByText('Retirar')).toBeTruthy();
    expect(getMisLotesMateriales).toHaveBeenCalledTimes(1); // no refresco como si hubiera pasado
  });

  it('bloquea la confirmacion mientras la accion esta en curso (sin doble envio)', async () => {
    getMisLotesMateriales.mockResolvedValue({ publicaciones: [lote(1, 'disponible')], total: 1 });
    let resolver;
    retirarLoteMaterial.mockReturnValue(new Promise((res) => { resolver = res; }));

    renderScreen();
    await screen.findByText('Lote 1');

    fireEvent.press(screen.getByText('Retirar'));
    fireEvent.press(screen.getByText('Sí, retirar'));

    // Pendiente: el boton de confirmar queda en carga (sin texto) y no se puede repetir.
    expect(screen.queryByText('Sí, retirar')).toBeNull();
    expect(retirarLoteMaterial).toHaveBeenCalledTimes(1);

    resolver({ success: true });
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Lote retirado.', 'success'));
    expect(retirarLoteMaterial).toHaveBeenCalledTimes(1);
  });
});

describe('MyMaterialListingsScreen — solicitudes del vendedor', () => {
  const abrirSolicitudes = async (lotes = [lote(1, 'disponible', { reservas_pendientes: 2 })]) => {
    getMisLotesMateriales.mockResolvedValue({ publicaciones: lotes, total: lotes.length });
    renderScreen();
    await screen.findByText('Lote 1');
    fireEvent.press(screen.getAllByText('Ver solicitudes')[0]);
  };

  it('carga solo las solicitudes del lote abierto y muestra las acciones que da el backend', async () => {
    getReservasDeLote.mockResolvedValue({
      reservas: [reserva(11, 'pendiente', ['aceptar', 'rechazar']), reserva(12, 'rechazada', [])],
      total: 2,
    });

    await abrirSolicitudes([lote(1, 'disponible'), lote(2, 'disponible')]);

    expect(await screen.findByText('Comprador 11')).toBeTruthy();
    expect(getReservasDeLote).toHaveBeenCalledTimes(1);
    expect(getReservasDeLote).toHaveBeenCalledWith(1);

    const pendiente = within(screen.getByTestId('reserva-11'));
    expect(pendiente.getByText('Aceptar')).toBeTruthy();
    expect(pendiente.getByText('Rechazar')).toBeTruthy();
    expect(pendiente.getByText('Me interesa el lote (11)')).toBeTruthy();

    const rechazada = within(screen.getByTestId('reserva-12'));
    expect(rechazada.queryByText('Aceptar')).toBeNull();
    expect(rechazada.queryByText('Rechazar')).toBeNull();
  });

  it('un error al cargar solicitudes se muestra como error y no como lista vacia', async () => {
    getReservasDeLote.mockRejectedValue(new Error('No se pudieron cargar las solicitudes del lote.'));

    await abrirSolicitudes();

    expect(await screen.findByText('No se pudieron cargar las solicitudes del lote.')).toBeTruthy();
    expect(screen.queryByText('Este lote aún no tiene solicitudes.')).toBeNull();
  });

  it('sin solicitudes muestra el vacio del lote', async () => {
    getReservasDeLote.mockResolvedValue({ reservas: [], total: 0 });

    await abrirSolicitudes();

    expect(await screen.findByText('Este lote aún no tiene solicitudes.')).toBeTruthy();
  });

  it('aceptar una solicitud confirma, llama al backend y refresca lote y solicitudes', async () => {
    getReservasDeLote
      .mockResolvedValueOnce({ reservas: [reserva(11, 'pendiente', ['aceptar', 'rechazar'])], total: 1 })
      .mockResolvedValueOnce({ reservas: [reserva(11, 'aceptada', ['cancelar'])], total: 1 });
    aceptarReservaMaterial.mockResolvedValue({ success: true });

    await abrirSolicitudes();
    await screen.findByText('Comprador 11');
    getMisLotesMateriales.mockResolvedValue({ publicaciones: [lote(1, 'reservado')], total: 1 });

    fireEvent.press(within(screen.getByTestId('reserva-11')).getByText('Aceptar'));
    fireEvent.press(screen.getByText('Sí, aceptar'));

    await waitFor(() => expect(aceptarReservaMaterial).toHaveBeenCalledWith(11));
    await waitFor(() => expect(screen.getByText('Reservado')).toBeTruthy());
    await waitFor(() => expect(within(screen.getByTestId('reserva-11')).getByText('Cancelar reserva')).toBeTruthy());
    expect(within(screen.getByTestId('reserva-11')).queryByText('Aceptar')).toBeNull();
    expect(mockToast).toHaveBeenCalledWith('Solicitud aceptada.', 'success');
  });

  it('rechazar y cancelar llaman a su endpoint', async () => {
    getReservasDeLote.mockResolvedValue({
      reservas: [reserva(11, 'pendiente', ['aceptar', 'rechazar']), reserva(12, 'aceptada', ['cancelar'])],
      total: 2,
    });
    rechazarReservaMaterial.mockResolvedValue({ success: true });
    cancelarReservaMaterial.mockResolvedValue({ success: true });

    await abrirSolicitudes();
    await screen.findByText('Comprador 11');

    fireEvent.press(within(screen.getByTestId('reserva-11')).getByText('Rechazar'));
    fireEvent.press(screen.getByText('Sí, rechazar'));
    await waitFor(() => expect(rechazarReservaMaterial).toHaveBeenCalledWith(11));

    fireEvent.press(within(screen.getByTestId('reserva-12')).getByText('Cancelar reserva'));
    fireEvent.press(screen.getByText('Sí, cancelar'));
    await waitFor(() => expect(cancelarReservaMaterial).toHaveBeenCalledWith(12));
  });

  it('un error al aceptar muestra el mensaje del backend y deja la solicitud como estaba', async () => {
    getReservasDeLote.mockResolvedValue({ reservas: [reserva(11, 'pendiente', ['aceptar', 'rechazar'])], total: 1 });
    aceptarReservaMaterial.mockRejectedValue(new Error('El lote ya no está disponible.'));

    await abrirSolicitudes();
    await screen.findByText('Comprador 11');

    fireEvent.press(within(screen.getByTestId('reserva-11')).getByText('Aceptar'));
    fireEvent.press(screen.getByText('Sí, aceptar'));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('El lote ya no está disponible.', 'error'));
    expect(mockToast).not.toHaveBeenCalledWith('Solicitud aceptada.', 'success');
    expect(within(screen.getByTestId('reserva-11')).getByText('Aceptar')).toBeTruthy();
    expect(getReservasDeLote).toHaveBeenCalledTimes(1);
  });

  it('abre el hilo contextual de la reserva', async () => {
    getReservasDeLote.mockResolvedValue({ reservas: [reserva(11, 'pendiente', ['aceptar', 'rechazar'])], total: 1 });

    await abrirSolicitudes();
    await screen.findByText('Comprador 11');

    fireEvent.press(within(screen.getByTestId('reserva-11')).getByText('Abrir chat'));

    expect(navigation.navigate).toHaveBeenCalledWith('ChatContexto', { tipo: 'reserva', id: 11 });
  });

  it('ocultar solicitudes cierra el bloque sin volver a llamar al backend', async () => {
    getReservasDeLote.mockResolvedValue({ reservas: [reserva(11, 'pendiente', ['aceptar'])], total: 1 });

    await abrirSolicitudes();
    await screen.findByText('Comprador 11');

    fireEvent.press(screen.getByText('Ocultar solicitudes'));

    expect(screen.queryByText('Comprador 11')).toBeNull();
    expect(getReservasDeLote).toHaveBeenCalledTimes(1);
  });
});

describe('MyMaterialListingsScreen — navegacion', () => {
  it('lleva a Mis reservas', async () => {
    getMisLotesMateriales.mockResolvedValue({ publicaciones: [], total: 0 });

    renderScreen();
    await screen.findByText('Aún no tienes lotes publicados');

    fireEvent.press(screen.getByText('Mis reservas'));

    expect(navigation.navigate).toHaveBeenCalledWith('MisReservasMaterial');
  });
});
