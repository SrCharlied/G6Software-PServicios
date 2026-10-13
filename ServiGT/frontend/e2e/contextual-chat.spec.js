const { test, expect } = require('@playwright/test');
for (const width of [1440, 1024, 390]) {
  test(`hilos aislados ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem('servigt_token', 'fixture-token'));
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body = { success: true };
      if (path.endsWith('/me')) body.user = { id: 99, role: 'proveedor', name: 'Proveedor de prueba' };
      if (path.endsWith('/providers/me')) body.proveedor = { id: 99 };
      if (path.endsWith('/notificaciones')) Object.assign(body, { notificaciones: [], no_leidas: 0 });
      if (path.endsWith('/mensajes/hilos')) body.hilos = [21, 22].map((id) => ({ tipo: 'servicio', contexto_id: id, contexto: { titulo: `Trabajo ${id}` }, contraparte: { id: 9, name: 'Misma persona' }, no_leidos: id === 21 ? 2 : 3, ultimo_mensaje: { contenido: `Ultimo del ${id}` } }));
      if (/\/mensajes\/servicios\/\d+$/.test(path)) {
        const id = Number(path.split('/').pop());
        body = { mensajes: [{ id, emisor_id: 9, contenido: `Mensaje privado ${id}` }], contexto: { tipo: 'servicio', id, solo_lectura: id === 22, estado: id === 22 ? 'interrumpido_seguridad' : 'aceptado' }, contraparte: { id: 9, name: 'Nombre autoritativo' } };
      }
      await route.fulfill({ json: body });
    });
    await page.goto('/chat');
    await page.getByText('Ultimo del 21', { exact: true }).filter({ visible: true }).click();
    await expect(page.getByText('Mensaje privado 21', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Escribe un mensaje')).toBeVisible();
    await page.screenshot({ path: `test-results/chat-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    if (width < 1200) await page.getByLabel('Volver a mensajes', { exact: true }).click();
    await page.getByText('Ultimo del 22', { exact: true }).filter({ visible: true }).click();
    await expect(page.getByText('Mensaje privado 22', { exact: true })).toBeVisible();
    await expect(page.getByText('Mensaje privado 21', { exact: true }).filter({ visible: true })).toHaveCount(0);
    await expect(page.getByPlaceholder('Escribe un mensaje')).toHaveCount(0);
    await expect(page.getByText('Servicio interrumpido por seguridad. Chat de solo lectura.')).toBeVisible();
  });
}
