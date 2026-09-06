import { render, fireEvent } from '@testing-library/react-native';
import PublicacionCard from './PublicacionCard';
import {
  PublicacionesCargando,
  PublicacionesError,
  PublicacionesLimiteAlcanzado,
  PublicacionesVacias,
} from './PublicacionEstados';

/**
 * Task 6.1 — la tarjeta es presentacional.
 *
 * Lo que estas pruebas fijan no es el pixel sino el contrato: la tarjeta no
 * llama al API, no calcula cupos y distingue "precio a cotizar" de "precio 0".
 */

const publicacionBase = {
  id: 1,
  titulo: 'Instalacion de tuberia PVC',
  descripcion: 'Instalacion y reparacion en vivienda, materiales aparte.',
  precio_referencial: 350,
  imagen: '/storage/publicaciones/1/foto.jpg',
  estado: 'activa',
};

describe('PublicacionCard', () => {
  it('muestra titulo, descripcion y precio referencial', () => {
    const { getByText } = render(<PublicacionCard publicacion={publicacionBase} />);

    expect(getByText('Instalacion de tuberia PVC')).toBeTruthy();
    expect(getByText(/Instalacion y reparacion/)).toBeTruthy();
    expect(getByText(/Q350\.00/)).toBeTruthy();
  });

  it('distingue precio a cotizar de precio cero', () => {
    const sinPrecio = render(<PublicacionCard publicacion={{ ...publicacionBase, precio_referencial: null }} />);
    expect(sinPrecio.getByText('Precio a cotizar')).toBeTruthy();

    const gratis = render(<PublicacionCard publicacion={{ ...publicacionBase, precio_referencial: 0 }} />);
    expect(gratis.getByText(/Q0\.00/)).toBeTruthy();
    expect(gratis.queryByText('Precio a cotizar')).toBeNull();
  });

  it('sigue dibujando la tarjeta cuando no hay imagen', () => {
    const { getByText } = render(
      <PublicacionCard publicacion={{ ...publicacionBase, imagen: null }} />
    );

    expect(getByText('Instalacion de tuberia PVC')).toBeTruthy();
  });

  it('en modo gestion muestra el estado y en modo publico no', () => {
    const gestion = render(
      <PublicacionCard publicacion={{ ...publicacionBase, estado: 'inactiva' }} modo="gestion" />
    );
    expect(gestion.getByText('Inactiva')).toBeTruthy();

    const publico = render(<PublicacionCard publicacion={publicacionBase} modo="publico" />);
    expect(publico.queryByText('Activa')).toBeNull();
  });

  it('solo muestra el boton de accion cuando la pantalla lo pide', () => {
    const sinAccion = render(<PublicacionCard publicacion={publicacionBase} />);
    expect(sinAccion.queryByText('Solicitar')).toBeNull();

    const onAccion = jest.fn();
    const conAccion = render(
      <PublicacionCard publicacion={publicacionBase} accionLabel="Solicitar" onAccion={onAccion} />
    );

    fireEvent.press(conAccion.getByText('Solicitar'));
    expect(onAccion).toHaveBeenCalledTimes(1);
  });

  it('no dispara la accion cuando esta deshabilitada', () => {
    const onAccion = jest.fn();
    const { getByText } = render(
      <PublicacionCard
        publicacion={publicacionBase}
        accionLabel="Solicitar"
        onAccion={onAccion}
        deshabilitada
      />
    );

    fireEvent.press(getByText('Solicitar'));
    expect(onAccion).not.toHaveBeenCalled();
  });

  it('no revienta con una publicacion ausente', () => {
    const { toJSON } = render(<PublicacionCard publicacion={null} />);
    expect(toJSON()).toBeNull();
  });
});

describe('estados de la lista de publicaciones', () => {
  it('cargando, vacio y error son estados distintos', () => {
    expect(render(<PublicacionesCargando />).getByText(/Cargando publicaciones/)).toBeTruthy();
    expect(render(<PublicacionesVacias />).getByText(/Todavia no hay publicaciones/)).toBeTruthy();

    const error = render(<PublicacionesError mensaje="No se pudieron cargar las publicaciones." />);
    expect(error.getByText('No se pudieron cargar las publicaciones.')).toBeTruthy();
  });

  it('el error ofrece reintentar', () => {
    const onReintentar = jest.fn();
    const { getByText } = render(
      <PublicacionesError mensaje="Fallo la carga." onReintentar={onReintentar} />
    );

    fireEvent.press(getByText('Reintentar'));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });

  it('el aviso de limite usa los numeros que manda el backend, no los suyos', () => {
    const { getByText } = render(
      <PublicacionesLimiteAlcanzado
        cupos={{ activas: 1, limite: 1, disponibles: 0, premium_estado: 'nunca', limite_premium: 3 }}
      />
    );

    expect(getByText('Usaste 1 de 1 publicaciones activas.')).toBeTruthy();
    expect(getByText(/hasta 3 publicaciones activas/)).toBeTruthy();
  });

  it('a un proveedor Premium en el tope no le ofrece comprar Premium otra vez', () => {
    const onVerPremium = jest.fn();
    const { queryByText, getByText } = render(
      <PublicacionesLimiteAlcanzado
        cupos={{ activas: 3, limite: 3, disponibles: 0, premium_estado: 'activo', limite_premium: 3 }}
        onVerPremium={onVerPremium}
      />
    );

    expect(getByText('Usaste 3 de 3 publicaciones activas.')).toBeTruthy();
    expect(getByText(/Desactiva una/)).toBeTruthy();
    expect(queryByText('Ver Premium')).toBeNull();
  });

  it('sin cupos no pinta nada: no inventa un limite por defecto', () => {
    const { toJSON } = render(<PublicacionesLimiteAlcanzado cupos={null} />);
    expect(toJSON()).toBeNull();
  });
});
