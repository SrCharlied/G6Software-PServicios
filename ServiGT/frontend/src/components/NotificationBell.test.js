// HU 1.5: conteo, refresco al foco sin polling, error separado de cero,
// lectura y fallback de rutas de NotificationBell.
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppState, Platform } from 'react-native';
import NotificationBell from './NotificationBell';
import {
  getNotificaciones,
  getUnreadNotificationsCount,
  loadStoredSession,
  marcarNotificacionLeida,
} from '../services/api';

// El primer render en frio de jest-expo puede pasar de 5 s en Windows.
jest.setTimeout(20000);

const mockPush = jest.fn();
let mockSession = { user: { id: 7, role: 'proveedor' }, sessionLoading: false };

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../context/SessionContext', () => ({ useSession: () => mockSession }));
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('../services/api', () => ({
  getNotificaciones: jest.fn(),
  getUnreadNotificationsCount: jest.fn(),
  loadStoredSession: jest.fn(),
  marcarNotificacionLeida: jest.fn(),
  marcarTodasLeidas: jest.fn(),
  parseUnreadCount: (data) => {
    const count = data?.no_leidas;
    if (!Number.isInteger(count) || count < 0) throw new Error('conteo invalido');
    return count;
  },
}));

const notif = (overrides) => ({
  id: 1,
  tipo: 'nueva_solicitud',
  titulo: 'Nueva solicitud',
  mensaje: 'Tienes una solicitud',
  datos: { servicio_id: 41 },
  leida: false,
  created_at: '2026-10-20T10:00:00Z',
  ...overrides,
});

let appStateHandlers;
let appStateRemove;
const originalOS = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  mockSession = { user: { id: 7, role: 'proveedor' }, sessionLoading: false };
  loadStoredSession.mockReturnValue({ token: 't' });
  getUnreadNotificationsCount.mockResolvedValue(3);
  getNotificaciones.mockResolvedValue({ notificaciones: [], no_leidas: 0 });
  marcarNotificacionLeida.mockResolvedValue({});

  appStateHandlers = [];
  appStateRemove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((type, handler) => {
    if (type === 'change') appStateHandlers.push(handler);
    return { remove: appStateRemove };
  });
});

afterEach(() => {
  Platform.OS = originalOS;
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const emitAppState = (state) => act(() => { appStateHandlers.forEach((h) => h(state)); });

describe('conteo', () => {
  it('muestra el conteo del backend en el badge', async () => {
    const screen = render(<NotificationBell />);
    expect(await screen.findByText('3')).toBeTruthy();
    expect(screen.getByLabelText('Notificaciones, 3 sin leer')).toBeTruthy();
  });

  it('muestra 99+ cuando el conteo supera la lista (no depende del limit 50)', async () => {
    getUnreadNotificationsCount.mockResolvedValue(120);
    const screen = render(<NotificationBell />);
    expect(await screen.findByText('99+')).toBeTruthy();
  });

  it('un error de conteo se muestra como error, nunca como cero', async () => {
    getUnreadNotificationsCount.mockRejectedValue(new Error('500'));
    const screen = render(<NotificationBell />);
    expect(await screen.findByTestId('notification-count-error')).toBeTruthy();
    expect(screen.getByLabelText('Notificaciones, no se pudo cargar el conteo')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('un error de conteo conserva el ultimo valor y se recupera al refrescar', async () => {
    const screen = render(<NotificationBell />);
    await screen.findByText('3');

    getUnreadNotificationsCount.mockRejectedValueOnce(new Error('red'));
    emitAppState('active');
    expect(await screen.findByTestId('notification-count-error')).toBeTruthy();

    getUnreadNotificationsCount.mockResolvedValueOnce(5);
    emitAppState('active');
    expect(await screen.findByText('5')).toBeTruthy();
    expect(screen.queryByTestId('notification-count-error')).toBeNull();
  });

  it('sin sesion no pide el conteo', async () => {
    mockSession = { user: null, sessionLoading: false };
    const screen = render(<NotificationBell />);
    await waitFor(() => expect(screen.getByLabelText('Notificaciones')).toBeTruthy());
    expect(getUnreadNotificationsCount).not.toHaveBeenCalled();
  });

  it('espera a que termine de cargar la sesion', () => {
    mockSession = { user: null, sessionLoading: true };
    render(<NotificationBell />);
    expect(getUnreadNotificationsCount).not.toHaveBeenCalled();
  });
});

describe('refresco sin polling', () => {
  it('refresca al volver la app a primer plano y no en segundo plano', async () => {
    const screen = render(<NotificationBell />);
    await screen.findByText('3');
    expect(getUnreadNotificationsCount).toHaveBeenCalledTimes(1);

    emitAppState('background');
    expect(getUnreadNotificationsCount).toHaveBeenCalledTimes(1);

    getUnreadNotificationsCount.mockResolvedValueOnce(8);
    emitAppState('active');
    expect(await screen.findByText('8')).toBeTruthy();
    expect(getUnreadNotificationsCount).toHaveBeenCalledTimes(2);
  });

  it('en web refresca al recuperar el foco de la ventana', async () => {
    Platform.OS = 'web';
    const originalAdd = window.addEventListener;
    const originalRemove = window.removeEventListener;
    const addSpy = jest.fn();
    const removeSpy = jest.fn();
    window.addEventListener = addSpy;
    window.removeEventListener = removeSpy;

    try {
      const screen = render(<NotificationBell />);
      await screen.findByText('3');

      const onFocus = addSpy.mock.calls.find(([type]) => type === 'focus')[1];
      getUnreadNotificationsCount.mockResolvedValueOnce(4);
      await act(async () => { onFocus(); });
      expect(await screen.findByText('4')).toBeTruthy();

      screen.unmount();
      expect(removeSpy).toHaveBeenCalledWith('focus', onFocus);
    } finally {
      window.addEventListener = originalAdd;
      window.removeEventListener = originalRemove;
    }
  });

  it('eventos de foco simultaneos producen una sola peticion', async () => {
    const screen = render(<NotificationBell />);
    await screen.findByText('3');

    let resolve;
    getUnreadNotificationsCount.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    emitAppState('active');
    emitAppState('active');
    expect(getUnreadNotificationsCount).toHaveBeenCalledTimes(2);

    await act(async () => { resolve(6); });
    expect(await screen.findByText('6')).toBeTruthy();
  });

  it('no consulta por intervalo mientras la app sigue activa', async () => {
    jest.useFakeTimers();
    render(<NotificationBell />);
    await act(async () => { await Promise.resolve(); });
    expect(getUnreadNotificationsCount).toHaveBeenCalledTimes(1);

    await act(async () => { jest.advanceTimersByTime(10 * 60 * 1000); });
    expect(getUnreadNotificationsCount).toHaveBeenCalledTimes(1);
  });

  it('libera el listener de AppState al desmontar', async () => {
    const screen = render(<NotificationBell />);
    await screen.findByText('3');
    screen.unmount();
    expect(appStateRemove).toHaveBeenCalled();
  });
});

describe('panel y lectura', () => {
  it('abrir la campana recarga la lista y el conteo', async () => {
    getNotificaciones.mockResolvedValue({ notificaciones: [notif()], no_leidas: 9 });
    const screen = render(<NotificationBell />);
    await screen.findByText('3');

    fireEvent.press(screen.getByLabelText('Notificaciones, 3 sin leer'));
    expect(await screen.findByText('Nueva solicitud')).toBeTruthy();
    expect(getNotificaciones).toHaveBeenCalledTimes(1);
    expect(screen.getByText('9')).toBeTruthy();
  });

  it('si la lista trae un conteo invalido se marca error en vez de cero', async () => {
    getNotificaciones.mockResolvedValue({ notificaciones: [notif()] });
    const screen = render(<NotificationBell />);
    await screen.findByText('3');

    fireEvent.press(screen.getByLabelText('Notificaciones, 3 sin leer'));
    await screen.findByText('Nueva solicitud');
    expect(screen.getByTestId('notification-count-error')).toBeTruthy();
  });

  it('error al cargar la lista se muestra en el panel', async () => {
    getNotificaciones.mockRejectedValue(new Error('No se pudieron cargar las notificaciones.'));
    const screen = render(<NotificationBell />);
    await screen.findByText('3');

    fireEvent.press(screen.getByLabelText('Notificaciones, 3 sin leer'));
    expect(await screen.findByText('No se pudieron cargar las notificaciones.')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('tocar una no leida la marca, baja el conteo y navega a su destino', async () => {
    getNotificaciones.mockResolvedValue({ notificaciones: [notif()], no_leidas: 1 });
    getUnreadNotificationsCount.mockResolvedValue(1);
    const screen = render(<NotificationBell />);
    await screen.findByText('1');

    fireEvent.press(screen.getByLabelText('Notificaciones, 1 sin leer'));
    fireEvent.press(await screen.findByLabelText('Nueva solicitud'));

    expect(marcarNotificacionLeida).toHaveBeenCalledWith(1);
    expect(mockPush).toHaveBeenCalledWith('/solicitudes');
    await waitFor(() => expect(screen.getByLabelText('Notificaciones')).toBeTruthy());
  });

  it('si marcar leida falla revierte el conteo y muestra el error', async () => {
    getNotificaciones.mockResolvedValue({
      notificaciones: [notif({ tipo: 'tipo_desconocido', titulo: 'Aviso raro' })],
      no_leidas: 1,
    });
    getUnreadNotificationsCount.mockResolvedValue(1);
    marcarNotificacionLeida.mockRejectedValue(new Error('No se pudo marcar como leida.'));
    const screen = render(<NotificationBell />);
    await screen.findByText('1');

    fireEvent.press(screen.getByLabelText('Notificaciones, 1 sin leer'));
    fireEvent.press(await screen.findByLabelText('Aviso raro'));

    expect(await screen.findByText('No se pudo marcar como leida.')).toBeTruthy();
    expect(screen.getByLabelText('Notificaciones, 1 sin leer')).toBeTruthy();
  });

  it('una leida no vuelve a marcarse pero si navega', async () => {
    getNotificaciones.mockResolvedValue({
      notificaciones: [notif({ tipo: 'servicio_calificable', titulo: 'Califica', leida: true })],
      no_leidas: 0,
    });
    const screen = render(<NotificationBell />);
    await screen.findByText('3');

    fireEvent.press(screen.getByLabelText('Notificaciones, 3 sin leer'));
    fireEvent.press(await screen.findByLabelText('Califica'));

    expect(marcarNotificacionLeida).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/calificar/41');
  });
});

describe('fallback de rutas', () => {
  it.each([
    ['tipo desconocido', { tipo: 'premium_activado', datos: {} }],
    ['cotizacion sin pedido_id', { tipo: 'cotizacion_aceptada', datos: {} }],
    ['notificacion sin datos', { tipo: 'cotizacion_rechazada', datos: null }],
  ])('%s: se marca leida sin navegar y el panel sigue abierto', async (_caso, overrides) => {
    getNotificaciones.mockResolvedValue({
      notificaciones: [notif({ ...overrides, titulo: 'Sin destino' })],
      no_leidas: 1,
    });
    const screen = render(<NotificationBell />);
    await screen.findByText('3');

    fireEvent.press(screen.getByLabelText('Notificaciones, 3 sin leer'));
    fireEvent.press(await screen.findByLabelText('Sin destino'));

    expect(marcarNotificacionLeida).toHaveBeenCalledWith(1);
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText('Sin destino')).toBeTruthy();
  });

  it('una notificacion de seguridad navega sin exponer el ID del reporte', async () => {
    getNotificaciones.mockResolvedValue({
      notificaciones: [notif({ tipo: 'servicio_seguridad_reporte', titulo: 'Reporte', datos: { reporte_id: 99 } })],
      no_leidas: 1,
    });
    const screen = render(<NotificationBell />);
    await screen.findByText('3');

    fireEvent.press(screen.getByLabelText('Notificaciones, 3 sin leer'));
    fireEvent.press(await screen.findByLabelText('Reporte'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0]).not.toContain('99');
  });
});
