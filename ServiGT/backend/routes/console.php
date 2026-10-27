<?php

use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Console Schedules — ServiGT
|--------------------------------------------------------------------------
|
| Registrar el cron del sistema operativo una sola vez:
|   * * * * * php /var/www/html/artisan schedule:run >> /dev/null 2>&1
|
*/

Schedule::command('pedidos:expirar')->hourly();
// Reintento de borrado de archivos de cuentas anonimizadas (HU 3.1).
Schedule::command('cuentas:limpiar-archivos')->hourly();
