# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Etapa base: dependencias reproducibles desde el lockfile (task 1.2).
#
# `npm install` reescribe el arbol con lo que este publicado en ese momento, y
# lo hace en silencio cuando `package.json` y el lockfile divergen. `npm ci`
# falla si divergen y borra `node_modules` antes de instalar, de modo que la
# imagen siempre reproduce el arbol versionado en el repositorio.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:18 AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ─────────────────────────────────────────────────────────────────────────────
# Etapa de desarrollo: Metro con hot reload. Es el target por defecto para que
# `docker compose up frontend` siga comportandose exactamente igual que antes.
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS dev

# URL publica del backend (inyectada por docker-compose como build arg).
# Expo solo expone al bundle web las variables con prefijo EXPO_PUBLIC_*.
ARG EXPO_PUBLIC_API_URL=http://localhost:8080/api
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}

COPY . .

EXPOSE 8081

ENV CI=1
ENV REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0

CMD ["npx", "expo", "start", "--web", "--port", "8081"]

# ─────────────────────────────────────────────────────────────────────────────
# Etapa de build productivo: export estatico con `expo export`.
#
# La URL del API se deja RELATIVA (`/api`) a proposito: Nginx sirve el bundle y
# hace proxy del API en el mismo origen, asi que el navegador no dispara ningun
# preflight de CORS y la configuracion de origenes de la task 4.1 puede quedar
# vacia en produccion. Con una URL absoluta a otro host volveriamos a depender
# de CORS para el funcionamiento normal de la aplicacion.
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS build

ARG EXPO_PUBLIC_API_URL=/api
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
ENV CI=1

COPY . .

RUN npx expo export --platform web

# ─────────────────────────────────────────────────────────────────────────────
# Etapa productiva: Nginx sirviendo el export estatico.
#
# Metro no es un servidor de produccion: sirve el bundle sin comprimir, sin
# cache y con el dev server expuesto. Aqui solo viajan archivos ya compilados.
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Se prueba contra 127.0.0.1 y no contra `localhost`: dentro de la imagen
# `localhost` resuelve primero a ::1, y Nginx solo escucha en IPv4 (`listen 80`),
# asi que el healthcheck fallaba con "connection refused" con el sitio sirviendo
# perfectamente.
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
