const { test, expect } = require('@playwright/test');
// Fixtures solo de presentacion. No representan cuentas ni aprobaciones reales.
const profile = { id: 7, user_id: 9, nombre: 'Perfil de prueba responsive', telefono: '55550101', descripcion: 'Servicios profesionales de plomeria.', departamento: 'Guatemala', categoria_id: 1, color_acento: null };
const legal = (version = 'fixture-1') => ['terminos', 'privacidad'].map((tipo, index) => ({ id: index + 1, tipo, version, titulo: `Documento de prueba: ${tipo}`, contenido: `Fixture de presentacion ${tipo}. No es texto legal aprobado.\nContenido de prueba para comprobar lectura y ajuste de linea.`, hash: 'a'.repeat(64), vigente_desde: '2026-10-26T00:00:00Z' }));
async function noOverflow(page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true); }
async function screenshot(page, name, width) { await noOverflow(page); await page.screenshot({ path: `test-results/s10-${name}-${width}.png`, animations: 'disabled' }); }
async function fixtureApi(page, handler, role = 'cliente') {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (await handler(route, path)) return;
    let body = {};
    if (path === '/api/me') body.user = { id: 9, name: 'Cuenta de prueba', role };
    if (path === '/api/providers/me') body.proveedor = profile;
    if (path === '/api/categorias') body.categorias = [{ id: 1, nombre: 'Plomeria' }];
    if (path === '/api/notificaciones') Object.assign(body, { notificaciones: [], no_leidas: 0 });
    await route.fulfill({ json: body });
  });
}
for (const width of [1440, 1024, 390]) {
  test(`legal publico: error, reintento y acceso con sesion ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    let error = true;
    await fixtureApi(page, async (route, path) => {
      if (path !== '/api/legal/documentos/vigentes') return false;
      await route.fulfill({ status: error ? 503 : 200, json: error ? { message: 'Faltan textos aprobados' } : { documentos: legal() } }); return true;
    });
    await page.goto('/terminos'); await expect(page.getByText('Faltan textos aprobados', { exact: true })).toBeVisible();
    error = false; await page.getByText('Reintentar', { exact: true }).click();
    await expect(page.getByText('Version fixture-1', { exact: true })).toBeVisible();
    await screenshot(page, 'terminos', width);
    await page.evaluate(() => localStorage.setItem('servigt_token', 'fixture-token'));
    await page.goto('/privacidad'); await expect(page.getByText('Documento de prueba: privacidad', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Mis servicios/ })).toHaveCount(0);
    await screenshot(page, 'privacidad', width);
  });

  test(`registro: confirmacion, aceptaciones y 409 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    let version = 'fixture-1', posted;
    await fixtureApi(page, async (route, path) => {
      if (path === '/api/legal/documentos/vigentes') { await route.fulfill({ json: { documentos: legal(version) } }); return true; }
      if (path === '/api/register') { posted = route.request().postDataJSON(); version = 'fixture-2'; await route.fulfill({ status: 409, json: { message: 'Versiones obsoletas' } }); return true; }
      return false;
    });
    await page.goto('/register');
    const terms = page.getByRole('checkbox', { name: 'Acepto terminos' });
    await expect(terms).toHaveAttribute('aria-checked', 'false');
    await page.getByPlaceholder('Tu nombre').fill('Cuenta de prueba');
    await page.getByPlaceholder('correo@ejemplo.com').fill('fixture@servigt.test');
    await page.getByPlaceholder('Mínimo 6 caracteres, máximo 72 bytes').fill('Password123!');
    await page.getByPlaceholder('Repite tu contraseña').fill('Distinta123!');
    await page.getByLabel('Crear cuenta', { exact: true }).click();
    await expect(page.getByText('Las contraseñas no coinciden.', { exact: true })).toBeVisible();
    expect(posted).toBeUndefined();
    await page.getByPlaceholder('Repite tu contraseña').fill('Password123!');
    await terms.click(); await page.getByRole('checkbox', { name: 'Acepto privacidad' }).click();
    await screenshot(page, 'registro', width);
    await page.getByLabel('Crear cuenta', { exact: true }).click();
    await expect(page.getByText('Acepto terminos y condiciones (version fixture-2)', { exact: true })).toBeVisible();
    await expect(terms).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('checkbox', { name: 'Acepto privacidad' })).toHaveAttribute('aria-checked', 'false');
    expect(posted.password_confirmation).toBe(posted.password);
    expect(posted.aceptaciones_legales.map((d) => d.version)).toEqual(['fixture-1', 'fixture-1']);
    await noOverflow(page);
  });

  test(`perfil y logout con confirmacion ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem('servigt_token', 'fixture-token'));
    let posted, logoutCount = 0;
    await fixtureApi(page, async (route, path) => {
      if (path === '/api/providers/7' && route.request().method() === 'PUT') { posted = route.request().postDataJSON(); await route.fulfill({ json: { proveedor: { ...profile, ...posted } } }); return true; }
      if (path === '/api/logout') { logoutCount++; await route.fulfill({ json: { success: true } }); return true; }
      return false;
    }, 'proveedor');
    await page.goto('/profile/edit');
    await page.getByPlaceholder('Ej: 55551234').fill('5555-0101');
    await page.getByText('Guardar cambios', { exact: true }).click();
    await expect(page.getByText('Ingresa un telefono local de 8 digitos.', { exact: true })).toBeVisible();
    expect(posted).toBeUndefined();
    await page.getByPlaceholder('Ej: 55551234').fill('55550101');
    await page.getByPlaceholder('Describe los servicios que ofreces, tu experiencia, horarios...').fill('Servicios profesionales de plomeria.');
    await screenshot(page, 'perfil', width);
    await page.getByText('Guardar cambios', { exact: true }).click();
    await expect.poll(() => posted?.telefono).toBe('55550101');
    expect(posted).not.toHaveProperty('color_acento');
    await page.waitForURL('**/dashboard');
    if (width === 390) await page.getByLabel('Abrir menu').click();
    await page.getByRole('button', { name: 'Cerrar sesion', exact: true }).click();
    await page.getByText('Cancelar', { exact: true }).click();
    expect(logoutCount).toBe(0);
    expect(await page.evaluate(() => localStorage.getItem('servigt_token'))).toBe('fixture-token');
    if (width === 390) await expect(page.getByRole('button', { name: 'Cerrar sesion', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar sesion', exact: true }).click();
    await screenshot(page, 'logout', width);
    await page.getByRole('dialog').getByText('Cerrar sesion', { exact: true }).last().click();
    await expect.poll(() => logoutCount).toBe(1);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('servigt_token'))).toBeNull();
  });
}

test('consulta legal real local: disponibilidad o bloqueo explicito, sin escrituras', async ({ page, request }) => {
  const api = process.env.E2E_API_URL || 'http://localhost:8085/api';
  const health = await request.get(`${api}/health`);
  expect(health.status()).toBe(200);
  const response = await request.get(`${api}/legal/documentos/vigentes`);
  const body = await response.json();
  if (response.status() === 503) {
    await page.goto('/register');
    await expect(page.getByText(body.message, { exact: true })).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(0);
  } else {
    expect(response.status()).toBe(200);
    expect(body.documentos).toHaveLength(2);
  }
});
