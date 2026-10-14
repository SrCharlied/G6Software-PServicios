import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import AdminSecurityReportsScreen from './AdminSecurityReportsScreen';
import {
  cambiarEstadoReporteSeguridad,
  descargarEvidenciaSeguridad,
  getReporteSeguridadAdmin,
  getReportesSeguridadAdmin,
} from '../services/api';
import { guardarArchivo } from '../utils/descargas';

const mockToast = jest.fn();
jest.mock('../context/ToastContext', () => ({ useToast: () => mockToast }));
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

jest.mock('../services/api', () => ({
  getReportesSeguridadAdmin: jest.fn(),
  getReporteSeguridadAdmin: jest.fn(),
  cambiarEstadoReporteSeguridad: jest.fn(),
  descargarEvidenciaSeguridad: jest.fn(),
}));

jest.mock('../utils/descargas', () => ({ guardarArchivo: jest.fn() }));

const admin = { id: 1, name: 'Admin', role: 'admin' };

const resumen = (id, extra = {}) => ({
  id,
  servicio_id: 30 + id,
  categoria: 'emergencia',
  descripcion: `Descripción del incidente ${id}`,
  interrumpio_servicio: false,
  estado: 'recibido',
  estado_servicio_previo: 'en_progreso',
  transiciones_permitidas: ['en_revision'],
  created_at: '2026-10-12T10:00:00-06:00',
  reportante: { id: 5, name: `Reportante ${id}`, role: 'cliente' },
  servicio: { id: 30 + id, estado: 'en_progreso', cliente: { id: 5, name: 'Cliente' }, proveedor: { id: 9, nombre: 'Proveedor' } },
  evidencias_count: 0,
  ...extra,
});

const detalle = (id, extra = {}) => ({
  ...resumen(id),
  evidencias: [],
  historial: [],
  ...extra,
});

const lista = (reportes, meta = {}) => ({
  reportes,
  meta: { total: reportes.length, per_page: 20, current_page: 1, last_page: 1, ...meta },
});

const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const renderScreen = (user = admin) => render(<AdminSecurityReportsScreen navigation={navigation} user={user} />);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AdminSecurityReportsScreen — acceso', () => {
  it.each([['cliente'], ['proveedor'], [undefined]])('rol %s no accede a la cola ni consulta la API', (role) => {
    renderScreen(role ? { id: 2, name: 'X', role } : null);

    expect(screen.getByText('Acceso restringido')).toBeTruthy();
    expect(getReportesSeguridadAdmin).not.toHaveBeenCalled();
  });

  it('el admin carga la cola', async () => {
    getReportesSeguridadAdmin.mockResolvedValue(lista([resumen(1)]));

    renderScreen();

    expect(await screen.findByText('Descripción del incidente 1')).toBeTruthy();
    expect(screen.queryByText('Acceso restringido')).toBeNull();
  });
});

describe('AdminSecurityReportsScreen — estados de la lista', () => {
  it('muestra loading', () => {
    getReportesSeguridadAdmin.mockReturnValue(new Promise(() => {}));

    renderScreen();

    expect(screen.getByText('Cargando reportes...')).toBeTruthy();
  });

  it('muestra el error con reintento y nunca como cola vacia', async () => {
    getReportesSeguridadAdmin.mockRejectedValueOnce(new Error('No se pudieron cargar los reportes de seguridad.'));

    renderScreen();

    expect(await screen.findByText('No se pudieron cargar los reportes de seguridad.')).toBeTruthy();
    expect(screen.queryByText('No hay reportes de seguridad')).toBeNull();

    getReportesSeguridadAdmin.mockResolvedValueOnce(lista([resumen(1)]));
    fireEvent.press(screen.getByText('Reintentar'));

    expect(await screen.findByText('Descripción del incidente 1')).toBeTruthy();
  });

  it('distingue la cola vacia de un filtro sin resultados', async () => {
    getReportesSeguridadAdmin.mockResolvedValue(lista([]));

    renderScreen();
    expect(await screen.findByText('No hay reportes de seguridad')).toBeTruthy();

    fireEvent.press(screen.getByText('Resuelto'));

    expect(await screen.findByText('No hay reportes con estos filtros')).toBeTruthy();
  });

  it('distingue el estado del reporte y el estado del servicio en cada tarjeta', async () => {
    getReportesSeguridadAdmin.mockResolvedValue(lista([
      resumen(1, {
        estado: 'en_revision',
        interrumpio_servicio: true,
        evidencias_count: 2,
        servicio: { id: 31, estado: 'interrumpido_seguridad', cliente: { id: 5, name: 'C' }, proveedor: { id: 9, nombre: 'P' } },
      }),
    ]));

    renderScreen();
    await screen.findByText('Descripción del incidente 1');

    const tarjeta = within(screen.getByTestId('reporte-1'));
    expect(tarjeta.getByText('Reporte: En revisión')).toBeTruthy();
    expect(tarjeta.getByText('Servicio: Interrumpido por seguridad')).toBeTruthy();
    expect(tarjeta.getByText('Reportó: Reportante 1')).toBeTruthy();
    expect(tarjeta.getByText('Emergencia')).toBeTruthy();
    expect(tarjeta.getByText('2 evidencias')).toBeTruthy();
  });
});

describe('AdminSecurityReportsScreen — filtros y paginacion', () => {
  it('filtra por estado y por interrupcion consultando al backend', async () => {
    getReportesSeguridadAdmin.mockResolvedValue(lista([resumen(1)]));

    renderScreen();
    await screen.findByText('Descripción del incidente 1');
    expect(getReportesSeguridadAdmin).toHaveBeenLastCalledWith({ estado: null, interrumpio: null, page: 1 });

    fireEvent.press(screen.getByText('En revisión'));
    await waitFor(() => expect(getReportesSeguridadAdmin).toHaveBeenLastCalledWith({ estado: 'en_revision', interrumpio: null, page: 1 }));

    fireEvent.press(screen.getByText('Solo interrupciones'));
    await waitFor(() => expect(getReportesSeguridadAdmin).toHaveBeenLastCalledWith({ estado: 'en_revision', interrumpio: true, page: 1 }));

    fireEvent.press(screen.getByText('Todos'));
    fireEvent.press(screen.getByText('Solo interrupciones'));
    await waitFor(() => expect(getReportesSeguridadAdmin).toHaveBeenLastCalledWith({ estado: null, interrumpio: null, page: 1 }));
  });

  it('ver mas agrega la pagina siguiente sin perder la primera', async () => {
    getReportesSeguridadAdmin
      .mockResolvedValueOnce(lista([resumen(1)], { total: 2, last_page: 2 }))
      .mockResolvedValueOnce(lista([resumen(2)], { total: 2, current_page: 2, last_page: 2 }));

    renderScreen();
    await screen.findByText('Descripción del incidente 1');

    fireEvent.press(screen.getByText('Ver más'));

    expect(await screen.findByText('Descripción del incidente 2')).toBeTruthy();
    expect(screen.getByText('Descripción del incidente 1')).toBeTruthy();
    expect(getReportesSeguridadAdmin).toHaveBeenLastCalledWith({ estado: null, interrumpio: null, page: 2 });
    expect(screen.queryByText('Ver más')).toBeNull();
  });

  it('un error al cargar mas conserva lo mostrado y avisa', async () => {
    getReportesSeguridadAdmin
      .mockResolvedValueOnce(lista([resumen(1)], { total: 2, last_page: 2 }))
      .mockRejectedValueOnce(new Error('No se pudieron cargar los reportes de seguridad.'));

    renderScreen();
    await screen.findByText('Descripción del incidente 1');

    fireEvent.press(screen.getByText('Ver más'));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('No se pudieron cargar los reportes de seguridad.', 'error'));
    expect(screen.getByText('Descripción del incidente 1')).toBeTruthy();
    expect(screen.getByText('Ver más')).toBeTruthy();
  });
});

describe('AdminSecurityReportsScreen — detalle', () => {
  const abrir = async (reporte, resumenExtra = {}) => {
    getReportesSeguridadAdmin.mockResolvedValue(lista([resumen(reporte.id, resumenExtra)]));
    getReporteSeguridadAdmin.mockResolvedValue({ reporte });
    renderScreen();
    await screen.findByText(`Descripción del incidente ${reporte.id}`);
    fireEvent.press(within(screen.getByTestId(`reporte-${reporte.id}`)).getByText('Ver detalle'));
  };

  it('muestra historial auditable, evidencias y las dos etiquetas de estado', async () => {
    await abrir(detalle(1, {
      estado: 'en_revision',
      transiciones_permitidas: ['resuelto', 'descartado'],
      interrumpio_servicio: true,
      servicio: { id: 31, estado: 'interrumpido_seguridad', cliente: { id: 5, name: 'Ana Cliente' }, proveedor: { id: 9, nombre: 'Pedro Proveedor' } },
      evidencias: [{ id: 7, orden: 1, nombre: 'foto.png', mime: 'image/png', tamano_bytes: 2048 }],
      historial: [
        { id: 1, actor: { id: 5, name: 'Reportante 1', role: 'cliente' }, estado_anterior: null, estado_nuevo: 'recibido', nota_interna: null, correlation_id: 'corr-1', created_at: '2026-10-12T10:00:00-06:00' },
        { id: 2, actor: { id: 1, name: 'Admin Seguridad', role: 'admin' }, estado_anterior: 'recibido', estado_nuevo: 'en_revision', nota_interna: 'Se contactó al reportante', correlation_id: 'corr-2', created_at: '2026-10-12T11:00:00-06:00' },
      ],
    }));

    const detalleVista = within(await screen.findByTestId('detalle-reporte'));
    expect(getReporteSeguridadAdmin).toHaveBeenCalledWith(1);

    expect(detalleVista.getByText('Estado del reporte')).toBeTruthy();
    expect(detalleVista.getByText('Estado del servicio')).toBeTruthy();
    expect(detalleVista.getByText('En revisión')).toBeTruthy();
    expect(detalleVista.getByText('Interrumpido por seguridad')).toBeTruthy();
    expect(detalleVista.getByText(/no reabre ni completa el servicio/i)).toBeTruthy();
    expect(detalleVista.getByText(/Ana Cliente/)).toBeTruthy();

    expect(detalleVista.getByText('foto.png')).toBeTruthy();

    expect(detalleVista.getByText('Se contactó al reportante')).toBeTruthy();
    expect(detalleVista.getByText(/Admin Seguridad/)).toBeTruthy();
    expect(detalleVista.getByText('Recibido → En revisión')).toBeTruthy();
    expect(detalleVista.getByText('Creación del reporte → Recibido')).toBeTruthy();
  });

  it('no ofrece ninguna accion para reabrir o completar el servicio', async () => {
    await abrir(detalle(1, {
      servicio: { id: 31, estado: 'interrumpido_seguridad', cliente: { id: 5, name: 'C' }, proveedor: { id: 9, nombre: 'P' } },
      interrumpio_servicio: true,
    }));

    const detalleVista = within(await screen.findByTestId('detalle-reporte'));
    expect(detalleVista.queryByText(/reabrir/i)).toBeNull();
    expect(detalleVista.queryByText(/completar servicio/i)).toBeNull();
    expect(detalleVista.queryByText(/cancelar servicio/i)).toBeNull();
  });

  it('un error al cargar el detalle se muestra y permite reintentar', async () => {
    getReportesSeguridadAdmin.mockResolvedValue(lista([resumen(1)]));
    getReporteSeguridadAdmin.mockRejectedValueOnce(new Error('No se pudo cargar el reporte de seguridad.'));
    renderScreen();
    await screen.findByText('Descripción del incidente 1');

    fireEvent.press(within(screen.getByTestId('reporte-1')).getByText('Ver detalle'));
    expect(await screen.findByText('No se pudo cargar el reporte de seguridad.')).toBeTruthy();

    getReporteSeguridadAdmin.mockResolvedValueOnce({ reporte: detalle(1) });
    fireEvent.press(within(screen.getByTestId('detalle-reporte')).getByText('Reintentar'));

    expect(await within(screen.getByTestId('detalle-reporte')).findByText('Estado del reporte')).toBeTruthy();
  });

  it('descarga una evidencia mediante el endpoint autorizado', async () => {
    descargarEvidenciaSeguridad.mockResolvedValue({ blob: { size: 4 }, contentType: 'image/png' });
    guardarArchivo.mockReturnValue(true);
    await abrir(detalle(1, { evidencias: [{ id: 7, orden: 1, nombre: 'foto.png', mime: 'image/png', tamano_bytes: 2048 }] }));

    fireEvent.press(await screen.findByLabelText('Descargar foto.png'));

    await waitFor(() => expect(descargarEvidenciaSeguridad).toHaveBeenCalledWith(1, 7));
    await waitFor(() => expect(guardarArchivo).toHaveBeenCalledWith({ size: 4 }, 'evidencia-1-1.png'));
  });

  it('un error al descargar se informa y no se simula una descarga', async () => {
    descargarEvidenciaSeguridad.mockRejectedValue(new Error('El archivo ya no está disponible.'));
    await abrir(detalle(1, { evidencias: [{ id: 7, orden: 1, nombre: 'foto.png', mime: 'image/png', tamano_bytes: 2048 }] }));

    fireEvent.press(await screen.findByLabelText('Descargar foto.png'));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('El archivo ya no está disponible.', 'error'));
    expect(guardarArchivo).not.toHaveBeenCalled();
  });

  it('fuera de web avisa que la descarga no esta disponible en lugar de fingirla', async () => {
    descargarEvidenciaSeguridad.mockResolvedValue({ blob: { size: 4 }, contentType: 'image/png' });
    guardarArchivo.mockReturnValue(false);
    await abrir(detalle(1, { evidencias: [{ id: 7, orden: 2, nombre: null, mime: 'application/pdf', tamano_bytes: 2048 }] }));

    fireEvent.press(await screen.findByLabelText('Descargar evidencia 2'));

    await waitFor(() => expect(guardarArchivo).toHaveBeenCalledWith({ size: 4 }, 'evidencia-1-2.pdf'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('La descarga de evidencias está disponible en la versión web.', 'info'));
  });
});

describe('AdminSecurityReportsScreen — cambio de estado', () => {
  const abrir = async (reporte) => {
    getReportesSeguridadAdmin.mockResolvedValue(lista([resumen(reporte.id, { estado: reporte.estado })]));
    getReporteSeguridadAdmin.mockResolvedValue({ reporte });
    renderScreen();
    await screen.findByText(`Descripción del incidente ${reporte.id}`);
    fireEvent.press(within(screen.getByTestId(`reporte-${reporte.id}`)).getByText('Ver detalle'));
    return within(await screen.findByTestId('detalle-reporte'));
  };

  it('solo ofrece las transiciones que da el backend', async () => {
    const vista = await abrir(detalle(1, { estado: 'en_revision', transiciones_permitidas: ['resuelto', 'descartado'] }));

    expect(vista.getByText('Marcar como resuelto')).toBeTruthy();
    expect(vista.getByText('Descartar reporte')).toBeTruthy();
    expect(vista.queryByText('Pasar a en revisión')).toBeNull();
  });

  it('un reporte en estado final no admite cambios', async () => {
    const vista = await abrir(detalle(1, { estado: 'resuelto', transiciones_permitidas: [] }));

    expect(vista.getByText('Este reporte está en un estado final y no admite más cambios.')).toBeTruthy();
    expect(vista.queryByText('Guardar cambio')).toBeNull();
  });

  it('guardar exige elegir una transicion', async () => {
    const vista = await abrir(detalle(1));

    fireEvent.press(vista.getByText('Guardar cambio'));

    expect(cambiarEstadoReporteSeguridad).not.toHaveBeenCalled();
  });

  it('guarda con nota interna y refresca el detalle y la cola desde el backend', async () => {
    cambiarEstadoReporteSeguridad.mockResolvedValue({ success: true });
    const vista = await abrir(detalle(1));
    getReporteSeguridadAdmin.mockResolvedValue({ reporte: detalle(1, { estado: 'en_revision', transiciones_permitidas: ['resuelto', 'descartado'] }) });
    getReportesSeguridadAdmin.mockResolvedValue(lista([resumen(1, { estado: 'en_revision' })]));

    fireEvent.press(vista.getByText('Pasar a en revisión'));
    fireEvent.changeText(vista.getByTestId('nota-interna'), 'Tomado por el equipo');
    fireEvent.press(vista.getByText('Guardar cambio'));

    await waitFor(() => expect(cambiarEstadoReporteSeguridad).toHaveBeenCalledWith(1, { estado: 'en_revision', notaInterna: 'Tomado por el equipo' }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Estado del reporte actualizado.', 'success'));
    await waitFor(() => expect(within(screen.getByTestId('detalle-reporte')).getByText('Marcar como resuelto')).toBeTruthy());
    expect(within(screen.getByTestId('detalle-reporte')).queryByText('Pasar a en revisión')).toBeNull();
    expect(within(screen.getByTestId('reporte-1')).getByText('Reporte: En revisión')).toBeTruthy();
  });

  it('un error al actualizar no cambia el estado mostrado ni se presenta como exito', async () => {
    cambiarEstadoReporteSeguridad.mockRejectedValue(new Error('No se puede pasar un reporte de «recibido» a «en_revision».'));
    const vista = await abrir(detalle(1));
    const consultasAntes = getReporteSeguridadAdmin.mock.calls.length;

    fireEvent.press(vista.getByText('Pasar a en revisión'));
    fireEvent.press(vista.getByText('Guardar cambio'));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('No se puede pasar un reporte de «recibido» a «en_revision».', 'error'));
    expect(mockToast).not.toHaveBeenCalledWith('Estado del reporte actualizado.', 'success');
    expect(within(screen.getByTestId('reporte-1')).getByText('Reporte: Recibido')).toBeTruthy();
    expect(getReporteSeguridadAdmin.mock.calls.length).toBe(consultasAntes);
    expect(within(screen.getByTestId('detalle-reporte')).getByText('Pasar a en revisión')).toBeTruthy();
  });

  it('bloquea el boton mientras guarda (sin doble envio)', async () => {
    let resolver;
    cambiarEstadoReporteSeguridad.mockReturnValue(new Promise((res) => { resolver = res; }));
    const vista = await abrir(detalle(1));

    fireEvent.press(vista.getByText('Pasar a en revisión'));
    fireEvent.press(vista.getByText('Guardar cambio'));

    expect(within(screen.getByTestId('detalle-reporte')).queryByText('Guardar cambio')).toBeNull();
    expect(cambiarEstadoReporteSeguridad).toHaveBeenCalledTimes(1);

    getReporteSeguridadAdmin.mockResolvedValue({ reporte: detalle(1, { estado: 'en_revision', transiciones_permitidas: ['resuelto'] }) });
    resolver({ success: true });
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Estado del reporte actualizado.', 'success'));
    expect(cambiarEstadoReporteSeguridad).toHaveBeenCalledTimes(1);
  });
});
