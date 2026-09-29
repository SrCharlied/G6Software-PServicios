const { test, expect, request } = require('@playwright/test');

const API_URL = process.env.E2E_API_URL || 'http://localhost:8085/api';
const evidenceDir = '../docs/sprint8/evidencia/responsive';
const stamp = Date.now();

const accounts = {
  client: {
    name: `Smoke Responsive Cliente ${stamp}`,
    email: `smoke-responsive-client-${stamp}@servigt.test`,
    password: 'Password123!',
    role: 'cliente',
  },
  provider: {
    name: `Smoke Responsive Proveedor ${stamp}`,
    email: `smoke-responsive-provider-${stamp}@servigt.test`,
    password: 'Password123!',
    role: 'proveedor',
  },
};

let api;
let clientToken;
let providerToken;
let serviceId;

async function apiCall(method, path, { token, data } = {}) {
  const response = await api.fetch(`${API_URL}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    data,
  });
  const body = await response.json();
  return { response, body };
}

async function register(account) {
  const { response, body } = await apiCall('POST', '/register', { data: account });
  expect(response.status(), JSON.stringify(body)).toBe(201);
  return body;
}

async function login(page, account) {
  await page.goto('/login');
  await page.getByPlaceholder('correo@ejemplo.com').fill(account.email);
  await page.getByPlaceholder('Contrasena').fill(account.password);
  await page.getByText('Ingresar', { exact: true }).click();
  await page.waitForURL(account.role === 'proveedor' ? '**/dashboard' : '**/home');
}

async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test.describe.serial('Checklist responsive Sprint 8', () => {
  test.beforeAll(async () => {
    api = await request.newContext({ extraHTTPHeaders: { Accept: 'application/json' } });

    const client = await register(accounts.client);
    const provider = await register(accounts.provider);
    clientToken = client.token;
    providerToken = provider.token;

    const categories = await apiCall('GET', '/categorias');
    expect(categories.response.ok()).toBeTruthy();
    const categoryId = (categories.body.categorias || categories.body.data)[0].id;

    const profile = await apiCall('POST', '/providers', {
      token: providerToken,
      data: {
        nombre: accounts.provider.name,
        email: accounts.provider.email,
        departamento: 'Guatemala',
        categoria_id: categoryId,
        nivel: 'experto',
        descripcion: 'Perfil temporal para evidencia responsive del Sprint 8.',
      },
    });
    expect(profile.response.status(), JSON.stringify(profile.body)).toBe(201);

    const service = await apiCall('POST', '/servicios', {
      token: clientToken,
      data: {
        proveedor_id: profile.body.proveedor.id,
        descripcion: 'Servicio temporal para validar cancelacion responsive.',
        direccion: 'Zona 10, Guatemala',
      },
    });
    expect(service.response.status(), JSON.stringify(service.body)).toBe(201);
    serviceId = service.body.servicio.id;

    const accepted = await apiCall('POST', `/servicios/${serviceId}/aceptar`, {
      token: providerToken,
    });
    expect(accepted.response.status(), JSON.stringify(accepted.body)).toBe(200);
  });

  test.afterAll(async () => {
    await api?.dispose();
  });

  for (const viewport of [
    { name: '1440', width: 1440, height: 900 },
    { name: '1024', width: 1024, height: 768 },
    { name: '390', width: 390, height: 844 },
  ]) {
    test(`registro y cancelacion en ${viewport.name}px`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/register');
      await expect(page.getByText('Crear cuenta', { exact: true }).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: `${evidenceDir}/registro-${viewport.name}.png`,
        fullPage: false,
      });

      await login(page, accounts.client);
      await page.goto('/solicitudes');
      await expect(page.getByText('Mis servicios', { exact: true }).last()).toBeVisible();
      await expect(page.getByText('Cancelar servicio', { exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.getByText('Cancelar servicio', { exact: true }).click();
      await expect(page.getByText('Cancelar este servicio', { exact: true })).toBeVisible();
      await expect(page.getByText('Confirmar cancelacion', { exact: true })).toBeVisible();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${evidenceDir}/cancelacion-${viewport.name}.png`,
        fullPage: false,
      });
    });
  }

  test('muestra error de carrera al cancelar y conserva navegacion movil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, accounts.client);
    await page.goto('/solicitudes');
    await page.getByText('Cancelar servicio', { exact: true }).click();
    const activeClientToken = await page.evaluate(() => localStorage.getItem('servigt_token'));

    const cancelled = await apiCall('POST', `/servicios/${serviceId}/cancelar`, {
      token: activeClientToken,
    });
    expect(cancelled.response.status(), JSON.stringify(cancelled.body)).toBe(200);

    await page.getByText('Confirmar cancelacion', { exact: true }).click();
    await expect(page.getByText('Este servicio ya no se puede cancelar', { exact: true })).toBeVisible();
    await expect(page.getByText('Mis servicios', { exact: true }).last()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${evidenceDir}/cancelacion-error-390.png`,
      fullPage: false,
    });
  });

  for (const viewport of [
    { name: '1024', width: 1024, height: 768 },
    { name: '390', width: 390, height: 844 },
  ]) {
    test(`navegacion y trabajos del proveedor en ${viewport.name}px`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await login(page, accounts.provider);
      await page.goto('/solicitudes');
      await expect(page.getByText('Trabajos', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Recibidas', { exact: true })).toBeVisible();
      await expect(page.getByText('Cargando solicitudes...', { exact: true })).toBeHidden();
      await page.getByText('Recibidas', { exact: true }).click();
      await expect(page.getByText('Servicio temporal para validar cancelacion responsive.', { exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: `${evidenceDir}/proveedor-${viewport.name}.png`,
        fullPage: false,
      });
    });
  }
});
