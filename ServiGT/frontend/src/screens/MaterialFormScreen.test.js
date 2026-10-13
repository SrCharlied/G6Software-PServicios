import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import MaterialFormScreen from './MaterialFormScreen';
import { actualizarLoteMaterial, crearLoteMaterial, getMaterialDetalle, getServicio } from '../services/api';
import * as ImagePicker from 'expo-image-picker';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn(), requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })) }));
jest.mock('expo-file-system', () => ({ getInfoAsync: jest.fn(async () => ({ size: 100 })) }));
jest.mock('../services/api', () => ({ actualizarLoteMaterial: jest.fn(), crearLoteMaterial: jest.fn(), getMaterialDetalle: jest.fn(), getServicio: jest.fn(), storageUrl: (x) => x }));
const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const props = { user: { id: 1, role: 'proveedor' }, servicioId: 21, navigation };
const image = (extra = {}) => ({ uri: 'file:///foto.jpg', fileName: 'foto.jpg', mimeType: 'image/jpeg', fileSize: 100, ...extra });
const fill = () => {
  for (const [label, value] of Object.entries({ Titulo: 'Tubos PVC', Descripcion: 'Material sobrante de servicio', Cantidad: '10', Unidad: 'metros', 'Precio referencial': '0', Departamento: 'Guatemala' })) fireEvent.changeText(screen.getByLabelText(label), value);
};
beforeEach(() => {
  jest.clearAllMocks();
  getServicio.mockReset().mockResolvedValue({ servicio: { id: 21, puede_publicar_materiales: true } });
  getMaterialDetalle.mockReset(); crearLoteMaterial.mockReset(); actualizarLoteMaterial.mockReset();
  ImagePicker.launchImageLibraryAsync.mockReset().mockResolvedValue({ canceled: false, assets: [image()] });
});
it.each(['cliente', 'admin'])('bloquea formulario para %s', (role) => {
  render(<MaterialFormScreen {...props} user={{ role }} />);
  expect(getServicio).not.toHaveBeenCalled();
});
it('respeta el permiso del backend sin inferir estados', async () => {
  getServicio.mockResolvedValue({ servicio: { id: 21, estado: 'cancelado', puede_publicar_materiales: false } });
  render(<MaterialFormScreen {...props} />);
  expect(await screen.findByText('Este servicio no permite publicar materiales.')).toBeTruthy();
  expect(screen.queryByText('Publicar lote')).toBeNull();
});
it('abre lote existente sin publicar duplicado', async () => {
  getServicio.mockResolvedValue({ servicio: { id: 21, publicacion_material_id: 7, puede_publicar_materiales: false } });
  render(<MaterialFormScreen {...props} />);
  await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('MaterialDetail', { id: 7 }));
  expect(crearLoteMaterial).not.toHaveBeenCalled();
});
it('valida campos e imagen obligatoria', async () => {
  render(<MaterialFormScreen {...props} />);
  await screen.findByText('Publicar lote');
  fireEvent.press(screen.getByText('Publicar lote'));
  expect(await screen.findByText('El titulo debe tener entre 3 y 120 caracteres.')).toBeTruthy();
  fill(); fireEvent.press(screen.getByText('Publicar lote'));
  expect(await screen.findByText('Adjunta entre 1 y 3 imagenes.')).toBeTruthy();
  expect(crearLoteMaterial).not.toHaveBeenCalled();
});
it('crea con Q0 y evita doble envio', async () => {
  let resolve;
  crearLoteMaterial.mockReturnValue(new Promise((r) => { resolve = r; }));
  render(<MaterialFormScreen {...props} />);
  await screen.findByText('Publicar lote'); fill();
  fireEvent.press(screen.getByText('Agregar imagenes'));
  await screen.findByText('foto.jpg');
  const submit = screen.getByText('Publicar lote');
  fireEvent.press(submit); fireEvent.press(submit);
  await waitFor(() => expect(crearLoteMaterial).toHaveBeenCalledTimes(1));
  expect(crearLoteMaterial.mock.calls[0][0]).toMatchObject({ servicio_id: 21, precio_referencial: '0', imagenes: [image()] });
  await act(async () => resolve({ publicacion: { id: 7 } }));
  expect(navigation.navigate).toHaveBeenCalledWith('MaterialDetail', { id: 7 });
});
it.each([
  [{ mimeType: 'image/gif', fileName: 'foto.gif' }, 'Usa imagenes JPG, PNG o WebP.'],
  [{ fileSize: 4 * 1024 * 1024 + 1 }, 'Cada imagen debe pesar como maximo 4 MB.'],
])('rechaza imagen invalida %j', async (extra, error) => {
  ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [image(extra)] });
  render(<MaterialFormScreen {...props} />);
  await screen.findByText('Publicar lote');
  fireEvent.press(screen.getByText('Agregar imagenes'));
  expect(await screen.findByText(error)).toBeTruthy();
});
it('rechaza mas de tres imagenes', async () => {
  ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [image(), image(), image(), image()] });
  render(<MaterialFormScreen {...props} />); await screen.findByText('Publicar lote');
  fireEvent.press(screen.getByText('Agregar imagenes'));
  expect(await screen.findByText('Adjunta entre 1 y 3 imagenes.')).toBeTruthy();
});
it('conserva imagenes al editar sin adjuntos y permite reintentar error', async () => {
  getMaterialDetalle.mockResolvedValue({ publicacion: { id: 7, titulo: 'Tubos PVC', descripcion: 'Material sobrante de servicio', cantidad: 10, unidad: 'metros', precio_referencial: 0, departamento: 'Guatemala', es_mio: true, estado: 'disponible', imagenes: [{ id: 5, url: '/storage/a.jpg' }] } });
  actualizarLoteMaterial.mockRejectedValueOnce(new Error('Sin conexion')).mockResolvedValueOnce({ publicacion: { id: 7 } });
  render(<MaterialFormScreen {...props} materialId={7} />);
  await screen.findByText('Guardar cambios');
  fireEvent.press(screen.getByText('Guardar cambios'));
  await screen.findByText('Sin conexion');
  fireEvent.press(screen.getByText('Guardar cambios'));
  await waitFor(() => expect(actualizarLoteMaterial).toHaveBeenCalledTimes(2));
  expect(actualizarLoteMaterial.mock.calls[0][1]).toMatchObject({ imagenes: [], eliminar_imagenes: [] });
  expect(crearLoteMaterial).not.toHaveBeenCalled();
});
it('bloquea edicion de lotes ajenos o no disponibles', async () => {
  getMaterialDetalle.mockResolvedValue({ publicacion: { id: 7, es_mio: false, estado: 'disponible' } });
  render(<MaterialFormScreen {...props} materialId={7} />);
  expect(await screen.findByText('Solo puedes editar un lote propio disponible.')).toBeTruthy();
});
it('elimina imagen existente solo con confirmacion y envia su ID', async () => {
  getMaterialDetalle.mockResolvedValue({ publicacion: { id: 7, titulo: 'Tubos PVC', descripcion: 'Material sobrante de servicio', cantidad: 10, unidad: 'metros', precio_referencial: 0, departamento: 'Guatemala', es_mio: true, estado: 'disponible', imagenes: [{ id: 5, url: '/storage/a.jpg' }, { id: 6, url: '/storage/b.jpg' }] } });
  actualizarLoteMaterial.mockResolvedValue({ publicacion: { id: 7 } });
  render(<MaterialFormScreen {...props} materialId={7} />);
  await screen.findByText('Guardar cambios');
  fireEvent.press(screen.getByLabelText('Eliminar imagen 1'));
  fireEvent.press(screen.getByText('No, volver'));
  expect(screen.getByText('Imagen 1')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Eliminar imagen 1'));
  fireEvent.press(screen.getByText('Eliminar'));
  fireEvent.press(screen.getByText('Guardar cambios'));
  await waitFor(() => expect(actualizarLoteMaterial).toHaveBeenCalledWith(7, expect.objectContaining({ eliminar_imagenes: [5], imagenes: [] })));
});
it('un error al cargar no muestra un formulario autorizado y se puede reintentar', async () => {
  getServicio.mockRejectedValueOnce(new Error('Sin conexion'));
  render(<MaterialFormScreen {...props} />);
  await screen.findByText('Sin conexion');
  expect(screen.queryByText('Publicar lote')).toBeNull();
  fireEvent.press(screen.getByText('Reintentar'));
  expect(await screen.findByText('Publicar lote')).toBeTruthy();
});
