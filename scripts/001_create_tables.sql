-- Tabla de cotizaciones
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Información de la empresa
  company_name TEXT NOT NULL,
  company_nit TEXT NOT NULL,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  
  -- Información del cliente
  client_name TEXT NOT NULL,
  client_nit TEXT,
  client_address TEXT,
  client_phone TEXT,
  client_email TEXT,
  
  -- Productos (JSON array con todos los detalles)
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Precios
  subtotal DECIMAL(10, 2) NOT NULL,
  iva DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  
  -- Detalles adicionales
  delivery_time TEXT,
  warranty TEXT,
  observations TEXT,
  
  -- Estado y fechas
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, converted, cancelled
  work_start_date DATE,
  work_end_date DATE,
  
  -- PDF
  pdf_url TEXT,
  
  -- Timestamps
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de cuentas de cobro
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Vinculación con cotización
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  
  -- Información de la empresa
  company_name TEXT NOT NULL,
  company_nit TEXT NOT NULL,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  
  -- Información del cliente
  client_name TEXT NOT NULL,
  client_nit TEXT,
  client_address TEXT,
  client_phone TEXT,
  client_email TEXT,
  
  -- Productos (JSON array)
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Precios
  subtotal DECIMAL(10, 2) NOT NULL,
  iva DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  
  -- Detalles del trabajo
  work_description TEXT,
  work_start_date DATE,
  work_end_date DATE,
  
  -- Pago
  payment_date DATE,
  payment_method TEXT,
  
  -- PDF
  pdf_url TEXT,
  
  -- Timestamps
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id ON invoices(quotation_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
