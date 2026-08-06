import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { T } from '../../theme';

const KIND_STYLES = {
  primary:   { bg: T.blue, border: T.blue, text: T.white },
  secondary: { bg: T.white, border: T.soft, text: T.deep },
  ghost:     { bg: 'transparent', border: T.border, text: T.text },
  danger:    { bg: T.danger, border: T.danger, text: T.white },
};

const SIZE_STYLES = {
  sm: { height: 36, paddingHorizontal: 14, fontSize: 13, iconSize: 14 },
  md: { height: 44, paddingHorizontal: 18, fontSize: 14, iconSize: 16 },
  lg: { height: 48, paddingHorizontal: 22, fontSize: 15, iconSize: 18 },
};

export default function Button({
  kind = 'primary',
  size = 'md',
  icon,
  iconRight,
  children,
  onPress,
  full,
  disabled,
  loading,
  style,
}) {
  const k = KIND_STYLES[kind] ?? KIND_STYLES.primary;
  const s = SIZE_STYLES[size] ?? SIZE_STYLES.md;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        styles.base,
        {
          backgroundColor: k.bg,
          borderColor: k.border,
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          width: full ? '100%' : undefined,
          opacity: isDisabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={k.text} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={s.iconSize} color={k.text} /> : null}
          <Text style={[styles.text, { color: k.text, fontSize: s.fontSize }]}>{children}</Text>
          {iconRight ? <Feather name={iconRight} size={s.iconSize} color={k.text} /> : null}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: T.rMd,
    borderWidth: 1,
  },
  text: { fontWeight: '700' },
});
