import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ServicioCard from './ServicioCard';
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const servicio = (estado) => ({
  id: 21,
  estado,
  descripcion: 'Reparar una fuga de agua',
  created_at: '2026-09-29T12:00:00Z',
  cliente: { name: 'Cliente real' },
  categoria: { nombre: 'Plomeria' },
});

const renderCard = (estado, props = {}) => {
  const handlers = {
    onAccept: jest.fn(),
    onReject: jest.fn(),
    onIniciar: jest.fn(),
    onFinalizar: jest.fn(),
    onEnCamino: jest.fn(),
    ...props,
  };
  return { ...render(<ServicioCard servicio={servicio(estado)} {...handlers} />), handlers };
};

describe('ServicioCard aviso de trayecto', () => {
  it('ofrece avisar que va en camino cuando el servicio esta aceptado', () => {
    const { getByText, handlers } = renderCard('aceptado');

    fireEvent.press(getByText('Voy en camino'));

    expect(handlers.onEnCamino).toHaveBeenCalledWith(21);
  });

  it('conserva iniciar servicio junto al aviso, sin sustituirlo', () => {
    const { getByText, handlers } = renderCard('aceptado');

    fireEvent.press(getByText('Iniciar servicio'));

    expect(handlers.onIniciar).toHaveBeenCalled();
  });

  // El backend admite el codigo de inicio desde `aceptado` y desde `en_camino`.
  // Si la tarjeta solo contemplara `aceptado`, avisar el trayecto dejaria al
  // proveedor sin ninguna accion y el servicio quedaria atascado.
  it('sigue permitiendo iniciar cuando ya se marco en camino', () => {
    const { getByText, queryByText, handlers } = renderCard('en_camino');

    expect(queryByText('Voy en camino')).toBeNull();

    fireEvent.press(getByText('Iniciar servicio'));

    expect(handlers.onIniciar).toHaveBeenCalled();
  });

  it('no ofrece el aviso antes de aceptar la solicitud', () => {
    const { queryByText, getByText, handlers } = renderCard('pendiente');

    expect(queryByText('Voy en camino')).toBeNull();
    expect(getByText('Aceptar')).toBeTruthy();
    fireEvent.press(getByText('Aceptar'));
    expect(handlers.onAccept).toHaveBeenCalledWith(expect.objectContaining({
      id: 21,
      descripcion: 'Reparar una fuga de agua',
    }));
  });

  it('no ofrece el aviso con el trabajo ya iniciado', () => {
    const { queryByText, getByText } = renderCard('en_progreso');

    expect(queryByText('Voy en camino')).toBeNull();
    expect(getByText('Finalizar trabajo')).toBeTruthy();
  });

  // Defensa para pantallas que aun no pasen el handler: el boton no debe
  // aparecer si nadie puede atenderlo.
  it('omite el aviso cuando no se le pasa manejador', () => {
    const { queryByText } = renderCard('aceptado', { onEnCamino: undefined });

    expect(queryByText('Voy en camino')).toBeNull();
  });
});

describe('ServicioCard materiales autorizados', () => {
  it('publica solo cuando el backend entrega true', () => {
    const onMaterial = jest.fn();
    const { getByText } = render(<ServicioCard servicio={{ ...servicio('cancelado'), puede_publicar_materiales: true }} onMaterial={onMaterial} />);
    fireEvent.press(getByText('Publicar materiales'));
    expect(onMaterial).toHaveBeenCalledWith('MaterialCreate', { servicioId: 21 });
  });
  it.each([false, undefined, 'true'])('no infiere elegibilidad con %s', (permiso) => {
    const { queryByText } = render(<ServicioCard servicio={{ ...servicio('cancelado'), puede_publicar_materiales: permiso }} onMaterial={jest.fn()} />);
    expect(queryByText('Publicar materiales')).toBeNull();
  });
  it('prefiere abrir el lote existente', () => {
    const onMaterial = jest.fn();
    const { getByText, queryByText } = render(<ServicioCard servicio={{ ...servicio('cancelado'), puede_publicar_materiales: true, publicacion_material_id: 7 }} onMaterial={onMaterial} />);
    expect(queryByText('Publicar materiales')).toBeNull();
    fireEvent.press(getByText('Ver lote de materiales'));
    expect(onMaterial).toHaveBeenCalledWith('MaterialDetail', { id: 7 });
  });
});
