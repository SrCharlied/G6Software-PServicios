<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedidos', function (Blueprint $table) {
            $table->id();

            $table->foreignId('cliente_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->foreignId('categoria_id')
                ->constrained('categorias')
                ->cascadeOnDelete();

            $table->text('descripcion');

            $table->string('direccion', 255);

            $table->enum('urgencia', ['baja', 'media', 'alta']);

            $table->enum('estado', ['abierto', 'adjudicado', 'expirado', 'cerrado', 'cancelado'])
                ->default('abierto');

            $table->timestamp('fecha_expiracion');

            $table->timestamps();

            $table->index('estado');
            $table->index('fecha_expiracion');
            $table->index('categoria_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedidos');
    }
};
