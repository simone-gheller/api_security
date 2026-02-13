import fastify from "fastify";
import { createSpace } from "./routes/space.js"
import { createUser } from "./routes/users.js";
import { createSpaceSchema } from "./schemas/spaceSchema.js";
import { createUserSchema } from "./schemas/userSchema.js";

const app = fastify({
  logger: true,
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
app.post("/users", { schema: createUserSchema }, createUser);
try {
  await app.listen({ port: 3000 });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}