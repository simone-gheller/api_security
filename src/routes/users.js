import bcrypt from 'bcrypt';
import { prisma } from "../lib/prisma.js";

const SALT_ROUNDS = 12;  // OWASP raccomandato per 2026

export async function createUser(request, reply) {
  const { username, password } = request.body;

  try {
    // Hash della password con 12 rounds (più sicuro)
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword
      }
    });

    reply.code(201);
    reply.header("Location", `/users/${user.id}`);
    return {
      username: user.username,
    };
  } catch (error) {
    // Gestisci errore username duplicato (Prisma unique constraint)
    if (error.code === 'P2002') {
      reply.code(409);  // Conflict
      return { error: 'Username already exists' };
    }
    throw error;  // Altri errori
  }
}