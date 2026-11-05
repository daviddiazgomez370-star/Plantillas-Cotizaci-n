-- Fecha de emisión editable para cuentas de cobro.
-- Las comprobaciones permiten aplicar la migración de forma segura una sola vez.

SET @has_invoice_issue_date := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'invoices' AND column_name = 'issue_date'
);
SET @statement := IF(
  @has_invoice_issue_date = 0,
  'ALTER TABLE invoices ADD COLUMN issue_date DATE NULL AFTER work_end_date',
  'SELECT 1'
);
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
