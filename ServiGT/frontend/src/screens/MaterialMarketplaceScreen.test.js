import { fireEvent, render, screen } from '@testing-library/react-native';
import MaterialMarketplaceScreen from './MaterialMarketplaceScreen';
import { getMateriales } from '../services/api';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('../services/api', () => ({ getMateriales: jest.fn(), storageUrl: (x) => x }));
const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const provider = { id: 9, role: 'proveedor' };
beforeEach(() => { jest.clearAllMocks(); getMateriales.mockReset(); });

it.each(['cliente', 'admin'])('no consulta el catalogo para %s', (role) => {
  render(<MaterialMarketplaceScreen user={{ role }} navigation={navigation} />);
  expect(screen.getByText('La bolsa de materiales es exclusiva para proveedores.')).toBeTruthy();
  expect(getMateriales).not.toHaveBeenCalled();
});
it('muestra loading', () => {
  getMateriales.mockReturnValue(new Promise(() => {}));
  render(<MaterialMarketplaceScreen user={provider} navigation={navigation} />);
  expect(screen.getByText('Cargando materiales...')).toBeTruthy();
});
it('muestra vacio', async () => {
  getMateriales.mockResolvedValue({ publicaciones: [] });
  render(<MaterialMarketplaceScreen user={provider} navigation={navigation} />);
  expect(await screen.findByText('No hay materiales disponibles')).toBeTruthy();
});
it('reintenta errores y muestra Q0, imagen, ubicacion y detalle', async () => {
  getMateriales.mockRejectedValueOnce(new Error('Sin conexion')).mockResolvedValueOnce({ publicaciones: [
    { id: 7, titulo: 'Tubos PVC', descripcion: 'Material sobrante', cantidad: 10, unidad: 'metros', precio_referencial: 0, departamento: 'Guatemala', estado: 'disponible', imagenes: [{ url: '/storage/a.jpg' }] },
  ] });
  render(<MaterialMarketplaceScreen user={provider} navigation={navigation} />);
  expect(await screen.findByText('Sin conexion')).toBeTruthy();
  expect(screen.queryByText('No hay materiales disponibles')).toBeNull();
  fireEvent.press(screen.getByText('Reintentar'));
  expect(await screen.findByText('Tubos PVC')).toBeTruthy();
  expect(screen.getByText('Q0.00')).toBeTruthy();
  fireEvent.press(screen.getByText('Ver lote'));
  expect(navigation.navigate).toHaveBeenCalledWith('MaterialDetail', { id: 7 });
});
