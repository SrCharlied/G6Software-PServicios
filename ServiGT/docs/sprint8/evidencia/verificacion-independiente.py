# -*- coding: utf-8 -*-
"""Verificacion independiente del "despues" de 5.3, contra el stack de
desarrollo (localhost:8085, base `pservicios`), no contra el servidor efimero.

El punto es comprobar los mismos tres riesgos en el mismo entorno donde se
capturo el "antes", para que la comparacion sea equivalente.
"""
import requests, random, time, sys

B = "http://localhost:8085/api"
S = random.randint(100000, 999999)
OK = FAIL = 0

def chk(cond, label, detalle=""):
    global OK, FAIL
    if cond:
        OK += 1; print("  [OK]    " + label + ("  " + detalle if detalle else ""))
    else:
        FAIL += 1; print("  [FALLA] " + label + ("  " + detalle if detalle else ""))

def call(method, path, tok=None, **kw):
    h = kw.pop("headers", {}); h["Accept"] = "application/json"
    if tok: h["Authorization"] = "Bearer " + tok
    r = requests.request(method, B + path, headers=h, timeout=30, **kw)
    try: return r.status_code, r.json()
    except Exception: return r.status_code, {"_raw": r.text[:200]}

def reg(role, tag):
    pl = {"name": "smoke " + tag + " " + str(S),
          "email": "smoke_ver_" + tag + "_" + str(S) + "@test.gt",
          "password": "secret123", "role": role}
    for _ in range(10):
        c, b = call("POST", "/register", json=pl)
        if c != 429: break
        time.sleep(int(b.get("retry_after", 20)) + 1)
    if c != 201:
        print("REGISTRO FALLO", c, b); sys.exit(1)
    return b["token"], b["user"]["id"]

def perfil(tok, tag, cat):
    c, b = call("POST", "/providers", tok, json={
        "nombre": "smoke ver " + tag + " " + str(S),
        "email": "smoke_ver_perf_" + tag + "_" + str(S) + "@test.gt",
        "departamento": "Guatemala", "categoria_id": cat, "nivel": "experto",
        "descripcion": "Perfil de verificacion independiente."})
    return b["proveedor"]["id"]

print("=" * 72)
print("Verificacion independiente DESPUES - stack de desarrollo :8085 - " + str(S))
print("=" * 72)

c, b = call("GET", "/categorias")
cat = (b.get("categorias") or b.get("data"))[0]["id"]

# ══ H1 ══════════════════════════════════════════════════════════════════════
print("\nH1 - Bypass del handshake por PUT /estado")
tok_cli, _ = reg("cliente", "h1c")
tok_pro, _ = reg("proveedor", "h1p")
prov = perfil(tok_pro, "h1", cat)
c, b = call("POST", "/servicios", tok_cli, json={
    "proveedor_id": prov, "descripcion": "Verificacion H1", "direccion": "Zona 10"})
srv = b["servicio"]["id"]
call("POST", "/servicios/" + str(srv) + "/aceptar", tok_pro)

c, _ = call("PUT", "/servicios/" + str(srv) + "/estado", tok_pro, json={"estado": "completado"})
chk(c == 422, "PUT /estado {completado} rechazado", "HTTP " + str(c))
c, _ = call("PUT", "/servicios/" + str(srv) + "/estado", tok_pro, json={"estado": "cancelado"})
chk(c == 422, "PUT /estado {cancelado} rechazado", "HTTP " + str(c))
c, b = call("GET", "/servicios/" + str(srv), tok_cli)
chk(b["servicio"]["estado"] == "aceptado", "el servicio conserva aceptado", b["servicio"]["estado"])
c, _ = call("POST", "/servicios/" + str(srv) + "/calificar", tok_cli, json={"puntuacion": 5})
chk(c == 422, "no queda calificable sin el handshake", "HTTP " + str(c))
# la salida ratificada de en_camino sigue viva
cod_antes = call("GET", "/servicios/" + str(srv), tok_cli)[1]["servicio"].get("codigo_inicio")
c, _ = call("PUT", "/servicios/" + str(srv) + "/estado", tok_pro, json={"estado": "en_camino"})
chk(c == 200, "aceptado -> en_camino sigue permitido", "HTTP " + str(c))
cod_despues = call("GET", "/servicios/" + str(srv), tok_cli)[1]["servicio"].get("codigo_inicio")
chk(cod_despues is not None,
    "el cliente SIGUE viendo su codigo_inicio en en_camino",
    "antes=" + str(cod_antes) + " despues=" + str(cod_despues))
cod = cod_antes
c, _ = call("POST", "/servicios/" + str(srv) + "/iniciar", tok_pro, json={"codigo": cod})
chk(c == 200, "iniciar con codigo desde en_camino", "HTTP " + str(c))

# ══ H2 ══════════════════════════════════════════════════════════════════════
print("\nH2 - Cancelacion del cliente")
tok_cli2, _ = reg("cliente", "h2c")
tok_pro2, _ = reg("proveedor", "h2p")
prov2 = perfil(tok_pro2, "h2", cat)

def nuevo_servicio():
    c, b = call("POST", "/servicios", tok_cli2, json={
        "proveedor_id": prov2, "descripcion": "Verificacion H2", "direccion": "Zona 1"})
    return b["servicio"]["id"]

s1 = nuevo_servicio()
c, _ = call("POST", "/servicios/" + str(s1) + "/cancelar", tok_cli2)
chk(c == 200, "cliente cancela un servicio pendiente", "HTTP " + str(c))
c, b = call("GET", "/servicios/" + str(s1), tok_cli2)
chk(b["servicio"]["estado"] == "cancelado", "queda cancelado", b["servicio"]["estado"])
c, _ = call("POST", "/servicios/" + str(s1) + "/aceptar", tok_pro2)
chk(c == 422, "un cancelado no se puede aceptar", "HTTP " + str(c))

s2 = nuevo_servicio()
call("POST", "/servicios/" + str(s2) + "/aceptar", tok_pro2)
cod2 = call("GET", "/servicios/" + str(s2), tok_cli2)[1]["servicio"]["codigo_inicio"]
call("POST", "/servicios/" + str(s2) + "/iniciar", tok_pro2, json={"codigo": cod2})
c, _ = call("POST", "/servicios/" + str(s2) + "/cancelar", tok_cli2)
chk(c == 422, "cliente NO cancela trabajo ya iniciado", "HTTP " + str(c))
c, _ = call("POST", "/servicios/" + str(s2) + "/cancelar", tok_pro2)
chk(c in (403, 422), "proveedor no cancela unilateralmente", "HTTP " + str(c))

s3 = nuevo_servicio()
tok_x, _ = reg("cliente", "h2x")
c, _ = call("POST", "/servicios/" + str(s3) + "/cancelar", tok_x)
chk(c in (403, 404), "tercero no cancela servicio ajeno", "HTTP " + str(c))

# ══ H3 ══════════════════════════════════════════════════════════════════════
print("\nH3 - Destinatario arbitrario en POST /calificaciones")
tok_cli3, _ = reg("cliente", "h3c")
tok_proA, id_proA = reg("proveedor", "h3a")
tok_proB, id_proB = reg("proveedor", "h3b")
provA = perfil(tok_proA, "h3a", cat)
provB = perfil(tok_proB, "h3b", cat)

c, b = call("POST", "/servicios", tok_cli3, json={
    "proveedor_id": provA, "descripcion": "Servicio legitimo con A", "direccion": "Zona 4"})
s = b["servicio"]["id"]
call("POST", "/servicios/" + str(s) + "/aceptar", tok_proA)
cod3 = call("GET", "/servicios/" + str(s), tok_cli3)[1]["servicio"]["codigo_inicio"]
call("POST", "/servicios/" + str(s) + "/iniciar", tok_proA, json={"codigo": cod3})
c, b = call("POST", "/servicios/" + str(s) + "/finalizar", tok_proA)
call("POST", "/servicios/" + str(s) + "/confirmar-fin", tok_cli3, json={"codigo": b["codigo_fin"]})

antesB = call("GET", "/providers/" + str(provB))[1]["proveedor"]
c, b = call("POST", "/calificaciones", tok_cli3, json={
    "servicio_id": s, "destinatario_id": id_proB, "puntuacion": 1, "comentario": "smoke ataque"})
despB = call("GET", "/providers/" + str(provB))[1]["proveedor"]
despA = call("GET", "/providers/" + str(provA))[1]["proveedor"]

chk(despB.get("total_calificaciones") == antesB.get("total_calificaciones"),
    "la reputacion del proveedor ajeno NO cambia",
    "antes=" + str(antesB.get("total_calificaciones")) + " despues=" + str(despB.get("total_calificaciones")))
chk(despA.get("total_calificaciones") == 1,
    "la calificacion aterriza en el proveedor real",
    "total A=" + str(despA.get("total_calificaciones")))

c, _ = call("POST", "/calificaciones", tok_proA, json={
    "servicio_id": s, "destinatario_id": id_proA, "puntuacion": 5, "comentario": "smoke auto"})
chk(c in (403, 422), "proveedor no puede autocalificarse", "HTTP " + str(c))

print("\n" + "=" * 72)
print("RESULTADO: " + str(OK) + " correctas, " + str(FAIL) + " fallidas")
print("=" * 72)
