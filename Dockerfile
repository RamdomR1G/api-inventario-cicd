# Imagen base: Node LTS sobre Alpine (ligera)
FROM node:20-alpine

# Modo produccion
ENV NODE_ENV=production

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos primero package.json y package-lock.json
# (para aprovechar el cache de Docker: si no cambian, no reinstala dependencias)
COPY package*.json ./

# Instalacion reproducible, SOLO dependencias de produccion
RUN npm ci --omit=dev

# Copiamos el resto del codigo fuente
COPY . .

# Puertos: HTTP (API REST) y TCP (socket)
EXPOSE 80
EXPOSE 6061

# Puertos en los que escucha la app
ENV PORT=80
ENV TCP_PORT=6061

# Verificacion de salud usando el endpoint /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/api/health || exit 1

# Comando para arrancar el servidor
CMD ["node", "src/server.js"]