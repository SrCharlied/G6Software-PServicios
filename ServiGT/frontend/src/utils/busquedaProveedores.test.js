import { coincideBusquedaProveedor, normalizeText } from './busquedaProveedores';

const prov = {
  nombre: 'Taller Ramírez',
  descripcion: 'Reparaciones del hogar',
  departamento: 'Guatemala',
  municipio: 'Mixco',
  telefono: '55550106',
  categoria: { id: 1, nombre: 'Plomería' },
  categorias: [
    { id: 1, nombre: 'Plomería' },
    { id: 2, nombre: 'Electricidad' },
    { id: 3, nombre: 'Carpintería' },
  ],
};

describe('coincideBusquedaProveedor (HU 1.6.b)', () => {
  it('encuentra al proveedor por una categoria secundaria', () => {
    expect(coincideBusquedaProveedor(prov, 'electricidad')).toBe(true);
    expect(coincideBusquedaProveedor(prov, 'carpinteria')).toBe(true);
  });

  it('sigue encontrando por la principal y los campos de texto', () => {
    expect(coincideBusquedaProveedor(prov, 'plomeria')).toBe(true);
    expect(coincideBusquedaProveedor(prov, 'ramirez')).toBe(true);
    expect(coincideBusquedaProveedor(prov, 'mixco')).toBe(true);
  });

  it('no coincide con una categoria que el proveedor no ofrece', () => {
    expect(coincideBusquedaProveedor(prov, 'jardineria')).toBe(false);
  });

  it('una consulta vacia muestra a todos', () => {
    expect(coincideBusquedaProveedor(prov, '   ')).toBe(true);
    expect(coincideBusquedaProveedor(prov, '')).toBe(true);
  });

  it('tolera respuestas sin `categorias` (solo principal)', () => {
    const legado = { ...prov, categorias: undefined };
    expect(coincideBusquedaProveedor(legado, 'plomeria')).toBe(true);
    expect(coincideBusquedaProveedor(legado, 'electricidad')).toBe(false);
  });
});

describe('normalizeText', () => {
  it('quita tildes y pasa a minusculas', () => {
    expect(normalizeText('Plomería ÁÉ')).toBe('plomeria ae');
    expect(normalizeText(null)).toBe('');
  });
});
