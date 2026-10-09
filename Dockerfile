# Imagen base: Node LTS sobre Alpine (ligera)
FROM node:20-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos primero package.json y package-lock.json
# (para aprovechar el cache de Docker: si no cambian, no reinstala dependencias)
COPY package*.json ./

# Instalamos SOLO dependencias de producción
RUN npm install --omit=dev

# Copiamos el resto del código fuente
COPY . .

# Puerto en el que escucha la app dentro del contenedor
EXPOSE 80
EXPOSE 6061

# Variable de entorno para que server.js sepa en qué puerto escuchar
ENV PORT=80
ENV TCP_PORT=6061

# Comando para arrancar el servidor
CMD ["node", "src/server.js"]