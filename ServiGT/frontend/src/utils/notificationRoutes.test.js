// Pruebas del mapa de destinos de notificaciones (src/utils/notificationRoutes.js).
//
// Funcion pura: sin React, sin red. Cubre los 10 tipos que emite el backend mas
// los casos degradados (tipo desconocido, datos ausentes, payload incompleto).

import { destinoNotificacion, TIPOS_CON_DESTINO } from './notificationRoutes';

// Contrato con el backend. Fuente exacta:
//   ServicioController.php  -> nueva_solicitud, solicitud_aceptada,
//     solicitud_rechazada, servicio_iniciado, servicio_por_confirmar,
//     servicio_completado, servicio_cancelado, servicio_calificable
//   CotizacionController.php -> cotizacion_aceptada, cotizacion_rechazada
const TIPOS_BACKEND = [
  'nueva_solicitud',
  'solicitud_aceptada',
  'solicitud_rechazada',
  'servicio_iniciado',
  'servicio_por_confirmar',
  'servicio_completado',
  'servicio_cancelado',
  'servicio_calificable',
  'cotizacion_aceptada',
  'cotizacion_rechazada',
  'reserva_material_solicitada',
  'reserva_material_aceptada',
  'reserva_material_rechazada',
  'reserva_material_cancelada',
  'servicio_seguridad_reporte',
  'servicio_interrumpido_seguridad',
];

describe('cobertura de tipos', () => {
  it('mapea los tipos reales de servicios, cotizaciones, reservas y seguridad', () => {
    expect(TIPOS_CON_DESTINO.sort()).toEqual([...TIPOS_BACKEND].sort());
  });

  it('ningun tipo del backend queda sin destino', () => {
    TIPOS_BACKEND.forEach((tipo) => {
      const destino = destinoNotificacion({
        tipo,
        datos: { servicio_id: 7, pedido_id: 12, cotizacion_id: 30 },
      });
      expect(destino).not.toBeNull();
      expect(typeof destino).toBe('string');
    });
  });
});

describe('Flujo A: servicios', () => {
  it('los siete tipos de ciclo de servicio van al listado de solicitudes', () => {
    const tipos = [
      'nueva_solicitud',
      'solicitud_aceptada',
      'solicitud_rechazada',
      'servicio_iniciado',
      'servicio_por_confirmar',
      'servicio_completado',
      'servicio_cancelado',
    ];

    tipos.forEach((tipo) => {
      expect(destinoNotificacion({ tipo, datos: { servicio_id: 41 } })).toBe('/solicitudes');
    });
  });

  it('servicio_cancelado navega al listado incluso sin servicio_id', () => {
    expect(destinoNotificacion({ tipo: 'servicio_cancelado', datos: {} }))
      .toBe('/solicitudes');
  });

  it('servicio_calificable abre la pantalla de calificacion del servicio', () => {
    expect(destinoNotificacion({ tipo: 'servicio_calificable', datos: { servicio_id: 41 } }))
      .toBe('/calificar/41');
  });

  it('servicio_calificable sin servicio_id cae al listado en lugar de romper la ruta', () => {
    expect(destinoNotificacion({ tipo: 'servicio_calificable', datos: {} }))
      .toBe('/solicitudes');
  });
});

describe('Flujo B: pedidos y cotizaciones', () => {
  it('navega reservas y seguridad sin revelar IDs de reportes privados', () => {
    expect(destinoNotificacion({ tipo: 'reserva_material_solicitada', datos: { reserva_id: 8 } })).toBe('/bolsa-materiales/mias');
    expect(destinoNotificacion({ tipo: 'reserva_material_aceptada' })).toBe('/reservas-materiales');
    expect(destinoNotificacion({ tipo: 'reserva_material_cancelada', datos: { publicacion_id: 7 } })).toBe('/bolsa-materiales/7');
    expect(destinoNotificacion({ tipo: 'servicio_interrumpido_seguridad', datos: { servicio_id: 2 } })).toBe('/solicitudes');
  });
  it('cotizacion_aceptada abre el pedido adjudicado', () => {
    const datos = { pedido_id: 12, cotizacion_id: 30, servicio_id: 55 };
    expect(destinoNotificacion({ tipo: 'cotizacion_aceptada', datos })).toBe('/pedidos/12');
  });

  it('cotizacion_rechazada abre el pedido que se perdio', () => {
    const datos = { pedido_id: 12, cotizacion_id: 31 };
    expect(destinoNotificacion({ tipo: 'cotizacion_rechazada', datos })).toBe('/pedidos/12');
  });

  it('sin pedido_id no navega en lugar de generar /pedidos/undefined', () => {
    expect(destinoNotificacion({ tipo: 'cotizacion_aceptada', datos: {} })).toBeNull();
    expect(destinoNotificacion({ tipo: 'cotizacion_rechazada', datos: {} })).toBeNull();
  });
});

describe('casos degradados', () => {
  it('un tipo desconocido no navega', () => {
    expect(destinoNotificacion({ tipo: 'premium_activado', datos: { proveedor_id: 3 } }))
      .toBeNull();
  });

  it('tolera notificaciones sin datos, sin tipo, nulas o vacias', () => {
    expect(destinoNotificacion({ tipo: 'nueva_solicitud' })).toBe('/solicitudes');
    expect(destinoNotificacion({ tipo: 'servicio_calificable', datos: null }))
      .toBe('/solicitudes');
    expect(destinoNotificacion({})).toBeNull();
    expect(destinoNotificacion(null)).toBeNull();
    expect(destinoNotificacion(undefined)).toBeNull();
  });

  it('no hereda destinos de Object.prototype', () => {
    expect(destinoNotificacion({ tipo: 'constructor' })).toBeNull();
    expect(destinoNotificacion({ tipo: 'toString' })).toBeNull();
  });
});
