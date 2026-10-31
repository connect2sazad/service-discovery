import express from 'express';

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 4999;
const CONSUL_URL = process.env.CONSUL_URL || `http://consul:${PORT}`

const allowedServices = [
    "service-alpha",
    "service-beta",
    "service-delta",
]

async function discoverService(service) {

    const response = await fetch(
        `${CONSUL_URL}/v1/health/service/${service}?passing`
    );

    if(!response.ok) throw new Error("Failed to query Consul");
    
    const instances = await response.json();

    if(instances.length === 0) return null;

    const instance = instances[
        Math.floor(Math.random() * instances.length)
    ];

    return {
        address: instance.Service.Address || instance.Node.Address,
        prot: instance.Service.Port,
    }
}

app.get('/', (req, res) => {
    res.status(200).json({
        health: 'Healthy',
        status: 'up',
        name: 'API Gateway'
    });
});

app.get("/:service/info", async(req, res) => {
    
    const service = req.params.service;

    try {

        // validate requested service
        if(!allowedServices.includes(serviceName)){
            return res.status(404).json({
                error: "Service not found"
            });
        }

        // discover service through Consul
        const service = await discoverService(service);

        if(!service){
            return res.status(503).json({
                error: "No healthy instances available",
                service
            });
        }

        const serviceUrl = `http://${service.address}:${service.port}/info`;

        console.log(`Forwarding request to ${serviceUrl}`);

        const serviceResponse = await fetch(serviceUrl, {
            signal: AbortSignal.timeout(5000)
        });

        const data = await serviceResponse.json();

        return res.status(serviceResponse.status).json(data);
        

    } catch(err) {
        console.error(`Gateway Error: ${err.message}`);
        
        return res.status(502).json({
            error: "Failed to communicate with service",
            details: err.message
        });
    }

});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`API Gateway is running at ${PORT}`); 
});