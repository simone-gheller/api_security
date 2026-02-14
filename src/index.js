import fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { createSpace } from "./routes/space.js"
import { createUser } from "./routes/users.js";
import { createSpaceSchema } from "./schemas/spaceSchema.js";
import { createUserSchema } from "./schemas/userSchema.js";

const app = fastify({
  logger: true,
});

// Rate limiting globale
await app.register(rateLimit, {
  global: true,
  max: 100,              // Massimo 100 richieste
  timeWindow: '1 minute', // Per finestra di 1 minuto
  cache: 10000,           // Cache per 10000 IP diversi
  allowList: ['127.0.0.1'], // Whitelist per localhost (sviluppo)
  redis: null,            // Usa memory store (in produzione usa Redis)
  nameSpace: 'natter-rl-',
  continueExceeding: true,
  skipOnError: false,     // Non skippare rate limit se c'è errore
  addHeadersOnExceeding: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true
  },
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
    'retry-after': true
  }
});

// Hook per aggiungere security headers a tutte le risposte
app.addHook('onSend', async (_request, reply) => {
  reply.header("X-XSS-Protection", "0");
  reply.header("X-Content-Type-Options", "nosniff");
  reply.header("X-Frame-Options", "DENY");
  reply.header("Cache-Control", "no-store");
  reply.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; sandbox");
});

app.get("/", async (request, reply) => {
  return { hello: "world" };
});

app.post("/spaces", { schema: createSpaceSchema }, createSpace);

// Rate limiting più restrittivo per creazione utenti (prevenzione spam)
app.post("/users", {
  schema: createUserSchema,
  config: {
    rateLimit: {
      max: 5,                // Massimo 5 registrazioni
      timeWindow: '15 minutes' // Ogni 15 minuti per IP
    }
  }
}, createUser);
try {
  await app.listen({ port: 3000 });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}