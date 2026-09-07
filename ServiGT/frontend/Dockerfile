FROM node:18 AS frontend_base

WORKDIR /app

# URL publica del backend (inyectada por docker-compose como build arg).
# Expo solo expone al bundle web las variables con prefijo EXPO_PUBLIC_*.
ARG EXPO_PUBLIC_API_URL=http://localhost:8080/api
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
ENV EXPO_NO_TELEMETRY=1

# Copiar package.json e instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el resto del proyecto
COPY . .

FROM frontend_base AS frontend_dev

EXPOSE 8081

ENV CI=1
ENV REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0

CMD ["npx", "expo", "start", "--web", "--port", "8081"]

FROM frontend_base AS frontend_build

ARG EXPO_PUBLIC_API_URL=/api
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
RUN npm run build:web

FROM nginx:1.27-alpine AS frontend_prod

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend_build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
