-- Actualiza instalaciones creadas con los scripts manuales anteriores.
-- Las comprobaciones permiten ejecutarla una sola vez sin duplicar estructura.

SET @has_free_document_status := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'free_documents' AND column_name = 'status'
);
SET @statement := IF(
  @has_free_document_status = 0,
  'ALTER TABLE free_documents ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''pending'' AFTER document_date',
  'SELECT 1'
);
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_invoice_free_document := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'invoices' AND column_name = 'free_document_id'
);
SET @statement := IF(
  @has_invoice_free_document = 0,
  'ALTER TABLE invoices ADD COLUMN free_document_id VARCHAR(36) NULL AFTER quotation_id',
  'SELECT 1'
);
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_invoice_free_document_fk := (
  SELECT COUNT(*)
  FROM information_schema.referential_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'invoices'
    AND constraint_name = 'fk_invoices_free_document'
);
SET @statement := IF(
  @has_invoice_free_document_fk = 0,
  'ALTER TABLE invoices ADD CONSTRAINT fk_invoices_free_document FOREIGN KEY (free_document_id) REFERENCES free_documents(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_quotations_created_index := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'quotations' AND index_name = 'idx_quotations_created_at'
);
SET @statement := IF(@has_quotations_created_index = 0, 'CREATE INDEX idx_quotations_created_at ON quotations(created_at)', 'SELECT 1');
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_quotations_status_index := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'quotations' AND index_name = 'idx_quotations_status'
);
SET @statement := IF(@has_quotations_status_index = 0, 'CREATE INDEX idx_quotations_status ON quotations(status)', 'SELECT 1');
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_free_documents_created_index := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'free_documents' AND index_name = 'idx_free_documents_created_at'
);
SET @statement := IF(@has_free_documents_created_index = 0, 'CREATE INDEX idx_free_documents_created_at ON free_documents(created_at)', 'SELECT 1');
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_invoices_created_index := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'invoices' AND index_name = 'idx_invoices_created_at'
);
SET @statement := IF(@has_invoices_created_index = 0, 'CREATE INDEX idx_invoices_created_at ON invoices(created_at)', 'SELECT 1');
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_invoices_quotation_index := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'invoices' AND index_name = 'idx_invoices_quotation_id'
);
SET @statement := IF(@has_invoices_quotation_index = 0, 'CREATE INDEX idx_invoices_quotation_id ON invoices(quotation_id)', 'SELECT 1');
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_invoices_free_document_index := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'invoices' AND index_name = 'idx_invoices_free_document_id'
);
SET @statement := IF(@has_invoices_free_document_index = 0, 'CREATE INDEX idx_invoices_free_document_id ON invoices(free_document_id)', 'SELECT 1');
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_clients_created_index := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'clients' AND index_name = 'idx_clients_created_at'
);
SET @statement := IF(@has_clients_created_index = 0, 'CREATE INDEX idx_clients_created_at ON clients(created_at)', 'SELECT 1');
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
