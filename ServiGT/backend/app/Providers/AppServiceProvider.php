<?php

namespace App\Providers;

use App\Models\Calificacion;
use App\Observers\CalificacionObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Calificacion::observe(CalificacionObserver::class);

        RateLimiter::for('login', function (Request $request) {
            $email = Str::lower((string) $request->input('email', 'sin-email'));

            return Limit::perMinute(5)->by($email.'|'.$request->ip());
        });

        RateLimiter::for('register', fn (Request $request) => Limit::perMinute(3)->by($request->ip()));

        RateLimiter::for('messages', fn (Request $request) => Limit::perMinute(30)->by($this->rateKey($request)));

        RateLimiter::for('uploads', fn (Request $request) => Limit::perMinute(10)->by($this->rateKey($request)));

        RateLimiter::for('purchase', fn (Request $request) => Limit::perMinute(6)->by($this->rateKey($request)));

        RateLimiter::for('premium', fn (Request $request) => Limit::perMinute(5)->by($this->rateKey($request)));

        // Publicar un pedido notifica a todos los proveedores de la categoria,
        // asi que sin limite un solo cliente puede generar un aluvion de
        // notificaciones (matriz OWASP, fila A06/API6). El limite es holgado:
        // publicar 10 pedidos en un minuto no es un uso legitimo.
        RateLimiter::for('pedidos', fn (Request $request) => Limit::perMinute(10)->by($this->rateKey($request)));
    }

    private function rateKey(Request $request): string
    {
        return $request->user()
            ? 'user:'.$request->user()->id
            : 'ip:'.$request->ip();
    }
}
