// E2E de humo para task 4.1 (registro/correo endurecido) contra el stack
// real de docker compose (frontend :8086, backend :8085). Usa un correo con
// prefijo "smoke-" identificable para poder limpiarlo despues, tal como pide
// AGENTS.md para datos de prueba en ambientes compartidos.
const { test, expect, request } = require('@playwright/test');
const { requireLocalStack, cleanupAccounts, respectRetryAfter } = require('./helpers/local-smoke');
const API_URL = process.env.E2E_API_URL || 'http://localhost:8085/api';
const { legalAcceptance } = require('./helpers/legal');
test.use({ trace: 'off' });

// Timestamp en el correo: cada corrida usa una cuenta nueva y no colisiona
// con ejecuciones anteriores que no se hayan limpiado.
const stamp = Date.now();
const emailLower = `smoke-e2e-${stamp}@servigt.test`;
const emailMixedCase = `Smoke-E2E-${stamp}@ServiGT.test`;

test.describe.serial('Registro endurecido (task 4.1)', () => {
  test.beforeAll(async () => {
    test.setTimeout(90_000); // Fixture: esperar el limite real, no ampliar los tests de UI.
    requireLocalStack(API_URL);
    const api = await request.newContext({ extraHTTPHeaders: { Accept: 'application/json' } });
    try {
      await legalAcceptance(api, API_URL);
      // Una validacion sin datos no crea usuarios. Reservar dos intentos de UI
      // evita que una corrida previa transforme el caso de duplicado en un 429.
      for (let attempt = 0; attempt < 5; attempt++) {
        const response = await api.post(`${API_URL}/register`, { data: {} });
        if (await respectRetryAfter(response)) continue;
        expect(response.status()).toBe(422);
        if (Number(response.headers()['x-ratelimit-remaining']) >= 2) return;
      }
      throw new Error('No se libero la ventana de registro.');
    } finally { await api.dispose(); }
  });
  test.afterAll(() => cleanupAccounts([emailLower]));
  test('registra una cuenta nueva y redirige a home', async ({ page }) => {
    await page.goto('/register');

    await page.getByPlaceholder('Tu nombre').fill('Smoke E2E');
    await page.getByPlaceholder('correo@ejemplo.com').fill(emailLower);
    await page.getByPlaceholder('Mínimo 6 caracteres').fill('Password123!');
    await page.getByPlaceholder('Repite tu contraseña').fill('Password123!');
    await page.getByRole('checkbox', { name: 'Acepto terminos' }).click();
    await page.getByRole('checkbox', { name: 'Acepto privacidad' }).click();
    await page.getByText('Cliente', { exact: true }).click();
    // "Crear cuenta" tambien es el subtitulo de la pantalla; el boton de
    // envio es la segunda ocurrencia (mas abajo en el DOM).
    await page.getByText('Crear cuenta', { exact: true }).last().click();

    await page.waitForURL('**/home', { timeout: 10_000 });
  });

  test('rechaza un correo duplicado que solo difiere en mayusculas', async ({ page }) => {
    await page.goto('/register');

    await page.getByPlaceholder('Tu nombre').fill('Smoke E2E Duplicado');
    // Mismo correo que la prueba anterior, pero con mayusculas distintas:
    // el backend debe normalizar y detectar la colision (no crear una
    // segunda cuenta).
    await page.getByPlaceholder('correo@ejemplo.com').fill(emailMixedCase);
    await page.getByPlaceholder('Mínimo 6 caracteres').fill('Password123!');
    await page.getByPlaceholder('Repite tu contraseña').fill('Password123!');
    await page.getByRole('checkbox', { name: 'Acepto terminos' }).click();
    await page.getByRole('checkbox', { name: 'Acepto privacidad' }).click();
    await page.getByText('Cliente', { exact: true }).click();
    await page.getByText('Crear cuenta', { exact: true }).last().click();

    await expect(page.getByText(/correo electrónico ya está registrado/i).first()).toBeVisible({ timeout: 10_000 });
    // Se queda en /register: no hubo redireccion a home.
    await expect(page).toHaveURL(/\/register$/);
  });

  test('permite iniciar sesion usando un case distinto al que se guardo', async ({ page }) => {
    // La cuenta se creo con emailLower; se inicia sesion con el correo en
    // mayusculas para probar la busqueda case-insensitive del login.
    await page.goto('/login');

    await page.getByPlaceholder('correo@ejemplo.com').fill(emailMixedCase);
    await page.getByPlaceholder('Contrasena').fill('Password123!');
    await page.getByText('Ingresar', { exact: true }).click();

    await page.waitForURL('**/home', { timeout: 10_000 });
  });
});
