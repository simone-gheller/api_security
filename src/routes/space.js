import { prisma } from "../lib/prisma.js";

export async function createSpace(request, reply) {
  const { name, owner } = request.body;
  const space = await prisma.space.create({
    data: {
      name,
      owner
    }
  })
  reply.code(201);
  reply.header("Location", `/space/${space.id}`);
  return {
    name: space.name,
    uri: `/space/${space.id}`
  };
}