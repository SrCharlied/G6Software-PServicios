import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProviderHeader from './ProviderHeader';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

describe('ProviderHeader cierre de sesion', () => {
  it('cancelar no cierra sesion y confirmar la ejecuta una sola vez', async () => {
    let finishLogout;
    const onLogout = jest.fn(() => new Promise((resolve) => { finishLogout = resolve; }));
    const { getByText, getAllByText } = render(
      <ProviderHeader
        profile={null}
        disponibilidad={[]}
        onLogout={onLogout}
      />
    );

    fireEvent.press(getByText('Salir'));
    fireEvent.press(getByText('Cancelar'));
    expect(onLogout).not.toHaveBeenCalled();

    fireEvent.press(getByText('Salir'));
    fireEvent.press(getAllByText('Cerrar sesion').at(-1));
    expect(onLogout).toHaveBeenCalledTimes(1);

    // Mientras la promesa esta pendiente el boton queda bloqueado y desaparece
    // su texto a favor del indicador de carga.
    expect(getAllByText('Cerrar sesion')).toHaveLength(1);
    finishLogout();
    await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
  });
});
