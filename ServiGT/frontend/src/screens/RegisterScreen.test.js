import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import RegisterScreen from './RegisterScreen';
import { register } from '../services/api';

jest.mock('../services/api', () => ({
  register: jest.fn(),
  createProvider: jest.fn(),
  getCategorias: jest.fn(),
  uploadDocumento: jest.fn(),
}));

const mockToast = jest.fn();
jest.mock('../context/ToastContext', () => ({
  useToast: () => mockToast,
}));

jest.mock('../components/ServiGTLogo', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockLogo() {
    return <Text>ServiGT</Text>;
  };
});

const completarFormulario = (screen, {
  name = 'Pablo Toledo',
  email = ' Pablo@ServiGT.test ',
  password = '123456',
} = {}) => {
  fireEvent.changeText(screen.getByPlaceholderText('Tu nombre'), name);
  fireEvent.changeText(screen.getByPlaceholderText('correo@ejemplo.com'), email);
  fireEvent.changeText(
    screen.getByPlaceholderText('Minimo 6 caracteres, maximo 72 bytes'),
    password,
  );
};

describe('RegisterScreen politica de registro', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rechaza localmente contrasenas menores a 6 caracteres', () => {
    const screen = render(<RegisterScreen navigation={{ navigate: jest.fn() }} />);
    completarFormulario(screen, { password: '12345' });

    fireEvent.press(screen.getByLabelText('Crear cuenta'));

    expect(screen.getByText('La contrasena debe tener al menos 6 caracteres.')).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  it('rechaza contrasenas Unicode que superan 72 bytes', () => {
    const screen = render(<RegisterScreen navigation={{ navigate: jest.fn() }} />);
    completarFormulario(screen, { password: '\u{1F600}'.repeat(24) });

    fireEvent.press(screen.getByLabelText('Crear cuenta'));

    expect(screen.getByText('La contrasena no debe superar los 72 bytes.')).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  it('normaliza el correo y acepta una contrasena valida de 72 bytes', async () => {
    const user = { id: 8, name: 'Pablo Toledo', email: 'pablo@servigt.test', role: 'cliente' };
    const onRegisterSuccess = jest.fn();
    register.mockResolvedValue({ user });
    const screen = render(
      <RegisterScreen navigation={{ navigate: jest.fn() }} onRegisterSuccess={onRegisterSuccess} />,
    );
    completarFormulario(screen, { password: 'a'.repeat(72) });

    fireEvent.press(screen.getByLabelText('Crear cuenta'));

    await waitFor(() => expect(register).toHaveBeenCalledWith(
      'Pablo Toledo',
      'pablo@servigt.test',
      'a'.repeat(72),
      'cliente',
    ));
    expect(onRegisterSuccess).toHaveBeenCalledWith(user, null);
  });

  it('muestra junto al campo el error backend de correo duplicado por caja', async () => {
    register.mockRejectedValue({
      message: 'El correo electronico ya esta registrado.',
      data: { errors: { email: ['El correo electronico ya esta registrado.'] } },
    });
    const screen = render(<RegisterScreen navigation={{ navigate: jest.fn() }} />);
    completarFormulario(screen, { email: 'Existente@ServiGT.test' });

    fireEvent.press(screen.getByLabelText('Crear cuenta'));

    expect(await screen.findByText('El correo electronico ya esta registrado.')).toBeTruthy();
    expect(mockToast).toHaveBeenCalledWith('El correo electronico ya esta registrado.', 'error');
  });
});
