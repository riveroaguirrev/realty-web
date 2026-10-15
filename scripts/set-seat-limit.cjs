const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const [organizationId, input] = process.argv.slice(2)
const limit = Number(input)
async function main() {
  if (!organizationId || !Number.isSafeInteger(limit) || limit < 1) throw new Error('Uso: npm run accounts:seats -- <sucursalId> <cupo entero positivo>')
  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUniqueOrThrow({ where: { id: organizationId } })
    const occupied = await tx.advisor.count({ where: { organizationId } })
    const reserved = await tx.inviteCode.count({ where: { organizationId, usedAt: null, cancelledAt: null, expiresAt: { gt: new Date() } } })
    if (limit < occupied + reserved) throw new Error('El cupo no puede ser menor que las cuentas y reservas existentes.')
    await tx.organization.update({ where: { id: organizationId }, data: { maxAdvisors: limit } })
    return { organizationId, previousLimit: org.maxAdvisors, limit, occupied, reserved }
  }, { isolationLevel: 'Serializable' })
  console.log(JSON.stringify(result))
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
