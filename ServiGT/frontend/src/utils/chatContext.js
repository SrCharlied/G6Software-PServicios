const positiveId = (value) => /^[1-9]\d*$/.test(String(value ?? '')) ? Number(value) : null;
export const chatContextFromParams = ({ tipo, contexto, userId } = {}) => {
  if (tipo === 'servicio' || tipo === 'reserva') {
    const id = positiveId(contexto);
    return id ? { tipo, id, contraparteId: positiveId(userId) } : null;
  }
  if (tipo === 'legado') return positiveId(userId) ? { tipo, contraparteId: positiveId(userId) } : null;
  if (tipo) return null;
  return positiveId(userId) ? { tipo: 'legacy', contraparteId: positiveId(userId) } : null;
};
export const chatContextKey = (context, userId) => `${userId}:${context?.tipo}:${context?.id ?? 0}:${context?.contraparteId ?? 0}`;
export const chatPath = ({ tipo, contexto, userId } = {}) => {
  const context = chatContextFromParams({ tipo, contexto, userId });
  if (!context) return '/chat';
  const params = context.tipo === 'legacy'
    ? `userId=${context.contraparteId}`
    : context.tipo === 'legado'
      ? `tipo=legado&userId=${context.contraparteId}`
      : `tipo=${context.tipo}&contexto=${context.id}${context.contraparteId ? `&userId=${context.contraparteId}` : ''}`;
  return `/chat?${params}`;
};
