const { test, expect } = require('@playwright/test');
// Solo lectura: no inicia sesion, registra usuarios, compra ni elimina datos.
const deployment = 'https://servigtdev.com';
for (const width of [1440, 1024, 390]) {
  test(`smoke publico del despliegue ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/*', (route) => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
    const health = await request.get(`${deployment}/api/health`);
    expect(health.status()).toBe(200);
    expect((await health.json()).database.status).toBe('connected');
    const response = await page.goto(deployment);
    expect(response.status()).toBe(200);
    await expect(page.getByText('ServiGT', { exact: true }).first()).toBeVisible();
    await page.goto(`${deployment}/login`);
    await expect(page.getByPlaceholder('correo@ejemplo.com')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/s10-deploy-login-${width}.png`, animations: 'disabled' });
  });
}
