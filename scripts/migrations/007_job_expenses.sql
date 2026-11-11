-- Gastos por trabajo (Fase 3).
-- Los gastos protegen el historial financiero del trabajo.

CREATE TABLE IF NOT EXISTS job_expenses (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL,
  expense_date DATE NOT NULL,
  category VARCHAR(30) NOT NULL,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_job_expenses_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT,
  INDEX idx_job_expenses_job_date (job_id, expense_date),
  INDEX idx_job_expenses_job_category_date (job_id, category, expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
