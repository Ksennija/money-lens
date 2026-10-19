import { Prisma } from '../generated/prisma/client.js';
import { prisma } from './client.js';

const UNIQUE_CONSTRAINT_ERROR_CODE = 'P2002';

export type CreateUserResult = 'created' | 'email-taken';

export async function createUser(email: string, passwordHash: string): Promise<CreateUserResult> {
  try {
    await prisma.user.create({ data: { email, passwordHash } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT_ERROR_CODE
    ) {
      return 'email-taken';
    }
    throw error;
  }
  return 'created';
}

export async function isEmailTaken(email: string): Promise<boolean> {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  return existingUser !== null;
}

export type PublicUser = { id: string; email: string };

export async function findUserById(id: string): Promise<PublicUser | null> {
  return prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
}

export type UserRecord = { id: string; email: string; passwordHash: string };

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true },
  });
}
