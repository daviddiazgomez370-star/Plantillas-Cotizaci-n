"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DEFAULT_ACCESSORIES, PRODUCT_TYPES, type Accessory, type ProductConfig } from "@/lib/pricing"
import { Save, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function ConfigurationForm() {
  const { toast } = useToast()
  const [accessories, setAccessories] = useState<Accessory[]>(DEFAULT_ACCESSORIES)
  const [productTypes, setProductTypes] = useState<ProductConfig[]>(PRODUCT_TYPES)

  const updateAccessory = (id: string, field: keyof Accessory, value: string | number) => {
    setAccessories(
      accessories.map((acc) =>
        acc.id === id ? { ...acc, [field]: field === "pricePerUnit" ? Number(value) : value } : acc,
      ),
    )
  }

  const addAccessory = () => {
    const newId = `acc-${Date.now()}`
    setAccessories([...accessories, { id: newId, name: "Nuevo Accesorio", pricePerUnit: 0, unit: "unidad" }])
  }

  const removeAccessory = (id: string) => {
    setAccessories(accessories.filter((acc) => acc.id !== id))
  }

  const updateProductPrice = (type: string, price: string) => {
    setProductTypes(productTypes.map((p) => (p.type === type ? { ...p, basePricePerM2: Number(price) } : p)))
  }

  const handleSave = () => {
    // En una aplicación real, guardarías esto en localStorage o backend
    localStorage.setItem("customAccessories", JSON.stringify(accessories))
    localStorage.setItem("customProductTypes", JSON.stringify(productTypes))

    toast({
      title: "Configuración guardada",
      description: "Los cambios se han guardado exitosamente",
    })
  }

  const getProductName = (type: string) => {
    const names: Record<string, string> = {
      "ventana-corrediza": "Ventana Corrediza",
      "ventana-fija": "Ventana Fija",
      "puerta-vidriera": "Puerta Vidriera",
      "puerta-batiente": "Puerta Batiente",
      "fijo-batiente": "Fijo Batiente",
    }
    return names[type] || type
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Precios Base por Tipo de Producto</CardTitle>
          <CardDescription>Precio base por metro cuadrado (sin accesorios)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {productTypes.map((product) => (
              <div key={product.type} className="space-y-2">
                <Label>{getProductName(product.type)}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={product.basePricePerM2}
                    onChange={(e) => updateProductPrice(product.type, e.target.value)}
                    placeholder="180000"
                  />
                  <span className="text-sm text-muted-foreground">/ m²</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accesorios Disponibles</CardTitle>
          <CardDescription>Gestiona los accesorios y sus precios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accessories.map((accessory) => (
            <div key={accessory.id} className="grid gap-4 rounded-lg border p-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={accessory.name}
                  onChange={(e) => updateAccessory(accessory.id, "name", e.target.value)}
                  placeholder="Nombre del accesorio"
                />
              </div>
              <div className="space-y-2">
                <Label>Precio</Label>
                <Input
                  type="number"
                  value={accessory.pricePerUnit}
                  onChange={(e) => updateAccessory(accessory.id, "pricePerUnit", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Input value={accessory.unit} disabled className="bg-muted" />
              </div>
              <div className="flex items-end">
                <Button variant="ghost" size="icon" onClick={() => removeAccessory(accessory.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addAccessory} className="w-full bg-transparent">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Accesorio
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Save className="mr-2 h-4 w-4" />
          Guardar Configuración
        </Button>
      </div>
    </div>
  )
}
