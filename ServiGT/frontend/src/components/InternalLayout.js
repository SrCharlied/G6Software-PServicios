import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSession } from '../context/SessionContext';
import { T } from '../theme';

const SIDEBAR_WIDTH = 220;

const PROVIDER_ITEMS = [
  { label: 'Mi panel', path: '/dashboard' },
  { label: 'Pedidos abiertos', path: '/pedidos/abiertos' },
  { label: 'Solicitudes', path: '/solicitudes' },
  { label: 'Mensajes', path: '/chat' },
];

const ADMIN_ITEMS = [
  { label: 'Panel admin', path: '/admin' },
];

function SidebarItem({ label, path }) {
  const router = useRouter();
  return (
    <TouchableOpacity style={styles.navItem} onPress={() => router.push(path)} activeOpacity={0.75}>
      <Text style={styles.navLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function InternalLayout({ children, section = 'proveedor' }) {
  const router = useRouter();
  const { user, signOut } = useSession();
  const { width } = useWindowDimensions();
  const showSidebar = width >= 900;
  const items = section === 'admin' ? ADMIN_ITEMS : PROVIDER_ITEMS;

  const handleLogout = async () => {
    await signOut();
    router.replace('/home');
  };

  if (!showSidebar) {
    return children;
  }

  return (
    <View style={styles.shell}>
      <View style={styles.sidebar}>
        <Text style={styles.brand}>ServiGT</Text>
        <Text style={styles.role}>{section === 'admin' ? 'Administrador' : 'Proveedor'}</Text>

        <View style={styles.userBox}>
          <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Usuario'}</Text>
          <Text style={styles.userMeta}>{user?.email || ''}</Text>
        </View>

        <View style={styles.nav}>
          <SidebarItem label="Inicio" path="/home" />
          {items.map((item) => (
            <SidebarItem key={item.path} label={item.label} path={item.path} />
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
    paddingVertical: 11,
    paddingHorizontal: T.s3,
    borderRadius: T.rSm,
  },
  navLabel: {
    color: T.white,
    fontSize: 14,
    fontWeight: '600',
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
