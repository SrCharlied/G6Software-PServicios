// Mapa unico de rutas publicas. Las pantallas siguen recibiendo un objeto
// `navigation` con .navigate(nombre) — el mismo contrato que ya usaba
// LandingScreen — para no acoplarlas a expo-router.

import { useRouter } from 'expo-router';

export const PUBLIC_ROUTES = {
  Inicio:    '/landing',
  Servicios: '/servicios',
  Nosotros:  '/nosotros',
  Login:     '/login',
  Register:  '/register',
};

export function usePublicNavigation() {
  const router = useRouter();

  return {
    navigate: (name) => router.push(PUBLIC_ROUTES[name] ?? PUBLIC_ROUTES.Inicio),
  };
}
