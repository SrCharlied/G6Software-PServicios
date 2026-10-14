import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ServiceSafetyScreen from './ServiceSafetyScreen';
import { getServicio, getReporteSeguridad, registrarReporteSeguridad, subirEvidenciasSeguridad } from '../services/api';
import * as DocumentPicker from 'expo-document-picker';
import { sessionStorage } from '../services/sessionStorage';
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('../services/sessionStorage', () => ({ sessionStorage: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}) } }));
jest.mock('../services/api', () => ({ getServicio: jest.fn(), getReporteSeguridad: jest.fn(), registrarReporteSeguridad: jest.fn(), subirEvidenciasSeguridad: jest.fn(), descargarEvidenciaSeguridad: jest.fn() }));
const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const props = { servicioId: 21, user: { id: 1, role: 'cliente' }, navigation };
const service = { id: 21, estado: 'aceptado', descripcion: 'Servicio real' };
beforeEach(() => { jest.clearAllMocks(); getServicio.mockReset().mockResolvedValue({ servicio: service }); registrarReporteSeguridad.mockReset(); });
it('recupera una interrupcion cuya respuesta se perdio aun en estado terminal', async () => {
  getServicio.mockResolvedValue({ servicio: { ...service, estado: 'interrumpido_seguridad' } });
  const attempt = { interrumpir: true, payload: { categoria: 'otro', descripcion: 'Incidente privado', idempotency_key: 'misma-clave' } };
  sessionStorage.getItem.mockResolvedValueOnce(JSON.stringify(attempt));
  registrarReporteSeguridad.mockResolvedValue({ servicio: { ...service, estado: 'interrumpido_seguridad' }, reporte: { id: 5, estado: 'recibido', evidencias: [] } });
  render(<ServiceSafetyScreen {...props} />);
  fireEvent.press(await screen.findByText('Reintentar envio'));
  await screen.findByText('Reporte registrado.');
  expect(registrarReporteSeguridad).toHaveBeenCalledWith(21, attempt.payload, true);
});
it('mantiene ayuda inmediata durante loading y error de API', async () => {
  getServicio.mockRejectedValue(new Error('Sin conexion'));
  render(<ServiceSafetyScreen {...props} />);
  expect(screen.getByText('Bomberos Voluntarios · 122')).toBeTruthy();
  await screen.findByText('Sin conexion');
  expect(screen.getByText('Policia Nacional Civil · 110')).toBeTruthy();
  expect(screen.queryByText('Enviar reporte')).toBeNull();
});
it.each(['admin', undefined])('no consulta el servicio para rol %s', (role) => {
  render(<ServiceSafetyScreen {...props} user={{ role }} />);
  expect(getServicio).not.toHaveBeenCalled();
});
it('valida descripcion y confirma reporte simple sin alterar servicio', async () => {
  registrarReporteSeguridad.mockResolvedValue({ servicio: service, reporte: { id: 5, servicio_id: 21, estado: 'recibido', evidencias: [], puede_adjuntar_evidencia: true } });
  render(<ServiceSafetyScreen {...props} />);
  await screen.findByText('Enviar reporte');
  fireEvent.press(screen.getByText('Enviar reporte'));
  expect(screen.getByText('Describe el incidente con al menos 5 caracteres.')).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText('Descripcion del incidente'), 'Incidente privado');
  fireEvent.press(screen.getByText('Enviar reporte'));
  await screen.findByText('Reporte registrado.');
  expect(screen.getByText('Aceptado')).toBeTruthy();
  expect(registrarReporteSeguridad.mock.calls[0][2]).toBe(false);
});
it('interrupcion espera confirmacion y respuesta real, impide doble envio', async () => {
  let resolve;
  registrarReporteSeguridad.mockReturnValue(new Promise((r) => { resolve = r; }));
  render(<ServiceSafetyScreen {...props} />);
  await screen.findByText('Interrumpir servicio');
  fireEvent.changeText(screen.getByLabelText('Descripcion del incidente'), 'Incidente privado');
  fireEvent.press(screen.getByText('Interrumpir servicio'));
  expect(registrarReporteSeguridad).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Confirmar interrupcion'));
  await waitFor(() => expect(registrarReporteSeguridad).toHaveBeenCalledTimes(1));
  expect(screen.queryByText('Interrumpido por seguridad')).toBeNull();
  await act(async () => resolve({ servicio: { ...service, estado: 'interrumpido_seguridad' }, reporte: { id: 5, estado: 'recibido', evidencias: [], puede_adjuntar_evidencia: true } }));
  expect(await screen.findByText('Interrumpido por seguridad')).toBeTruthy();
  expect(screen.queryByText('Interrumpir servicio')).toBeNull();
});
it('reintenta con el mismo payload y clave', async () => {
  registrarReporteSeguridad.mockRejectedValueOnce(new Error('Respuesta perdida')).mockResolvedValueOnce({ servicio: service, reporte: { id: 5, estado: 'recibido', evidencias: [] } });
  render(<ServiceSafetyScreen {...props} />); await screen.findByText('Enviar reporte');
  fireEvent.changeText(screen.getByLabelText('Descripcion del incidente'), 'Incidente privado');
  fireEvent.press(screen.getByText('Enviar reporte')); await screen.findByText('Respuesta perdida');
  fireEvent.press(screen.getByText('Reintentar envio')); await screen.findByText('Reporte registrado.');
  expect(registrarReporteSeguridad.mock.calls[1]).toEqual(registrarReporteSeguridad.mock.calls[0]);
});
it('adjunta PDF solo al reporte confirmado y usa estado del servidor', async () => {
  registrarReporteSeguridad.mockResolvedValue({ servicio: service, reporte: { id: 5, estado: 'recibido', evidencias: [], puede_adjuntar_evidencia: true } });
  DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///prueba.pdf', name: 'prueba.pdf', mimeType: 'application/pdf', size: 100 }] });
  subirEvidenciasSeguridad.mockResolvedValue({ reporte: { id: 5, estado: 'recibido', evidencias: [{ id: 9, nombre: 'prueba.pdf' }], puede_adjuntar_evidencia: true } });
  render(<ServiceSafetyScreen {...props} />); await screen.findByText('Enviar reporte');
  fireEvent.changeText(screen.getByLabelText('Descripcion del incidente'), 'Incidente privado');
  fireEvent.press(screen.getByText('Enviar reporte')); await screen.findByText('Reporte registrado.');
  fireEvent.press(screen.getByText('Adjuntar evidencia'));
  expect(await screen.findByText('prueba.pdf')).toBeTruthy();
  expect(subirEvidenciasSeguridad).toHaveBeenCalledWith(5, expect.any(Array));
});
it.each(['pendiente', 'cancelado', 'completado', 'interrumpido_seguridad'])('no reporta en estado %s', async (estado) => {
  getServicio.mockResolvedValue({ servicio: { ...service, estado } });
  render(<ServiceSafetyScreen {...props} />);
  await waitFor(() => expect(screen.queryByText('Cargando servicio...')).toBeNull());
  expect(screen.queryByText('Enviar reporte')).toBeNull();
});
