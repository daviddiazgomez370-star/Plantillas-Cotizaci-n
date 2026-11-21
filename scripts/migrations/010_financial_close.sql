-- Cierre financiero y reparto de utilidad por trabajo (Fase 6A).
-- El cierre conserva snapshots independientes de cambios posteriores en trabajadores.

CREATE TABLE IF NOT EXISTS job_profit_shares (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL,
  worker_id VARCHAR(36) NOT NULL,
  percentage DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_job_profit_shares_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT,
  CONSTRAINT fk_job_profit_shares_worker FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE RESTRICT,
  CONSTRAINT uq_job_profit_shares_job_worker UNIQUE (job_id, worker_id),
  INDEX idx_job_profit_shares_job (job_id),
  INDEX idx_job_profit_shares_worker (worker_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_financial_closes (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL,
  agreed_value_snapshot DECIMAL(14, 2) NOT NULL,
  client_collected_snapshot DECIMAL(14, 2) NOT NULL,
  expenses_snapshot DECIMAL(14, 2) NOT NULL,
  worker_payments_snapshot DECIMAL(14, 2) NOT NULL,
  result_snapshot DECIMAL(14, 2) NOT NULL,
  closed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_job_financial_closes_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT,
  CONSTRAINT uq_job_financial_closes_job UNIQUE (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_financial_close_shares (
  id VARCHAR(36) PRIMARY KEY,
  financial_close_id VARCHAR(36) NOT NULL,
  worker_id VARCHAR(36) NOT NULL,
  worker_name_snapshot VARCHAR(255) NOT NULL,
  worker_job_title_snapshot VARCHAR(100) NOT NULL,
  percentage_snapshot DECIMAL(5, 2) NOT NULL,
  amount_snapshot DECIMAL(14, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_job_financial_close_shares_close
    FOREIGN KEY (financial_close_id) REFERENCES job_financial_closes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_job_financial_close_shares_worker
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE RESTRICT,
  INDEX idx_job_financial_close_shares_close (financial_close_id),
  INDEX idx_job_financial_close_shares_worker (worker_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
