export const PROPERTY_OPERATIONS = {
  ANTICRETIC: { label: 'Anticrético', color: '#B95130' },
  SALE: { label: 'Venta', color: '#18324B' },
  RENTAL: { label: 'Alquiler', color: '#24736B' },
} as const
export type PropertyOperation = keyof typeof PROPERTY_OPERATIONS
export const propertyOperation = (operation?: string): PropertyOperation => operation === 'ANTICRETIC' || operation === 'RENTAL' ? operation : 'SALE'
export const propertyOperationColor = (operation?: string) => PROPERTY_OPERATIONS[propertyOperation(operation)].color
