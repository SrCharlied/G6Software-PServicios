import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import MisPublicacionesScreen from './MisPublicacionesScreen';
import {
  getMisPublicaciones,
  getCategorias,
  crearPublicacion,
  desactivarPublicacion,
} from '../services/api';

/**
 * Tasks 5.5 y 6.4 — gestion de publicaciones del proveedor.
 *
 * Lo que se fija aqui: la pantalla distingue cargando / vacio / error / limite,
 * y el contador de cupos sale del backend, no de una regla escrita en el
 * frontend.
 */

jest.mock('../services/api', () => ({
  getMisPublicaciones: jest.fn(),
  getCategorias: jest.fn(),
  crearPublicacion: jest.fn(),
  actualizarPublicacion: jest.fn(),
  activarPublicacion: jest.fn(),
  desactivarPublicacion: jest.fn(),
  eliminarPublicacion: jest.fn(),
  storageUrl: (ruta) => ruta,
}));

const publicacion = (extra = {}) => ({
  id: 1,
  titulo: 'Instalacion de tuberia PVC',
  descripcion: 'Instalacion y reparacion en vivienda, materiales aparte.',
  precio_referencial: 350,
  imagen: null,
  estado: 'activa',
  categoria: { id: 2, nombre: 'Plomeria' },
  ...extra,
});

const cupos = (extra = {}) => ({
  limite: 1,
  activas: 1,
  disponibles: 0,
  premium_estado: 'nunca',
  limite_premium: 3,
  ...extra,
});

describe('MisPublicacionesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCategorias.mockResolvedValue({ categorias: [{ id: 2, nombre: 'Plomeria' }] });
  });

  it('muestra el estado de carga antes de que responda el API', async () => {
    getMisPublicaciones.mockReturnValue(new Promise(() => {}));

    render(<MisPublicacionesScreen />);

    expect(screen.getByText(/Cargando publicaciones/)).toBeTruthy();

    // La carga de categorias resuelve por su cuenta; se espera aqui para que
    // su `setState` no quede fuera de `act` y ensucie la salida de la suite.
    await waitFor(() => expect(getCategorias).toHaveBeenCalled());
  });

  it('muestra el estado vacio cuando el proveedor no publico nada', async () => {
    getMisPublicaciones.mockResolvedValue({
      publicaciones: [],
      cupos: cupos({ activas: 0, disponibles: 1 }),
    });

    render(<MisPublicacionesScreen />);

    expect(await screen.findByText(/Todavia no publicaste ningun servicio/)).toBeTruthy();
  });

  it('un fallo del API no se convierte en "no tienes publicaciones"', async () => {
    getMisPublicaciones.mockRejectedValue(
      Object.assign(new Error('No se pudieron cargar tus publicaciones.'), { status: 500 })
    );

    render(<MisPublicacionesScreen />);

    expect(await screen.findByText('No se pudieron cargar tus publicaciones.')).toBeTruthy();
    expect(screen.queryByText(/Todavia no publicaste/)).toBeNull();
  });

  it('el error deja reintentar la carga', async () => {
    getMisPublicaciones
      .mockRejectedValueOnce(new Error('Fallo la carga.'))
      .mockResolvedValueOnce({ publicaciones: [publicacion()], cupos: cupos() });

    render(<MisPublicacionesScreen />);

    fireEvent.press(await screen.findByText('Reintentar'));

    expect(await screen.findByText('Instalacion de tuberia PVC')).toBeTruthy();
  });

  it('el contador refleja los cupos que manda el backend', async () => {
    getMisPublicaciones.mockResolvedValue({
      publicaciones: [publicacion()],
      cupos: cupos(),
    });

    render(<MisPublicacionesScreen />);

    expect(await screen.findByText('1/1')).toBeTruthy();
  });

  it('con Premium activo el contador usa el limite de 3 que dio el backend', async () => {
    getMisPublicaciones.mockResolvedValue({
      publicaciones: [publicacion()],
      cupos: cupos({ limite: 3, activas: 1, disponibles: 2, premium_estado: 'activo' }),
    });

    render(<MisPublicacionesScreen />);

    expect(await screen.findByText('1/3')).toBeTruthy();
    // Con cupo disponible no hay aviso de limite.
    expect(screen.queryByText(/publicaciones activas\./)).toBeNull();
  });

  it('avisa del limite alcanzado y apaga el boton de crear', async () => {
    getMisPublicaciones.mockResolvedValue({
      publicaciones: [publicacion()],
      cupos: cupos(),
    });

    render(<MisPublicacionesScreen />);

    expect(await screen.findByText('Usaste 1 de 1 publicaciones activas.')).toBeTruthy();

    const boton = screen.getByText('Nueva publicacion');
    fireEvent.press(boton);

    // El formulario no se abre porque el boton esta deshabilitado.
    expect(screen.queryByText('Publicar')).toBeNull();
  });

  it('el mensaje de limite del backend se muestra literal, sin reescribirlo', async () => {
    getMisPublicaciones.mockResolvedValue({
      publicaciones: [],
      cupos: cupos({ activas: 0, disponibles: 1 }),
    });
    crearPublicacion.mockRejectedValue(
      Object.assign(new Error('Alcanzaste el limite de publicaciones activas (1).'), { status: 422 })
    );

    render(<MisPublicacionesScreen />);

    fireEvent.press(await screen.findByText('Nueva publicacion'));
    fireEvent.press(screen.getByText('Publicar'));

    expect(
      await screen.findByText('Alcanzaste el limite de publicaciones activas (1).')
    ).toBeTruthy();
  });

  it('desactivar recarga la lista desde el backend en vez de mutarla en memoria', async () => {
    getMisPublicaciones
      .mockResolvedValueOnce({ publicaciones: [publicacion()], cupos: cupos() })
      .mockResolvedValueOnce({
        publicaciones: [publicacion({ estado: 'inactiva' })],
        cupos: cupos({ activas: 0, disponibles: 1 }),
      });
    desactivarPublicacion.mockResolvedValue({});

    render(<MisPublicacionesScreen />);

    fireEvent.press(await screen.findByText('Desactivar'));

    await waitFor(() => expect(desactivarPublicacion).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Activar')).toBeTruthy();
    expect(await screen.findByText('0/1')).toBeTruthy();
  });
});
