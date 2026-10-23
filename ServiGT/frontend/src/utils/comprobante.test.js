import {
  construirHtmlComprobante,
  etiquetaMetodoPago,
  filasComprobante,
  imprimirComprobante,
  LEYENDA_SIN_VALIDEZ_FISCAL,
  puedeImprimir,
} from './comprobante';

const COMPROBANTE = {
  folio: 'SGT-0000000042',
  proveedor: { id: 3, nombre: 'Ana <script>alert(1)</script>', email: 'ana@servigt.test' },
  paquete: { id: 2, nombre: 'Impulso', creditos_base: 25, creditos_bonus: 5 },
  creditos_otorgados: 30,
  monto_gtq: '115.00',
  moneda: 'GTQ',
  metodo_pago: 'stripe',
  completada_at: '2026-10-21T10:00:00Z',
  sin_validez_fiscal: true,
  leyenda: LEYENDA_SIN_VALIDEZ_FISCAL,
};

describe('comprobante utils', () => {
  it('lista las filas con folio, paquete, créditos y total', () => {
    const filas = Object.fromEntries(filasComprobante(COMPROBANTE));

    expect(filas.Folio).toBe('SGT-0000000042');
    expect(filas.Paquete).toBe('Impulso');
    expect(filas['Créditos base']).toBe('25');
    expect(filas['Créditos de bonificación']).toBe('5');
    expect(filas['Créditos acreditados']).toBe('30');
    expect(filas['Método de pago']).toBe('Tarjeta (Stripe)');
    expect(filas['Total pagado']).toBe('Q115.00 GTQ');
  });

  it('el HTML imprimible incluye la leyenda sin validez fiscal y escapa el contenido', () => {
    const html = construirHtmlComprobante(COMPROBANTE);

    expect(html).toContain('No tiene validez fiscal');
    expect(html).toContain('SGT-0000000042');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('no promete PDF ni factura electrónica', () => {
    const html = construirHtmlComprobante(COMPROBANTE).toLowerCase();

    expect(html).not.toContain('pdf');
    expect(html).not.toContain('fel');
    expect(html).not.toContain('factura');
  });

  it('un método de pago desconocido no rompe el comprobante', () => {
    expect(etiquetaMetodoPago('otro')).toBe('Sin especificar');
  });

  it('sin entorno web no se puede imprimir y no lanza', () => {
    expect(puedeImprimir()).toBe(false);
    expect(imprimirComprobante(COMPROBANTE)).toBe(false);
  });
});
