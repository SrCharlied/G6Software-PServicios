// Primitivas compartidas por las pantallas publicas (landing, servicios, nosotros).
// Viven aparte para que las tres compartan paleta, botones y footer en vez de
// duplicarlos.

import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ServiGTLogo from './ServiGTLogo';

export const C = {
  blue:   '#4589d4',
  deep:   '#1b5499',
  soft:   '#b3cfe8',
  ink:    '#0e1424',
  paper:  '#f6f4ee',
  canvas: '#f0eee9',
  muted:  '#64748b',
  border: 'rgba(14,20,36,0.09)',
  heroBg: '#0e1424',
  accent: '#e07b18',
};

// Punto de corte entre el layout ancho y el de telefono.
export const MD = 768;

// ── Boton con escala por resorte al presionar ──────────────────────────────
export function ScaleBtn({ label, onPress, style, textStyle }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={s.scaleBtnInner}
      >
        <Text style={textStyle}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function SolidBtn({ label, onPress, style }) {
  return <ScaleBtn label={label} onPress={onPress} style={[s.solidBtn, style]} textStyle={s.solidBtnText} />;
}

export function OutlineBtn({ label, onPress, style, textStyle }) {
  return <ScaleBtn label={label} onPress={onPress} style={[s.outlineBtn, style]} textStyle={[s.outlineBtnText, textStyle]} />;
}

// ── Footer publico ─────────────────────────────────────────────────────────
export function PublicFooter() {
  return (
    <View style={s.footer}>
      <ServiGTLogo size={18} mode="light" />
      <Text style={s.footerText}>
        © 2026 ServiGT · Guatemala · Todos los derechos reservados
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  scaleBtnInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  solidBtn: {
    backgroundColor: C.blue,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    height: 42,
  },
  solidBtnText: { color: C.paper, fontWeight: '600', fontSize: 14 },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: C.blue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    height: 42,
  },
  outlineBtnText: { color: C.blue, fontWeight: '600', fontSize: 14 },

  footer: {
    backgroundColor: C.ink,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  footerText: { color: 'rgba(246,244,238,0.4)', fontSize: 12, marginTop: 10, textAlign: 'center', letterSpacing: 0.2 },
});
