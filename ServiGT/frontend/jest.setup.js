/**
 * Configuracion compartida de Jest.
 *
 * TIMEOUT
 * -------
 * El default de Jest son 5 s por test. El primer test de cada suite que monta
 * un componente paga el arranque en frio del renderer de React Native, que en
 * el runner de CI se acerca a esos 5 s aunque el test tarde milisegundos en
 * local: el job fallaba en `SessionContext` por eso, no por un fallo real.
 * 20 s deja margen para el arranque sin volver util un test que se cuelgue.
 *
 * `@expo/vector-icons` intenta cargar la fuente real al construirse, y en el
 * entorno de pruebas `expo-font` no tiene nada que cargar: cualquier componente
 * que dibuje un icono revienta con un error de `expo-font/src/memory`. Se
 * sustituye por un Text con el nombre del icono, que ademas hace que los
 * iconos sean localizables desde las pruebas.
 */
jest.setTimeout(20000);

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
