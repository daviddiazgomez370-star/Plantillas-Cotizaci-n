import { z, type ZodError } from "zod"
import { NextResponse } from "next/server"
import { ConflictError, ResourceNotFoundError } from "@/lib/errors"

const optionalText = (maxLength = 1_000) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .nullable()
    .optional()
    .transform((value) => value || undefined)

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener el formato AAAA-MM-DD")
  .nullable()
  .optional()
  .transform((value) => value || undefined)

const requiredText = (label: string, maxLength = 255) =>
  z.string().trim().min(1, `${label} es obligatorio`).max(maxLength)

const money = z.coerce.number().finite().min(0, "El valor no puede ser negativo")
const uuid = z.string().uuid("El identificador no es válido")

export const idSchema = z.string().uuid("El identificador no es valido")

const optionalMoney = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().finite().min(0, "El valor no puede ser negativo").optional()
)

const itemSchema = z.object({
  id: optionalText(100),
  description: requiredText("La descripción", 5_000),
  quantity: z.coerce.number().finite().positive("La cantidad debe ser mayor que cero"),
  unitPrice: money,
})

const contactFields = {
  company_name: requiredText("El nombre de la empresa"),
  company_nit: optionalText(50),
  company_address: optionalText(5_000),
  company_phone: optionalText(50),
  company_email: optionalText(255),
  client_name: requiredText("El nombre del cliente"),
  client_nit: optionalText(50),
  client_address: optionalText(5_000),
  client_phone: optionalText(50),
  client_email: optionalText(255),
}

export const quotationSchema = z.object({
  ...contactFields,
  company_nit: requiredText("El NIT de la empresa", 50),
  products: z.array(z.record(z.string(), z.unknown())).min(1, "Agrega al menos un producto"),
  subtotal: money,
  iva: money,
  total: money,
  delivery_time: optionalText(255),
  warranty: optionalText(255),
  observations: optionalText(5_000),
  status: z.enum(["pending", "approved", "converted", "cancelled"]),
  work_start_date: optionalDate,
  work_end_date: optionalDate,
})

export const invoiceSchema = z.object({
  quotation_id: uuid.nullable().optional().transform((value) => value || undefined),
  free_document_id: uuid.nullable().optional().transform((value) => value || undefined),
  ...contactFields,
  company_nit: requiredText("El NIT de la empresa", 50),
  products: z.array(z.record(z.string(), z.unknown())).min(1, "Agrega al menos un ítem"),
  subtotal: money,
  iva: money,
  total: money,
  work_description: optionalText(5_000),
  issue_date: optionalDate,
  work_start_date: optionalDate,
  work_end_date: optionalDate,
  payment_date: optionalDate,
  payment_method: optionalText(100),
})

/**
 * La API de cuentas de cobro conserva los nombres históricos en snake_case,
 * pero también acepta el modelo del formulario/PDF en camelCase. Así los
 * clientes existentes no se rompen y todos los campos se validan y persisten
 * usando una única estructura interna.
 */
export function normalizeInvoiceRequest(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload

  const source = payload as Record<string, unknown>
  const field = (snakeCase: string, camelCase: string) => source[snakeCase] ?? source[camelCase]

  return {
    ...source,
    company_name: field("company_name", "companyName"),
    company_nit: field("company_nit", "companyId"),
    company_address: field("company_address", "companyAddress"),
    company_phone: field("company_phone", "companyPhone"),
    company_email: field("company_email", "companyEmail"),
    client_name: field("client_name", "clientName"),
    client_nit: field("client_nit", "clientId"),
    client_address: field("client_address", "clientAddress"),
    client_phone: field("client_phone", "clientPhone"),
    client_email: field("client_email", "clientEmail"),
    products: field("products", "items"),
    subtotal: source.subtotal ?? source.total,
    iva: source.iva ?? 0,
    total: source.total,
    issue_date: field("issue_date", "issueDate"),
    work_start_date: field("work_start_date", "startDate"),
    work_end_date: field("work_end_date", "endDate"),
    payment_date: field("payment_date", "paymentDate"),
    payment_method: field("payment_method", "paymentTerms"),
  }
}

export const freeDocumentSchema = z.object({
  document_title: requiredText("El título del documento"),
  document_number: optionalText(100),
  ...contactFields,
  general_description: optionalText(5_000),
  items: z.array(itemSchema).min(1, "Agrega al menos un ítem"),
  total: money,
  delivery_days: z.coerce.number().int().min(0).max(36_500),
  warranty_months: z.coerce.number().int().min(0).max(1_200),
  notes: optionalText(5_000),
  document_date: optionalDate,
})

export const clientSchema = z.object({
  name: requiredText("El nombre del cliente"),
  nit: optionalText(50),
  address: optionalText(5_000),
  phone: optionalText(50),
  email: optionalText(255),
  notes: optionalText(5_000),
})

export const quotationStatusSchema = z.object({
  status: z.enum(["pending", "approved", "converted", "cancelled"]),
})

export const workerCompensationTypes = ["daily_rate", "profit_share"] as const
export const jobStatuses = ["accepted", "in_progress", "completed"] as const

export const workerSchema = z
  .object({
    name: requiredText("El nombre del trabajador"),
    job_title: requiredText("El cargo", 100),
    phone: optionalText(50),
    compensation_type: z.enum(workerCompensationTypes),
    daily_rate: optionalMoney,
  })
  .superRefine((worker, context) => {
    if (worker.compensation_type === "daily_rate" && worker.daily_rate === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["daily_rate"],
        message: "La tarifa diaria es obligatoria para este tipo de remuneracion",
      })
    }

    if (worker.compensation_type !== "daily_rate" && worker.daily_rate !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["daily_rate"],
        message: "La tarifa diaria solo aplica a trabajadores con tarifa diaria",
      })
    }
  })

export const workerActivationSchema = z.object({
  is_active: z.boolean(),
})

export const jobSchema = z
  .object({
    name: requiredText("El nombre del trabajo"),
    description: optionalText(5_000),
    client_id: idSchema.nullable().optional().transform((value) => value || undefined),
    quotation_id: idSchema.nullable().optional().transform((value) => value || undefined),
    agreed_value: money,
    start_date: optionalDate,
    end_date: optionalDate,
    notes: optionalText(5_000),
  })
  .superRefine((job, context) => {
    if (job.start_date && job.end_date && job.end_date < job.start_date) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "La fecha de finalizacion no puede ser anterior a la fecha inicial",
      })
    }
  })

export const workerIdsSchema = z
  .array(idSchema)
  .min(1, "Selecciona al menos un trabajador")
  .superRefine((workerIds, context) => {
    if (new Set(workerIds).size !== workerIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No repitas trabajadores en la asignacion",
      })
    }
  })

export const jobCreateSchema = jobSchema.and(z.object({
  worker_ids: workerIdsSchema.optional(),
}))

export const jobStatusSchema = z.object({
  status: z.enum(jobStatuses),
})

export const workerAssignmentSchema = z.object({
  worker_ids: workerIdsSchema,
})

export function invalidRequest(error: ZodError) {
  const firstMessage = error.issues[0]?.message

  return NextResponse.json(
    {
      error: firstMessage || "Los datos enviados no son válidos",
      fields: error.flatten().fieldErrors,
    },
    { status: 400 }
  )
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function knownRequestError(error: unknown) {
  if (error instanceof ResourceNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 })
  }

  return null
}

export function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 })
}
