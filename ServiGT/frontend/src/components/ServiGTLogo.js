// React Native fallback for native (iOS/Android).
// Approximates the ClaspMark using Views + Text.
// Metro loads ServiGTLogo.web.js on web; this file runs on native.
import { View, Text } from 'react-native';

export const GT = {
  blue: '#4589d4',
  deep: '#1b5499',
  soft: '#b3cfe8',
  ink:  '#0e1424',
  paper:'#f6f4ee',
};

export function ClaspIcon({ size = 76 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        backgroundColor: GT.blue,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: GT.paper, fontSize: size * 0.46, fontWeight: '800' }}>
        S
      </Text>
    </View>
  );
}

export function InterlockIcon({ size = 32 }) {
  return <ClaspIcon size={size} />;
}

export default function ServiGTLogo({ size = 26, mode = 'dark', layout = 'horizontal' }) {
  const light = mode === 'light';
  const iconSize = size * 1.55;

  return (
    <View
      style={{
        flexDirection: layout === 'stacked' ? 'column' : 'row',
        alignItems: 'center',
      }}
    >
      <ClaspIcon size={iconSize} />
      <Text
        style={{
          fontSize: size,
          fontWeight: '700',
          color: light ? GT.paper : GT.ink,
          letterSpacing: -0.5,
          marginLeft: layout === 'stacked' ? 0 : size * 0.42,
          marginTop: layout === 'stacked' ? size * 0.3 : 0,
        }}
      >
        Servi<Text style={{ color: GT.blue, fontWeight: '800' }}>GT</Text>
      </Text>
    </View>
  );
}

export function PillLogo({ size = 18, mode = 'dark' }) {
  const dark = mode === 'dark';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: size * 0.8,
        paddingVertical: size * 0.44,
        backgroundColor: dark ? GT.ink : GT.paper,
        borderRadius: 999,
        borderWidth: dark ? 0 : 1.5,
        borderColor: GT.ink,
      }}
    >
      <View
        style={{
          width: size * 1.1,
          height: size * 1.1,
          borderRadius: size * 0.55,
          backgroundColor: GT.blue,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 9,
        }}
      >
        <View
          style={{
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size * 0.2,
            backgroundColor: GT.paper,
          }}
        />
      </View>
      <Text
        style={{
          fontSize: size,
          fontWeight: '600',
          color: dark ? GT.paper : GT.ink,
          letterSpacing: -0.3,
        }}
      >
        Servi<Text style={{ color: GT.blue }}>GT</Text>
      </Text>
    </View>
  );
}
