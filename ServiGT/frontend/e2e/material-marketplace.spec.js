const { test, expect } = require('@playwright/test');

// Fixtures isolate layout and error states; sprint9-critical-flows uses the real API.
const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const lote = { id: 71, titulo: 'Tubos PVC sobrantes', descripcion: 'Material de catalogo para verificar la presentacion.', cantidad: 10, unidad: 'metros', precio_referencial: 0, departamento: 'Guatemala', municipio: 'Mixco', estado: 'disponible', vendedor: { nombre: 'Proveedor de prueba' }, imagenes: [{ id: 1, url: 'https://fixture.test/pvc.png' }] };

for (const width of [1440, 1024, 390]) {
  test(`catalogo y detalle ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('servigt_token', 'fixture-token');
      localStorage.setItem('servigt_user', JSON.stringify({ id: 99, role: 'proveedor', name: 'Proveedor de prueba' }));
    });
    await page.route('https://fixture.test/pvc.png', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from(pixel.split(',')[1], 'base64') }));
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body = { success: true };
      if (path.endsWith('/me')) body.user = { id: 99, role: 'proveedor', name: 'Proveedor de prueba' };
      if (path.endsWith('/providers/me')) body.proveedor = { id: 99, nombre: 'Proveedor de prueba' };
      if (path.endsWith('/notificaciones')) Object.assign(body, { notificaciones: [], no_leidas: 0 });
      if (path.endsWith('/materiales')) Object.assign(body, { publicaciones: [lote], meta: { current_page: 1, last_page: 1 } });
      if (path.endsWith('/materiales/71')) body.publicacion = lote;
      await route.fulfill({ json: body });
    });
    await page.goto('/bolsa-materiales');
    await expect(page.getByText(lote.titulo, { exact: true })).toBeVisible();
    await expect(page.getByText('Q0.00')).toBeVisible();
    await expect(page.getByText('Mis lotes', { exact: true })).toBeVisible();
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    expect(await overflow()).toBe(true);
    await page.screenshot({ path: `test-results/material-catalogo-${width}.png` });
    await page.getByText('Ver lote', { exact: true }).click();
    await expect(page.getByLabel('Mensaje inicial')).toBeVisible();
    await expect(page.getByText('Abrir chat', { exact: true })).toHaveCount(0);
    expect(await overflow()).toBe(true);
    await page.screenshot({ path: `test-results/material-detalle-${width}.png` });
  });
}
