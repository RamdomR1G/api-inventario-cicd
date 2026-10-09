const path = require('path');

const TEST_DB_PATH = path.join(__dirname, 'test-inventario.db');
process.env.DB_PATH = TEST_DB_PATH;

const fs = require('fs');
const request = require('supertest');
const app = require('../src/server');
const { closeDb } = require('../src/db');

let categoriaId;
let productoId;

beforeAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

afterAll(async () => {
  await closeDb();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

describe('GET /', () => {
  test('responde 200 con el schema estándar {statusCode, data}', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('mensaje');
  });
});

describe('POST /categorias', () => {
  test('crea una categoría correctamente (201)', async () => {
    const res = await request(app)
      .post('/categorias')
      .send({ nombre: 'Electronica' });

    expect(res.status).toBe(201);
    expect(res.body.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.nombre).toBe('Electronica');

    categoriaId = res.body.data.id;
  });

  test('ESCENARIO DE FALLO: nombre duplicado responde error (UNIQUE constraint)', async () => {
    const res = await request(app)
      .post('/categorias')
      .send({ nombre: 'Electronica' }); 

    expect(res.status).toBe(500);
    expect(res.body.data.error).toMatch(/UNIQUE/i);
  });

  test('ESCENARIO DE FALLO: usuario olvida enviar "nombre" (400)', async () => {
    const res = await request(app)
      .post('/categorias')
      .send({}); 

    expect(res.status).toBe(400);
    expect(res.body.statusCode).toBe(400);
  });
});

describe('GET /categorias', () => {
  test('devuelve un arreglo con al menos la categoría creada', async () => {
    const res = await request(app).get('/categorias');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('POST /productos', () => {
  test('crea un producto correctamente (201)', async () => {
    const res = await request(app)
      .post('/productos')
      .send({
        nombre: 'Laptop',
        descripcion: 'Laptop 15 pulgadas',
        precio: 15000,
        stock: 5,
        categoria_id: categoriaId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.nombre).toBe('Laptop');

    productoId = res.body.data.id;
  });

  test('ESCENARIO DE FALLO: usuario no envía "precio" (400)', async () => {
    const res = await request(app)
      .post('/productos')
      .send({ nombre: 'Producto sin precio' });

    expect(res.status).toBe(400);
    expect(res.body.statusCode).toBe(400);
  });

  test('ESCENARIO DE FALLO: categoria_id que no existe (violación de llave foránea)', async () => {
    const res = await request(app)
      .post('/productos')
      .send({
        nombre: 'Producto huerfano',
        precio: 100,
        categoria_id: 99999,
      });

    expect(res.status).toBe(500);
    expect(res.body.data.error).toMatch(/FOREIGN KEY/i);
  });
});

describe('GET /productos', () => {
  test('devuelve un arreglo con al menos el producto creado', async () => {
    const res = await request(app).get('/productos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('categoria_nombre');
  });
});

describe('GET /productos/:id', () => {
  test('devuelve el producto correcto (200)', async () => {
    const res = await request(app).get(`/productos/${productoId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(productoId);
  });

  test('ESCENARIO DE FALLO: usuario consulta un id que no existe (404)', async () => {
    const res = await request(app).get('/productos/999999');
    expect(res.status).toBe(404);
    expect(res.body.statusCode).toBe(404);
  });
});

describe('PUT /productos/:id', () => {
  test('actualiza el producto correctamente (200)', async () => {
    const res = await request(app)
      .put(`/productos/${productoId}`)
      .send({ precio: 13999, stock: 8 });

    expect(res.status).toBe(200);
    expect(res.body.data.precio).toBe(13999);
    expect(res.body.data.stock).toBe(8);
  });

  test('ESCENARIO DE FALLO: intenta actualizar un id inexistente (404)', async () => {
    const res = await request(app)
      .put('/productos/999999')
      .send({ precio: 100 });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /productos/:id', () => {
  test('elimina el producto correctamente (200)', async () => {
    const res = await request(app).delete(`/productos/${productoId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.mensaje).toMatch(/eliminado/i);
  });

  test('ESCENARIO DE FALLO: intenta eliminar el mismo id otra vez (404, ya no existe)', async () => {
    const res = await request(app).delete(`/productos/${productoId}`);
    expect(res.status).toBe(404);
  });
});