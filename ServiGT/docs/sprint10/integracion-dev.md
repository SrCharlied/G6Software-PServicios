# Integracion de dev en sprint-10-pablo

## Referencias

- Rama de trabajo: `sprint-10-pablo`, inicialmente limpia.
- Primer padre: `e35bf74` (avance de Pablo).
- Segundo padre: `7d7f22d` (`origin/dev` despues de `git fetch origin`).
- Merge iniciado con `git merge --no-commit origin/dev`.
- Sin push, PR nuevo, reset ni seleccion automatica de ours/theirs.

## Resolucion de los seis conflictos

| Archivo | Integracion |
| --- | --- |
| `backend/app/Models/AceptacionLegal.php` | Ambas implementaciones tenian el mismo contrato. Se conserva la estructura documentada de dev, relaciones, fillable y cast. |
| `backend/app/Models/DocumentoLegal.php` | Se conservan la relacion, constante, scope y consulta por tipo de dev. Se agregan los metadatos de aprobacion y la consulta de aprobados de Pablo. `hash_sha256` es canonico; `hash` sigue disponible en el JSON publico. |
| `frontend/src/components/InternalLayout.js` | Se conserva la navegacion por rol y un solo LogoutButton por superficie. El modal compartido de dev se consume desde LogoutButton, sin dos confirmaciones. El menu movil se cierra despues de completar signOut, no antes de conocer el resultado. |
| `frontend/src/screens/ProviderEditProfileScreen.js` | Se mantienen telefono obligatorio de ocho digitos, descripcion 20-500 y su contador, junto con experiencia opcional de hasta 1000 caracteres y su contador. Se conserva la regla de dev para no reenviar color historico y permitir quitarlo sin Premium. |
| `frontend/src/screens/ProviderEditProfileScreen.test.js` | Se combinan las pruebas de ambas ramas y se agregan limites de experiencia de 1000/1001 caracteres. No se descartan assertions. |
| `frontend/src/screens/provider/ProviderHeader.js` | Conserva saldo, disponibilidad, Premium y editar perfil. Comparte LogoutButton, que usa ConfirmActionModal y conserva lock sincrono, error y reintento. |

## Incompatibilidad no detectada por Git

El merge textual agregaba dos CREATE TABLE IF NOT EXISTS de documentos legales:
el primero creaba `hash` y aprobaciones obligatorias; el segundo suponia
`hash_sha256` y agregaba un trigger que escribia una columna inexistente.
Aceptar solo los seis archivos no resolvia esta regresion.

Se unifica `database/init.sql` y se refuerza `backend/docker/sync_schema.php`:

- Convergencia desde la tabla anterior de Pablo: rename de hash sin reescribir
  documentos, IDs, fechas, aprobaciones ni aceptaciones.
- Convergencia desde dev: agrega metadatos de aprobacion nulos, sin inventarlos.
- Conserva hash calculado por PostgreSQL, unicidad, inmutabilidad y FK RESTRICT.
- Se mantienen el scope de vigencia de dev y una consulta separada de documentos
  aprobados para registro/API publico. Los consumidores de registro usan esta ultima.
- No se incluyen textos ni aprobaciones reales de ejemplo.

La nueva `IntegracionLegalSprint10Test.php` prueba ambas formas anteriores,
aplica el SQL dos veces, compara evidencia preservada y verifica que una fila
sin aprobacion no desplace la version aprobada expuesta por el API.

## Verificacion ejecutada

Desde `ServiGT/`, salvo Playwright desde `frontend/`:

| Comando | Resultado real |
| --- | --- |
| `docker compose --profile test build backend_test` | Imagen construida con los modelos integrados. |
| `docker compose --profile test up -d --force-recreate db_test` | Solo DB temporal tmpfs; esquema limpio creado. No se elimino ningun volumen persistente. |
| `docker compose --profile test run --rm backend_test --filter='LegalSchemaSprint10Test\|DocumentosLegalesTest\|RegistroLegalTest\|ProviderValidationSprint10Test\|PremiumPersonalizacionTest\|ExperienciaProfesionalTest\|TelefonoBackfillTest\|EliminacionCuentaSchemaSprint10Test' --compact` | 53 pruebas, 249 assertions; pasan. |
| `docker compose --profile test run --rm backend_test tests/Feature/IntegracionLegalSprint10Test.php --compact` | 3 pruebas, 63 assertions; pasan. |
| `docker compose --profile test run --rm backend_test --compact` | 723 pruebas, 3315 assertions; pasan, 38.55 s. |
| `docker exec servigt_frontend npx jest --ci --runInBand src/screens/ProviderEditProfileScreen.test.js src/components/InternalLayout.test.js src/screens/provider/ProviderHeader.test.js src/components/LogoutButton.test.js src/components/LogoutSurfaces.test.js src/components/ConfirmActionModal.test.js` | 6 suites, 28 pruebas; pasan. |
| `docker exec servigt_frontend npm test -- --ci --runInBand` | 41 suites, 342 pruebas; pasan, 22.301 s. |
| `docker exec servigt_frontend npm run build:web` | Export web exitoso, 907 modulos, bundle 1.96 MB. |
| `npx.cmd playwright test e2e/sprint10-responsive.spec.js` | Corrida final: 10 pasan, 21.5 s; 1440, 1024 y 390 px. |
| `docker exec servigt_backend php /app/docker/sync_schema.php` (dos veces) | Exito, sin seed demo; conteos persistentes preservados. |

Los contenedores recibieron el codigo integrado antes de las pruebas; se
reinicio Metro antes de Playwright. Se inspeccionaron capturas de confirmacion
movil/desktop y perfil con ambos contadores. Los nueve casos UI usan fixtures
de presentacion; el decimo consulta health y documentos reales locales sin escribir.
Los conteos antes/despues fueron users=2, proveedores=0, servicios=0,
documentos_legales=0 y aceptaciones_legales=0. Backend y DB quedaron healthy,
frontend ejecutandose en localhost:8086.

Primera corrida Playwright: 7 pasan y 3 fallan por un selector que buscaba el
boton del sidebar detras del modal. Se acoto al dialogo, sin force, retries ni
timeout aumentado; la repeticion completa paso. Jest conserva warnings de
act/Animated preexistentes; no se silenciaron ni se arreglaron tareas ajenas.

## Limites

Esta integracion no publica textos legales aprobados ni completa la eliminacion
de cuentas. Sin ambos documentos aprobados el registro sigue bloqueado con 503;
el login historico sigue funcionando. Se preserva el esquema/servicio de
solicitudes de eliminacion recibido de dev, sin inventar un endpoint nuevo.
Las pruebas locales no sustituyen una nueva corrida de GitHub CI despues del push.
