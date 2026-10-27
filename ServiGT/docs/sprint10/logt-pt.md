# 7.1.logt-pt - formato individual

Persona: Pablo Toledo. Preparado: 2026-10-26, America/Guatemala.
**Borrador para completar por la persona, no horas consumidas certificadas.**
No se deducen inicio, fin, interrupciones o esfuerzo a partir de timestamps
Git. La duracion de un test tampoco es tiempo personal imputable por defecto.

| Fecha | Inicio | Fin | Interrupciones | Delta neto | Fase | Actividad | Evidencia/comentarios |
|---|---|---|---|---|---|---|---|
| Por registrar | | | | | | | |

Calcular delta solo con inicio/fin e interrupciones reales. Registrar cada
sesion y distinguir analisis, implementacion, tests, revision y gestion.
No usar las horas estimadas del plan como si fueran horas observadas.

## Hitos Git observados (no sesiones de trabajo)

Fecha de los siguientes hitos: 2026-10-26, offset autor -06:00.

| Hora del commit | SHA | Actividad verificable |
|---|---|---|
| 17:41:30 | 963d880 | Backfill seguro de telefonos |
| 17:42:38 | 23954be | Validacion API de perfil |
| 17:46:16 | 57d48a0 | Formularios/contador/fixtures |
| 17:48:44 | 0537779 | Confirmacion de logout |
| 17:53:28 | 6476ef8 | Esquema y consulta legal |
| 17:54:26 | da9c43f | Rutas legales publicas |
| 17:57:58 | e0f2e67 | Registro legal transaccional |
| 18:05:05 | a67f2ad | Aceptacion explicita/409 |
| 18:06:40 | a8883a0 | Espera y limpieza local de sesion |
| 18:19:52 | 74bb94a | Convergencia de esquema anterior |

Fuente ejecutada: `git log origin/dev..HEAD --format='%h %aI %s'`.
No son diez sesiones ni se asignan horas a cada commit. Para la entrega
academica, completar tiempos/interrupciones reales y revision con CL.
