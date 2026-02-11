import fastify from "fastify";
import { createSpace } from "./routes/space.js"

const app = fastify({
  logger: true,
});


app.get("/", async (request, reply) => {
  return { hello: "world" };
});
app.post("/space", createSpace);

try {
  await app.listen({ port: 3000 });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}