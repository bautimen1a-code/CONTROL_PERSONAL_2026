// ============ server.js ============
// Ejecuta: npm install express
// Luego: node server.js
// Accede desde tu celular: https://[TU_IP]:5500

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 5500;
const HOST = '0.0.0.0';

// Certificados (genera con: openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes)
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

const express = require('express');
const app = express();

app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cache-Control', 'no-cache');
    next();
});

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const server = https.createServer(options, app);

server.listen(PORT, HOST, () => {
    const networkInterfaces = os.networkInterfaces();
    let ips = [];
    for (const iface of Object.values(networkInterfaces)) {
        for (const addr of iface) {
            if (addr.family === 'IPv4' && !addr.internal) {
                ips.push(addr.address);
            }
        }
    }
    console.log('\n✅ Servidor PWA HTTPS iniciado');
    console.log(`📍 Local: https://localhost:${PORT}`);
    ips.forEach(ip => {
        console.log(`📍 Red: https://${ip}:${PORT}`);
    });
    console.log('\n⚠️ Acepta el certificado self-signed en el celular\n');
});