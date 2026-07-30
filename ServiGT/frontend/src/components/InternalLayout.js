import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSession } from '../context/SessionContext';
import { T } from '../theme';

const SIDEBAR_WIDTH = 220;
const DESKTOP_MIN_WIDTH = 900;

// Navegacion por rol. `match` marca el item como activo tambien en las rutas
// hijas (por ejemplo /pedidos/12 resalta "Mis pedidos" en el cliente).
const NAV_BY_ROLE = {
  cliente: [
    { label: 'Inicio',       path: '/home' },
    { label: 'Mis pedidos',  path: '/pedidos/mios',     match: ['/pedidos/'] },
    { label: 'Mis servicios', path: '/solicitudes',     match: ['/solicitud', '/calificar/'] },
    { label: 'Mensajes',     path: '/chat' },
  ],
  proveedor: [
    { label: 'Mi panel',       path: '/dashboard' },
    { label: 'Oportunidades',  path: '/pedidos/abiertos', match: ['/pedidos/'] },
    { label: 'Solicitudes',    path: '/solicitudes' },
    { label: 'Mensajes',       path: '/chat' },
    { label: 'Mi perfil',      path: '/profile/edit' },
  ],
  admin: [
    { label: 'Panel admin', path: '/admin' },
    { label: 'Inicio',      path: '/home' },
  ],
};

const ROLE_LABEL = {
  cliente: 'Cliente',
  proveedor: 'Proveedor',
  admin: 'Administrador',
};

// Un item exacto siempre gana sobre uno que solo coincide por prefijo, para que
// /pedidos/abiertos no active "Mis pedidos" al mismo tiempo.
function resolveActivePath(items, pathname) {
  const exact = items.find((item) => item.path === pathname);
  if (exact) return exact.path;

  const byPrefix = items.find((item) =>
    (item.match ?? []).some((prefix) => pathname.startsWith(prefix)),
  );
  return byPrefix?.path ?? null;
}

function SidebarItem({ label, path, active }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[styles.navItem, active && styles.navItemActive]}
      onPress={() => router.push(path)}
      activeOpacity={0.75}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.navMarker, active && styles.navMarkerActive]} />
      <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function InternalLayout({ children, section }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useSession();
  const { width } = useWindowDimensions();

  const role = section ?? user?.role ?? 'cliente';
  const items = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.cliente;
  const activePath = resolveActivePath(items, pathname ?? '');

  if (width < DESKTOP_MIN_WIDTH) {
    return children;
  }

  const handleLogout = async () => {
    await signOut();
    router.replace('/home');
  };

  return (
    <View style={styles.shell}>
      <View style={styles.sidebar}>
        <Text style={styles.brand}>ServiGT</Text>
        <Text style={styles.role}>{ROLE_LABEL[role] ?? 'Cliente'}</Text>

        <View style={styles.userBox}>
          <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Usuario'}</Text>
          <Text style={styles.userMeta} numberOfLines={1}>{user?.email || ''}</Text>
        </View>

        <View style={styles.nav}>
          {items.map((item) => (
            <SidebarItem
              key={item.path}
              label={item.label}
              path={item.path}
              active={activePath === item.path}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.75}>
          <Text style={styles.logoutText}>Cerrar sesion</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: T.canvas,
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: T.ink,
    paddingHorizontal: T.s4,
    paddingTop: T.s6,
    paddingBottom: T.s4,
  },
  brand: {
    color: T.white,
    fontSize: 22,
    fontWeight: '800',
  },
  role: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
    marginBottom: T.s5,
  },
  userBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingVertical: T.s4,
    marginBottom: T.s4,
  },
  userName: {
    color: T.white,
    fontSize: 15,
    fontWeight: '700',
  },
  userMeta: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 11,
    marginTop: 4,
  },
  nav: {
    gap: T.s1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: T.s3,
    paddingVertical: 11,
    paddingRight: T.s3,
    paddingLeft: T.s2,
    borderRadius: T.rSm,
  },
  navItemActive: {
    backgroundColor: 'rgba(69,137,212,0.22)',
  },
  navMarker: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  navMarkerActive: {
    backgroundColor: T.blue,
  },
  navLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    fontWeight: '600',
  },
  navLabelActive: {
    color: T.white,
    fontWeight: '700',
  },
  logoutBtn: {
    marginTop: 'auto',
    paddingVertical: 11,
    paddingHorizontal: T.s3,
    borderRadius: T.rSm,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  logoutText: {
    color: T.white,
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
});
