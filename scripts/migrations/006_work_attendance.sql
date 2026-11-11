-- Dias trabajados y asistencia (Fase 2).
-- Conserva el historial: los trabajos y trabajadores con asistencia no se eliminan en cascada.

CREATE TABLE IF NOT EXISTS work_attendance (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL,
  worker_id VARCHAR(36) NOT NULL,
  work_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_work_attendance_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT,
  CONSTRAINT fk_work_attendance_worker FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE RESTRICT,
  CONSTRAINT uq_work_attendance_job_worker_date UNIQUE (job_id, worker_id, work_date),
  INDEX idx_work_attendance_job_date (job_id, work_date),
  INDEX idx_work_attendance_worker_date (worker_id, work_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
