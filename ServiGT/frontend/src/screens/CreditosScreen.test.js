import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import CreditosScreen from './CreditosScreen';
import {
  activarPremium,
  comprarCreditos,
  getCreditosPaquetes,
  getCreditosTransacciones,
  getMiCredito,
  getPremiumMiEstado,
} from '../services/api';

const mockToast = jest.fn();
jest.mock('../context/ToastContext', () => ({ useToast: () => mockToast }));
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

jest.mock('../services/api', () => ({
  activarPremium: jest.fn(),
  comprarCreditos: jest.fn(),
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
  [activarPremium, comprarCreditos, getCreditosPaquetes, getCreditosTransacciones, getMiCredito, getPremiumMiEstado]
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
