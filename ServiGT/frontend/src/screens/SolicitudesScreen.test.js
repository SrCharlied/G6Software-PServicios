import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SolicitudesScreen from './SolicitudesScreen';
import {
  cancelarServicio,
  getSolicitudesCliente,
  getSolicitudesProveedor,
} from '../services/api';

jest.mock('../services/api', () => ({
  cancelarServicio: jest.fn(),
  confirmarFinServicio: jest.fn(),
  getSolicitudesCliente: jest.fn(),
  getSolicitudesProveedor: jest.fn(),
}));

const mockToast = jest.fn();
jest.mock('../context/ToastContext', () => ({
  useToast: () => mockToast,
}));

jest.mock('../components/ui', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    Button: ({ children, onPress }) => (
      <TouchableOpacity onPress={onPress}><Text>{children}</Text></TouchableOpacity>
    ),
    ScreenHeader: ({ title, subtitle, right }) => (
      <View>
        <Text>{title}</Text>
        <Text>{subtitle}</Text>
        {right}
      </View>
    ),
  };
});

const servicio = (estado = 'pendiente') => ({
  id: 17,
  estado,
  descripcion: 'Reparar una fuga de agua',
  created_at: '2026-09-28T12:00:00Z',
  proveedor: { nombre: 'Proveedor real', categoria: { nombre: 'Plomeria' } },
  calificaciones: [],
});

const renderScreen = (role = 'cliente') => render(
  <SolicitudesScreen
    navigation={{ navigate: jest.fn() }}
    user={{ id: role === 'cliente' ? 4 : 8, role }}
  />,
);

describe('SolicitudesScreen cancelacion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSolicitudesCliente.mockResolvedValue({ servicios: [servicio()] });
    getSolicitudesProveedor.mockResolvedValue({ servicios: [servicio()] });
  });

  it.each(['pendiente', 'aceptado', 'en_camino'])(
    'muestra cancelar al cliente cuando el servicio esta %s',
    async (estado) => {
      getSolicitudesCliente.mockResolvedValue({ servicios: [servicio(estado)] });
      const { findByText } = renderScreen();

      expect(await findByText('Cancelar servicio')).toBeTruthy();
    },
  );

  it.each(['en_progreso', 'por_confirmar', 'completado', 'cancelado', 'rechazado'])(
    'oculta cancelar cuando el servicio esta %s',
    async (estado) => {
      getSolicitudesCliente.mockResolvedValue({ servicios: [servicio(estado)] });
      const { queryByText, findByText } = renderScreen();

      await findByText('Reparar una fuga de agua');
      expect(queryByText('Cancelar servicio')).toBeNull();
    },
  );

  it('pide confirmacion, evita doble envio y refresca tras cancelar', async () => {
    let resolver;
    cancelarServicio.mockImplementation(() => new Promise((resolve) => { resolver = resolve; }));
    const { findByText, queryByText } = renderScreen();

    fireEvent.press(await findByText('Cancelar servicio'));
    expect(await findByText('Esta accion no se puede deshacer. El proveedor recibira una notificacion.'))
      .toBeTruthy();

    const confirmar = await findByText('Confirmar cancelacion');
    fireEvent.press(confirmar);
    fireEvent.press(confirmar);
    expect(cancelarServicio).toHaveBeenCalledTimes(1);

    getSolicitudesCliente.mockResolvedValueOnce({ servicios: [servicio('cancelado')] });
    resolver({ servicio: servicio('cancelado') });

    await waitFor(() => expect(getSolicitudesCliente).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(queryByText('Confirmar cancelacion')).toBeNull());
    expect(mockToast).toHaveBeenCalledWith('Servicio cancelado.', 'success');
  });

  it('muestra un error legible y conserva la confirmacion', async () => {
    cancelarServicio.mockRejectedValue(new Error('Este servicio ya no se puede cancelar'));
    const { findByText } = renderScreen();

    fireEvent.press(await findByText('Cancelar servicio'));
    fireEvent.press(await findByText('Confirmar cancelacion'));

    expect(await findByText('Este servicio ya no se puede cancelar')).toBeTruthy();
    expect(await findByText('Confirmar cancelacion')).toBeTruthy();
  });

  it('no ofrece cancelacion unilateral al proveedor', async () => {
    getSolicitudesCliente.mockResolvedValue({ servicios: [] });
    const { findByText, queryByText } = renderScreen('proveedor');

    fireEvent.press(await findByText('Recibidas'));
    await findByText('Reparar una fuga de agua');
    expect(queryByText('Cancelar servicio')).toBeNull();
  });
});
