const { execFileSync } = require('node:child_process');

function requireLocalStack(apiUrl) {
  if (!['localhost', '127.0.0.1'].includes(new URL(apiUrl).hostname)) {
    throw new Error('Las pruebas con limpieza dirigida requieren Docker local.');
  }
}

function cleanupAccounts(emails) {
  if (!emails.length) return;
  if (emails.some((email) => !/^smoke-[a-z0-9-]+@servigt\.test$/.test(email))) {
    throw new Error('Correo fuera del alcance smoke.');
  }
  const encoded = Buffer.from(JSON.stringify(emails)).toString('base64');
  const php = `require '/app/vendor/autoload.php'; $app=require '/app/bootstrap/app.php'; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
    $emails=json_decode(base64_decode('${encoded}'),true);
    Illuminate\\Support\\Facades\\DB::transaction(function()use($emails){
      $ids=App\\Models\\User::whereIn('email',$emails)->pluck('id');
      Illuminate\\Support\\Facades\\DB::table('personal_access_tokens')->where('tokenable_type',App\\Models\\User::class)->whereIn('tokenable_id',$ids)->delete();
      App\\Models\\User::whereIn('id',$ids)->delete();
    });
    if(App\\Models\\User::whereIn('email',$emails)->exists()) throw new RuntimeException('Smoke cleanup failed');`;
  execFileSync('docker', ['exec', 'servigt_backend', 'php', '-r', php], { stdio: 'pipe' });
}

async function respectRetryAfter(response) {
  if (response.status() !== 429) return false;
  const seconds = Number(response.headers()['retry-after']);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 60) {
    throw new Error('Retry-After inesperado; no desactivar el limitador.');
  }
  await new Promise((resolve) => setTimeout(resolve, (seconds + 1) * 1000));
  return true;
}

module.exports = { requireLocalStack, cleanupAccounts, respectRetryAfter };
