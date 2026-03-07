// Api/health.js
async function routes(fastify) {
    // GET /game-api/health
    fastify.get("/game-api/health", async (request, reply) => {
        return reply.send({ status: "OK" });
    });

    // GET /game-identity/api/v1.0/health
    fastify.get("/game-identity/api/v1.0/health", async (request, reply) => {
        return reply.send({ status: "OK" });
    });

    // GET /health (альтернативный путь)
    fastify.get("/health", async (request, reply) => {
        return reply.send({ status: "OK" });
    });
}

module.exports = routes;