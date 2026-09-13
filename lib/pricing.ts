export interface Accessory {
  id: string
  name: string
  pricePerUnit: number
  unit: "unidad" | "metro" | "metro-cuadrado"
}

export interface ProductConfig {
  type: string
  basePricePerM2: number
  requiredAccessories: {
    accessoryId: string
    quantityPerM2?: number
    quantityPerUnit?: number
  }[]
}

export const DEFAULT_ACCESSORIES: Accessory[] = [
  { id: "cerradura", name: "Cerradura", pricePerUnit: 45000, unit: "unidad" },
  { id: "bisagra", name: "Bisagra", pricePerUnit: 12000, unit: "unidad" },
  { id: "manija", name: "Manija", pricePerUnit: 35000, unit: "unidad" },
  { id: "vidrio-4mm", name: "Vidrio 4mm", pricePerUnit: 75000, unit: "metro-cuadrado" },
  { id: "vidrio-6mm", name: "Vidrio 6mm", pricePerUnit: 95000, unit: "metro-cuadrado" },
  { id: "vidrio-8mm", name: "Vidrio 8mm", pricePerUnit: 125000, unit: "metro-cuadrado" },
  { id: "vidrio-10mm", name: "Vidrio 10mm", pricePerUnit: 155000, unit: "metro-cuadrado" },
  { id: "perfil-aluminio", name: "Perfil de Aluminio", pricePerUnit: 25000, unit: "metro" },
  { id: "riel-corrediza", name: "Riel Corrediza", pricePerUnit: 18000, unit: "metro" },
  { id: "rodamiento", name: "Rodamiento", pricePerUnit: 8000, unit: "unidad" },
  { id: "empaque-goma", name: "Empaque de Goma", pricePerUnit: 5000, unit: "metro" },
  { id: "cierre-cremonas", name: "Cierre Cremonas", pricePerUnit: 55000, unit: "unidad" },
  { id: "bisagra-primavera", name: "Bisagra de Primavera", pricePerUnit: 35000, unit: "unidad" },
  { id: "perfil-u", name: "Perfil en U", pricePerUnit: 22000, unit: "metro" },
  { id: "toallero", name: "Toallero", pricePerUnit: 28000, unit: "unidad" },
]

export const PRODUCT_TYPES: ProductConfig[] = [
  {
    type: "ventana-corrediza",
    basePricePerM2: 180000,
    requiredAccessories: [
      { accessoryId: "vidrio-4mm", quantityPerM2: 1 },
      { accessoryId: "perfil-aluminio", quantityPerM2: 4 },
      { accessoryId: "riel-corrediza", quantityPerM2: 2 },
      { accessoryId: "rodamiento", quantityPerUnit: 4 },
      { accessoryId: "empaque-goma", quantityPerM2: 4 },
    ],
  },
  {
    type: "ventana-fija",
    basePricePerM2: 120000,
    requiredAccessories: [
      { accessoryId: "vidrio-4mm", quantityPerM2: 1 },
      { accessoryId: "perfil-aluminio", quantityPerM2: 4 },
      { accessoryId: "empaque-goma", quantityPerM2: 4 },
    ],
  },
  {
    type: "puerta-vidriera",
    basePricePerM2: 220000,
    requiredAccessories: [
      { accessoryId: "vidrio-6mm", quantityPerM2: 1 },
      { accessoryId: "perfil-aluminio", quantityPerM2: 4 },
      { accessoryId: "cerradura", quantityPerUnit: 1 },
      { accessoryId: "manija", quantityPerUnit: 1 },
      { accessoryId: "bisagra", quantityPerUnit: 3 },
      { accessoryId: "empaque-goma", quantityPerM2: 4 },
    ],
  },
  {
    type: "puerta-batiente",
    basePricePerM2: 200000,
    requiredAccessories: [
      { accessoryId: "perfil-aluminio", quantityPerM2: 4 },
      { accessoryId: "cerradura", quantityPerUnit: 1 },
      { accessoryId: "bisagra", quantityPerUnit: 3 },
      { accessoryId: "manija", quantityPerUnit: 1 },
    ],
  },
  {
    type: "fijo-batiente",
    basePricePerM2: 250000,
    requiredAccessories: [
      { accessoryId: "vidrio-4mm", quantityPerM2: 1 },
      { accessoryId: "perfil-aluminio", quantityPerM2: 6 },
      { accessoryId: "cerradura", quantityPerUnit: 1 },
      { accessoryId: "bisagra", quantityPerUnit: 3 },
      { accessoryId: "manija", quantityPerUnit: 1 },
      { accessoryId: "cierre-cremonas", quantityPerUnit: 1 },
      { accessoryId: "empaque-goma", quantityPerM2: 6 },
    ],
  },
  {
    type: "cabina-baño",
    basePricePerM2: 280000,
    requiredAccessories: [
      { accessoryId: "vidrio-8mm", quantityPerM2: 1 },
      { accessoryId: "perfil-u", quantityPerM2: 4 },
      { accessoryId: "empaque-goma", quantityPerM2: 4 },
      { accessoryId: "toallero", quantityPerUnit: 1 },
    ],
  },
]

export function calculateProductPrice(
  productType: string,
  width: number,
  height: number,
  accessories: Accessory[],
  customConfig?: ProductConfig,
): {
  basePrice: number
  accessoriesPrice: number
  total: number
  breakdown: Array<{ name: string; quantity: number; unitPrice: number; total: number }>
} {
  const area = (width * height) / 10000 // Convert cm² to m²
  const perimeter = (2 * (width + height)) / 100 // Convert cm to m

  const config = customConfig || PRODUCT_TYPES.find((p) => p.type === productType)

  if (!config) {
    return { basePrice: 0, accessoriesPrice: 0, total: 0, breakdown: [] }
  }

  const basePrice = area * config.basePricePerM2
  const breakdown: Array<{ name: string; quantity: number; unitPrice: number; total: number }> = []

  let accessoriesPrice = 0

  config.requiredAccessories.forEach((required) => {
    const accessory = accessories.find((a) => a.id === required.accessoryId)
    if (!accessory) return

    let quantity = 0
    if (required.quantityPerM2) {
      if (accessory.unit === "metro-cuadrado") {
        quantity = area * required.quantityPerM2
      } else if (accessory.unit === "metro") {
        quantity = perimeter * required.quantityPerM2
      }
    } else if (required.quantityPerUnit) {
      quantity = required.quantityPerUnit
    }

    const itemTotal = quantity * accessory.pricePerUnit
    accessoriesPrice += itemTotal

    breakdown.push({
      name: accessory.name,
      quantity: Math.round(quantity * 100) / 100,
      unitPrice: accessory.pricePerUnit,
      total: itemTotal,
    })
  })

  return {
    basePrice,
    accessoriesPrice,
    total: basePrice + accessoriesPrice,
    breakdown,
  }
}
