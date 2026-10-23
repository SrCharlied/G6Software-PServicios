import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ComprobanteCompraScreen from './ComprobanteCompraScreen';
import { getComprobanteCompra } from '../services/api';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('../services/api', () => ({ getComprobanteCompra: jest.fn() }));

const COMPROBANTE = {
  version: 1,
  folio: 'SGT-0000000042',
  proveedor: { id: 3, nombre: 'Ana Proveedora', email: 'ana@servigt.test' },
  paquete: { id: 2, nombre: 'Impulso', creditos_base: 25, creditos_bonus: 5 },
  creditos_otorgados: 30,
  monto_gtq: '115.00',
  moneda: 'GTQ',
  metodo_pago: 'simulado',
  completada_at: '2026-10-21T10:00:00Z',
  emitido_at: '2026-10-21T10:00:00Z',
  sin_validez_fiscal: true,
  leyenda: 'Comprobante informativo de compra de créditos. No tiene validez fiscal.',
};

const renderizar = (props = {}) => render(
  <ComprobanteCompraScreen compraId={42} onVolver={jest.fn()} {...props} />,
);

beforeEach(() => {
  jest.clearAllMocks();
  getComprobanteCompra.mockReset();
});

describe('ComprobanteCompraScreen', () => {
  it('muestra loading mientras carga', () => {
    getComprobanteCompra.mockReturnValue(new Promise(() => {}));

    renderizar();

    expect(screen.getByTestId('comprobante-cargando')).toBeTruthy();
  });

  it('muestra el snapshot con folio, paquete, total y leyenda sin validez fiscal', async () => {
    getComprobanteCompra.mockResolvedValue({ comprobante: COMPROBANTE });

    renderizar();

    expect(await screen.findByText('Folio SGT-0000000042')).toBeTruthy();
    expect(screen.getByText('Impulso')).toBeTruthy();
    expect(screen.getByText('Ana Proveedora')).toBeTruthy();
    expect(screen.getByText('Q115.00 GTQ')).toBeTruthy();
    expect(screen.getByText('Compra simulada')).toBeTruthy();
    expect(screen.getByTestId('comprobante-leyenda').props.children).toContain('No tiene validez fiscal');
    expect(getComprobanteCompra).toHaveBeenCalledWith(42);
  });

  it('fuera de la web no ofrece imprimir ni promete PDF', async () => {
    getComprobanteCompra.mockResolvedValue({ comprobante: COMPROBANTE });

    renderizar();
    await screen.findByText('Folio SGT-0000000042');

    expect(screen.queryByText('Imprimir comprobante')).toBeNull();
    expect(screen.getByText('La impresión del comprobante está disponible en la versión web.')).toBeTruthy();
    expect(screen.queryByText(/pdf/i)).toBeNull();
  });

  it('un error de API no se presenta como comprobante y permite reintentar', async () => {
    getComprobanteCompra.mockRejectedValueOnce(new Error('Esta compra no tiene comprobante disponible.'));
    getComprobanteCompra.mockResolvedValueOnce({ comprobante: COMPROBANTE });

    renderizar();

    expect(await screen.findByTestId('comprobante-error')).toBeTruthy();
    expect(screen.getByText('Esta compra no tiene comprobante disponible.')).toBeTruthy();
    expect(screen.queryByText('Folio SGT-0000000042')).toBeNull();

    fireEvent.press(screen.getByText('Reintentar'));

    expect(await screen.findByText('Folio SGT-0000000042')).toBeTruthy();
  });

  it('sin compraId no llama a la API y muestra error', async () => {
    renderizar({ compraId: null });

    await waitFor(() => expect(screen.getByTestId('comprobante-error')).toBeTruthy());
    expect(getComprobanteCompra).not.toHaveBeenCalled();
    expect(screen.queryByText('Reintentar')).toBeNull();
  });

  it('volver regresa a créditos', async () => {
    getComprobanteCompra.mockResolvedValue({ comprobante: COMPROBANTE });
    const onVolver = jest.fn();

    renderizar({ onVolver });
    await screen.findByText('Folio SGT-0000000042');
    fireEvent.press(screen.getByText('Volver a créditos'));

    expect(onVolver).toHaveBeenCalledTimes(1);
  });
});
