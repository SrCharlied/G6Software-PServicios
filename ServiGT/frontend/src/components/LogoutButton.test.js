import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import LogoutButton from './LogoutButton';
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

it('cancelar no cierra la sesion', () => {
  const logout = jest.fn(); const screen = render(<LogoutButton onLogout={logout} label="Salir" />);
  fireEvent.press(screen.getByText('Salir'));
  fireEvent.press(screen.getByText('Cancelar'));
  expect(logout).not.toHaveBeenCalled();
  expect(screen.queryByText('Cerrar sesion')).toBeNull();
});

it('bloquea doble confirmacion mientras la promesa esta pendiente', async () => {
  let finish; const logout = jest.fn(() => new Promise((resolve) => { finish = resolve; }));
  const screen = render(<LogoutButton onLogout={logout} label="Salir" />);
  fireEvent.press(screen.getByText('Salir'));
  const confirm = screen.getAllByText('Cerrar sesion').at(-1);
  act(() => { fireEvent.press(confirm); fireEvent.press(confirm); });
  expect(logout).toHaveBeenCalledTimes(1);
  await act(async () => finish());
  expect(screen.queryByText('Cerrar sesion')).toBeNull();
});

it('conserva confirmacion y permite reintentar un error real', async () => {
  const logout = jest.fn().mockRejectedValueOnce(new Error('Fallo de sesion')).mockResolvedValue(undefined);
  const screen = render(<LogoutButton onLogout={logout} label="Salir" />);
  fireEvent.press(screen.getByText('Salir')); fireEvent.press(screen.getAllByText('Cerrar sesion').at(-1));
  await screen.findByText(/Fallo de sesion/);
  fireEvent.press(screen.getAllByText('Cerrar sesion').at(-1));
  await waitFor(() => expect(screen.queryByText('Cerrar sesion')).toBeNull());
  expect(logout).toHaveBeenCalledTimes(2);
});
