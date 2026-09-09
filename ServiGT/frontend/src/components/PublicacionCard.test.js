import { fireEvent, render, screen } from '@testing-library/react-native';
import PublicacionCard from './PublicacionCard';

// La card solo usa storageUrl (helper de string, sin red) de services/api. Se
// mockea igual para no arrastrar en el test la cadena axios/AsyncStorage de
// ese modulo, que es infraestructura ajena a un componente presentacional.
jest.mock('../services/api', () => ({
  storageUrl: (path) => (path ? `https://cdn.test${path}` : null),
}));

// Fixtures locales: la card es presentacional, sin fetch ni logica de cupos.
const publicacionActiva = {
  id: 1,
  titulo: 'Instalación eléctrica residencial',
  descripcion: 'Revisión y reparación de instalaciones eléctricas en el hogar.',
  precio_referencial: 250.5,
  imagen: '/storage/publicaciones/1/foto.jpg',
  estado: 'activa',
  categoria: { id: 2, nombre: 'Electricidad' },
  proveedor: { id: 5, nombre: 'Juan Pérez' },
};

const publicacionSinPrecio = { ...publicacionActiva, id: 2, precio_referencial: null };

const publicacionSinImagen = { ...publicacionActiva, id: 3, imagen: null };

describe('PublicacionCard', () => {
  it('muestra una publicacion activa con su precio referencial', () => {
    render(<PublicacionCard publicacion={publicacionActiva} />);

    expect(screen.getByText('Instalación eléctrica residencial')).toBeTruthy();
    expect(screen.getByText('Activa')).toBeTruthy();
    expect(screen.getByText('Q250.50')).toBeTruthy();
    expect(screen.getByTestId('publicacion-imagen')).toBeTruthy();
  });

  it('muestra "Precio a cotizar" cuando no hay precio referencial', () => {
    render(<PublicacionCard publicacion={publicacionSinPrecio} />);

    expect(screen.getByText('Precio a cotizar')).toBeTruthy();
  });

  it('en modo cotizar muestra el boton y delega la accion al padre', () => {
    const onCotizar = jest.fn();
    render(<PublicacionCard publicacion={publicacionActiva} mode="cotizar" onCotizar={onCotizar} />);

    fireEvent.press(screen.getByText('Cotizar'));

    expect(onCotizar).toHaveBeenCalledTimes(1);
  });

  it('no muestra boton de cotizar fuera del modo cotizar', () => {
    render(<PublicacionCard publicacion={publicacionActiva} />);

    expect(screen.queryByText('Cotizar')).toBeNull();
  });

  it('muestra un marcador cuando la publicacion no tiene imagen', () => {
    render(<PublicacionCard publicacion={publicacionSinImagen} />);

    expect(screen.getByTestId('publicacion-imagen-placeholder')).toBeTruthy();
    expect(screen.queryByTestId('publicacion-imagen')).toBeNull();
  });

  it('no revienta ni ejecuta llamadas cuando no se pasa publicacion', () => {
    const { toJSON } = render(<PublicacionCard publicacion={null} />);
    expect(toJSON()).toBeNull();
  });
});