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

# Copiar archivos personalizados sobre el proyecto Laravel
COPY routes/api.php /app/routes/api.php
COPY app/Http/Controllers/ /app/app/Http/Controllers/
COPY app/Models/ /app/app/Models/
COPY config/cors.php /app/config/cors.php
COPY bootstrap/app.php /app/bootstrap/app.php
COPY docker/entrypoint.sh /app/docker/entrypoint.sh

RUN sed -i 's/\r$//' /app/docker/entrypoint.sh \
    && chmod +x /app/docker/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/docker/entrypoint.sh"]
