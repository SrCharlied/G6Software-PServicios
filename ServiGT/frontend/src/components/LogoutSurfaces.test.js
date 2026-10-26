import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import InternalLayout from './InternalLayout';
import ProviderHeader from '../screens/provider/ProviderHeader';
const mockSignOut = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ usePathname: () => '/dashboard', useRouter: () => ({ replace: mockReplace, push: jest.fn() }) }));
jest.mock('../context/SessionContext', () => ({ useSession: () => ({ user: { id: 7, role: 'proveedor', name: 'Proveedor' }, signOut: mockSignOut }) }));
jest.mock('./NotificationBell', () => () => null);
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

it.each([1440, 390])('confirma logout desde layout %s sin llamar al cancelar', async (width) => {
  jest.spyOn(require('react-native'), 'useWindowDimensions').mockReturnValue({ width, height: 900 });
  const screen = render(<InternalLayout />);
  if (width < 900) fireEvent.press(screen.getByLabelText('Abrir menu'));
  fireEvent.press(screen.getByText('Cerrar sesion'));
  fireEvent.press(screen.getByText('No, volver'));
  expect(mockSignOut).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Cerrar sesion'));
  fireEvent.press(screen.getByText('Confirmar salida'));
  await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
  expect(mockReplace).toHaveBeenCalledWith('/home');
});

it('ProviderHeader usa la misma confirmacion', async () => {
  const logout = jest.fn().mockResolvedValue(undefined);
  const screen = render(<ProviderHeader disponibilidad={[]} onLogout={logout} />);
  fireEvent.press(screen.getByText('Salir')); fireEvent.press(screen.getByText('No, volver'));
  expect(logout).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Salir')); fireEvent.press(screen.getByText('Confirmar salida'));
  await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
});
