// Prisma Client Singleton

import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    log: process.env['NODE_ENV'] === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export default prisma;

// Helper function to disconnect (useful for tests)
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

// Transaction helper
export async function withTransaction<T>(
  fn: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return fn(tx as typeof prisma);
  });
}