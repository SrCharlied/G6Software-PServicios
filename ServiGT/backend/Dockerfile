FROM php:8.2-cli

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpq-dev \
    curl \
    && docker-php-ext-install pdo pdo_pgsql

# Instalar Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Crear directorio de trabajo
WORKDIR /var/www

# Copiar archivos
COPY . .

# Instalar dependencias de Laravel
RUN composer install

# Exponer puerto
EXPOSE 8000

# Comando para correr Laravel
CMD php artisan serve --host=0.0.0.0 --port=8000