// E2E de HU 4.1 contra el stack real de docker compose (frontend :8086, backend
// :8085): comprobante informativo de compras de créditos. Las compras se siembran
// directo en la base (el driver local puede ser Stripe) con cuentas "smoke-"
// que se limpian al terminar.
const { test, expect, request } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { requireLocalStack, cleanupAccounts, respectRetryAfter } = require('./helpers/local-smoke');

const API_URL = process.env.E2E_API_URL || 'http://localhost:8085/api';
test.use({ trace: 'off' });

const stamp = Date.now();
const password = 'Password123!';
const cuenta = (key) => ({
  name: `Smoke Comprobante ${key} ${stamp}`,
  email: `smoke-comprobante-${key}-${stamp}@servigt.test`,
  password,
  password_confirmation: password,
  role: 'proveedor',
});
const accounts = { dueno: cuenta('dueno'), ajeno: cuenta('ajeno') };
const sessions = {};
let api;
let nuevaId;
let historicaId;
let folioNuevo;

async function call(method, path, key, data) {
  const response = await api.fetch(`${API_URL}${path}`, {
    method,
    headers: key ? { Authorization: `Bearer ${sessions[key].token}` } : undefined,
    data,
  });
  return { response, body: await response.json() };
}

async function registrar(key, categoriaId) {
  let { response, body } = await call('POST', '/register', null, accounts[key]);
  if (await respectRetryAfter(response)) ({ response, body } = await call('POST', '/register', null, accounts[key]));
  expect(response.status(), JSON.stringify(body)).toBe(201);
  sessions[key] = body;
  const perfil = await call('POST', '/providers', key, {
    nombre: accounts[key].name,
    telefono: '55550101',
    email: accounts[key].email,
    departamento: 'Guatemala',
    categoria_id: categoriaId,
    nivel: 'experto',
    descripcion: 'Perfil temporal smoke para pruebas de comprobantes.',
  });
  expect(perfil.response.status(), JSON.stringify(perfil.body)).toBe(201);
  sessions[key].proveedor = perfil.body.proveedor;
}

// Una compra completada con snapshot (nueva) y otra completada sin snapshot (histórica).
function sembrarCompras(proveedorId) {
  const php = `require '/app/vendor/autoload.php'; $app=require '/app/bootstrap/app.php'; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
    $p=App\\Models\\Proveedor::findOrFail(${proveedorId}); $paq=App\\Models\\PaqueteCredito::where('nombre','Impulso')->firstOrFail();
    $svc=app(App\\Services\\ComprobanteCompraService::class); $out=[];
    foreach(['nueva','historica'] as $tipo){
      $ref='SGT-'.str_pad((string)random_int(0,9999999999),10,'0',STR_PAD_LEFT); $ahora=now();
      $datos=['proveedor_id'=>$p->id,'paquete_id'=>$paq->id,'monto_gtq'=>$paq->precio_gtq,'creditos_otorgados'=>30,'estado'=>'completada','metodo_pago'=>'simulado','referencia'=>$ref,'idempotency_key'=>'smoke-'.$tipo.'-'.$ref,'completada_at'=>$ahora];
      if($tipo==='nueva'){ $datos['comprobante_snapshot']=$svc->construir($p,$paq,$ref,'simulado',$paq->precio_gtq,30,$ahora); $datos['comprobante_emitido_at']=$ahora; }
      $c=App\\Models\\CompraCredito::create($datos);
      App\\Models\\TransaccionCredito::create(['proveedor_id'=>$p->id,'tipo'=>'compra','monto'=>30,'motivo'=>'Compra de creditos: Impulso '.$tipo,'referencia_id'=>$c->id]);
      $out[$tipo]=['id'=>$c->id,'folio'=>$ref];
    }
    echo json_encode($out);`;
  return JSON.parse(execFileSync('docker', ['exec', 'servigt_backend', 'php', '-r', php], { encoding: 'utf8' }));
}

async function entrar(page, key) {
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('servigt_token', token);
    localStorage.setItem('servigt_user', JSON.stringify(user));
  }, { token: sessions[key].token, user: sessions[key].user });
}

async function sinDesborde(page) {
  const dim = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dim.scroll).toBeLessThanOrEqual(dim.client + 1);
}

test.describe.serial('Comprobantes de compras de créditos (HU 4.1)', () => {
  test.beforeAll(async () => {
    test.setTimeout(150_000);
    requireLocalStack(API_URL);
    api = await request.newContext({ extraHTTPHeaders: { Accept: 'application/json' } });
    const categorias = await call('GET', '/categorias');
    const categoriaId = categorias.body.categorias[0].id;
    await registrar('dueno', categoriaId);
    await registrar('ajeno', categoriaId);
    const compras = sembrarCompras(sessions.dueno.proveedor.id);
    nuevaId = compras.nueva.id;
    folioNuevo = compras.nueva.folio;
    historicaId = compras.historica.id;
  });

  test.afterAll(async () => {
    try { cleanupAccounts(Object.values(accounts).map((a) => a.email)); } finally { await api?.dispose(); }
  });

  test('API: propietario ve su comprobante; ajeno e histórica responden 404', async () => {
    const propio = await call('GET', `/creditos/compras/${nuevaId}/comprobante`, 'dueno');
    expect(propio.response.status()).toBe(200);
    expect(propio.body.comprobante.folio).toBe(folioNuevo);
    expect(propio.body.comprobante.sin_validez_fiscal).toBe(true);

    // Consultar de nuevo devuelve exactamente lo mismo.
    const repetido = await call('GET', `/creditos/compras/${nuevaId}/comprobante`, 'dueno');
    expect(repetido.body.comprobante).toEqual(propio.body.comprobante);

    expect((await call('GET', `/creditos/compras/${nuevaId}/comprobante`, 'ajeno')).response.status()).toBe(404);
    expect((await call('GET', `/creditos/compras/${historicaId}/comprobante`, 'dueno')).response.status()).toBe(404);
    expect((await call('GET', `/creditos/compras/${nuevaId}/comprobante`, null)).response.status()).toBe(401);
  });

  for (const viewport of [
    { name: '1440', width: 1440, height: 900 },
    { name: '1024', width: 1024, height: 768 },
    { name: '390', width: 390, height: 844 },
  ]) {
    test(`historial y comprobante en ${viewport.name}px`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await entrar(page, 'dueno');
      await page.goto('/creditos');

      // Solo la compra nueva ofrece comprobante; la histórica no.
      await expect(page.getByText('Compra de creditos: Impulso historica')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Ver comprobante', { exact: true })).toHaveCount(1);
      await sinDesborde(page);

      await page.getByText('Ver comprobante', { exact: true }).click();
      await page.waitForURL(`**/comprobante?compra_id=${nuevaId}`);
      await expect(page.getByText(`Folio ${folioNuevo}`)).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/No tiene validez fiscal/)).toBeVisible();
      await expect(page.getByText('Imprimir comprobante', { exact: true })).toBeVisible();
      await expect(page.getByText(/pdf|factura|fel/i)).toHaveCount(0);
      await sinDesborde(page);
      await page.screenshot({ path: `test-results/comprobante/comprobante-${viewport.name}.png` });
    });
  }

  test('imprimir abre la impresión con el documento del comprobante', async ({ page }) => {
    // Chromium sin interfaz no imprime: se intercepta print() del iframe oculto.
    await page.addInitScript(() => {
      const original = Node.prototype.appendChild;
      Node.prototype.appendChild = function appendChild(node) {
        const result = original.call(this, node);
        if (node && node.tagName === 'IFRAME' && node.contentWindow) {
          node.contentWindow.print = () => { window.__impreso = node.contentWindow.document.body.innerText; };
        }
        return result;
      };
    });
    await entrar(page, 'dueno');
    await page.goto(`/comprobante?compra_id=${nuevaId}`);
    await page.getByText('Imprimir comprobante', { exact: true }).click();

    await expect.poll(() => page.evaluate(() => window.__impreso || '')).toContain(folioNuevo);
    expect(await page.evaluate(() => window.__impreso)).toContain('No tiene validez fiscal');
  });

  test('un comprobante ajeno o histórico muestra error y no datos', async ({ page }) => {
    await entrar(page, 'dueno');
    await page.goto(`/comprobante?compra_id=${historicaId}`);

    await expect(page.getByText('No se pudo mostrar el comprobante')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Esta compra no tiene comprobante disponible.')).toBeVisible();
    await expect(page.getByText('Imprimir comprobante', { exact: true })).toHaveCount(0);
  });
});
