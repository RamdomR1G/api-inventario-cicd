const net = require('net');

const client = new net.Socket();
const HOST = '3.85.17.95';
const PORT = 6061;

client.connect(PORT, HOST, () => {
  console.log('Conectado al servidor TCP');

  // Prueba 1: insertar un producto
  const insertMsg = '{insert:{"nombre":"Mouse tcp","descripcion":"Mouse inalambrico","precio":250,"stock":20,"categoria_id":1}}';
  console.log('\n--> Enviando:', insertMsg);
  client.write(insertMsg);
});

let step = 0;

client.on('data', (data) => {
  console.log('<-- Respuesta:', data.toString().trim());
  step++;

  if (step === 1) {
    // Después de la respuesta del insert, probamos el get
    const getMsg = '{get:}';
    console.log('\n--> Enviando:', getMsg);
    client.write(getMsg);
  } else if (step === 2) {
    client.end();
  }
});

client.on('close', () => {
  console.log('\nConexión cerrada');
});

client.on('error', (err) => {
  console.error('Error:', err.message);
});