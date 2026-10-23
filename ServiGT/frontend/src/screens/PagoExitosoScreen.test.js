import { fireEvent, render, screen } from '@testing-library/react-native';
import PagoExitosoScreen from './PagoExitosoScreen';
import { getCompraCredito, getPagoPremium } from '../services/api';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('../services/api', () => ({ getCompraCredito: jest.fn(), getPagoPremium: jest.fn() }));

const COMPRA = {
  id: 5,
  paquete: 'Impulso',
  monto_gtq: 115,
  creditos_otorgados: 30,
  estado: 'completada',
  referencia: 'SGT-0000000005',
  fallo_motivo: null,
  completada_at: '2026-10-21T10:00:00Z',
};

const renderizar = (props = {}) => render(
  <PagoExitosoScreen compraId={5} onVerCreditos={jest.fn()} onContinuar={jest.fn()} {...props} />,
);

beforeEach(() => {
  jest.clearAllMocks();
  getCompraCredito.mockReset();
  getPagoPremium.mockReset();
});

describe('PagoExitosoScreen', () => {
  it('muestra loading mientras verifica el pago', () => {
    getCompraCredito.mockReturnValue(new Promise(() => {}));

    renderizar();

    expect(screen.getByTestId('pago-verificando')).toBeTruthy();
    expect(screen.queryByText('Pago realizado con exito')).toBeNull();
  });

  it('con la compra completada muestra el exito, el detalle y el saldo real', async () => {
    getCompraCredito.mockResolvedValue({ compra: COMPRA, saldo: 38 });

    renderizar();

    expect(await screen.findByText('Pago realizado con exito')).toBeTruthy();
    expect(screen.getByText('Se acreditaron 30 creditos a tu cuenta.')).toBeTruthy();
    expect(screen.getByText('Q115.00')).toBeTruthy();
    expect(screen.getByText('+30')).toBeTruthy();
    expect(screen.getByText('38 creditos')).toBeTruthy();
    expect(screen.getByText('SGT-0000000005')).toBeTruthy();
    expect(getCompraCredito).toHaveBeenCalledWith(5);
  });

  it('los botones navegan a creditos y a oportunidades', async () => {
    getCompraCredito.mockResolvedValue({ compra: COMPRA, saldo: 38 });
    const onVerCreditos = jest.fn();
    const onContinuar = jest.fn();

    renderizar({ onVerCreditos, onContinuar });
    await screen.findByText('Pago realizado con exito');

    fireEvent.press(screen.getByText('Ver mis creditos'));
    fireEvent.press(screen.getByText('Buscar oportunidades'));

    expect(onVerCreditos).toHaveBeenCalledTimes(1);
    expect(onContinuar).toHaveBeenCalledTimes(1);
  });

  it('una compra cancelada nunca se presenta como exito', async () => {
    getCompraCredito.mockResolvedValue({ compra: { ...COMPRA, estado: 'cancelada' }, saldo: 8 });

    renderizar();

    expect(await screen.findByText('El pago no se completo')).toBeTruthy();
    expect(screen.queryByText('Pago realizado con exito')).toBeNull();
    expect(screen.queryByText(/Se acreditaron/)).toBeNull();
  });

  it('una compra fallida muestra el motivo', async () => {
    getCompraCredito.mockResolvedValue({
      compra: { ...COMPRA, estado: 'fallida', fallo_motivo: 'El pago diferido fue rechazado.' },
      saldo: 8,
    });

    renderizar();

    expect(await screen.findByText('El pago diferido fue rechazado.')).toBeTruthy();
    expect(screen.queryByText('Pago realizado con exito')).toBeNull();
  });

  it('si el pago sigue pendiente tras los intentos avisa y permite verificar de nuevo', async () => {
    jest.useFakeTimers();
    try {
      getCompraCredito.mockResolvedValue({ compra: { ...COMPRA, estado: 'pendiente' }, saldo: 8 });

      renderizar();
      for (let i = 0; i < 12; i += 1) {
        await jest.advanceTimersByTimeAsync(1600);
      }

      expect(await screen.findByText('Tu pago aun se esta confirmando')).toBeTruthy();
      expect(screen.queryByText('Pago realizado con exito')).toBeNull();
      expect(screen.getByText('Verificar de nuevo')).toBeTruthy();
      expect(getCompraCredito).toHaveBeenCalledTimes(10);
    } finally {
      jest.useRealTimers();
    }
  });

  it('un error de la API se muestra como error y no como exito, con reintento', async () => {
    getCompraCredito.mockRejectedValueOnce(new Error('No se pudo consultar la compra.'));
    getCompraCredito.mockResolvedValueOnce({ compra: COMPRA, saldo: 38 });

    renderizar();

    expect(await screen.findByText('No pudimos verificar tu pago')).toBeTruthy();
    expect(screen.getByText('No se pudo consultar la compra.')).toBeTruthy();
    expect(screen.queryByText('Pago realizado con exito')).toBeNull();

    fireEvent.press(screen.getByText('Reintentar'));

    expect(await screen.findByText('Pago realizado con exito')).toBeTruthy();
  });

  it('sin compra_id no consulta la API y muestra error', async () => {
    renderizar({ compraId: null });

    expect(await screen.findByText('No pudimos verificar tu pago')).toBeTruthy();
    expect(getCompraCredito).not.toHaveBeenCalled();
  });
});

describe('PagoExitosoScreen — Premium', () => {
  const PAGO = { id: 9, recurrente: true, monto_gtq: 115, estado: 'completada', referencia: 'PRM-0000000009', completada_at: '2026-10-21T10:00:00Z' };
  const PREMIUM = { estado: 'activo', vence_at: '2026-11-20T10:00:00Z', proximo_cobro_at: '2026-11-20T10:00:00Z', creditos_por_ciclo: 10 };

  it('consulta el pago Premium (no la compra de creditos) y muestra el plan', async () => {
    getPagoPremium.mockResolvedValue({ pago: PAGO, premium: PREMIUM });

    renderizar({ compraId: 9, tipo: 'premium' });

    expect(await screen.findByText('Premium activado con exito')).toBeTruthy();
    expect(screen.getByText('Suscripcion mensual')).toBeTruthy();
    expect(screen.getByText('Q115.00')).toBeTruthy();
    expect(screen.getByText('+10')).toBeTruthy();
    expect(screen.getByText('PRM-0000000009')).toBeTruthy();
    expect(screen.getByText('Proximo cobro')).toBeTruthy();
    expect(getPagoPremium).toHaveBeenCalledWith(9);
    expect(getCompraCredito).not.toHaveBeenCalled();
  });

  it('un pago unico no muestra proximo cobro', async () => {
    getPagoPremium.mockResolvedValue({ pago: { ...PAGO, recurrente: false }, premium: { ...PREMIUM, proximo_cobro_at: null } });

    renderizar({ compraId: 9, tipo: 'premium' });

    expect(await screen.findByText('Pago unico (30 dias)')).toBeTruthy();
    expect(screen.queryByText('Proximo cobro')).toBeNull();
  });

  it('un pago Premium cancelado no se presenta como exito', async () => {
    getPagoPremium.mockResolvedValue({ pago: { ...PAGO, estado: 'cancelada' }, premium: { estado: 'nunca' } });

    renderizar({ compraId: 9, tipo: 'premium' });

    expect(await screen.findByText('El pago no se completo')).toBeTruthy();
    expect(screen.queryByText('Premium activado con exito')).toBeNull();
  });
});
