/**
 * Configuracion compartida de Jest.
 *
 * `@expo/vector-icons` intenta cargar la fuente real al construirse, y en el
 * entorno de pruebas `expo-font` no tiene nada que cargar: cualquier componente
 * que dibuje un icono revienta con un error de `expo-font/src/memory`. Se
 * sustituye por un Text con el nombre del icono, que ademas hace que los
 * iconos sean localizables desde las pruebas.
 */
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  const crearIcono = (familia) => ({ name, ...props }) => (
    <Text {...props}>{`${familia}:${name}`}</Text>
  );

  return {
    Feather: crearIcono('Feather'),
    Ionicons: crearIcono('Ionicons'),
    MaterialIcons: crearIcono('MaterialIcons'),
    MaterialCommunityIcons: crearIcono('MaterialCommunityIcons'),
    FontAwesome: crearIcono('FontAwesome'),
    FontAwesome5: crearIcono('FontAwesome5'),
    AntDesign: crearIcono('AntDesign'),
  };
});
