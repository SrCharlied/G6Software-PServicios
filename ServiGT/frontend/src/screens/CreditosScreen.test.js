import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import CreditosScreen from './CreditosScreen';
import {
  activarPremium,
  cancelarSuscripcionPremium,
  comprarCreditos,
  crearSesionPagoPremium,
  crearSesionPagoStripe,
  getCompraCredito,
  getCreditosPaquetes,
  getCreditosTransacciones,
  getMiCredito,
  getPremiumMiEstado,
} from '../services/api';

const mockToast = jest.fn();
jest.mock('../context/ToastContext', () => ({ useToast: () => mockToast }));
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('../components/StripeCheckoutForm', () => {
  const { Text } = require('react-native');
  return ({ clientSecret }) => <Text>{`form-stripe:${clientSecret}`}</Text>;
});

jest.mock('../services/api', () => ({
  activarPremium: jest.fn(),
  cancelarSuscripcionPremium: jest.fn(),
  comprarCreditos: jest.fn(),
  crearSesionPagoPremium: jest.fn(),
  crearSesionPagoStripe: jest.fn(),
  getCompraCredito: jest.fn(),
  getCreditosPaquetes: jest.fn(),
  getCreditosTransacciones: jest.fn(),
  getMiCredito: jest.fn(),
  getPremiumMiEstado: jest.fn(),
}));

const PAQUETE = {
  id: 1,
  nombre: 'Inicial',
  precio_gtq: 39,
  creditos_base: 8,
  creditos_bonus: 0,
  total_creditos: 8,
  costo_por_credito: 4.88,
  ahorro_porcentaje: 0,
};

const MOVIMIENTO = {
  id: 7,
  tipo: 'compra',
  motivo: 'Compra del paquete Inicial',
  monto: 8,
  created_at: '2026-10-01T10:00:00Z',
};

const PREMIUM_ACTIVO = {
  estado: 'activo',
  vence_at: '2026-11-01T00:00:00Z',
  dias_restantes: 19,
  renovaciones: 1,
  creditos_por_ciclo: 10,
  beneficios: [],
};

const ERROR_SALDO = 'No se pudo obtener el saldo.';
const saldoVisible = () => within(screen.getByTestId('saldo-actual'));

beforeEach(() => {
  // resetAllMocks tambien borraria los mocks nativos de jest-expo; solo se
  // reinician los de la API para que ningun "Once" pase de una prueba a otra.
  jest.clearAllMocks();
  [activarPremium, cancelarSuscripcionPremium, crearSesionPagoPremium, comprarCreditos, crearSesionPagoStripe, getCompraCredito, getCreditosPaquetes, getCreditosTransacciones, getMiCredito, getPremiumMiEstado]
    .forEach((mock) => mock.mockReset());
  getMiCredito.mockResolvedValue({ saldo: 12 });
  getCreditosPaquetes.mockResolvedValue({ paquetes: [PAQUETE] });
  getCreditosTransacciones.mockResolvedValue({ transacciones: [MOVIMIENTO], pagina_actual: 1, ultima_pagina: 1 });
  getPremiumMiEstado.mockResolvedValue(PREMIUM_ACTIVO);
});

describe('CreditosScreen — saldo', () => {
  it('muestra loading mientras carga', () => {
    getMiCredito.mockReturnValue(new Promise(() => {}));

    render(<CreditosScreen />);

    expect(screen.getByText('Cargando creditos...')).toBeTruthy();
  });

  it('muestra el saldo real, incluido un 0 legitimo', async () => {
    getMiCredito.mockResolvedValue({ saldo: 0 });

    render(<CreditosScreen />);

    expect(await screen.findByText('Equivale a 0 cotizaciones en slots pagados.')).toBeTruthy();
    expect(saldoVisible().getByText('0')).toBeTruthy();
    expect(screen.queryByText('No se pudo cargar la informacion')).toBeNull();
  });

  it('si falla el saldo no lo presenta como 0 y conserva el resto de la pantalla', async () => {
    getMiCredito.mockRejectedValue(new Error(ERROR_SALDO));

    render(<CreditosScreen />);

    expect(await screen.findByText(ERROR_SALDO)).toBeTruthy();
    expect(saldoVisible().queryByText('0')).toBeNull();
    expect(saldoVisible().getByText('No se pudo cargar tu saldo. Reintenta para verlo.')).toBeTruthy();
    expect(screen.queryByText(/Equivale a \d+ cotizaciones/)).toBeNull();
    expect(screen.getByText('Reintentar')).toBeTruthy();

    // Un fallo parcial no tumba las demas secciones.
    expect(screen.getByText('Inicial')).toBeTruthy();
    expect(screen.getByText('Compra del paquete Inicial')).toBeTruthy();
    expect(screen.getByText('Premium activo')).toBeTruthy();
  });

  it('una respuesta sin saldo numerico tampoco se convierte en 0', async () => {
    getMiCredito.mockResolvedValue({});

    render(<CreditosScreen />);

    expect(await screen.findByText('La respuesta del saldo no es valida.')).toBeTruthy();
    expect(saldoVisible().queryByText('0')).toBeNull();
  });

  it('Reintentar vuelve a pedir los datos y muestra el saldo real sin tocar compras ni Premium', async () => {
    getMiCredito.mockRejectedValueOnce(new Error(ERROR_SALDO));

    render(<CreditosScreen />);
    await screen.findByText(ERROR_SALDO);

    fireEvent.press(screen.getByText('Reintentar'));

    expect(await screen.findByText('Equivale a 12 cotizaciones en slots pagados.')).toBeTruthy();
    expect(screen.queryByText(ERROR_SALDO)).toBeNull();
    expect(screen.queryByText('Reintentar')).toBeNull();
    expect(getMiCredito).toHaveBeenCalledTimes(2);
    expect(comprarCreditos).not.toHaveBeenCalled();
    expect(activarPremium).not.toHaveBeenCalled();
  });

  it('mientras reintenta no acepta otro toque ni duplica la recarga', async () => {
    getMiCredito.mockRejectedValueOnce(new Error(ERROR_SALDO));

    render(<CreditosScreen />);
    await screen.findByText(ERROR_SALDO);

    let responder;
    getMiCredito.mockReturnValueOnce(new Promise((resolve) => { responder = resolve; }));
    fireEvent.press(screen.getByText('Reintentar'));

    // El boton pasa a progreso: ya no hay un "Reintentar" que tocar.
    expect(screen.queryByText('Reintentar')).toBeNull();

    await act(async () => { responder({ saldo: 5 }); });

    expect(await screen.findByText('Equivale a 5 cotizaciones en slots pagados.')).toBeTruthy();
    expect(getMiCredito).toHaveBeenCalledTimes(2);
  });

  it('el checkout no inventa el saldo actual cuando no se pudo cargar', async () => {
    getMiCredito.mockRejectedValue(new Error(ERROR_SALDO));

    render(<CreditosScreen />);
    await screen.findByText(ERROR_SALDO);

    fireEvent.press(screen.getByText('Comprar creditos'));

    expect(screen.getByText('Confirmar compra')).toBeTruthy();
    expect(screen.queryByText('0 creditos')).toBeNull();
    expect(screen.getAllByText('No disponible')).toHaveLength(2);
  });
});

describe('CreditosScreen — otras secciones ante error parcial', () => {
  it('si falla el estado Premium no lo presenta como nunca activado ni ofrece activarlo', async () => {
    getPremiumMiEstado.mockRejectedValue(new Error('No se pudo cargar el estado Premium.'));

    render(<CreditosScreen />);

    expect(await screen.findByText('No se pudo cargar el estado Premium.')).toBeTruthy();
    expect(screen.getByText('Estado Premium no disponible')).toBeTruthy();
    expect(screen.queryByText('Nunca activado')).toBeNull();
    expect(screen.queryByText('Activar Premium')).toBeNull();
    expect(screen.getByText('Equivale a 12 cotizaciones en slots pagados.')).toBeTruthy();
  });

  it('si falla el historial no lo presenta como vacio', async () => {
    getCreditosTransacciones.mockRejectedValue(new Error('No se pudo cargar el historial de creditos.'));

    render(<CreditosScreen />);

    expect(await screen.findByText('No se pudo cargar el historial de creditos.')).toBeTruthy();
    expect(screen.getByText('Movimientos no disponibles')).toBeTruthy();
    expect(screen.queryByText('Sin movimientos todavia')).toBeNull();
  });

  it('si falla el catalogo no deja un boton de compra sin paquete', async () => {
    getCreditosPaquetes.mockRejectedValue(new Error('No se pudieron cargar los paquetes de creditos.'));

    render(<CreditosScreen />);

    expect(await screen.findByText('No se pudieron cargar los paquetes de creditos.')).toBeTruthy();
    expect(screen.getByText('Paquetes no disponibles')).toBeTruthy();

    fireEvent.press(screen.getByText('Comprar creditos'));
    expect(screen.queryByText('Confirmar compra')).toBeNull();
  });
});

describe('CreditosScreen — pago con Stripe', () => {
  const COMPRA_PENDIENTE = { id: 5, estado: 'pendiente', referencia: 'SGT-0000000005', creditos_otorgados: 8 };

  beforeEach(() => {
    getCreditosPaquetes.mockResolvedValue({ paquetes: [PAQUETE], pasarela: 'stripe' });
  });

  it('con pasarela stripe pide la sesion y muestra el formulario, sin usar la compra simulada', async () => {
    crearSesionPagoStripe.mockResolvedValue({
      compra: COMPRA_PENDIENTE, client_secret: 'cs_1_secret', publishable_key: 'pk_test_x',
    });

    render(<CreditosScreen />);
    await screen.findByText('Equivale a 12 cotizaciones en slots pagados.');

    fireEvent.press(screen.getByText('Comprar creditos'));
    fireEvent.press(screen.getByText('Continuar al pago'));

    expect(await screen.findByText('form-stripe:cs_1_secret')).toBeTruthy();
    expect(crearSesionPagoStripe).toHaveBeenCalledWith({ paqueteId: 1, idempotencyKey: expect.any(String) });
    expect(comprarCreditos).not.toHaveBeenCalled();
    // El saldo no cambia hasta que el backend confirme el pago.
    expect(getMiCredito).toHaveBeenCalledTimes(1);
  });

  it('reabrir el checkout tras cerrarlo reutiliza la misma clave de idempotencia', async () => {
    crearSesionPagoStripe.mockResolvedValue({
      compra: COMPRA_PENDIENTE, client_secret: 'cs_1_secret', publishable_key: 'pk_test_x',
    });

    render(<CreditosScreen />);
    await screen.findByText('Equivale a 12 cotizaciones en slots pagados.');

    fireEvent.press(screen.getByText('Comprar creditos'));
    fireEvent.press(screen.getByText('Continuar al pago'));
    await screen.findByText('form-stripe:cs_1_secret');
    fireEvent.press(screen.getByText('Cancelar'));

    fireEvent.press(screen.getByText('Comprar creditos'));
    fireEvent.press(screen.getByText('Continuar al pago'));
    await screen.findByText('form-stripe:cs_1_secret');

    const [primera, segunda] = crearSesionPagoStripe.mock.calls.map(([arg]) => arg.idempotencyKey);
    expect(primera).toBe(segunda);
  });

  it('un error al crear la sesion se muestra como fallo y no como compra', async () => {
    crearSesionPagoStripe.mockRejectedValue(new Error('No se pudo iniciar el pago. Intenta de nuevo.'));

    render(<CreditosScreen />);
    await screen.findByText('Equivale a 12 cotizaciones en slots pagados.');

    fireEvent.press(screen.getByText('Comprar creditos'));
    fireEvent.press(screen.getByText('Continuar al pago'));

    expect(await screen.findByText('No se pudo iniciar el pago. Intenta de nuevo.')).toBeTruthy();
    expect(screen.queryByText(/form-stripe/)).toBeNull();
  });
});

describe('CreditosScreen — Premium con Stripe', () => {
  const SESION = { pago: { id: 9, estado: 'pendiente' }, client_secret: 'cs_p_secret', publishable_key: 'pk_test_x' };

  beforeEach(() => {
    getCreditosPaquetes.mockResolvedValue({ paquetes: [PAQUETE], pasarela: 'stripe' });
  });

  it('nunca activado: ofrece pago unico por defecto y abre el formulario sin usar la activacion gratuita', async () => {
    getPremiumMiEstado.mockResolvedValue({ estado: 'nunca', vence_at: null, dias_restantes: 0, renovaciones: 0, creditos_por_ciclo: 10, beneficios: [] });
    crearSesionPagoPremium.mockResolvedValue(SESION);

    render(<CreditosScreen />);
    fireEvent.press(await screen.findByText('Activar Premium por Q115'));

    expect(await screen.findByText('form-stripe:cs_p_secret')).toBeTruthy();
    expect(crearSesionPagoPremium).toHaveBeenCalledWith({ recurrente: false, idempotencyKey: expect.any(String) });
    expect(activarPremium).not.toHaveBeenCalled();
    expect(screen.getByText('Premium por 30 dias')).toBeTruthy();
  });

  it('con la opcion mensual marcada pide una suscripcion recurrente', async () => {
    getPremiumMiEstado.mockResolvedValue({ estado: 'vencido', vence_at: '2026-09-01T00:00:00Z', dias_restantes: 0, renovaciones: 1, creditos_por_ciclo: 10, beneficios: [] });
    crearSesionPagoPremium.mockResolvedValue(SESION);

    render(<CreditosScreen />);
    fireEvent.press(await screen.findByText(/Renovar automaticamente cada mes/));
    fireEvent.press(screen.getByText('Suscribirme por Q115 al mes'));

    expect(await screen.findByText('Suscripcion Premium mensual')).toBeTruthy();
    expect(crearSesionPagoPremium).toHaveBeenCalledWith({ recurrente: true, idempotencyKey: expect.any(String) });
  });

  it('suscripcion activa: muestra la renovacion y permite cancelar con confirmacion', async () => {
    const activo = {
      estado: 'activo', recurrente: true, cancela_al_final: false, vence_at: '2026-11-19T20:11:00Z',
      proximo_cobro_at: '2026-11-19T20:11:00Z', dias_restantes: 30, renovaciones: 1, creditos_por_ciclo: 10, beneficios: [],
    };
    getPremiumMiEstado.mockResolvedValue(activo);
    cancelarSuscripcionPremium.mockResolvedValue({ ...activo, cancela_al_final: true, proximo_cobro_at: null, message: 'Suscripcion cancelada.' });

    render(<CreditosScreen />);
    fireEvent.press(await screen.findByText('Cancelar suscripcion'));

    // Pide confirmacion y aclara que Premium sigue hasta el fin del ciclo.
    expect(await screen.findByText(/Seguiras con Premium hasta el/)).toBeTruthy();
    expect(cancelarSuscripcionPremium).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Si, cancelar'));

    expect(await screen.findByText(/Suscripcion cancelada\. Premium sigue activo hasta el/)).toBeTruthy();
    expect(cancelarSuscripcionPremium).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Si, cancelar')).toBeNull();
  });

  it('un error al cancelar no cambia el estado y se informa', async () => {
    getPremiumMiEstado.mockResolvedValue({
      estado: 'activo', recurrente: true, cancela_al_final: false, vence_at: '2026-11-19T20:11:00Z',
      proximo_cobro_at: '2026-11-19T20:11:00Z', dias_restantes: 30, renovaciones: 1, creditos_por_ciclo: 10, beneficios: [],
    });
    cancelarSuscripcionPremium.mockRejectedValue(new Error('No se pudo cancelar la suscripcion. Intenta de nuevo.'));

    render(<CreditosScreen />);
    fireEvent.press(await screen.findByText('Cancelar suscripcion'));
    fireEvent.press(await screen.findByText('Si, cancelar'));

    await screen.findByText('Seguiras con Premium hasta el', { exact: false });
    expect(mockToast).toHaveBeenCalledWith('No se pudo cancelar la suscripcion. Intenta de nuevo.', 'error');
    expect(screen.queryByText(/Suscripcion cancelada\. Premium sigue activo/)).toBeNull();
  });

  it('pago unico activo no ofrece cancelar ni volver a pagar', async () => {
    getPremiumMiEstado.mockResolvedValue({
      estado: 'activo', recurrente: false, cancela_al_final: false, vence_at: '2026-11-19T20:11:00Z',
      dias_restantes: 30, renovaciones: 1, creditos_por_ciclo: 10, beneficios: [],
    });

    render(<CreditosScreen />);

    expect(await screen.findByText('Ciclo activo')).toBeTruthy();
    expect(screen.queryByText('Cancelar suscripcion')).toBeNull();
    expect(screen.queryByText(/Activar Premium por Q115/)).toBeNull();
  });
});
