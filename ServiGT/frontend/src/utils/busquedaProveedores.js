// Busqueda del catalogo de proveedores (HomeScreen).
//
// HU 1.6.b (Sprint 10): el catalogo trae todas las categorias del perfil en
// `categorias`; la busqueda debe encontrar al proveedor por cualquiera de
// ellas, no solo por la principal (`categoria`).

// Evita escribir un rango unicode de marcas diacriticas como literal de regex:
// se filtra por code point para no depender de como el editor/herramienta
// interprete esa secuencia de escape.
export const normalizeText = (value) =>
  (value || '')
    .toString()
    .normalize('NFD')
    .split('')
    .filter((ch) => {
      const code = ch.codePointAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join('')
    .toLowerCase();

export function coincideBusquedaProveedor(prov, query) {
  const normalizedQuery = normalizeText((query || '').trim());
  if (!normalizedQuery) return true;

  const categorias = Array.isArray(prov.categorias)
    ? prov.categorias.map((c) => c?.nombre)
    : [];

  return [
    prov.nombre,
    prov.descripcion,
    prov.departamento,
    prov.municipio,
    prov.telefono,
    prov.categoria?.nombre,
    ...categorias,
  ].some((f) => normalizeText(f).includes(normalizedQuery));
}
