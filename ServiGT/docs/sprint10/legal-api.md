# Documentos legales - contrato implementado

## GET /api/legal/documentos/vigentes

Publico, sin token obligatorio. Devuelve `200` con `success`, `message` y
`documentos` (terminos y privacidad). Cada documento contiene `id`, `tipo`,
`version`, `titulo`, `contenido` de texto plano, `hash` SHA-256,
`aprobado_at`, `vigente_desde`, `created_at`. No expone `aprobado_por`.
Se elige la ultima vigencia ya efectiva de cada tipo; no se anticipan
versiones futuras. `Cache-Control: no-store` permite refrescar versiones.

`503` si falta cualquiera de los dos documentos aprobados y vigentes.
No se publica un borrador ni se sustituye contenido con texto quemado.

## Persistencia

`documentos_legales`: unicidad tipo/version, contenido no vacio, integridad
del hash y trigger contra UPDATE/DELETE, tambien mediante SQL directo.
Una nueva version es otro registro, no una modificacion de la anterior.
`aceptaciones_legales`: FK restrictivas a usuario/documento y unicidad por
usuario/documento.

## POST /api/register - aceptacion

Ademas de name/email/password/password_confirmation/role, exige:

```json
{"aceptaciones_legales":[{"documento_legal_id":42,"version":"1.0","aceptado":true},{"documento_legal_id":43,"version":"1.0","aceptado":true}]}
```

IDs y versiones son ilustrativos: siempre obtenerlos de GET vigente, nunca
quemarlos. Exige los dos tipos distintos; faltante/no aceptado/duplicado: 422.
Version/ID que ya no son vigentes: 409, sin crear cuenta ni aceptaciones.
Usuario y aceptaciones se crean en una transaccion; token despues del commit.
El login de cuentas historicas no cambia. Sin pareja de textos aprobados,
no se puede completar un registro nuevo (503); no existe bypass legal.

El esquema no siembra textos. Para publicar hace falta recibir el texto,
version y constancia de aprobacion real del equipo/responsable. En esta
rama no se encontro esa evidencia y no se la inventa. Los textos de tests
estan marcados como fixtures y solo se crean en la base efimera de pruebas.
