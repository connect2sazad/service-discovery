
import 'dotenv/config';
import express from 'express';

console.log('Starting application...');

const service = express();

service.use(express.json());

const PORT = Number(process.env.PORT || 3000);
const NAME = process.env.NAME || 'service-template';

const CONSUL_HOST = process.env.CONSUL_HOST || 'localhost';
const CONSUL_PORT = process.env.CONSUL_PORT || 8500;

const SERVICE_NAME = `service-${NAME}`;
const SERVICE_ID = `${SERVICE_NAME}-${PORT}`;

const CONSUL_URL = `http://${CONSUL_HOST}:${CONSUL_PORT}`;
const SERVICE_ADDRESS = process.env.SERVICE_ADDRESS || '127.0.0.1';

service.get('/', (req, res) => {
    res.status(200).json({
        health: 'Healthy',
        status: 'up',
        name: SERVICE_NAME
    });
});

service.get('/info', (req, res) => {
    res.status(200).json({
        current_timestamp: Date.now(),
        name: SERVICE_NAME
    });
});

// Register service with Consul
async function registerWithConsul() {
    const registration = {
        ID: SERVICE_ID,
        Name: SERVICE_NAME,
        Address: SERVICE_ADDRESS,
        Port: PORT,
        Tags: ['express', 'nodejs'],
        Check: {
            HTTP: `http://${SERVICE_ADDRESS}:${PORT}/`,
            Interval: '10s',
            Timeout: '5s',
            DeregisterCriticalServiceAfter: '1m'
        }
    };

    const response = await fetch(
        `${CONSUL_URL}/v1/agent/service/register`,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registration)
        }
    );

    if (!response.ok) {
        throw new Error(`Consul registration failed: ${response.status}`);
    }

    console.log(`Registered ${SERVICE_NAME} with Consul`);
}

// Deregister service from Consul
async function deregisterFromConsul() {
    try {
        await fetch(
            `${CONSUL_URL}/v1/agent/service/deregister/${SERVICE_ID}`,
            { method: 'PUT' }
        );

        console.log(`Deregistered ${SERVICE_NAME} from Consul`);
    } catch (error) {
        console.error('Consul deregistration failed:', error);
    }
}

console.log('Starting HTTP server...');

const server = service.listen(PORT, '0.0.0.0', async () => {
    try {
        console.log('Server started successfully!');
        console.log(`Service Name: ${SERVICE_NAME}`);
        console.log(`Port: ${PORT}`);
        console.log(`Full URL: http://localhost:${PORT}`);

        await registerWithConsul();
    } catch (error) {
        console.error('Consul registration error:', error);
    }
});

// Graceful shutdown
async function shutdown() {
    console.log('Shutting down application...');

    server.close(async () => {
        await deregisterFromConsul();
        process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.on('error', (error) => {
    console.error('Server Error:', error);
    process.exit(1);
});

console.log('Application initialization completed.');
