// Pruebas del ciclo de vida de la clave de idempotencia (src/utils/purchaseIntent.js).
//
// El escenario que protegen es el de doble acreditacion: el backend acredita, la
// respuesta se pierde, el proveedor reintenta. Si el reintento llega con clave
// nueva, se acredita dos veces.

import {
  abrirIntento,
  cerrarIntento,
  nuevaClaveCompra,
  INTENTO_VACIO,
} from './purchaseIntent';

// Generador determinista: cada llamada devuelve k1, k2, k3...
const generadorSecuencial = () => {
  let n = 0;
  return () => `k${++n}`;
};

describe('nuevaClaveCompra', () => {
  it('usa el prefijo web- y trae marca temporal mas sufijo aleatorio', () => {
    expect(nuevaClaveCompra()).toMatch(/^web-\d+-[a-z0-9]{1,8}$/);
  });

  it('no repite la clave en llamadas seguidas', () => {
    const claves = new Set(Array.from({ length: 50 }, () => nuevaClaveCompra()));
    expect(claves.size).toBe(50);
  });

  it('cabe en el limite de 100 caracteres de la columna', () => {
    expect(nuevaClaveCompra().length).toBeLessThanOrEqual(100);
  });
});

describe('abrirIntento', () => {
  it('acuña clave nueva cuando no hay intento abierto', () => {
    const gen = generadorSecuencial();
    expect(abrirIntento(INTENTO_VACIO, 7, gen)).toEqual({ paqueteId: 7, key: 'k1' });
  });

  it('REUTILIZA la clave al reabrir el mismo paquete', () => {
    const gen = generadorSecuencial();
    const primero = abrirIntento(INTENTO_VACIO, 7, gen);
    // El proveedor cierra el modal tras un fallo y vuelve a entrar.
    const segundo = abrirIntento(primero, 7, gen);

    expect(segundo.key).toBe(primero.key);
    expect(segundo).toBe(primero); // misma referencia: no se toco nada
  });

  it('acuña clave nueva al cambiar de paquete', () => {
    const gen = generadorSecuencial();
    const inicial = abrirIntento(INTENTO_VACIO, 7, gen);
    const impulso = abrirIntento(inicial, 9, gen);

    expect(impulso).toEqual({ paqueteId: 9, key: 'k2' });
    expect(impulso.key).not.toBe(inicial.key);
  });

  it('acuña clave nueva si el intento previo quedo sin clave', () => {
    const gen = generadorSecuencial();
    expect(abrirIntento({ paqueteId: 7, key: null }, 7, gen))
      .toEqual({ paqueteId: 7, key: 'k1' });
  });

  it('tolera un intento previo nulo o indefinido', () => {
    const gen = generadorSecuencial();
    expect(abrirIntento(null, 3, gen)).toEqual({ paqueteId: 3, key: 'k1' });
    expect(abrirIntento(undefined, 3, gen)).toEqual({ paqueteId: 3, key: 'k2' });
  });
});

describe('cerrarIntento', () => {
  it('deja el intento vacio', () => {
    expect(cerrarIntento()).toEqual({ paqueteId: null, key: null });
  });

  it('devuelve una copia, no la constante compartida', () => {
    expect(cerrarIntento()).not.toBe(INTENTO_VACIO);
  });
});

describe('secuencia completa: el reintento no puede acreditar dos veces', () => {
  it('mantiene una sola clave desde la apertura hasta la confirmacion', () => {
    const gen = generadorSecuencial();
    let intento = INTENTO_VACIO;
    const enviadas = [];

    // 1. Abre el checkout del paquete 7.
    intento = abrirIntento(intento, 7, gen);
    enviadas.push(intento.key);

    // 2. El envio falla por timeout. La clave NO se toca.
    //    3. Reintenta sin cerrar el modal.
    enviadas.push(intento.key);

    // 4. Cierra, reabre el mismo paquete y reintenta otra vez.
    intento = abrirIntento(intento, 7, gen);
    enviadas.push(intento.key);

    // Los tres envios comparten clave: el backend reconoce la acreditacion.
    expect(new Set(enviadas).size).toBe(1);

    // 5. El backend confirma. El intento se cierra.
    intento = cerrarIntento();

    // 6. Una compra deliberada posterior del mismo paquete es intencion nueva.
    intento = abrirIntento(intento, 7, gen);
    expect(intento.key).not.toBe(enviadas[0]);
  });
});
