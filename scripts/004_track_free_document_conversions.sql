-- LEGADO: el migrador formal ya incluye esta actualización como
-- scripts/migrations/003_existing_database_upgrade.sql.
-- Solo ejecutar una vez en phpMyAdmin si no se utilizará npm run db:migrate.
-- Agrega el vínculo entre cuentas de cobro y documentos libres, y el estado
-- necesario para impedir conversiones duplicadas.

USE cotizaciones_db;

ALTER TABLE free_documents
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending' AFTER document_date;

ALTER TABLE invoices
  ADD COLUMN free_document_id VARCHAR(36) NULL AFTER quotation_id,
  ADD CONSTRAINT fk_invoices_free_document
    FOREIGN KEY (free_document_id) REFERENCES free_documents(id) ON DELETE SET NULL;

CREATE INDEX idx_invoices_free_document_id ON invoices(free_document_id);
