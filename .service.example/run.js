
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

// Discover service through Consul
async function discoverService(serviceName) {
    try {
        const response = await fetch(
            `${CONSUL_URL}/v1/health/service/${serviceName}?passing`
        );

        if (!response.ok) {
            throw new Error(`Consul query failed: ${response.status}`);
        }

        const instances = await response.json();

        if (instances.length === 0) {
            return null;
        }

        // Select a random healthy instance
        const instance = instances[
            Math.floor(Math.random() * instances.length)
        ];

        return {
            address: instance.Service.Address || instance.Node.Address,
            port: instance.Service.Port
        };

    } catch (error) {
        console.error('Service discovery failed:', error.message);
        throw error;
    }
}

service.get('/discover/:target', async (req, res) => {
    try {
        const targetService = `service-${req.params.target}`;

        const instance = await discoverService(targetService);

        if (!instance) {
            return res.status(503).json({
                message: 'No healthy instance found',
                service: targetService
            });
        }

        res.json({
            message: 'Service discovered successfully',
            service: targetService,
            address: instance.address,
            port: instance.port
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

service.get('/communicate/:target', async (req, res) => {
    try {
        const targetService = `service-${req.params.target}`;

        const instance = await discoverService(targetService);

        if (!instance) {
            return res.status(503).json({
                error: 'No healthy service instance available',
                service: targetService
            });
        }

        const targetURL = `http://${instance.address}:${instance.port}/info`;

        console.log(`Calling ${targetURL}`);

        const response = await fetch(targetURL);
        const data = await response.json();

        return res.status(200).json({
            message: 'Service communication successful',
            source: SERVICE_NAME,
            target: targetService,
            response: data
        });

    } catch (error) {
        console.error('Service communication failed:', error.message);

        return res.status(502).json({
            error: 'Service communication failed',
            details: error.message
        });
    }
});

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
