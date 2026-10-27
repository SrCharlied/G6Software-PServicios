import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import RegisterScreen from './RegisterScreen';
import { register, getDocumentosLegales } from '../services/api';
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
const legalDocuments = ['terminos', 'privacidad'].map((tipo, id) => ({ id: id + 1, tipo, version: 'fixture-1' }));
const aceptar = async (screen) => { await screen.findByLabelText('Acepto terminos'); fireEvent.press(screen.getByLabelText('Acepto terminos')); fireEvent.press(screen.getByLabelText('Acepto privacidad')); };

jest.mock('../services/api', () => ({
  register: jest.fn(),
  createProvider: jest.fn(),
  getCategorias: jest.fn(),
  uploadDocumento: jest.fn(),
  getDocumentosLegales: jest.fn(),
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
  passwordConfirmation = password,
} = {}) => {
  fireEvent.changeText(screen.getByPlaceholderText('Tu nombre'), name);
  fireEvent.changeText(screen.getByPlaceholderText('correo@ejemplo.com'), email);
  fireEvent.changeText(
    screen.getByPlaceholderText('Mínimo 6 caracteres, máximo 72 bytes'),
    password,
  );
  fireEvent.changeText(
    screen.getByPlaceholderText('Repite tu contraseña'),
    passwordConfirmation,
  );
};

describe('RegisterScreen politica de registro', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDocumentosLegales.mockResolvedValue({ documentos: legalDocuments });
  });

  it('rechaza localmente contrasenas menores a 6 caracteres', () => {
    const screen = render(<RegisterScreen navigation={{ navigate: jest.fn() }} />);
    completarFormulario(screen, { password: '12345' });

    fireEvent.press(screen.getByLabelText('Crear cuenta'));

    expect(screen.getByText('La contraseña debe tener al menos 6 caracteres.')).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  it('rechaza localmente una confirmacion distinta o vacia', () => {
    const screen = render(<RegisterScreen navigation={{ navigate: jest.fn() }} />);
    completarFormulario(screen, { password: '123456', passwordConfirmation: '654321' });

    fireEvent.press(screen.getByLabelText('Crear cuenta'));
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('Repite tu contraseña'), '');
    fireEvent.press(screen.getByLabelText('Crear cuenta'));
    expect(screen.getByText('Confirma tu contraseña.')).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  it('rechaza contrasenas Unicode que superan 72 bytes', () => {
    const screen = render(<RegisterScreen navigation={{ navigate: jest.fn() }} />);
    completarFormulario(screen, { password: '\u{1F600}'.repeat(24) });

    fireEvent.press(screen.getByLabelText('Crear cuenta'));

    expect(screen.getByText('La contraseña no debe superar los 72 bytes.')).toBeTruthy();
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
    await aceptar(screen);

    fireEvent.press(screen.getByLabelText('Crear cuenta'));

    await waitFor(() => expect(register).toHaveBeenCalledWith(
      'Pablo Toledo',
      'pablo@servigt.test',
      'a'.repeat(72),
      'a'.repeat(72),
      'cliente',
      legalDocuments.map((doc) => ({ documento_legal_id: doc.id, version: doc.version, aceptado: true })),
    ));
    expect(onRegisterSuccess).toHaveBeenCalledWith(user, null);
  });

  it('muestra junto al campo el error backend de correo duplicado por caja', async () => {
    register.mockRejectedValue({
      message: 'El correo electrónico ya está registrado.',
      data: { errors: { email: ['El correo electrónico ya está registrado.'] } },
    });
    const screen = render(<RegisterScreen navigation={{ navigate: jest.fn() }} />);
    completarFormulario(screen, { email: 'Existente@ServiGT.test' });
    await aceptar(screen);

    fireEvent.press(screen.getByLabelText('Crear cuenta'));

    expect(await screen.findByText('El correo electrónico ya está registrado.')).toBeTruthy();
    expect(mockToast).toHaveBeenCalledWith('El correo electrónico ya está registrado.', 'error');
  });
});

it('no premarca aceptaciones ni registra si no estan marcadas', async () => {
  jest.clearAllMocks(); getDocumentosLegales.mockResolvedValue({ documentos: legalDocuments });
  const screen = render(<RegisterScreen />); completarFormulario(screen);
  await screen.findByLabelText('Acepto terminos');
  expect(screen.getByLabelText('Acepto terminos').props.accessibilityState.checked).toBe(false);
  fireEvent.press(screen.getByLabelText('Crear cuenta'));
  expect(register).not.toHaveBeenCalled();
  expect(screen.getByText('Debes revisar y aceptar terminos y privacidad vigentes.')).toBeTruthy();
});

it('409 recarga versiones y limpia ambas aceptaciones conservando formulario', async () => {
  jest.clearAllMocks();
  getDocumentosLegales.mockResolvedValueOnce({ documentos: legalDocuments }).mockResolvedValue({ documentos: legalDocuments.map((d) => ({ ...d, version: 'fixture-2' })) });
  register.mockRejectedValue({ status: 409, message: 'Version obsoleta' });
  const screen = render(<RegisterScreen />); completarFormulario(screen); await aceptar(screen);
  fireEvent.press(screen.getByLabelText('Crear cuenta'));
  await waitFor(() => expect(getDocumentosLegales).toHaveBeenCalledTimes(2));
  await screen.findByText('Acepto terminos y condiciones (version fixture-2)');
  expect(screen.getByLabelText('Acepto terminos').props.accessibilityState.checked).toBe(false);
  expect(screen.getByLabelText('Acepto privacidad').props.accessibilityState.checked).toBe(false);
  expect(screen.getByPlaceholderText('Tu nombre').props.value).toBe('Pablo Toledo');
});
