-- Cobros del cliente (Fase 4).
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS advance_percentage DECIMAL(5, 2) NOT NULL DEFAULT 50.00;

CREATE TABLE IF NOT EXISTS job_client_payments (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL,
  payment_date DATE NOT NULL,
  payment_type VARCHAR(30) NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_job_client_payments_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT,
  INDEX idx_job_client_payments_job_date (job_id, payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
