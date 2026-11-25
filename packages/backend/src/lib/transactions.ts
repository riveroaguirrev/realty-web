import { Prisma } from '@prisma/client'
import { setTimeout } from 'node:timers/promises'
import { prisma } from './prisma'

// Retry serialization conflicts; never retry provider calls inside this callback.
export async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      // Prisma preserves PostgreSQL's SQLSTATE on conflicts from raw row locks.
      const conflict = error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || (error.code === 'P2010' && ['40001', '40P01'].includes(String(error.meta?.code))))
      if (attempt >= 4 || !conflict) throw error
      const backoff = 15 * 2 ** attempt
      await setTimeout(backoff + Math.random() * backoff)
    }
  }
}
