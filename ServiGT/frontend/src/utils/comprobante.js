// Comprobante informativo de compra de créditos (HU 4.1). Solo web: imprime el
// snapshot que devuelve el backend, sin PDF, sin FEL y sin validez fiscal.

export const LEYENDA_SIN_VALIDEZ_FISCAL = 'Comprobante informativo de compra de créditos. No tiene validez fiscal.';

const METODO_PAGO = { simulado: 'Compra simulada', stripe: 'Tarjeta (Stripe)' };

export const etiquetaMetodoPago = (metodo) => METODO_PAGO[metodo] || 'Sin especificar';

export const formatearMonto = (value) => `Q${Number(value || 0).toFixed(2)}`;

export const formatearFecha = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
};

// Filas del comprobante en el orden en que se muestran y se imprimen.
export const filasComprobante = (c) => [
  ['Folio', c.folio],
  ['Fecha', formatearFecha(c.completada_at)],
  ['Proveedor', c.proveedor?.nombre || 'Sin nombre'],
  ['Correo', c.proveedor?.email || 'Sin correo'],
  ['Paquete', c.paquete?.nombre || 'Paquete de créditos'],
  ['Créditos base', String(c.paquete?.creditos_base ?? 0)],
  ['Créditos de bonificación', String(c.paquete?.creditos_bonus ?? 0)],
  ['Créditos acreditados', String(c.creditos_otorgados ?? 0)],
  ['Método de pago', etiquetaMetodoPago(c.metodo_pago)],
  ['Total pagado', `${formatearMonto(c.monto_gtq)} ${c.moneda || 'GTQ'}`],
];

const escaparHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

// Documento HTML independiente de la app: se imprime tal cual, sin menús ni navegación.
export const construirHtmlComprobante = (c) => {
  const filas = filasComprobante(c)
    .map(([label, value]) => `<tr><th>${escaparHtml(label)}</th><td>${escaparHtml(value)}</td></tr>`)
    .join('');

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Comprobante ${escaparHtml(c.folio)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p.sub { margin: 0 0 20px; color: #475569; font-size: 13px; }
  table { border-collapse: collapse; width: 100%; max-width: 560px; }
  th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  th { width: 45%; color: #475569; font-weight: 600; }
  p.leyenda { margin-top: 24px; font-size: 12px; color: #475569; max-width: 560px; }
</style></head>
<body>
<h1>ServiGT — Comprobante de compra de créditos</h1>
<p class="sub">Folio ${escaparHtml(c.folio)}</p>
<table>${filas}</table>
<p class="leyenda">${escaparHtml(c.leyenda || LEYENDA_SIN_VALIDEZ_FISCAL)}</p>
</body></html>`;
};

export const puedeImprimir = () => (
  typeof document !== 'undefined' && typeof window !== 'undefined' && typeof window.print === 'function'
);

// Imprime en un iframe oculto: evita bloqueadores de ventanas emergentes y no
// imprime la interfaz de la app. Devuelve false si el entorno no puede imprimir.
export const imprimirComprobante = (c) => {
  if (!puedeImprimir()) return false;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);

  const limpiar = () => setTimeout(() => frame.parentNode?.removeChild(frame), 1000);

  try {
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(construirHtmlComprobante(c));
    doc.close();
    frame.contentWindow.focus();
    frame.contentWindow.print();
  } catch (error) {
    limpiar();
    return false;
  }

  limpiar();
  return true;
};
