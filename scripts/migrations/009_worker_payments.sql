-- Pagos a trabajadores por dias trabajados (Fase 5, primera parte).
-- Los detalles usan CASCADE hacia la cabecera para permitir anular un pago
-- explicitamente; la asistencia permanece protegida con ON DELETE RESTRICT.

CREATE TABLE IF NOT EXISTS worker_payments (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL,
  worker_id VARCHAR(36) NOT NULL,
  payment_date DATE NOT NULL,
  total_amount DECIMAL(14, 2) NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_worker_payments_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT,
  CONSTRAINT fk_worker_payments_worker FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE RESTRICT,
  INDEX idx_worker_payments_job_date (job_id, payment_date),
  INDEX idx_worker_payments_worker_date (worker_id, payment_date),
  INDEX idx_worker_payments_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS worker_payment_days (
  id VARCHAR(36) PRIMARY KEY,
  worker_payment_id VARCHAR(36) NOT NULL,
  attendance_id VARCHAR(36) NOT NULL,
  daily_rate_snapshot DECIMAL(14, 2) NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_worker_payment_days_payment
    FOREIGN KEY (worker_payment_id) REFERENCES worker_payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_worker_payment_days_attendance
    FOREIGN KEY (attendance_id) REFERENCES work_attendance(id) ON DELETE RESTRICT,
  CONSTRAINT uq_worker_payment_days_attendance UNIQUE (attendance_id),
  INDEX idx_worker_payment_days_payment (worker_payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
