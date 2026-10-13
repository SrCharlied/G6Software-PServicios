const { test, expect } = require('@playwright/test');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

for (const width of [1440, 1024, 390]) {
  test(`formulario multipart web ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem('servigt_token', 'fixture-token'));
    let submitted;
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body = { success: true };
      if (path.endsWith('/me')) body.user = { id: 99, role: 'proveedor', name: 'Proveedor de prueba' };
      if (path.endsWith('/providers/me')) body.proveedor = { id: 99 };
      if (path.endsWith('/notificaciones')) Object.assign(body, { notificaciones: [], no_leidas: 0 });
      if (path.endsWith('/servicios/21')) body.servicio = { id: 21, puede_publicar_materiales: true };
      if (path.endsWith('/materiales') && route.request().method() === 'POST') {
        submitted = route.request();
        body.publicacion = { id: 71 };
      }
      if (path.endsWith('/materiales/71')) body.publicacion = { id: 71, titulo: 'Tubos PVC', descripcion: 'Material sobrante de un servicio', cantidad: 10, unidad: 'metros', precio_referencial: 0, departamento: 'Guatemala', estado: 'disponible', es_mio: true };
      await route.fulfill({ json: body });
    });
    await page.goto('/bolsa-materiales/publicar?servicioId=21');
    for (const [label, value] of Object.entries({ Titulo: 'Tubos PVC', Descripcion: 'Material sobrante de un servicio', Cantidad: '10', Unidad: 'metros', 'Precio referencial': '0', Departamento: 'Guatemala' })) await page.getByLabel(label, { exact: true }).fill(value);
    const chooser = page.waitForEvent('filechooser');
    await page.getByText('Agregar imagenes', { exact: true }).click();
    await (await chooser).setFiles({ name: 'material.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByText('material.png', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/material-form-${width}.png`, fullPage: true });
    await page.getByText('Publicar lote', { exact: true }).click();
    await page.waitForURL('**/bolsa-materiales/71');
    expect(submitted.headers()['content-type']).toContain('multipart/form-data; boundary=');
    expect(submitted.postData()).toContain('name="imagenes[]"; filename="material.png"');
    expect(submitted.postData()).toContain('name="precio_referencial"\r\n\r\n0');
  });
}
