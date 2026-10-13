import { chatContextFromParams, chatContextKey, chatPath } from './chatContext';
it('interpreta Abrir chat de reserva sin necesitar receptor', () => {
  expect(chatContextFromParams({ tipo: 'reserva', contexto: '12' })).toEqual({ tipo: 'reserva', id: 12, contraparteId: null });
  expect(chatPath({ tipo: 'reserva', contexto: 12 })).toBe('/chat?tipo=reserva&contexto=12');
});
it('aisla claves con la misma contraparte', () => {
  const keys = [{ tipo: 'servicio', id: 1 }, { tipo: 'servicio', id: 2 }, { tipo: 'reserva', id: 1 }].map((ctx) => chatContextKey({ ...ctx, contraparteId: 9 }, 4));
  expect(new Set(keys).size).toBe(3);
});
it('mantiene legacy sin elegir servicio y valida parametros', () => {
  expect(chatContextFromParams({ userId: '9' })).toEqual({ tipo: 'legacy', contraparteId: 9 });
  expect(chatPath({ tipo: 'servicio', contexto: 'invalid', userId: 9 })).toBe('/chat');
  expect(chatPath({ tipo: 'legado', userId: 9 })).toBe('/chat?tipo=legado&userId=9');
});
