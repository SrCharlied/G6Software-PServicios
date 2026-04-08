FROM node:18

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del proyecto
COPY . .

# Exponer puerto de Expo
EXPOSE 8081

# Ejecutar Expo
CMD ["npx", "expo", "start", "--tunnel"]