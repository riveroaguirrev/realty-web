import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

// Retry serialization conflicts; never retry provider calls inside this callback.
export async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      if (attempt >= 4 || !(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034') throw error
    }
  }
}
