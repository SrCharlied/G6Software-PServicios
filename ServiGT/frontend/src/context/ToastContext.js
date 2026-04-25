import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ToastContext = createContext(null);

const COLORS = {
  error:   { bg: '#c0392b', border: '#922b21' },
  success: { bg: '#27ae60', border: '#1e8449' },
  warning: { bg: '#e67e22', border: '#ca6f1e' },
  info:    { bg: '#2980b9', border: '#1a6a9a' },
};

function ToastItem({ toast, onDismiss }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const colors  = COLORS[toast.type] || COLORS.info;

  Animated.sequence([
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    Animated.delay(toast.duration - 400),
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
  ]).start(() => onDismiss(toast.id));

  return (
    <Animated.View style={[styles.toast, { backgroundColor: colors.bg, borderLeftColor: colors.border, opacity }]}>
      <Text style={styles.message} numberOfLines={3}>{toast.message}</Text>
      <TouchableOpacity onPress={() => onDismiss(toast.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.close}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'error', duration = 3500) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, type, duration }]);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginRight: 10,
  },
  close: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
});
