"""Task 5.3 - regression smoke for the corrected H1/H2/H3 cases.

The target is configurable so the script can use the disposable db_test
environment. It creates only users prefixed with smoke_after_.
"""
import os
import random
import sys
import time
import json
import urllib.error
import urllib.request


BASE_URL = os.environ.get("BASE_URL", "http://localhost:18000/api").rstrip("/")
RUN_ID = random.randint(100000, 999999)
FAILURES = []


def call(method, path, token=None, **kwargs):
    headers = kwargs.pop("headers", {})
    headers["Accept"] = "application/json"
    if token:
        headers["Authorization"] = "Bearer " + token
    payload = kwargs.pop("json", None)
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    if data is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(
        BASE_URL + path, data=data, headers=headers, method=method
    )
    try:
        response = urllib.request.urlopen(request, timeout=30)
    except urllib.error.HTTPError as error:
        response = error
    raw = response.read().decode("utf-8")
    try:
        body = json.loads(raw)
    except ValueError:
        body = {"_raw": raw[:300]}
    return response.status, body


def expect(label, condition, detail):
    status = "PASS" if condition else "FAIL"
    print(f"  [{status}] {label}: {detail}")
    if not condition:
        FAILURES.append(label)


def register(role, tag):
    payload = {
        "name": f"smoke after {tag} {RUN_ID}",
        "email": f"smoke_after_{tag}_{RUN_ID}@servigt.test",
        "password": "Password123!",
        "role": role,
    }
    for _ in range(10):
        status, body = call("POST", "/register", json=payload)
        if status != 429:
            break
        time.sleep(int(body.get("retry_after", 20)) + 1)
    if status != 201:
        raise RuntimeError(f"registration {tag} failed: HTTP {status} {body}")
    return body["token"], body["user"]["id"]


def create_provider(token, tag, category_id):
    status, body = call(
        "POST",
        "/providers",
        token,
        json={
            "nombre": f"smoke after {tag} {RUN_ID}",
            "email": f"smoke_after_profile_{tag}_{RUN_ID}@servigt.test",
            "departamento": "Guatemala",
            "categoria_id": category_id,
            "nivel": "experto",
            "descripcion": "Perfil temporal para regresion de seguridad.",
        },
    )
    if status != 201:
        raise RuntimeError(f"provider {tag} failed: HTTP {status} {body}")
    return body["proveedor"]["id"]


def create_service(client_token, provider_id, tag):
    status, body = call(
        "POST",
        "/servicios",
        client_token,
        json={
            "proveedor_id": provider_id,
            "descripcion": f"Servicio temporal {tag}",
            "direccion": "Zona 10",
        },
    )
    if status != 201:
        raise RuntimeError(f"service {tag} failed: HTTP {status} {body}")
    return body["servicio"]["id"]


def service(client_token, service_id):
    status, body = call("GET", f"/servicios/{service_id}", client_token)
    if status != 200:
        raise RuntimeError(f"service lookup failed: HTTP {status} {body}")
    return body["servicio"]


def complete_service(client_token, provider_token, service_id):
    status, _ = call("POST", f"/servicios/{service_id}/aceptar", provider_token)
    if status != 200:
        raise RuntimeError(f"accept failed: HTTP {status}")
    start_code = service(client_token, service_id)["codigo_inicio"]
    status, _ = call(
        "POST",
        f"/servicios/{service_id}/iniciar",
        provider_token,
        json={"codigo": start_code},
    )
    if status != 200:
        raise RuntimeError(f"start failed: HTTP {status}")
    status, body = call("POST", f"/servicios/{service_id}/finalizar", provider_token)
    if status != 200:
        raise RuntimeError(f"finish failed: HTTP {status}")
    status, _ = call(
        "POST",
        f"/servicios/{service_id}/confirmar-fin",
        client_token,
        json={"codigo": body["codigo_fin"]},
    )
    if status != 200:
        raise RuntimeError(f"confirmation failed: HTTP {status}")


print("=" * 72)
print(f"Evidencia DESPUES - matriz H1/H2/H3 - corrida {RUN_ID}")
print(f"Target: {BASE_URL}")
print("=" * 72)

status, body = call("GET", "/categorias")
if status != 200:
    raise RuntimeError(f"categories failed: HTTP {status} {body}")
category_id = (body.get("categorias") or body.get("data"))[0]["id"]

print("\nH1 - El endpoint generico no omite el handshake")
client_h1, _ = register("cliente", "h1_client")
provider_h1, _ = register("proveedor", "h1_provider")
provider_profile_h1 = create_provider(provider_h1, "h1", category_id)
service_h1 = create_service(client_h1, provider_profile_h1, "h1")
status, _ = call("POST", f"/servicios/{service_h1}/aceptar", provider_h1)
expect("precondicion aceptada", status == 200, f"HTTP {status}")
status, _ = call(
    "PUT",
    f"/servicios/{service_h1}/estado",
    provider_h1,
    json={"estado": "completado"},
)
current = service(client_h1, service_h1)["estado"]
expect("rechaza completar por estado generico", status == 422, f"HTTP {status}")
expect("conserva estado aceptado", current == "aceptado", f"estado={current}")
status, _ = call(
    "PUT",
    f"/servicios/{service_h1}/estado",
    provider_h1,
    json={"estado": "cancelado"},
)
expect("rechaza cancelar por estado generico", status == 422, f"HTTP {status}")

print("\nH2 - Cancelacion valida y estados posteriores protegidos")
client_h2, _ = register("cliente", "h2_client")
provider_h2, _ = register("proveedor", "h2_provider")
provider_profile_h2 = create_provider(provider_h2, "h2", category_id)
service_h2a = create_service(client_h2, provider_profile_h2, "h2_cancel")
status, body = call(
    "POST",
    f"/servicios/{service_h2a}/cancelar",
    client_h2,
    json={"motivo": "Cambio de planes"},
)
cancelled_state = (body.get("servicio") or {}).get("estado")
expect("cliente cancela antes de iniciar", status == 200, f"HTTP {status}")
expect("queda cancelado", cancelled_state == "cancelado", f"estado={cancelled_state}")
status, _ = call(
    "POST",
    f"/servicios/{service_h2a}/iniciar",
    provider_h2,
    json={"codigo": "000000"},
)
expect("no inicia un servicio cancelado", status == 422, f"HTTP {status}")

service_h2b = create_service(client_h2, provider_profile_h2, "h2_started")
call("POST", f"/servicios/{service_h2b}/aceptar", provider_h2)
start_code = service(client_h2, service_h2b)["codigo_inicio"]
status, _ = call(
    "POST",
    f"/servicios/{service_h2b}/iniciar",
    provider_h2,
    json={"codigo": start_code},
)
expect("precondicion iniciada", status == 200, f"HTTP {status}")
status, _ = call("POST", f"/servicios/{service_h2b}/cancelar", client_h2)
current = service(client_h2, service_h2b)["estado"]
expect("cliente no cancela trabajo iniciado", status == 422, f"HTTP {status}")
expect("conserva estado en progreso", current == "en_progreso", f"estado={current}")

print("\nH3 - El destinatario se deriva del servicio")
client_h3, _ = register("cliente", "h3_client")
provider_h3a, provider_user_h3a = register("proveedor", "h3_provider_a")
provider_h3b, provider_user_h3b = register("proveedor", "h3_provider_b")
profile_h3a = create_provider(provider_h3a, "h3a", category_id)
profile_h3b = create_provider(provider_h3b, "h3b", category_id)
service_h3 = create_service(client_h3, profile_h3a, "h3")
complete_service(client_h3, provider_h3a, service_h3)

status, before = call("GET", f"/providers/{profile_h3b}")
if status != 200:
    raise RuntimeError(f"provider B lookup failed: HTTP {status} {before}")
before_total = before["proveedor"].get("total_calificaciones")
status, _ = call(
    "POST",
    "/calificaciones",
    client_h3,
    json={
        "servicio_id": service_h3,
        "destinatario_id": provider_user_h3b,
        "puntuacion": 4,
        "comentario": "Regresion H3",
    },
)
_, after_b = call("GET", f"/providers/{profile_h3b}")
_, after_a = call("GET", f"/providers/{profile_h3a}")
after_total_b = after_b["proveedor"].get("total_calificaciones")
after_total_a = after_a["proveedor"].get("total_calificaciones")
expect("ruta historica conserva compatibilidad", status == 201, f"HTTP {status}")
expect(
    "proveedor ajeno no recibe calificacion",
    after_total_b == before_total,
    f"antes={before_total}, despues={after_total_b}",
)
expect(
    "proveedor real recibe calificacion",
    after_total_a == 1,
    f"total={after_total_a}",
)
status, _ = call(
    "POST",
    "/calificaciones",
    provider_h3a,
    json={
        "servicio_id": service_h3,
        "destinatario_id": provider_user_h3a,
        "puntuacion": 5,
    },
)
expect("proveedor no puede autocalificarse", status == 403, f"HTTP {status}")

print("\n" + "=" * 72)
if FAILURES:
    print("RESULTADO: FAIL - " + ", ".join(FAILURES))
    sys.exit(1)
print("RESULTADO: PASS - H1, H2 y H3 no se reproducen")
