
-- Tabla de clientes registrados
-- Ejecutar en phpMyAdmin despues de haber creado la base de datos
-- NOTA: No modifica las tablas existentes

USE cotizaciones_db;

CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Informacion del cliente
  name VARCHAR(255) NOT NULL,
  nit VARCHAR(50),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Notas adicionales
  notes TEXT,

  -- Timestamps
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indice para ordenar por fecha
CREATE INDEX idx_clients_created_at ON clients(created_at DESC);
