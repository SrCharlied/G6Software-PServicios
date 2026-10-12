// Adaptador de navegacion de las pantallas de la bolsa de materiales.
// Las pantallas piden destinos por nombre; aqui se traducen a rutas de Expo
// Router. Un destino desconocido o un ID ausente nunca rompe la app: cae en la
// bandeja de chat o en el inicio.

export const rutaDeMaterial = (screen, params = {}) => {
  switch (screen) {
    case 'MisLotesMaterial':
      return '/bolsa-materiales/mias';
    case 'MisReservasMaterial':
      return '/reservas-materiales';
    case 'ChatContexto':
      // Contrato de contexto del hilo (Task 4.3): ?tipo=reserva&contexto={id}.
      // Sin ID valido se abre la bandeja, que no necesita contexto.
      return params.tipo && params.id
        ? `/chat?tipo=${encodeURIComponent(params.tipo)}&contexto=${encodeURIComponent(params.id)}`
        : '/chat';
    default:
      return '/home';
  }
};

export const materialNavigation = (router) => ({
  goBack: () => router.back(),
  navigate: (screen, params) => router.push(rutaDeMaterial(screen, params)),
});
