const { test, expect } = require('@playwright/test');
// Contratos reales con fixtures solo de presentacion; critical-flows prueba API/DB reales.
const lot = { id: 7, titulo: 'Material de prueba responsive', descripcion: 'Material sobrante para inspeccion visual.', cantidad: 8, unidad: 'metros', precio_referencial: 0, departamento: 'Guatemala', estado: 'disponible', imagenes: [], es_mio: true, vendedor: { nombre: 'Vendedor de prueba' } };
const reservation = { id: 8, estado: 'pendiente', mensaje_inicial: 'Mensaje de prueba responsive', acciones: ['cancelar'], publicacion: lot, comprador: { nombre: 'Comprador de prueba' } };
const report = { id: 9, estado: 'recibido', categoria: 'otro', descripcion: 'Descripcion de prueba responsive', reportante: { name: 'Reportante de prueba', role: 'cliente' }, servicio: { id: 21, estado: 'interrumpido_seguridad', cliente: { name: 'Cliente' }, proveedor: { nombre: 'Proveedor' } }, transiciones_permitidas: ['en_revision'], evidencias: [], historial: [] };
const routes = [
  { name: 'catalogo', path: '/bolsa-materiales', role: 'proveedor', endpoint: '/materiales', response: { publicaciones: [lot] }, empty: { publicaciones: [] }, ready: lot.titulo, emptyText: 'No hay materiales disponibles' },
  { name: 'mis-lotes', path: '/bolsa-materiales/mias', role: 'proveedor', endpoint: '/materiales/mias', response: { publicaciones: [lot] }, empty: { publicaciones: [] }, ready: lot.titulo, emptyText: 'Aún no tienes lotes publicados' },
  { name: 'mis-reservas', path: '/reservas-materiales', role: 'proveedor', endpoint: '/reservas-material', response: { reservas: [reservation] }, empty: { reservas: [] }, ready: lot.titulo, emptyText: 'Aún no tienes reservas' },
  { name: 'mensajes', path: '/chat', role: 'proveedor', endpoint: '/mensajes/hilos', response: { hilos: [{ tipo: 'reserva', contexto_id: 8, contraparte: { id: 5, name: 'Comprador de prueba' }, contexto: { titulo: lot.titulo }, ultimo_mensaje: { contenido: 'Mensaje responsive' }, no_leidos: 2 }] }, empty: { hilos: [] }, ready: 'Mensaje responsive', emptyText: 'Bandeja vacia' },
  { name: 'seguridad', path: '/seguridad/servicios/21', role: 'cliente', endpoint: '/servicios/21', response: { servicio: { id: 21, estado: 'aceptado' } }, ready: 'Enviar reporte' },
  { name: 'admin', path: '/admin/reportes-seguridad', role: 'admin', endpoint: '/admin/reportes-seguridad', response: { reportes: [report] }, empty: { reportes: [] }, ready: report.descripcion, emptyText: 'No hay reportes de seguridad' },
];

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}
for (const width of [1440, 1024, 390]) {
  for (const view of routes) {
    test(`${view.name}: carga, contenido, vacio y error ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(() => localStorage.setItem('servigt_token', 'fixture-token'));
      let mode = 'loading';
      let release;
      await page.route('**/api/**', async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === `/api${view.endpoint}`) {
          if (mode === 'loading') await new Promise((resolve) => { release = resolve; });
          return route.fulfill({ status: mode === 'error' ? 500 : 200, json: mode === 'error' ? { message: 'Fallo controlado de API' } : mode === 'empty' ? view.empty : view.response });
        }
        let body = { success: true };
        if (path === '/api/me') body.user = { id: 99, name: 'Cuenta de prueba', role: view.role };
        if (path === '/api/providers/me') body.proveedor = { id: 99 };
        if (path === '/api/notificaciones') Object.assign(body, { notificaciones: [], no_leidas: 0 });
        if (path === '/api/admin/reportes-seguridad/9') body.reporte = report;
        await route.fulfill({ json: body });
      });
      await page.goto(view.path);
      await expect(page.getByText(/Cargando/).filter({ visible: true }).first()).toBeVisible();
      await noOverflow(page);
      mode = 'ready'; release();
      await expect(page.getByText(view.ready, { exact: true }).filter({ visible: true })).toBeVisible();
      await noOverflow(page);
      if (view.name === 'admin') {
        await page.getByText('Ver detalle', { exact: true }).click();
        await expect(page.getByText('Interrumpido por seguridad', { exact: true })).toBeVisible();
        await expect(page.getByPlaceholder('Nota interna (solo administradores)')).toBeVisible();
        await expect(page.getByPlaceholder('Nota interna (solo administradores)')).toBeInViewport({ ratio: 1 });
        await noOverflow(page);
        await page.screenshot({ path: `test-results/s9-admin-detalle-${width}.png`, animations: 'disabled' });
        await page.getByText('Cerrar', { exact: true }).filter({ visible: true }).click();
      }
      await page.screenshot({ path: `test-results/s9-${view.name}-${width}.png` });
      if (width === 390 && ['proveedor', 'admin'].includes(view.role)) {
        await page.getByLabel('Abrir menu').click();
        await expect(page.getByRole('link', { name: view.role === 'admin' ? /Panel admin/ : /Mi panel/ }).filter({ visible: true }).first()).toBeVisible();
        await page.getByLabel('Abrir menu').click();
      }
      if (view.empty) {
        mode = 'empty'; await page.reload();
        await expect(page.getByText(view.emptyText, { exact: true })).toBeVisible();
        await noOverflow(page);
      }
      mode = 'error'; await page.reload();
      await expect(page.getByText('Fallo controlado de API', { exact: true })).toBeVisible();
      if (view.emptyText) await expect(page.getByText(view.emptyText, { exact: true })).toHaveCount(0);
      if (view.name === 'seguridad') await expect(page.getByText('Bomberos Voluntarios · 122', { exact: true })).toBeVisible();
      await noOverflow(page);
      mode = 'ready'; await page.getByText('Reintentar', { exact: true }).click();
      await expect(page.getByText(view.ready, { exact: true })).toBeVisible();
    });
  }
  test(`servicio terminal oculta codigos y acciones ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem('servigt_token', 'fixture-token'));
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body = {};
      if (path === '/api/me') body.user = { id: 99, role: 'cliente', name: 'Cliente de prueba' };
      if (path === '/api/servicios/cliente') body.servicios = [{ id: 21, estado: 'interrumpido_seguridad', descripcion: 'Servicio terminal de prueba', codigo_inicio: '123456', codigo_fin: '654321', proveedor: { nombre: 'Proveedor' } }];
      if (path === '/api/notificaciones') Object.assign(body, { notificaciones: [], no_leidas: 0 });
      await route.fulfill({ json: body });
    });
    await page.goto('/solicitudes');
    await expect(page.getByText('Interrumpido por seguridad', { exact: true })).toBeVisible();
    for (const label of ['Codigo de inicio', 'Confirmar finalizacion', 'Calificar proveedor', 'Cancelar servicio', 'Centro de seguridad']) await expect(page.getByText(label, { exact: true })).toHaveCount(0);
    await noOverflow(page);
  });
}
