-- Vinculo seguro Cotizacion aprobada -> Trabajo (Fase 7A).
-- Una cotizacion puede originar a lo sumo un trabajo; los trabajos manuales
-- conservan quotation_id = NULL y no quedan limitados por este indice.

-- Detener la migracion antes de cambiar el esquema si hay datos historicos
-- incompatibles. ALTER TABLE tambien defenderia esta regla, pero este guard
-- deja el motivo explicito y evita continuar con el cambio de FK.
SET @quote_to_job_duplicate_count := (
  SELECT COUNT(*)
  FROM (
    SELECT quotation_id
    FROM jobs
    WHERE quotation_id IS NOT NULL
    GROUP BY quotation_id
    HAVING COUNT(*) > 1
  ) AS duplicate_quotation_ids
);
SET @quote_to_job_guard_sql := IF(
  @quote_to_job_duplicate_count = 0,
  'SELECT 1',
  'SIGNAL SQLSTATE ''45000'' SET MESSAGE_TEXT = ''No se puede aplicar 011_quote_to_job: existen trabajos duplicados para una misma cotizacion'''
);
PREPARE quote_to_job_guard FROM @quote_to_job_guard_sql;
EXECUTE quote_to_job_guard;
DEALLOCATE PREPARE quote_to_job_guard;

-- El nombre estable permite reintentar la migracion si una ejecucion se
-- interrumpe despues de una sentencia DDL (que MySQL/MariaDB confirma).
SET @quote_to_job_unique_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'jobs'
    AND index_name = 'uq_jobs_quotation_id'
);
SET @quote_to_job_unique_sql := IF(
  @quote_to_job_unique_exists = 0,
  'ALTER TABLE jobs ADD UNIQUE INDEX uq_jobs_quotation_id (quotation_id)',
  'SELECT 1'
);
PREPARE quote_to_job_unique FROM @quote_to_job_unique_sql;
EXECUTE quote_to_job_unique;
DEALLOCATE PREPARE quote_to_job_unique;

-- Sustituye solo la FK historica de quotations: ya no debe borrar el vinculo
-- cuando se intente eliminar una cotizacion que genero un trabajo.
SET @quote_to_job_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'jobs'
    AND constraint_name = 'fk_jobs_quotation'
    AND constraint_type = 'FOREIGN KEY'
);
SET @quote_to_job_drop_fk_sql := IF(
  @quote_to_job_fk_exists > 0,
  'ALTER TABLE jobs DROP FOREIGN KEY fk_jobs_quotation',
  'SELECT 1'
);
PREPARE quote_to_job_drop_fk FROM @quote_to_job_drop_fk_sql;
EXECUTE quote_to_job_drop_fk;
DEALLOCATE PREPARE quote_to_job_drop_fk;

SET @quote_to_job_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'jobs'
    AND constraint_name = 'fk_jobs_quotation'
    AND constraint_type = 'FOREIGN KEY'
);
SET @quote_to_job_add_fk_sql := IF(
  @quote_to_job_fk_exists = 0,
  'ALTER TABLE jobs ADD CONSTRAINT fk_jobs_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE RESTRICT',
  'SELECT 1'
);
PREPARE quote_to_job_add_fk FROM @quote_to_job_add_fk_sql;
EXECUTE quote_to_job_add_fk;
DEALLOCATE PREPARE quote_to_job_add_fk;
