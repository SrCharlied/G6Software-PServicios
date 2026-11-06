const { test, expect } = require('@playwright/test');

// Smoke del despliegue (6.1). Solo lectura: no inicia sesion, no registra
// usuarios, no compra ni elimina datos. Las paginas abortan cualquier metodo
// distinto de GET/HEAD y las llamadas directas a la API son todas GET.
//
// /api/health no expone el SHA, asi que la version se corrobora con huellas:
// comportamientos publicos que solo existen desde el Sprint 10. Contra un
// despliegue anterior estas pruebas fallan, y eso es lo esperado.
//
// Variables:
//   E2E_DEPLOY_URL      frontend (por defecto https://servigtdev.com)
//   E2E_DEPLOY_API      API (por defecto <E2E_DEPLOY_URL>/api)
//   E2E_CHROMIUM_PATH   ejecutable de Chromium ya instalado (opcional)

const deployment = (process.env.E2E_DEPLOY_URL || 'https://servigtdev.com').replace(/\/$/, '');
const apiBase = (process.env.E2E_DEPLOY_API || `${deployment}/api`).replace(/\/$/, '');
const JSON_HEADERS = { Accept: 'application/json' };

if (process.env.E2E_CHROMIUM_PATH) {
  test.use({ launchOptions: { executablePath: process.env.E2E_CHROMIUM_PATH } });
}

const sinScrollHorizontal = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

const soloLectura = (page) =>
  page.route('**/*', (route) => (['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort()));

test.describe('despliegue: salud', () => {
  test('health responde y la base esta conectada', async ({ request }) => {
    const health = await request.get(`${apiBase}/health`, { headers: JSON_HEADERS });
    expect(health.status()).toBe(200);
    expect((await health.json()).database.status).toBe('connected');
  });

  // Las pone frontend/nginx/default.conf: no aplica al servidor de desarrollo
  // (:8086), solo a un build productivo (despliegue o frontend_prod :8087).
  test('la portada sale con las cabeceras de seguridad', async ({ request }) => {
    const portada = await request.get(deployment);
    expect(portada.status()).toBe(200);
    const h = portada.headers();
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['content-security-policy']).toContain("default-src 'self'");
  });
});

test.describe('despliegue: huellas del Sprint 10 en la API', () => {
  test('3.1.b: la ruta de eliminacion de cuenta existe y exige sesion', async ({ request }) => {
    const r = await request.get(`${apiBase}/cuenta/eliminacion/impacto`, { headers: JSON_HEADERS });
    // 404 = el despliegue no tiene la 3.1.b.
    expect(r.status()).toBe(401);
  });

  test('1.6.b: el filtro de categoria valida su tipo', async ({ request }) => {
    const r = await request.get(`${apiBase}/providers?categoria_id=abc`, { headers: JSON_HEADERS });
    // 200 = el despliegue ignora el filtro (version anterior).
    expect(r.status()).toBe(422);
  });

  test('1.6.b: el catalogo trae todas las categorias con la principal primero', async ({ request }) => {
    const r = await request.get(`${apiBase}/providers`, { headers: JSON_HEADERS });
    expect(r.status()).toBe(200);
    const filas = (await r.json()).proveedores;
    expect(Array.isArray(filas)).toBe(true);
    test.skip(filas.length === 0, 'Catalogo vacio: no hay filas para inspeccionar.');
    for (const p of filas) {
      expect(Array.isArray(p.categorias)).toBe(true);
      expect(p.categorias.length).toBeLessThanOrEqual(3);
      if (p.categoria_id && p.categorias.length > 0) expect(p.categorias[0].id).toBe(p.categoria_id);
    }
  });

  test('las rutas privadas siguen protegidas', async ({ request }) => {
    for (const ruta of ['/notificaciones', '/me', '/cuenta/eliminacion/impacto']) {
      const r = await request.get(`${apiBase}${ruta}`, { headers: JSON_HEADERS });
      expect(r.status(), ruta).toBe(401);
    }
  });
});

test.describe('despliegue: huellas del Sprint 10 en el frontend', () => {
  test('el bundle publicado incluye la 3.2 y la 1.6.c', async ({ request }) => {
    const html = await (await request.get(deployment)).text();
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => new URL(m[1], `${deployment}/`).href);
    expect(scripts.length).toBeGreaterThan(0);
    test.info().annotations.push({ type: 'bundle', description: scripts.join(', ') });
    let codigo = '';
    for (const src of scripts) codigo += await (await request.get(src)).text();
    // Huellas ASCII: el minificador escapa los acentos de los textos.
    // Booleano a proposito: un toContain fallido volcaria el bundle entero.
    expect(codigo.includes('/cuenta/eliminacion/impacto'), '3.2: pantalla Mi cuenta en el bundle').toBe(true);
    expect(codigo.includes('seleccionadas'), '1.6.c: selector de categorias en el bundle').toBe(true);
  });
});

for (const width of [1440, 1024, 390]) {
  test(`despliegue: pantallas publicas ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await soloLectura(page);

    const portada = await page.goto(deployment);
    expect(portada.status()).toBe(200);
    await expect(page.getByText('ServiGT', { exact: true }).first()).toBeVisible();

    await page.goto(`${deployment}/login`);
    await expect(page.getByPlaceholder('correo@ejemplo.com')).toBeVisible();
    expect(await sinScrollHorizontal(page)).toBe(true);
    await page.screenshot({ path: `test-results/s10-deploy-login-${width}.png`, animations: 'disabled' });

    // Sin sesion, /cuenta no se muestra: el layout protegido manda a /landing.
    await page.goto(`${deployment}/cuenta`);
    await expect(page).toHaveURL(/\/landing$/);
    expect(await sinScrollHorizontal(page)).toBe(true);
  });
}
