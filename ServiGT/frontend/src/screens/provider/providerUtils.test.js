import {
  buildDisponibilidad,
  DIAS,
  formatCurrency,
  getSlotIndicator,
  isAvailableNow,
} from './providerUtils';

describe('getSlotIndicator', () => {
  it('usa slots_gratis del backend cuando viene en el pedido', () => {
    expect(getSlotIndicator({ slots_gratis: 2, slots_total: 3 })).toEqual({
      type: 'gratis',
      label: 'Slot gratis (1/3)',
    });
  });

  it('marca la cotizacion como cobrable cuando ya no quedan slots gratis', () => {
    expect(getSlotIndicator({ slots_gratis: 0, slots_total: 3 })).toEqual({
      type: 'credito',
      label: 'Costo: 1 crédito',
    });
  });

  it('deriva el estado del conteo cuando el backend no manda slots_gratis', () => {
    expect(getSlotIndicator({ cotizaciones_count: 1 }).type).toBe('gratis');
    expect(getSlotIndicator({ cotizaciones_count: 3 }).type).toBe('credito');
    expect(getSlotIndicator({ cotizaciones_count: 5 }).type).toBe('credito');
  });

  it('trata un pedido sin datos de cotizaciones como nuevo y gratuito', () => {
    expect(getSlotIndicator({})).toEqual({
      type: 'gratis',
      label: 'Slot gratis (0/3)',
    });
  });
});

describe('buildDisponibilidad', () => {
  it('devuelve los 7 dias aunque el backend mande solo algunos', () => {
    const resultado = buildDisponibilidad([
      { dia_semana: 1, disponible: true, hora_inicio: '09:00:00', hora_fin: '18:00:00' },
    ]);

    expect(resultado).toHaveLength(DIAS.length);
    expect(resultado[1]).toEqual({
      dia_semana: 1,
      disponible: true,
      hora_inicio: '09:00',
      hora_fin: '18:00',
    });
    expect(resultado[0].disponible).toBe(false);
  });
});

describe('isAvailableNow', () => {
  const hoy = new Date().getDay();

  it('es falso cuando el dia esta marcado como no disponible', () => {
    expect(isAvailableNow([{ dia_semana: hoy, disponible: false, hora_inicio: '00:00', hora_fin: '23:59' }]))
      .toBe(false);
  });

  it('es verdadero dentro del rango horario del dia actual', () => {
    expect(isAvailableNow([{ dia_semana: hoy, disponible: true, hora_inicio: '00:00', hora_fin: '23:59' }]))
      .toBe(true);
  });

  it('es falso cuando no hay disponibilidad registrada', () => {
    expect(isAvailableNow([])).toBe(false);
    expect(isAvailableNow(undefined)).toBe(false);
  });
});

describe('formatCurrency', () => {
  it('formatea quetzales con dos decimales', () => {
    expect(formatCurrency(115)).toBe('Q115.00');
    expect(formatCurrency('39.5')).toBe('Q39.50');
  });

  it('no inventa un cero cuando no hay monto', () => {
    expect(formatCurrency(null)).toBe('Sin monto');
    expect(formatCurrency('')).toBe('Sin monto');
  });
});
