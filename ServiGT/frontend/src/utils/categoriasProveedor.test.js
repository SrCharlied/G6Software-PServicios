import {
  MAX_CATEGORIAS,
  alternarCategoria,
  categoriasParaMostrar,
  idsInicialesDelPerfil,
  marcarPrincipal,
  validarSeleccionCategorias,
} from './categoriasProveedor';

describe('categoriasProveedor', () => {
  it('limita la seleccion a tres categorias', () => {
    expect(MAX_CATEGORIAS).toBe(3);
    let ids = [];
    ids = alternarCategoria(ids, 1);
    ids = alternarCategoria(ids, 2);
    ids = alternarCategoria(ids, 3);
    expect(alternarCategoria(ids, 4)).toBe(ids);
    expect(ids).toEqual(['1', '2', '3']);
  });

  it('quitar la principal promueve a la siguiente', () => {
    expect(alternarCategoria(['1', '2', '3'], '1')).toEqual(['2', '3']);
  });

  it('marcar principal la mueve al frente sin duplicar', () => {
    expect(marcarPrincipal(['1', '2', '3'], 3)).toEqual(['3', '1', '2']);
    expect(marcarPrincipal(['1', '2'], 9)).toEqual(['1', '2']);
  });

  it('los IDs iniciales ponen la principal primero', () => {
    const perfil = { categoria_id: 7, categorias: [{ id: 2 }, { id: 7 }] };
    expect(idsInicialesDelPerfil(perfil)).toEqual(['7', '2']);
    expect(idsInicialesDelPerfil({ categoria_id: 4 })).toEqual(['4']);
    expect(idsInicialesDelPerfil(null)).toEqual([]);
  });

  it('muestra la principal primero y acepta perfiles historicos', () => {
    const perfil = {
      categoria_id: 5,
      categorias: [{ id: 1, nombre: 'Albanileria' }, { id: 5, nombre: 'Plomeria' }],
    };
    expect(categoriasParaMostrar(perfil)).toEqual([
      { id: 5, nombre: 'Plomeria', principal: true },
      { id: 1, nombre: 'Albanileria', principal: false },
    ]);
    expect(categoriasParaMostrar({ categoria: { id: 3, nombre: 'Electricidad' } }))
      .toEqual([{ id: 3, nombre: 'Electricidad', principal: true }]);
    expect(categoriasParaMostrar({})).toEqual([]);
  });

  it('valida vacio y exceso con mensajes accionables', () => {
    expect(validarSeleccionCategorias([])).toMatch(/al menos una/);
    expect(validarSeleccionCategorias(['1', '2', '3'])).toBeNull();
    expect(validarSeleccionCategorias(['1', '2', '3', '4'])).toMatch(/máximo 3.*quita 1/);
  });
});
