// Header de las pantallas publicas. Lo comparten landing, servicios y nosotros
// para que el menu sea el mismo en las tres y solo cambie el item activo.

import React, { useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import ServiGTLogo from './ServiGTLogo';
import { C, MD, OutlineBtn, SolidBtn } from './publicUI';

const DRAWER_WIDTH = 300;

// Etiqueta visible -> nombre de ruta que entiende usePublicNavigation.
const NAV_ITEMS = [
  { label: 'Inicio',    route: 'Inicio' },
  { label: 'Servicios', route: 'Servicios' },
  { label: 'Nosotros',  route: 'Nosotros' },
];

// ── Layout ancho ───────────────────────────────────────────────────────────
function WebHeader({ active, onNavigate, onLogin, onRegister }) {
  return (
    <View style={s.webHeader}>
      <TouchableOpacity onPress={() => onNavigate('Inicio')} activeOpacity={0.7}>
        <ServiGTLogo size={22} mode="dark" />
      </TouchableOpacity>
      <View style={s.webNav}>
        {NAV_ITEMS.map(({ label, route }) => (
          <TouchableOpacity key={route} onPress={() => onNavigate(route)} activeOpacity={0.6}>
            <Text style={[s.navLink, active === route && s.navLinkActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.webCtas}>
        <OutlineBtn label="Iniciar Sesión" onPress={onLogin} />
        <SolidBtn   label="Crear Cuenta"   onPress={onRegister} />
      </View>
    </View>
  );
}

// ── Layout de telefono: barra + drawer deslizante ──────────────────────────
function MobileHeader({ active, onNavigate, onLogin, onRegister }) {
  const [visible, setVisible] = useState(false);
  const drawerX   = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const backdropO = useRef(new Animated.Value(0)).current;

  const open = () => {
    setVisible(true);
    Animated.parallel([
      Animated.spring(drawerX,   { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.timing(backdropO, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  // cb es opcional. Se comprueba que sea funcion porque close tambien se usa
  // como handler directo (onPress={close}), y entonces llega el evento de press
  // en su lugar: invocarlo reventaria con "cb is not a function".
  const close = (cb) => {
    Animated.parallel([
      Animated.timing(drawerX,   { toValue: DRAWER_WIDTH, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropO, { toValue: 0,            duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      if (typeof cb === 'function') cb();
    });
  };

  return (
    <>
      <View style={s.mobileHeader}>
        <TouchableOpacity onPress={() => onNavigate('Inicio')} activeOpacity={0.7}>
          <ServiGTLogo size={20} mode="dark" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={open}
          style={s.hamburger}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        >
          <View style={s.hLine} />
          <View style={[s.hLine, { width: 17 }]} />
          <View style={s.hLine} />
        </TouchableOpacity>
      </View>

      <Modal visible={visible} transparent statusBarTranslucent onRequestClose={() => close()}>
        <View style={s.drawerModal}>
          {/* Backdrop — tap to close */}
          <Pressable style={{ flex: 1 }} onPress={() => close()}>
            <Animated.View style={[StyleSheet.absoluteFill, s.drawerBackdrop, { opacity: backdropO }]} />
          </Pressable>

          {/* Sliding panel */}
          <Animated.View style={[s.drawer, { transform: [{ translateX: drawerX }] }]}>
            <View style={s.drawerTop}>
              <ServiGTLogo size={20} mode="dark" />
              <TouchableOpacity onPress={() => close()} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Text style={s.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={s.drawerNav}>
              {NAV_ITEMS.map(({ label, route }) => (
                <TouchableOpacity
                  key={route}
                  style={s.drawerItem}
                  onPress={() => close(() => onNavigate(route))}
                >
                  <Text style={[s.drawerItemText, active === route && s.drawerItemTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <SolidBtn   label="Crear Cuenta"   onPress={() => close(onRegister)} />
            <OutlineBtn label="Iniciar Sesión"  onPress={() => close(onLogin)}    style={{ marginTop: 12 }} />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

/**
 * @param active  ruta actualmente abierta ('Inicio' | 'Servicios' | 'Nosotros')
 * @param navigation  objeto con .navigate(nombreDeRuta), de usePublicNavigation
 */
export default function PublicHeader({ active, navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= MD;

  const go = (route) => navigation?.navigate(route);

  const props = {
    active,
    onNavigate: go,
    onLogin:    () => go('Login'),
    onRegister: () => go('Register'),
  };

  return isWide ? <WebHeader {...props} /> : <MobileHeader {...props} />;
}

const s = StyleSheet.create({
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
    paddingVertical: 14,
    backgroundColor: C.paper,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    shadowColor: C.ink,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  webNav: { flexDirection: 'row', alignItems: 'center', gap: 36 },
  navLink: { fontSize: 14, color: 'rgba(14,20,36,0.65)', fontWeight: '500', letterSpacing: 0.1 },
  navLinkActive: { color: C.deep, fontWeight: '700' },
  webCtas: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: C.paper,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    shadowColor: C.ink,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  hamburger: { paddingVertical: 4, alignItems: 'flex-end' },
  hLine: { width: 22, height: 2.5, borderRadius: 2, backgroundColor: C.ink, marginVertical: 3 },

  drawerModal: { flex: 1, flexDirection: 'row' },
  drawerBackdrop: { backgroundColor: 'rgba(14,20,36,0.52)' },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: C.paper,
    padding: 24,
    paddingTop: 56,
    shadowColor: C.ink,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  drawerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
  },
  closeX: { fontSize: 18, color: C.muted, fontWeight: '600' },
  drawerNav: { marginBottom: 36 },
  drawerItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: C.border },
  drawerItemText: { fontSize: 16, color: C.ink, fontWeight: '500' },
  drawerItemTextActive: { color: C.deep, fontWeight: '700' },
});
