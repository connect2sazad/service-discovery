
import 'dotenv/config';
import express from 'express';

console.log('Starting application...');

const service = express();

service.use(express.json());

const PORT = process.env.PORT || 3000;
const NAME = process.env.NAME || 'service-template';

service.get('/', (req, res) => {
    res.status(200).json({
        health: 'Healthy',
        status: 'up',
        name: `service-${NAME}`
    });
});

console.log('Starting HTTP server...');

const server = service.listen(PORT, () => {
    console.log('Server started successfully!');
    console.log(`Service Name: service-${NAME}`);
    console.log(`Port: ${PORT}`);
    console.log(`Full URL: http://localhost:${PORT}`);
});

server.on('error', (error) => {
    console.error('Server Error:', error);
    process.exit(1);
});

console.log('Application initialization completed.');
