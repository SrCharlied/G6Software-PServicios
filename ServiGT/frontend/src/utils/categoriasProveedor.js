// Reglas de UI para las categorias de un proveedor (HU 1.6.c). El backend
// (ProviderController::MAX_CATEGORIAS) es la autoridad; esto solo evita que
// la UI arme un conjunto que el servidor va a rechazar con 422.
//
// Convencion: en las listas de IDs (strings) la primera es la principal, que
// es lo que las pantallas envian como `categoria_id`.

export const MAX_CATEGORIAS = 3;

// Marca o desmarca una categoria. Si ya hay MAX_CATEGORIAS marcadas, una
// nueva no entra (devuelve la misma lista). Quitar la principal promueve a la
// siguiente en el orden actual.
export function alternarCategoria(ids, id, max = MAX_CATEGORIAS) {
  const clave = String(id);
  if (ids.includes(clave)) return ids.filter((x) => x !== clave);
  if (ids.length >= max) return ids;
  return [...ids, clave];
}

// Mueve la categoria indicada al frente: pasa a ser la principal.
export function marcarPrincipal(ids, id) {
  const clave = String(id);
  if (!ids.includes(clave)) return ids;
  return [clave, ...ids.filter((x) => x !== clave)];
}

// IDs iniciales para editar un perfil: la principal primero, aunque el
// arreglo venga en otro orden.
export function idsInicialesDelPerfil(perfil) {
  const ids = Array.isArray(perfil?.categorias) && perfil.categorias.length > 0
    ? perfil.categorias.map((c) => String(c.id))
    : perfil?.categoria_id ? [String(perfil.categoria_id)] : [];
  return perfil?.categoria_id ? marcarPrincipal(ids, perfil.categoria_id) : ids;
}

// Categorias para mostrar en tarjetas y detalle: [{id, nombre, principal}],
// principal primero. Acepta perfiles historicos que solo traen `categoria`.
export function categoriasParaMostrar(perfil) {
  const lista = Array.isArray(perfil?.categorias) && perfil.categorias.length > 0
    ? perfil.categorias
    : perfil?.categoria ? [perfil.categoria] : [];
  const principalId = perfil?.categoria_id ?? perfil?.categoria?.id ?? null;
  const conMarca = lista
    .filter((c) => c && c.nombre)
    .map((c) => ({ id: c.id, nombre: c.nombre, principal: principalId != null && String(c.id) === String(principalId) }));
  return [...conMarca.filter((c) => c.principal), ...conMarca.filter((c) => !c.principal)];
}

export function validarSeleccionCategorias(ids, max = MAX_CATEGORIAS) {
  if (ids.length === 0) return 'Selecciona al menos una categoría.';
  if (ids.length > max) return `Elige máximo ${max} categorías; quita ${ids.length - max} para continuar.`;
  return null;
}
