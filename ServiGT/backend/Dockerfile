FROM php:8.3-cli

# Dependencias del sistema
RUN apt-get update && apt-get install -y \
    libpq-dev zip unzip git curl libzip-dev \
    && docker-php-ext-install pdo pdo_pgsql zip \
    && rm -rf /var/lib/apt/lists/*

# Instalar Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Crear proyecto Laravel
RUN composer create-project laravel/laravel . --no-interaction --prefer-dist

# Instalar Sanctum (autenticacion por tokens)
RUN composer require laravel/sanctum --no-interaction --no-progress --quiet

# Copiar archivos personalizados sobre el proyecto Laravel
COPY routes/api.php /app/routes/api.php
COPY routes/console.php /app/routes/console.php
COPY app/Http/Controllers/ /app/app/Http/Controllers/
COPY app/Http/Middleware/ /app/app/Http/Middleware/
COPY app/Http/Requests/ /app/app/Http/Requests/
COPY app/Http/Resources/ /app/app/Http/Resources/
COPY app/Console/Commands/ /app/app/Console/Commands/
COPY app/Models/ /app/app/Models/
COPY app/Observers/ /app/app/Observers/
COPY app/Providers/ /app/app/Providers/
COPY app/Traits/ /app/app/Traits/
COPY config/cors.php /app/config/cors.php
COPY bootstrap/app.php /app/bootstrap/app.php
COPY lang/ /app/lang/
COPY tests/ /app/tests/
COPY docker/entrypoint.sh /app/docker/entrypoint.sh
COPY docker/sync_schema.php /app/docker/sync_schema.php

# Infraestructura de pruebas automatizadas (PHPUnit)
# migraciones y factories solo se usan en el entorno de testing (SQLite en memoria);
# el esquema de produccion lo crea database/init.sql en PostgreSQL.
COPY database/migrations/ /app/database/migrations/
COPY database/factories/ /app/database/factories/
COPY tests/ /app/tests/
COPY phpunit.xml /app/phpunit.xml

RUN sed -i 's/\r$//' /app/docker/entrypoint.sh \
    && chmod +x /app/docker/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/docker/entrypoint.sh"]
