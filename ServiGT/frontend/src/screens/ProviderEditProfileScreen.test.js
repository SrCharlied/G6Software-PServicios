import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProviderEditProfileScreen from './ProviderEditProfileScreen';
import { getCategorias, updateProvider } from '../services/api';
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

jest.mock('../services/api', () => ({ getCategorias: jest.fn(), updateProvider: jest.fn(), createProvider: jest.fn(), storageUrl: () => null }));
const mockToast = jest.fn();
jest.mock('../context/ToastContext', () => ({ useToast: () => mockToast }));
const profile = { id: 7, nombre: 'Nombre real', telefono: '55550101', descripcion: 'Servicios profesionales de plomeria.', departamento: 'Guatemala', categoria_id: 1, color_acento: null };
const setup = () => render(<ProviderEditProfileScreen user={{ id: 9 }} providerProfile={profile} />);
beforeEach(() => { jest.clearAllMocks(); getCategorias.mockResolvedValue({ categorias: [{ id: 1, nombre: 'Plomeria' }] }); updateProvider.mockResolvedValue({ proveedor: profile }); });

it('guarda perfil ordinario sin enviar un color que no cambio', async () => {
  const screen = setup();
  await screen.findByText(/Plomeria$/);
  fireEvent.press(screen.getByText('Guardar cambios'));
  await waitFor(() => expect(updateProvider).toHaveBeenCalledWith(7, expect.objectContaining({ telefono: '55550101', descripcion: profile.descripcion })));
  expect(updateProvider.mock.calls[0][1]).not.toHaveProperty('color_acento');
});

it.each(['', '5555-0101', '+50255550101', '1234567', '123456789'])('rechaza telefono %s sin enviar API', async (phone) => {
  const screen = setup(); await screen.findByText(/Plomeria$/);
  fireEvent.changeText(screen.getByPlaceholderText('Ej: 55551234'), phone);
  fireEvent.press(screen.getByText('Guardar cambios'));
  expect(screen.getByText('Ingresa un telefono local de 8 digitos.')).toBeTruthy();
  expect(updateProvider).not.toHaveBeenCalled();
});

it.each([19, 20, 500, 501])('valida descripcion de %s y muestra contador', async (length) => {
  const screen = setup(); await screen.findByText(/Plomeria$/);
  fireEvent.changeText(screen.getByPlaceholderText('Describe los servicios que ofreces, tu experiencia, horarios...'), 'a'.repeat(length));
  expect(screen.getByText(`${length}/500 caracteres`)).toBeTruthy();
  fireEvent.press(screen.getByText('Guardar cambios'));
  if (length === 20 || length === 500) await waitFor(() => expect(updateProvider).toHaveBeenCalled());
  else expect(updateProvider).not.toHaveBeenCalled();
});
