import { useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Pressable, SafeAreaView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import NotificationBell from './NotificationBell';
import { useSession } from '../context/SessionContext';
import { T } from '../theme';

const SIDEBAR_WIDTH = 220;
const DESKTOP_MIN_WIDTH = 900;

// Navegacion por rol. `match` marca el item como activo tambien en las rutas
// hijas (por ejemplo /pedidos/12 resalta "Mis pedidos" en el cliente).
const NAV_BY_ROLE = {
  cliente: [
    { label: 'Inicio',       path: '/home', icon: 'home' },
    { label: 'Mis pedidos',  path: '/pedidos/mios', icon: 'clipboard', match: ['/pedidos/'] },
    { label: 'Mis servicios', path: '/solicitudes', icon: 'briefcase', match: ['/solicitud', '/calificar/'] },
    { label: 'Mensajes',     path: '/chat', icon: 'message-circle' },
  ],
  proveedor: [
    { label: 'Mi panel',       path: '/dashboard', icon: 'grid' },
    { label: 'Oportunidades',  path: '/pedidos/abiertos', icon: 'search', match: ['/pedidos/'] },
    { label: 'Creditos',       path: '/creditos', icon: 'credit-card' },
    { label: 'Trabajos',       path: '/solicitudes', icon: 'briefcase' },
    { label: 'Mensajes',       path: '/chat', icon: 'message-circle' },
    { label: 'Mi perfil',      path: '/profile/edit', icon: 'user' },
  ],
  admin: [
    { label: 'Panel admin', path: '/admin', icon: 'shield' },
    { label: 'Inicio',      path: '/home', icon: 'home' },
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

function SidebarItem({ label, path, icon, active }) {
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
      <Feather name={icon || 'circle'} size={18} color={active ? T.blue : T.muted} />
      <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MobileNavItem({ label, path, icon, active, onNavigate, tab = false }) {
  return (
    <TouchableOpacity
      style={[
        tab ? styles.mobileTabItem : styles.mobileNavItem,
        active && (tab ? styles.mobileTabItemActive : styles.mobileNavItemActive),
      ]}
      onPress={() => onNavigate(path)}
      activeOpacity={0.75}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
    >
      <Feather name={icon || 'circle'} size={tab ? 21 : 18} color={active ? T.blue : T.muted} />
      <Text
        style={[
          tab ? styles.mobileTabLabel : styles.mobileNavLabel,
          active && (tab ? styles.mobileTabLabelActive : styles.mobileNavLabelActive),
        ]}
        numberOfLines={1}
      >
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const role = section ?? user?.role ?? 'cliente';
  const items = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.cliente;
  const activePath = resolveActivePath(items, pathname ?? '');

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await signOut();
    router.replace('/home');
  };

  const handleNavigate = (path) => {
    setMobileMenuOpen(false);
    router.push(path);
  };

  if (width < DESKTOP_MIN_WIDTH) {
    return (
      <SafeAreaView style={styles.mobileShell}>
        <View style={styles.mobileHeader}>
          <TouchableOpacity
            style={styles.mobileMenuBtn}
            onPress={() => setMobileMenuOpen((open) => !open)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Abrir menu"
          >
            <View style={styles.mobileMenuLine} />
            <View style={styles.mobileMenuLine} />
            <View style={styles.mobileMenuLine} />
          </TouchableOpacity>

          <View style={styles.mobileTitleBox}>
            <Text style={styles.mobileBrand}>ServiGT</Text>
            <Text style={styles.mobileRole}>{ROLE_LABEL[role] ?? 'Cliente'}</Text>
          </View>

          <NotificationBell />
        </View>

        {mobileMenuOpen ? (
          <View style={styles.mobileMenuWrap}>
            <Pressable style={styles.mobileMenuBackdrop} onPress={() => setMobileMenuOpen(false)} />
            <View style={styles.mobileMenu}>
              <Text style={styles.mobileUserName} numberOfLines={1}>{user?.name || 'Usuario'}</Text>
              <Text style={styles.mobileUserMeta} numberOfLines={1}>{user?.email || ''}</Text>

              <View style={styles.mobileNav}>
                {items.map((item) => (
                  <MobileNavItem
                    key={item.path}
                    label={item.label}
                    path={item.path}
                    icon={item.icon}
                    active={activePath === item.path}
                    onNavigate={handleNavigate}
                  />
                ))}
              </View>

              <TouchableOpacity style={styles.mobileLogoutBtn} onPress={handleLogout} activeOpacity={0.75}>
                <Text style={styles.mobileLogoutText}>Cerrar sesion</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.mobileContent}>
          {children}
        </View>

        <View style={styles.mobileTabBar}>
          {items.slice(0, 5).map((item) => (
            <MobileNavItem
              key={item.path}
              label={item.label}
              path={item.path}
              icon={item.icon}
              active={activePath === item.path}
              onNavigate={handleNavigate}
              tab
            />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.shell}>
      <View style={styles.sidebar}>
        <View style={styles.brandRow}>
          <View style={styles.brandBox}>
            <Text style={styles.brand}>ServiGT</Text>
            <Text style={styles.role}>{ROLE_LABEL[role] ?? 'Cliente'}</Text>
          </View>
          {/* La campana vive en el layout para que proveedor y admin tambien
              la tengan, no solo el home del cliente. */}
          <NotificationBell />
        </View>

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
              icon={item.icon}
              active={activePath === item.path}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.75}>
          <Text style={styles.logoutText}>Cerrar sesion</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={[styles.contentFrame, width < 1200 && styles.contentFrameCompact]}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileShell: {
    flex: 1,
    backgroundColor: T.canvas,
  },
  mobileHeader: {
    minHeight: 56,
    backgroundColor: 'rgba(246,244,238,0.94)',
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    paddingHorizontal: T.s3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: T.s3,
    zIndex: 30,
  },
  mobileMenuBtn: {
    width: 36,
    height: 36,
    borderRadius: T.rSm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mobileMenuLine: {
    width: 19,
    height: 2,
    borderRadius: 2,
    backgroundColor: T.ink,
  },
  mobileTitleBox: {
    flex: 1,
    minWidth: 0,
  },
  mobileBrand: {
    color: T.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  mobileRole: {
    color: T.muted,
    fontSize: 11,
    marginTop: 1,
  },
  mobileMenuWrap: {
    ...StyleSheet.absoluteFillObject,
    top: 56,
    zIndex: 20,
  },
  mobileMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,20,36,0.28)',
  },
  mobileMenu: {
    width: '82%',
    maxWidth: 320,
    backgroundColor: T.paper,
    borderRightWidth: 1,
    borderRightColor: T.border,
    padding: T.s4,
    gap: T.s3,
    ...T.sh3,
  },
  mobileUserName: {
    color: T.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  mobileUserMeta: {
    color: T.muted,
    fontSize: 12,
    marginTop: -8,
  },
  mobileNav: {
    gap: T.s1,
  },
  mobileNavItem: {
    paddingVertical: 12,
    paddingHorizontal: T.s3,
    borderRadius: T.rSm,
  },
  mobileNavItemActive: {
    backgroundColor: 'rgba(69,137,212,0.22)',
  },
  mobileNavLabel: {
    color: T.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  mobileNavLabelActive: {
    color: T.blue,
    fontWeight: '800',
  },
  mobileLogoutBtn: {
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: T.s3,
    marginTop: T.s1,
  },
  mobileLogoutText: {
    color: T.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  mobileContent: {
    flex: 1,
    minWidth: 0,
  },
  mobileTabBar: {
    minHeight: 66,
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(246,244,238,0.96)',
    borderTopWidth: 1,
    borderTopColor: T.border,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mobileTabItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: T.rSm,
  },
  mobileTabItemActive: {
    backgroundColor: 'transparent',
  },
  mobileTabLabel: {
    color: T.muted,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  mobileTabLabelActive: {
    color: T.blue,
    fontWeight: '800',
  },
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: T.canvas,
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: T.paper,
    paddingHorizontal: T.s3,
    paddingTop: T.s5,
    paddingBottom: T.s4,
    borderRightWidth: 1,
    borderRightColor: T.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: T.s2,
    marginBottom: T.s5,
  },
  brandBox: {
    flex: 1,
    minWidth: 0,
  },
  brand: {
    color: T.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  role: {
    color: T.muted,
    fontSize: 12,
    marginTop: 4,
  },
  userBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: T.border,
    paddingVertical: T.s4,
    marginBottom: T.s4,
  },
  userName: {
    color: T.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  userMeta: {
    color: T.muted,
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
    minHeight: 40,
    paddingVertical: 9,
    paddingRight: T.s3,
    paddingLeft: T.s2,
    borderRadius: T.rSm,
  },
  navItemActive: {
    backgroundColor: '#e6effa',
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
    color: T.text,
    fontSize: 14,
    fontWeight: '600',
  },
  navLabelActive: {
    color: T.deep,
    fontWeight: '700',
  },
  logoutBtn: {
    marginTop: 'auto',
    paddingVertical: 11,
    paddingHorizontal: T.s3,
    borderRadius: T.rSm,
    backgroundColor: T.tint,
  },
  logoutText: {
    color: T.deep,
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  contentFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 1120,
    paddingHorizontal: T.s5,
    paddingVertical: T.s4,
  },
  contentFrameCompact: {
    paddingHorizontal: T.s3,
  },
});
