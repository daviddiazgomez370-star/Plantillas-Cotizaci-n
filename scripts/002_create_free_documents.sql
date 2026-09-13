-- Tabla de documentos libres
-- Ejecutar en phpMyAdmin despues de haber creado la base de datos
-- NOTA: No modifica las tablas existentes

USE cotizaciones_db;

CREATE TABLE IF NOT EXISTS free_documents (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Titulo del documento
  document_title VARCHAR(255) NOT NULL DEFAULT 'COTIZACION',
  document_number VARCHAR(100),

  -- Informacion de la empresa
  company_name VARCHAR(255) NOT NULL,
  company_nit VARCHAR(50),
  company_address TEXT,
  company_phone VARCHAR(50),
  company_email VARCHAR(255),

  -- Informacion del cliente
  client_name VARCHAR(255) NOT NULL,
  client_nit VARCHAR(50),
  client_address TEXT,
  client_phone VARCHAR(50),
  client_email VARCHAR(255),

  -- Descripcion general
  general_description TEXT,

  -- Items del documento (JSON)
  items JSON NOT NULL,

  -- Total
  total DECIMAL(10, 2) NOT NULL,

  -- Condiciones
  delivery_days INT DEFAULT 0,
  warranty_months INT DEFAULT 0,
  notes TEXT,

  -- Fecha del documento
  document_date DATE,

  -- Timestamps
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indice para ordenar por fecha
CREATE INDEX idx_free_documents_created_at ON free_documents(created_at DESC);
