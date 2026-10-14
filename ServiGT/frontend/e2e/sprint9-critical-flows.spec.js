const { test, expect, request } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
test.use({ trace: 'off' }); // La suite usa sesiones reales y evidencia privada.

const API = process.env.E2E_API_URL || 'http://localhost:8085/api';
const stamp = `${Date.now()}-${randomBytes(4).toString('hex')}`;
const password = `Smoke9-${randomBytes(12).toString('hex')}!`;
const accounts = Object.fromEntries(['client', 'seller', 'buyer'].map((key) => [key, {
  name: `Smoke S9 ${key} ${stamp}`, email: `smoke-s9-${stamp}-${key}@servigt.test`, password, role: key === 'client' ? 'cliente' : 'proveedor',
}]));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
let api, serviceId, loteId, reservaId;
const sessions = {};
const loggedAccounts = new Set();
const createdEmails = [];
const titulo = `Smoke S9 tubos ${stamp}`;

async function call(method, path, key, data) {
  const response = await api.fetch(`${API}${path}`, { method, headers: sessions[key] ? { Authorization: `Bearer ${sessions[key].token}` } : undefined, data });
  return { status: response.status(), body: await response.json(), retryAfter: Number(response.headers()['retry-after'] || 60) };
}
async function login(page, key) {
  if (loggedAccounts.has(key)) {
    await page.addInitScript(({ token, user }) => { localStorage.setItem('servigt_token', token); localStorage.setItem('servigt_user', JSON.stringify(user)); }, { token: sessions[key].token, user: sessions[key].user });
    await page.goto(key === 'client' ? '/home' : '/dashboard');
    return;
  }
  await page.goto('/login');
  await page.getByPlaceholder('correo@ejemplo.com').fill(accounts[key].email);
  await page.getByPlaceholder('Contrasena').fill(password);
  const authenticated = page.waitForResponse((res) => res.request().method() === 'POST' && res.url().endsWith('/login'));
  await page.getByText('Ingresar', { exact: true }).click();
  // Login revoca tokens anteriores; los checks API deben usar el nuevo token.
  const response = await authenticated;
  expect(response.status()).toBe(200);
  sessions[key].token = (await response.json()).token;
  loggedAccounts.add(key);
  await page.waitForURL(key === 'client' ? '**/home' : '**/dashboard');
}
async function visibleText(page, text) { return page.getByText(text, { exact: true }).filter({ visible: true }); }

function cleanupLocalAccounts() {
  if (!createdEmails.length) return;
  const encoded = Buffer.from(JSON.stringify(createdEmails)).toString('base64');
  const php = `require '/app/vendor/autoload.php'; $app=require '/app/bootstrap/app.php'; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
    $emails=json_decode(base64_decode('${encoded}'),true);
    foreach($emails as $email) { if(!preg_match('/^smoke-s9-[a-z0-9-]+@servigt\\.test$/',$email)) throw new RuntimeException('Invalid smoke scope'); }
    $ids=App\\Models\\User::whereIn('email',$emails)->pluck('id');
    $providers=App\\Models\\Proveedor::whereIn('user_id',$ids)->pluck('id');
    $lotes=App\\Models\\PublicacionMaterial::whereIn('vendedor_id',$providers)->get();
    foreach($lotes as $lote) foreach($lote->imagenes as $img) { $prefix='/storage/materiales/'.$lote->id.'/'; if(str_starts_with($img->ruta,$prefix)) Illuminate\\Support\\Facades\\Storage::disk('public')->delete(substr($img->ruta,9)); }
    $reportes=App\\Models\\ReporteSeguridad::whereIn('reportante_id',$ids)->pluck('id');
    foreach(App\\Models\\EvidenciaReporteSeguridad::whereIn('reporte_id',$reportes)->get() as $e) { if(str_starts_with($e->ruta_privada,'seguridad/'.$e->reporte_id.'/')) Illuminate\\Support\\Facades\\Storage::disk('local')->delete($e->ruta_privada); }
    Illuminate\\Support\\Facades\\DB::transaction(function()use($ids){ Illuminate\\Support\\Facades\\DB::table('personal_access_tokens')->where('tokenable_type',App\\Models\\User::class)->whereIn('tokenable_id',$ids)->delete(); App\\Models\\User::whereIn('id',$ids)->delete(); });
    if(App\\Models\\User::whereIn('email',$emails)->exists()) throw new RuntimeException('Smoke cleanup failed'); echo 'Smoke S9 cleanup OK';`;
  const output = execFileSync('docker', ['exec', 'servigt_backend', 'php', '-r', php], { encoding: 'utf8' });
  expect(output).toContain('Smoke S9 cleanup OK');
}

test.describe.serial('Sprint 9 materiales con API real', () => {
  test.beforeAll(async () => {
    test.setTimeout(90_000); // Fixture de cuentas reales; puede recibir Retry-After de 60 s.
    // La limpieza dirigida usa el backend Docker local; no ejecutarla en un servidor remoto.
    if (!['localhost', '127.0.0.1'].includes(new URL(API).hostname)) throw new Error('Esta suite requiere el stack local de ServiGT.');
    api = await request.newContext({ extraHTTPHeaders: { Accept: 'application/json' } });
    const categories = await call('GET', '/categorias');
    expect(categories.status).toBe(200);
    const categoryId = categories.body.categorias[0].id;
    for (const [key, account] of Object.entries(accounts)) {
      let registered = await call('POST', '/register', null, account);
      if (registered.status === 429) {
        console.log(`Registro smoke: respetando Retry-After (${registered.retryAfter}s).`);
        await new Promise((resolve) => setTimeout(resolve, Math.min(registered.retryAfter, 60) * 1000));
        registered = await call('POST', '/register', null, account);
      }
      expect(registered.status).toBe(201);
      createdEmails.push(account.email);
      sessions[key] = registered.body;
      if (account.role === 'proveedor') {
        const profile = await call('POST', '/providers', key, { nombre: account.name, email: account.email, departamento: 'Guatemala', categoria_id: categoryId, nivel: 'experto', descripcion: 'Perfil temporal Smoke S9 para pruebas de integracion.' });
        expect(profile.status).toBe(201);
        sessions[key].proveedor = profile.body.proveedor;
      }
    }
    const created = await call('POST', '/servicios', 'client', { proveedor_id: sessions.seller.proveedor.id, descripcion: `Smoke S9 servicio ${stamp}`, direccion: 'Zona 10, Guatemala' });
    expect(created.status).toBe(201);
    serviceId = created.body.servicio.id;
    expect((await call('POST', `/servicios/${serviceId}/aceptar`, 'seller')).status).toBe(200);
    expect((await call('PUT', `/servicios/${serviceId}/estado`, 'seller', { estado: 'en_camino' })).status).toBe(200);
  });
  test.afterAll(async () => { try { if (sessions.admin) await call('POST', '/logout', 'admin'); cleanupLocalAccounts(); } finally { await api?.dispose(); } });

  test('cliente cancela desde en_camino y habilita publicacion al proveedor', async ({ page }) => {
    await login(page, 'client');
    await page.goto('/solicitudes');
    await (await visibleText(page, 'Cancelar servicio')).click();
    await (await visibleText(page, 'Confirmar cancelacion')).click();
    await expect(await visibleText(page, 'Cancelado')).toBeVisible();
    const detail = await call('GET', `/servicios/${serviceId}`, 'seller');
    expect(detail.body.servicio.puede_publicar_materiales).toBe(true);
  });
  test('vendedor publica desde Historial con archivo y precio Q0', async ({ page }) => {
    await login(page, 'seller');
    await (await visibleText(page, 'Historial')).click();
    await (await visibleText(page, 'Publicar materiales')).click();
    await page.waitForURL(`**/bolsa-materiales/publicar?servicioId=${serviceId}`);
    for (const [label, value] of Object.entries({ Titulo: titulo, Descripcion: 'Material sobrante de un servicio cancelado en camino.', Cantidad: '10', Unidad: 'metros', 'Precio referencial': '0', Departamento: 'Guatemala' })) await page.getByLabel(label, { exact: true }).fill(value);
    const chooser = page.waitForEvent('filechooser');
    await (await visibleText(page, 'Agregar imagenes')).click();
    await (await chooser).setFiles({ name: 'smoke-s9.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByText('smoke-s9.png')).toBeVisible();
    await (await visibleText(page, 'Publicar lote')).click();
    await page.waitForURL(/\/bolsa-materiales\/\d+$/);
    loteId = Number(new URL(page.url()).pathname.split('/').pop());
    const detail = await call('GET', `/materiales/${loteId}`, 'seller');
    expect(detail.status).toBe(200);
    expect(detail.body.publicacion.precio_referencial).toBe(0);
    expect(detail.body.publicacion.imagenes).toHaveLength(1);
    await expect(page.getByText(titulo, { exact: true }).filter({ visible: true })).toBeVisible();
    const loaded = await page.getByLabel(titulo, { exact: true }).evaluate((el) => { const image = el.tagName === 'IMG' ? el : el.querySelector('img'); return image?.complete && image.naturalWidth > 0; });
    expect(loaded).toBe(true);
  });
  test('edita sin adjuntos y conserva la imagen existente', async ({ page }) => {
    await login(page, 'seller');
    const before = await call('GET', `/materiales/${loteId}`, 'seller');
    await page.goto(`/bolsa-materiales/editar/${loteId}`);
    await page.getByLabel('Cantidad', { exact: true }).fill('8');
    await (await visibleText(page, 'Guardar cambios')).click();
    await page.waitForURL(`**/bolsa-materiales/${loteId}`);
    const after = await call('GET', `/materiales/${loteId}`, 'seller');
    expect(after.body.publicacion.cantidad).toBe(8);
    expect(after.body.publicacion.imagenes).toEqual(before.body.publicacion.imagenes);
  });
  test('comprador solicita una reserva idempotente desde el catalogo', async ({ page }) => {
    await login(page, 'buyer');
    await page.goto('/bolsa-materiales');
    await page.getByLabel('Buscar materiales').fill(titulo);
    await (await visibleText(page, 'Buscar')).click();
    await (await visibleText(page, 'Ver lote')).click();
    await expect(page.getByText('Abrir chat', { exact: true }).filter({ visible: true })).toHaveCount(0);
    await page.getByLabel('Mensaje inicial').fill('Smoke S9 me interesa el lote.');
    const posted = page.waitForRequest((req) => req.method() === 'POST' && req.url().endsWith(`/materiales/${loteId}/reservas`));
    await (await visibleText(page, 'Solicitar reserva')).click();
    const payload = (await posted).postDataJSON();
    await expect(page.getByText('Solicitud enviada correctamente.')).toBeVisible();
    const repeated = await call('POST', `/materiales/${loteId}/reservas`, 'buyer', payload);
    expect(repeated.status).toBe(200);
    reservaId = repeated.body.reserva.id;
    const received = await call('GET', `/materiales/${loteId}/reservas`, 'seller');
    expect(received.body.reservas).toHaveLength(1);
    await (await visibleText(page, 'Abrir chat')).click();
    await page.waitForURL(`**/chat?tipo=reserva&contexto=${reservaId}`);
    await expect(page.getByText('Smoke S9 me interesa el lote.')).toBeVisible();
  });
  test('vendedor acepta y ambas partes escriben en el contexto de la reserva', async ({ page }) => {
    await login(page, 'seller');
    await page.goto('/bolsa-materiales/mias');
    await (await visibleText(page, 'Ver solicitudes')).click();
    await (await visibleText(page, 'Aceptar')).click();
    await (await visibleText(page, 'Sí, aceptar')).click();
    await expect((await visibleText(page, 'Reservado'))).toBeVisible();
    await (await visibleText(page, 'Abrir chat')).click();
    await page.getByPlaceholder('Escribe un mensaje').fill('Smoke S9 lote reservado para ti.');
    const sent = page.waitForResponse((res) => res.request().method() === 'POST' && res.url().endsWith(`/mensajes/reservas/${reservaId}`));
    await page.getByLabel('Enviar mensaje').click();
    expect((await sent).status()).toBe(201);
    await expect(page.getByPlaceholder('Escribe un mensaje')).toHaveValue('');
    await expect(page.getByText('Smoke S9 lote reservado para ti.')).toBeVisible();
    const conversation = await call('GET', `/mensajes/reservas/${reservaId}`, 'buyer');
    expect(conversation.body.mensajes.map((msg) => msg.contenido)).toContain('Smoke S9 lote reservado para ti.');
    expect(conversation.body.contexto.id).toBe(reservaId);
  });
  test('vendedor marca vendido y el comprador no puede reservar nuevamente', async ({ page }) => {
    await login(page, 'seller');
    await page.goto('/bolsa-materiales/mias');
    await (await visibleText(page, 'Marcar vendido')).click();
    await (await visibleText(page, 'Sí, marcar vendido')).click();
    await expect((await visibleText(page, 'Vendido'))).toBeVisible();
    const detail = await call('GET', `/materiales/${loteId}`, 'buyer');
    expect(detail.body.publicacion.estado).toBe('vendido');
    expect((await call('POST', `/materiales/${loteId}/reservas`, 'buyer', { mensaje_inicial: 'Otra solicitud', idempotency_key: `otro-${stamp}` })).status).toBe(422);
  });
  test('permisos reales de cliente, tercero y anonimo', async () => {
    expect((await call('GET', '/materiales', 'client')).status).toBe(403);
    expect((await call('GET', '/materiales')).status).toBe(401);
    expect((await call('GET', `/mensajes/reservas/${reservaId}`, 'client')).status).toBe(403);
    expect((await call('GET', `/materiales/${loteId}/reservas`, 'buyer')).status).toBe(403);
  });
  test('dos servicios con la misma persona y una reserva mantienen no leidos aislados', async ({ page }) => {
    const second = await call('POST', '/servicios', 'client', { proveedor_id: sessions.seller.proveedor.id, descripcion: `Smoke S9 segundo servicio ${stamp}`, direccion: 'Zona 1, Guatemala' });
    expect(second.status).toBe(201);
    const secondId = second.body.servicio.id;
    for (const id of [serviceId, secondId]) expect((await call('POST', `/mensajes/servicios/${id}`, 'client', { contenido: `Smoke S9 mensaje servicio ${id}` })).status).toBe(201);
    expect((await call('POST', `/mensajes/reservas/${reservaId}`, 'buyer', { contenido: 'Smoke S9 mensaje exclusivo reserva' })).status).toBe(201);
    const before = await call('GET', '/mensajes/hilos', 'seller');
    const unread = (body, tipo, id) => body.hilos.find((hilo) => hilo.tipo === tipo && hilo.contexto_id === id)?.no_leidos;
    expect(unread(before.body, 'servicio', serviceId)).toBe(1);
    expect(unread(before.body, 'servicio', secondId)).toBe(1);
    expect(unread(before.body, 'reserva', reservaId)).toBe(1);
    expect((await call('GET', `/mensajes/servicios/${serviceId}`, 'seller')).status).toBe(200);
    const after = await call('GET', '/mensajes/hilos', 'seller');
    expect(unread(after.body, 'servicio', serviceId)).toBe(0);
    expect(unread(after.body, 'servicio', secondId)).toBe(1);
    expect(unread(after.body, 'reserva', reservaId)).toBe(1);
    await login(page, 'seller');
    await page.goto('/chat');
    await page.getByText(`Smoke S9 mensaje servicio ${serviceId}`, { exact: true }).filter({ visible: true }).click();
    await expect(page.getByText(`Servicio #${serviceId} · cancelado`, { exact: true }).filter({ visible: true })).toBeVisible();
    await page.getByText(`Smoke S9 mensaje servicio ${secondId}`, { exact: true }).filter({ visible: true }).click();
    await expect(page.getByText(`Servicio #${secondId} · pendiente`, { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText(`Smoke S9 mensaje servicio ${serviceId}`, { exact: true }).filter({ visible: true })).toHaveCount(1); // Solo el preview del otro hilo.
  });
  test('admin local conserva su panel pero no accede a materiales ni al chat privado', async () => {
    const credentials = JSON.parse(execFileSync('docker', ['exec', 'servigt_backend', 'php', '-r', 'echo json_encode(["email"=>getenv("ADMIN_EMAIL"),"password"=>getenv("ADMIN_PASSWORD")]);'], { encoding: 'utf8' }));
    const authenticated = await call('POST', '/login', null, credentials);
    expect(authenticated.status).toBe(200);
    sessions.admin = authenticated.body;
    try {
      expect((await call('GET', '/admin/stats', 'admin')).status).toBe(200);
      expect((await call('GET', '/materiales', 'admin')).status).toBe(403);
      expect((await call('GET', `/mensajes/reservas/${reservaId}`, 'admin')).status).toBe(403);
    } finally { await call('POST', '/logout', 'admin'); }
  });

  for (const actor of ['client', 'seller']) {
    test(`seguridad ${actor}: reporte, evidencia privada e interrupcion terminal`, async ({ page }) => {
      const created = await call('POST', '/servicios', 'client', { proveedor_id: sessions.seller.proveedor.id, descripcion: `Smoke S9 seguridad ${actor} ${stamp}`, direccion: 'Zona 10, Guatemala' });
      expect(created.status).toBe(201);
      const id = created.body.servicio.id;
      expect((await call('POST', `/servicios/${id}/aceptar`, 'seller')).status).toBe(200);
      expect((await call('POST', `/mensajes/servicios/${id}`, 'seller', { contenido: `Smoke S9 historial seguridad ${actor}` })).status).toBe(201);
      await login(page, actor);
      await page.goto(actor === 'client' ? '/solicitudes' : '/dashboard');
      await page.getByText('Centro de seguridad', { exact: true }).filter({ visible: true }).click();
      await page.waitForURL(`**/seguridad/servicios/${id}`);
      const privateDescription = `Smoke S9 detalle privado ${actor} ${stamp}`;
      await page.getByLabel('Descripcion del incidente').fill(privateDescription);
      const posted = page.waitForRequest((req) => req.method() === 'POST' && req.url().endsWith(`/servicios/${id}/seguridad/reportes`));
      await (await visibleText(page, 'Enviar reporte')).click();
      const payload = (await posted).postDataJSON();
      await expect(page.getByText('Reporte registrado.', { exact: true })).toBeVisible();
      const repeated = await call('POST', `/servicios/${id}/seguridad/reportes`, actor, payload);
      expect(repeated.status).toBe(200);
      const reportId = repeated.body.reporte.id;
      expect(repeated.body.servicio.estado).toBe('aceptado');
      const fileChooser = page.waitForEvent('filechooser');
      await (await visibleText(page, 'Adjuntar evidencia')).click();
      await (await fileChooser).setFiles({ name: `smoke-s9-privado-${actor}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF') });
      await expect(page.getByText('Evidencia adjuntada.')).toBeVisible();
      const reported = await call('GET', `/seguridad/reportes/${reportId}`, actor);
      expect(reported.status).toBe(200);
      expect(reported.body.reporte.evidencias).toHaveLength(1);
      expect(JSON.stringify(reported.body)).not.toMatch(/ruta_privada|storage\/app|sha256|nota_interna/);
      const evidenceId = reported.body.reporte.evidencias[0].id;
      const downloadPath = `${API}/seguridad/reportes/${reportId}/evidencias/${evidenceId}/descargar`;
      const authorized = await api.get(downloadPath, { headers: { Authorization: `Bearer ${sessions[actor].token}` } });
      expect(authorized.status()).toBe(200);
      expect(authorized.headers()['cache-control']).toContain('no-store');
      expect(authorized.headers()['x-content-type-options']).toBe('nosniff');
      const counterpart = actor === 'client' ? 'seller' : 'client';
      expect((await call('GET', `/seguridad/reportes/${reportId}`, counterpart)).status).toBe(403);
      expect((await api.get(downloadPath, { headers: { Authorization: `Bearer ${sessions[counterpart].token}` } })).status()).toBe(403);
      expect((await call('GET', `/seguridad/reportes/${reportId}`, 'buyer')).status).toBe(403);
      expect((await api.get(downloadPath)).status()).toBe(401);
      const privateRoute = execFileSync('docker', ['exec', 'servigt_backend', 'php', '-r', `require '/app/vendor/autoload.php'; $app=require '/app/bootstrap/app.php'; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); echo App\\Models\\EvidenciaReporteSeguridad::where('reporte_id',${reportId})->value('ruta_privada');`], { encoding: 'utf8' }).trim();
      expect(privateRoute.startsWith(`seguridad/${reportId}/`)).toBe(true);
      const publicAttempt = await api.get(`${API.replace('/api', '')}/storage/${privateRoute}`);
      expect([403, 404]).toContain(publicAttempt.status());
      expect((await publicAttempt.body()).subarray(0, 4).toString()).not.toBe('%PDF');
      await (await visibleText(page, 'Registrar otro incidente')).click();
      await page.getByLabel('Descripcion del incidente').fill(`Smoke S9 interrupcion privada ${actor} ${stamp}`);
      await (await visibleText(page, 'Interrumpir servicio')).click();
      const interruptedRequest = page.waitForRequest((req) => req.method() === 'POST' && req.url().endsWith(`/servicios/${id}/seguridad/interrumpir`));
      await (await visibleText(page, 'Confirmar interrupcion')).click();
      const interruptionPayload = (await interruptedRequest).postDataJSON();
      await expect(page.getByText('Interrumpido por seguridad', { exact: true })).toBeVisible();
      const interruption = await call('POST', `/servicios/${id}/seguridad/interrumpir`, actor, interruptionPayload);
      expect(interruption.status).toBe(200);
      expect(interruption.body.servicio.estado).toBe('interrumpido_seguridad');
      expect(interruption.body.servicio.codigo_inicio).toBeUndefined();
      expect((await call('PUT', `/servicios/${id}/estado`, 'seller', { estado: 'en_camino' })).status).toBe(422);
      expect((await call('POST', `/servicios/${id}/cancelar`, 'client')).status).toBe(422);
      expect((await call('POST', `/mensajes/servicios/${id}`, actor, { contenido: 'No debe enviarse' })).status).toBe(409);
      const notifications = await call('GET', '/notificaciones', counterpart);
      const securityNotifications = notifications.body.notificaciones.filter((n) => n.datos?.servicio_id === id && n.tipo.startsWith('servicio_') && n.tipo.includes('seguridad'));
      expect(securityNotifications.length).toBeGreaterThan(0);
      securityNotifications.forEach((n) => { expect(n.datos).toEqual({ servicio_id: id }); expect(JSON.stringify(n)).not.toContain(privateDescription); });
      await (await visibleText(page, 'Volver')).click();
      if (actor === 'seller') await page.getByText('Historial', { exact: true }).click();
      const serviceCard = page.getByText(`Smoke S9 seguridad ${actor} ${stamp}`, { exact: true }).locator('..');
      await expect(serviceCard.getByText('Interrumpido por seguridad', { exact: true })).toBeVisible();
      await expect(serviceCard.getByText('Centro de seguridad', { exact: true })).toHaveCount(0);
      await page.goto(`/seguridad/servicios/${id}`);
      await (await visibleText(page, 'Abrir chat del servicio')).click();
      await expect(page.getByText('Servicio interrumpido por seguridad. Chat de solo lectura.')).toBeVisible();
      await expect(page.getByText(`Smoke S9 historial seguridad ${actor}`, { exact: true })).toBeVisible();
      await expect(page.getByPlaceholder('Escribe un mensaje')).toHaveCount(0);
      sessions[`safety_${actor}`] = { reportId, interruptionId: interruption.body.reporte.id, serviceId: id, evidenceId };
    });
  }
  test('admin revisa evidencia y resuelve sin reabrir ni revelar notas privadas', async ({ page }) => {
    const credentials = JSON.parse(execFileSync('docker', ['exec', 'servigt_backend', 'php', '-r', 'echo json_encode(["email"=>getenv("ADMIN_EMAIL"),"password"=>getenv("ADMIN_PASSWORD")]);'], { encoding: 'utf8' }));
    const auth = await call('POST', '/login', null, credentials);
    expect(auth.status).toBe(200); sessions.admin = auth.body;
    await page.addInitScript(({ token, user }) => { localStorage.setItem('servigt_token', token); localStorage.setItem('servigt_user', JSON.stringify(user)); }, { token: auth.body.token, user: auth.body.user });
    await page.goto('/admin/reportes-seguridad');
    for (const actor of ['client', 'seller']) {
      const target = sessions[`safety_${actor}`];
      await page.getByTestId(`reporte-${target.reportId}`).getByText('Ver detalle', { exact: true }).click();
      const downloaded = page.waitForEvent('download');
      await page.getByLabel(`Descargar smoke-s9-privado-${actor}.pdf`).click();
      expect((await downloaded).suggestedFilename()).toContain('evidencia-');
      await page.getByText('Pasar a en revisión', { exact: true }).click();
      await page.getByTestId('nota-interna').fill(`Smoke S9 nota privada ${stamp}`);
      await page.getByText('Guardar cambio', { exact: true }).click();
      await expect(page.getByText('Marcar como resuelto', { exact: true })).toBeVisible();
      await page.getByText('Marcar como resuelto', { exact: true }).click();
      await page.getByText('Guardar cambio', { exact: true }).click();
      await expect(page.getByText('Este reporte está en un estado final y no admite más cambios.')).toBeVisible();
      const audited = await call('GET', `/admin/reportes-seguridad/${target.reportId}`, 'admin');
      expect(audited.body.reporte.historial.map((h) => h.estado_nuevo)).toEqual(['recibido', 'en_revision', 'resuelto']);
      const publicToAuthor = await call('GET', `/seguridad/reportes/${target.reportId}`, actor);
      expect(JSON.stringify(publicToAuthor.body)).not.toContain('nota privada');
      expect((await call('GET', `/servicios/${target.serviceId}`, actor)).body.servicio.estado).toBe('interrumpido_seguridad');
      expect((await call('POST', `/admin/reportes-seguridad/${target.reportId}/estado`, 'admin', { estado: 'en_revision' })).status).toBe(422);
      await page.getByText('Cerrar', { exact: true }).filter({ visible: true }).click();
    }
  });
  test('sincronizar el esquema conserva los datos y estados del recorrido integrado', () => {
    const php = `require '/app/vendor/autoload.php'; $app=require '/app/bootstrap/app.php'; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
      $rows=[]; foreach(['users','proveedores','servicios','publicaciones_material','publicaciones_material_imagenes','reservas_material','mensajes','reportes_seguridad','evidencias_reporte_seguridad','historial_reportes_seguridad'] as $table) {
        $rows[$table]=Illuminate\\Support\\Facades\\DB::table($table)->orderBy('id')->get()->toArray();
      } echo json_encode(['counts'=>array_map('count',$rows),'fingerprint'=>hash('sha256',json_encode($rows))]);`;
    const snapshot = () => JSON.parse(execFileSync('docker', ['exec', 'servigt_backend', 'php', '-r', php], { encoding: 'utf8' }));
    const before = snapshot();
    expect(before.counts.servicios).toBeGreaterThanOrEqual(4);
    expect(before.counts.publicaciones_material).toBeGreaterThan(0);
    expect(before.counts.reservas_material).toBeGreaterThan(0);
    expect(before.counts.evidencias_reporte_seguridad).toBeGreaterThan(0);
    for (let attempt = 0; attempt < 2; attempt++) {
      execFileSync('docker', ['exec', 'servigt_backend', 'php', '/app/docker/sync_schema.php'], { stdio: 'pipe' });
      expect(snapshot()).toEqual(before);
    }
  });
});
