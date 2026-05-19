<?php

namespace App\Providers;

use App\Models\Calificacion;
use App\Observers\CalificacionObserver;
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
    }
}
