# API de Inventario - Pipeline CI/CD

API REST (Node.js + Express + SQLite) con un pipeline automatizado de CI/CD:
pruebas con cobertura en GitHub Actions, publicación de la imagen en Docker Hub
y despliegue automático en una instancia AWS EC2.

## Arquitectura

```
git push (main)
     |
     v
GitHub Actions
  1. test   -> npm ci + Jest/Supertest + cobertura (umbral 70%)
  2. docker -> build de la imagen y push a Docker Hub (:latest y :<sha del commit>)
  3. deploy -> SSH a la EC2: pull de la imagen, stop/rm del contenedor viejo, run en el puerto 80
     |
     v
AWS EC2 (Ubuntu + Docker)  ->  http://<IP_EC2>/api/health
```

Cada job depende del anterior: si fallan las pruebas, no se publica ni se despliega.
La imagen desplegada usa el hash del commit como tag, para que el servidor
ejecute exactamente la versión que pasó las pruebas.

## Tecnologías

- Node.js 20, Express, SQLite (sqlite3 + sqlite)
- Jest + Supertest (pruebas y cobertura)
- Docker (imagen basada en node:20-alpine, con HEALTHCHECK)
- GitHub Actions, Docker Hub y AWS EC2 (Ubuntu Server)

## Endpoints

Todas las respuestas usan el formato `{ "statusCode": <número>, "data": <contenido> }`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servicio |
| GET | `/categorias` | Listar categorías |
| POST | `/categorias` | Crear categoría |
| PUT | `/categorias/:id` | Actualizar categoría |
| DELETE | `/categorias/:id` | Eliminar categoría |
| GET | `/productos` | Listar productos |
| GET | `/productos/:id` | Obtener un producto |
| POST | `/productos` | Crear producto |
| PUT | `/productos/:id` | Actualizar producto |
| DELETE | `/productos/:id` | Eliminar producto |
| POST | `/backup` | Generar respaldo de la base de datos |
| DELETE | `/reset` | Vaciar la base de datos |

Rutas auxiliares: `GET /` (mensaje de bienvenida) y `DELETE /productos` (vaciar la tabla de productos).

Ejemplo de cuerpo para `POST /productos`:

```json
{ "nombre": "Laptop", "descripcion": "Laptop 15 pulgadas", "precio": 15000, "stock": 5, "categoria_id": 1 }
```

### Socket TCP (puerto 6061)

El mismo contenedor expone un servidor TCP con el formato:

```
{insert:<element>}   -> inserta un producto (element = JSON del POST /productos)
{get:<id>}           -> obtiene un producto por id
```

## Ejecución local

Requisitos: Node.js 20 o superior, Docker.

```bash
npm ci
```

Levantar la API (en Windows CMD):

```bash
set PORT=3000 && node src/server.js
```

Probar:

```bash
curl http://localhost:3000/api/health
```

## Pruebas y cobertura

```bash
npm test
npm run test:coverage
```

La configuración de Jest exige un mínimo de 70% de cobertura global
(statements, branches, functions y lines); si no se alcanza, el pipeline falla.
El archivo `src/tcpServer.js` se excluye del cálculo porque el socket TCP
no se prueba con Supertest. Las pruebas usan una base de datos SQLite
temporal, aislada de la real.

## Docker

```bash
docker build -t api-inventario:local .
docker run -d -p 8080:80 -p 6061:6061 --name api-local api-inventario:local
curl http://localhost:8080/api/health
```

El `.dockerignore` excluye `node_modules`, `.env`, logs, bases de datos locales,
llaves `.pem`, pruebas y el directorio `.github`.

## Configuración del pipeline

### 1. Docker Hub

Crear un Personal Access Token (Account settings > Personal access tokens)
con permisos Read & Write.

### 2. Instancia EC2

- Ubuntu Server con Docker instalado y el usuario `ubuntu` en el grupo `docker`.
- Security Group con el puerto 22 (SSH) y el 80 (HTTP) abiertos; el 6061 es opcional (socket TCP).
- Una llave `.pem` para acceder por SSH.

### 3. GitHub Secrets

En Settings > Secrets and variables > Actions se crean estos secretos
(sus valores nunca se guardan en el repositorio):

| Secreto | Contenido |
|---------|-----------|
| `DOCKERHUB_USERNAME` | Usuario de Docker Hub |
| `DOCKERHUB_TOKEN` | Personal Access Token de Docker Hub |
| `EC2_HOST` | IP pública de la instancia EC2 |
| `EC2_USER` | Usuario SSH (`ubuntu`) |
| `EC2_SSH_KEY` | Contenido completo del archivo `.pem` |

### 4. Despliegue

Cada `git push` a `main` ejecuta `.github/workflows/main.yml`. Al terminar en verde:

```bash
curl http://<IP_EC2>/api/health
```

## Limitaciones conocidas

- La base de datos SQLite vive dentro del contenedor. Cada despliegue crea un
  contenedor nuevo, por lo que los datos se reinician. Para persistirlos se
  podría montar un volumen de Docker.
- Si la IP de la EC2 cambia (al detener y volver a iniciar la instancia),
  hay que actualizar el secreto `EC2_HOST`. Una Elastic IP evita este problema.