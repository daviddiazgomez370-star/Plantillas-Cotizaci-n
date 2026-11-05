-- Base de datos para sistema de cotizaciones
-- Compatible con MySQL/MariaDB en XAMPP

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS cotizaciones_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cotizaciones_db;

-- Tabla de cotizaciones
CREATE TABLE IF NOT EXISTS quotations (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Información de la empresa
  company_name VARCHAR(255) NOT NULL,
  company_nit VARCHAR(50) NOT NULL,
  company_address TEXT,
  company_phone VARCHAR(50),
  company_email VARCHAR(255),
  
  -- Información del cliente
  client_name VARCHAR(255) NOT NULL,
  client_nit VARCHAR(50),
  client_address TEXT,
  client_phone VARCHAR(50),
  client_email VARCHAR(255),
  
  -- Productos (JSON con todos los detalles)
  products JSON NOT NULL,
  
  -- Precios
  subtotal DECIMAL(10, 2) NOT NULL,
  iva DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  
  -- Detalles adicionales
  delivery_time TEXT,
  warranty TEXT,
  observations TEXT,
  
  -- Estado y fechas
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, converted, cancelled
  work_start_date DATE,
  work_end_date DATE,
  
  -- PDF
  pdf_url TEXT,
  
  -- Timestamps
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de documentos libres
CREATE TABLE IF NOT EXISTS free_documents (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  document_title VARCHAR(255) NOT NULL DEFAULT 'COTIZACION',
  document_number VARCHAR(100),
  company_name VARCHAR(255) NOT NULL,
  company_nit VARCHAR(50),
  company_address TEXT,
  company_phone VARCHAR(50),
  company_email VARCHAR(255),
  client_name VARCHAR(255) NOT NULL,
  client_nit VARCHAR(50),
  client_address TEXT,
  client_phone VARCHAR(50),
  client_email VARCHAR(255),
  general_description TEXT,
  items JSON NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  delivery_days INT DEFAULT 0,
  warranty_months INT DEFAULT 0,
  notes TEXT,
  document_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de cuentas de cobro
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Vinculación con cotización
  quotation_id VARCHAR(36),
  free_document_id VARCHAR(36),
  
  -- Información de la empresa
  company_name VARCHAR(255) NOT NULL,
  company_nit VARCHAR(50) NOT NULL,
  company_address TEXT,
  company_phone VARCHAR(50),
  company_email VARCHAR(255),
  
  -- Información del cliente
  client_name VARCHAR(255) NOT NULL,
  client_nit VARCHAR(50),
  client_address TEXT,
  client_phone VARCHAR(50),
  client_email VARCHAR(255),
  
  -- Productos (JSON)
  products JSON NOT NULL,
  
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
  payment_method VARCHAR(100),
  
  -- PDF
  pdf_url TEXT,
  
  -- Timestamps
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Clave foránea
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL,
  FOREIGN KEY (free_document_id) REFERENCES free_documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices para mejorar el rendimiento
CREATE INDEX idx_quotations_created_at ON quotations(created_at DESC);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_free_documents_created_at ON free_documents(created_at DESC);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX idx_invoices_quotation_id ON invoices(quotation_id);
CREATE INDEX idx_invoices_free_document_id ON invoices(free_document_id);
