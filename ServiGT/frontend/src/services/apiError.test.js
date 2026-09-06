import { ApiError, toApiError } from './apiError';

/**
 * Task 3.3 — el contrato de error preserva el status HTTP.
 *
 * Antes `api.js` lanzaba `new Error(mensaje)` y el status desaparecia, asi que
 * la app no podia distinguir 401 de 403 de 429.
 */
describe('toApiError', () => {
  const respuesta = (status, data = {}, headers = {}) => ({
    response: { status, data, headers },
    config: {},
  });

  it('conserva el status HTTP', () => {
    expect(toApiError(respuesta(403)).status).toBe(403);
    expect(toApiError(respuesta(404)).status).toBe(404);
    expect(toApiError(respuesta(429)).status).toBe(429);
  });

  it('expone los tres casos que se tratan distinto', () => {
    expect(toApiError(respuesta(401)).esNoAutenticado).toBe(true);
    expect(toApiError(respuesta(403)).esProhibido).toBe(true);
    expect(toApiError(respuesta(429)).esLimiteExcedido).toBe(true);

    // Un 403 no debe parecerse a un 401: confundirlos es lo que hacia que la
    // app cerrara sesion por una falta de permiso.
    expect(toApiError(respuesta(403)).esNoAutenticado).toBe(false);
  });

  it('prefiere el primer error de validacion sobre el mensaje generico', () => {
    const error = toApiError(respuesta(422, {
      message: 'Los datos no son validos',
      errors: { password: ['La contrasena es demasiado corta.'] },
    }));

    expect(error.message).toBe('La contrasena es demasiado corta.');
    expect(error.errors.password).toEqual(['La contrasena es demasiado corta.']);
    expect(error.esValidacion).toBe(true);
  });

  it('conserva el correlation id para poder cruzarlo con el log del backend', () => {
    const desdeCuerpo = toApiError(respuesta(500, { correlation_id: 'abc-123' }));
    expect(desdeCuerpo.correlationId).toBe('abc-123');

    const desdeCabecera = toApiError(respuesta(500, {}, { 'x-correlation-id': 'def-456' }));
    expect(desdeCabecera.correlationId).toBe('def-456');
  });

  it('lee los segundos de espera de un 429', () => {
    const error = toApiError(respuesta(429, {}, { 'retry-after': '45' }));
    expect(error.retryAfter).toBe(45);
  });

  it('marca los fallos de red como tales en vez de inventar un status', () => {
    const error = toApiError({ request: {}, code: 'ECONNABORTED' });

    expect(error.status).toBeNull();
    expect(error.esDeRed).toBe(true);
    expect(error.message).toMatch(/demasiado tiempo/i);
  });

  it('no vuelve a envolver un ApiError', () => {
    const original = new ApiError('ya convertido', { status: 418 });
    expect(toApiError(original)).toBe(original);
  });

  it('usa el fallback de la funcion que llamo cuando el backend no dice nada', () => {
    const error = toApiError(respuesta(500), 'No se pudo cargar el proveedor.');
    expect(error.message).toBe('No se pudo cargar el proveedor.');
  });

  it('sigue siendo un Error, asi que las pantallas que leen .message no cambian', () => {
    const error = toApiError(respuesta(403, { message: 'Sin permiso' }));

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Sin permiso');
  });
});
