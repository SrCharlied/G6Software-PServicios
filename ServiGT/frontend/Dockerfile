FROM node:18

WORKDIR /app

# URL publica del backend (inyectada por docker-compose como build arg).
# Expo solo expone al bundle web las variables con prefijo EXPO_PUBLIC_*.
ARG EXPO_PUBLIC_API_URL=http://localhost:8080/api
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}

# Copiar package.json e instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el resto del proyecto
COPY . .

EXPOSE 8081

ENV CI=1
ENV REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0

CMD ["npx", "expo", "start", "--web", "--port", "8081"]
