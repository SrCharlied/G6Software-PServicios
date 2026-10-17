// Task 5.1/5.2 - campana de carga (lecturas publicas + autenticadas).
//
// Rampa propuesta en el plan de Sprint 8 (S8-05): 5 a 25 VUs durante una
// campana de 5 minutos. Los tokens se generan una sola vez en setup() -no
// dentro del bucle de iteracion- via /api/register + /api/login, tal como
// pide el plan ("Tokens fuera del bucle").
//
// Uso:
//   docker run --rm --network <red-del-backend-objetivo> \
//     -e BASE_URL=http://k6_backend_target:8000/api \
//     -v "$(pwd)/ServiGT/tests/performance:/scripts" \
//     grafana/k6@sha256:e66db15b860113878fa74670e31f5e274830b7b6e42c8bff28b2f2d86a257603 run /scripts/carga.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:18000/api';
// Cuantas cuentas de prueba se crean en setup() y se reparten entre VUs.
// No depende de la cantidad de VUs: se reciclan por indice.
const SMOKE = __ENV.SMOKE === 'true' || __ENV.SMOKE === '1';
const POOL_SIZE = Number(__ENV.AUTH_POOL_SIZE || (SMOKE ? 1 : 3));

const errorRate = new Rate('errores_negocio');
const authDuration = new Trend('duracion_autenticada', true);
const publicDuration = new Trend('duracion_publica', true);

export const options = {
  scenarios: {
    carga_mixta: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: SMOKE ? [
        { duration: '10s', target: 1 },
        { duration: '5s', target: 0 },
      ] : [
        { duration: '30s', target: 5 },   // calentamiento
        { duration: '2m', target: 25 },   // rampa hasta el techo propuesto
        { duration: '2m', target: 25 },   // sostenido
        { duration: '30s', target: 0 },   // enfriamiento
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    // Objetivos propuestos en S8-05, pendientes de ratificacion formal por
    // producto: se codifican aqui como umbrales del script, no como un
    // veredicto ya aprobado de capacidad.
    'duracion_publica': ['p(95)<800'],
    'duracion_autenticada': ['p(95)<1500'],
    'errores_negocio': ['rate<0.01'],
    'http_req_failed': ['rate<0.05'],
    'checks': ['rate>0.99'],
  },
};

// Crea POOL_SIZE cuentas smoke-* dedicadas a esta corrida y devuelve sus
// tokens ya emitidos. Se ejecuta una sola vez para todo el test.
export function setup() {
  const stamp = Date.now();
  const tokens = [];

  for (let i = 0; i < POOL_SIZE; i++) {
    const email = `smoke-k6-carga-${stamp}-${i}@servigt.test`;
    const payload = JSON.stringify({
      name: `Smoke K6 Carga ${i}`,
      email,
      password: 'Password123!',
      role: 'cliente',
    });

    const res = http.post(`${BASE_URL}/register`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.status === 201) {
      tokens.push(res.json('token'));
    }
  }

  if (tokens.length === 0) {
    throw new Error('setup() no pudo crear ninguna cuenta de prueba; abortando la campana.');
  }

  return { tokens };
}

export default function (data) {
  const token = data.tokens[__VU % data.tokens.length];

  // 70% lecturas publicas, 30% autenticadas: aproxima el trafico real del
  // catalogo (publico) frente a pantallas que requieren sesion.
  if (Math.random() < 0.7) {
    const endpoints = ['/health', '/categorias', '/providers', '/publicaciones', '/pedidos/abiertos'];
    const path = endpoints[Math.floor(Math.random() * endpoints.length)];

    const res = http.get(`${BASE_URL}${path}`, { tags: { name: 'publica' } });
    publicDuration.add(res.timings.duration);

    const ok = check(res, { 'lectura publica responde 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  } else {
    const res = http.get(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
      tags: { name: 'autenticada' },
    });
    authDuration.add(res.timings.duration);

    const ok = check(res, { 'me autenticado responde 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  }

  sleep(1);
}
