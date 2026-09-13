"use client"

import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { Client } from "@/lib/database"

export function ClientSelector({ onSelect }: { onSelect: (client: Client) => void }) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch("/api/clients")
      .then((res) => {
        if (!res.ok) throw new Error("Error")
        return res.json()
      })
      .then((data) => setClients(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-2">
      <Label>Cliente Registrado</Label>
      <Select
        onValueChange={(id) => {
          const client = clients.find((c) => c.id === id)
          if (client) onSelect(client)
        }}
        value=""
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              loading
                ? "Cargando clientes..."
                : error
                  ? "No se pudieron cargar los clientes"
                  : clients.length === 0
                    ? "No hay clientes registrados"
                    : "Seleccionar cliente guardado"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name}
              {client.nit ? ` - ${client.nit}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Selecciona un cliente guardado para autocompletar sus datos
      </p>
    </div>
  )
}
