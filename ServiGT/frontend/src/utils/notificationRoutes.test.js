// Pruebas del mapa de destinos de notificaciones (src/utils/notificationRoutes.js).
//
// Funcion pura: sin React, sin red. Cubre los 9 tipos que emite el backend mas
// los casos degradados (tipo desconocido, datos ausentes, payload incompleto).

import { destinoNotificacion, TIPOS_CON_DESTINO } from './notificationRoutes';

// Contrato con el backend. Fuente exacta:
//   ServicioController.php  -> nueva_solicitud, solicitud_aceptada,
//     solicitud_rechazada, servicio_iniciado, servicio_por_confirmar,
//     servicio_completado, servicio_calificable
//   CotizacionController.php -> cotizacion_aceptada, cotizacion_rechazada
const TIPOS_BACKEND = [
  'nueva_solicitud',
  'solicitud_aceptada',
  'solicitud_rechazada',
  'servicio_iniciado',
  'servicio_por_confirmar',
  'servicio_completado',
  'servicio_calificable',
  'cotizacion_aceptada',
  'cotizacion_rechazada',
];

describe('cobertura de tipos', () => {
  it('mapea exactamente los 9 tipos del backend, sin faltantes ni sobrantes', () => {
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
  it('los seis tipos de ciclo de servicio van al listado de solicitudes', () => {
    const tipos = [
      'nueva_solicitud',
      'solicitud_aceptada',
      'solicitud_rechazada',
      'servicio_iniciado',
      'servicio_por_confirmar',
      'servicio_completado',
    ];

    tipos.forEach((tipo) => {
      expect(destinoNotificacion({ tipo, datos: { servicio_id: 41 } })).toBe('/solicitudes');
    });
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
