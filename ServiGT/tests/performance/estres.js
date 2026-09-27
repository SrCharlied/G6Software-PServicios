// Task 5.1/5.2 — prueba de estres escalonada con techo explicito.
//
// Escala VUs por etapas hasta un techo (STRESS_MAX_VUS, default 100) durante
// como maximo 10 minutos, seguido de 2 minutos a 0 VUs para observar
// recuperacion. Se detiene sola si `http_req_failed` supera el 50%
// sostenido (abortOnFail) para no seguir golpeando el entorno una vez
// saturado, tal como pide el plan ("detener por saturacion... o afectacion
// del entorno").
//
// Uso:
//   docker run --rm --network <red-del-backend-objetivo> \
//     -e BASE_URL=http://k6_backend_target:8000/api \
//     -v "$(pwd)/ServiGT/tests/performance:/scripts" \
//     grafana/k6:latest run /scripts/estres.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:18000/api';
const MAX_VUS = Number(__ENV.STRESS_MAX_VUS || 100);

const errorRate = new Rate('errores_estres');

export const options = {
  scenarios: {
    escalonado: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '90s', target: Math.round(MAX_VUS * 0.1) },
        { duration: '90s', target: Math.round(MAX_VUS * 0.25) },
        { duration: '90s', target: Math.round(MAX_VUS * 0.5) },
        { duration: '90s', target: Math.round(MAX_VUS * 0.75) },
        { duration: '2m',  target: MAX_VUS },     // techo explicito, sostenido
        { duration: '2m',  target: 0 },           // observacion de recuperacion
      ],
      gracefulRampDown: '20s',
    },
  },
  thresholds: {
    // No es un objetivo de negocio: es un freno de seguridad para no seguir
    // generando trafico si el entorno ya colapso.
    'http_req_failed': [{ threshold: 'rate<0.5', abortOnFail: true, delayAbortEval: '20s' }],
  },
};

export default function () {
  // Solo lecturas publicas: el objetivo de esta prueba es encontrar el
  // techo de saturacion del servidor, no medir autenticacion (eso ya lo
  // cubre carga.js). Mezclar login aqui encimaria el costo de bcrypt con la
  // señal de saturacion HTTP general que buscamos.
  const endpoints = ['/health', '/categorias', '/providers', '/publicaciones'];
  const path = endpoints[Math.floor(Math.random() * endpoints.length)];

  const res = http.get(`${BASE_URL}${path}`, { tags: { name: 'estres' } });

  const ok = check(res, {
    'responde sin error de servidor (< 500)': (r) => r.status > 0 && r.status < 500,
  });
  errorRate.add(!ok);

  sleep(0.5);
}
