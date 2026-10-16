import { z } from 'zod'
const list = z.array(z.string().trim().min(1).max(100)).max(12)
const amount = z.number().finite().min(0).max(9999999999).nullable().optional()
const count = z.number().int().min(0).max(100).nullable().optional()
export const requirementInput = z.object({
  title: z.string().trim().min(5, 'Escribe un título de al menos 5 caracteres.').max(180),
  description: z.string().trim().max(3000).optional(),
  operation: z.enum(['SALE', 'RENTAL', 'ANTICRETIC']),
  propertyType: z.array(z.enum(['RESIDENTIAL', 'COMMERCIAL', 'LAND', 'APARTMENT', 'HOUSE', 'OFFICE', 'INDUSTRIAL'])).min(1).max(7),
  currency: z.enum(['BOB', 'USD']),
  priceMin: amount,
  priceMax: amount,
  cities: list.min(1, 'Indica al menos una ciudad.'),
  zones: list.default([]),
  bedroomsMin: count,
  bathroomsMin: count,
  areaMin: z.number().finite().positive().max(10000000).nullable().optional(),
  requiresGarage: z.boolean().default(false),
  requiresGroundFloor: z.boolean().default(false),
  petsRequired: z.boolean().default(false),
}).refine(v => v.priceMin == null || v.priceMax == null || v.priceMin <= v.priceMax, {
  message: 'El presupuesto máximo debe ser mayor o igual al mínimo.', path: ['priceMax'],
})
