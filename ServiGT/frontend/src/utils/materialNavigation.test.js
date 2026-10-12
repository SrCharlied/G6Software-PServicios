import { materialNavigation, rutaDeMaterial } from './materialNavigation';

describe('rutaDeMaterial', () => {
  it('traduce los destinos de la bolsa de materiales a rutas de Expo Router', () => {
    expect(rutaDeMaterial('MisLotesMaterial')).toBe('/bolsa-materiales/mias');
    expect(rutaDeMaterial('MisReservasMaterial')).toBe('/reservas-materiales');
  });

  it('abre el hilo de la reserva con tipo y contexto', () => {
    expect(rutaDeMaterial('ChatContexto', { tipo: 'reserva', id: 12 })).toBe('/chat?tipo=reserva&contexto=12');
  });

  it('si falta el ID cae de forma segura en la bandeja de chat', () => {
    expect(rutaDeMaterial('ChatContexto', { tipo: 'reserva' })).toBe('/chat');
    expect(rutaDeMaterial('ChatContexto', {})).toBe('/chat');
    expect(rutaDeMaterial('ChatContexto')).toBe('/chat');
  });

  it('un destino desconocido cae en el inicio sin romper', () => {
    expect(rutaDeMaterial('Inexistente')).toBe('/home');
  });
});

describe('materialNavigation', () => {
  it('navigate usa push con la ruta traducida y goBack usa back', () => {
    const router = { push: jest.fn(), back: jest.fn() };
    const navigation = materialNavigation(router);

    navigation.navigate('MisReservasMaterial');
    navigation.goBack();

    expect(router.push).toHaveBeenCalledWith('/reservas-materiales');
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
