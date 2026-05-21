import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../context/SessionContext';
import ServiGTLogo from './ServiGTLogo';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.78, 300);

function NavItem({ icon, label, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.navIcon, danger && styles.navIconDanger]}>{icon}</Text>
      <Text style={[styles.navLabel, danger && styles.navLabelDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function Drawer({ isOpen, onClose }) {
  const router       = useRouter();
  const { user, signOut } = useSession();

  const translateX   = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAlpha = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX,   { toValue: isOpen ? 0 : -DRAWER_WIDTH, duration: 260, useNativeDriver: true }),
      Animated.timing(overlayAlpha, { toValue: isOpen ? 1 : 0,              duration: 260, useNativeDriver: true }),
    ]).start();
  }, [isOpen]);

  const go = (path) => { onClose(); router.push(path); };

  const handleLogout = async () => {
    onClose();
    await signOut();
    router.replace('/home');
  };

  return (
    <View style={[styles.root, !isOpen && styles.hidden]} pointerEvents={isOpen ? 'auto' : 'none'}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayAlpha }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>

        {/* Cabecera */}
        <View style={styles.drawerHead}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user ? user.name.charAt(0).toUpperCase() : 'P'}
            </Text>
          </View>
          {user ? (
            <>
              <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
              <Text style={styles.userRole}>
                {user.role === 'proveedor' ? 'Proveedor' : 'Cliente'}
              </Text>
            </>
          ) : (
            <ServiGTLogo size={20} mode="light" />
          )}
        </View>

        <View style={styles.divider} />

        {/* Navegacion */}
        <View style={styles.navSection}>
          <NavItem icon="⌂" label="Inicio" onPress={() => go('/home')} />

          {user?.role === 'proveedor' && (
            <NavItem icon="▤" label="Mi panel"          onPress={() => go('/dashboard')} />
          )}
          {user?.role === 'proveedor' && (
            <NavItem icon="📋" label="Pedidos abiertos" onPress={() => go('/pedidos/abiertos')} />
          )}
          {user?.role === 'admin' && (
            <NavItem icon="★" label="Panel admin"       onPress={() => go('/admin')} />
          )}
          {user && user.role !== 'proveedor' && (
            <NavItem icon="📝" label="Mis pedidos"      onPress={() => go('/pedidos/mios')} />
          )}
          {user && (
            <NavItem icon="≡" label="Solicitudes"       onPress={() => go('/solicitudes')} />
          )}
          {user && (
            <NavItem icon="✉" label="Mensajes"          onPress={() => go('/chat')} />
          )}
          {!user && (
            <>
              <NavItem icon="→" label="Iniciar sesion"  onPress={() => go('/login')} />
              <NavItem icon="+" label="Registrarse"     onPress={() => go('/register')} />
            </>
          )}
        </View>

        <View style={styles.divider} />

        {user && (
          <NavItem icon="←" label="Cerrar sesion" danger onPress={handleLogout} />
        )}

        <Text style={styles.version}>ServiGT · Guatemala</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 1000, flexDirection: 'row' },
  hidden: { pointerEvents: 'none' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  panel: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#f6f4ee',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerHead: {
    backgroundColor: '#0e1424',
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  avatarCircle: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText:  { fontSize: 22, fontWeight: '700', color: '#fff' },
  userName:    { fontSize: 16, fontWeight: '700', color: '#fff' },
  userRole:    { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  guestLabel:  { fontSize: 20, fontWeight: '700', color: '#fff' },
  divider:     { height: 1, backgroundColor: '#f0f0f0', marginVertical: 8 },
  navSection:  { paddingVertical: 4 },
  navItem:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 16 },
  navIcon:     { fontSize: 18, color: '#555', width: 22, textAlign: 'center' },
  navLabel:    { fontSize: 15, color: '#0e1424', fontWeight: '500' },
  navIconDanger:  { color: '#c0392b' },
  navLabelDanger: { color: '#c0392b' },
  version: {
    position: 'absolute', bottom: 20, left: 0, right: 0,
    textAlign: 'center', fontSize: 11, color: '#bbb',
  },
});
