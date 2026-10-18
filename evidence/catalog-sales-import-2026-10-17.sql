-- Executed only under explicit user authorization. Reference is consumed on success.
-- Target: steep-brook-51659857 / br-lingering-wind-acwh5wap / neondb
BEGIN;
SET LOCAL lock_timeout = '5s';

SET LOCAL statement_timeout = '20s';

LOCK TABLE public.products, public.categories, public.historical_import_records, public.operational_audit_events IN SHARE ROW EXCLUSIVE MODE;

DO $guard$ BEGIN
IF current_database() <> 'neondb' THEN RAISE EXCEPTION 'Unexpected database'; END IF;
IF EXISTS (SELECT 1 FROM public.products) THEN RAISE EXCEPTION 'Catalog is no longer empty; stop and reconcile'; END IF;
IF EXISTS (SELECT 1 FROM public.historical_import_records WHERE source_key = 'CATALOG-SALES-2026-10-17-001' OR source_hash = '8ea777ccfc69015ef3562283fd8ea66c21da111005f4b70cadfedae4409652d2') THEN RAISE EXCEPTION 'Import reference already consumed'; END IF;
IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = 1 AND name = 'Bombons' AND is_active) THEN RAISE EXCEPTION 'Existing category changed'; END IF;
END $guard$;

INSERT INTO public.categories(name) VALUES ('Bombom'), ('Bordinha'), ('Brownie'), ('Kit') ON CONFLICT (name) DO NOTHING;

DO $guard$ BEGIN IF (SELECT count(*) FROM public.categories WHERE name IN ('Bombom','Bordinha','Brownie','Kit') AND is_active) <> 4 THEN RAISE EXCEPTION 'Categories unavailable'; END IF; END $guard$;

INSERT INTO public.products (sku, name, category_id, product_type, measurement_unit, sale_price, is_active)
SELECT v.sku, v.name, c.id, 'finished_product'::public.product_type, 'unit'::public.measurement_unit, v.sale_price::numeric(12,2), true
FROM (VALUES
('PROD001', 'Bombom Brownie Unitário', 'Bombom', '5.00'),
('PROD002', 'Bordinhas', 'Bordinha', '5.00'),
('PROD003', 'Brownie Recheado 5x5 (Brigadeiro)', 'Brownie', '12.00'),
('PROD004', 'Brownie Recheado 5x5 (Creme de Avelã)', 'Brownie', '12.00'),
('PROD005', 'Brownie Recheado 5x5 (Doce de Leite)', 'Brownie', '12.00'),
('PROD006', 'Brownie Recheado 5x5 (Goiabada)', 'Brownie', '12.00'),
('PROD007', 'Brownie Recheado 5x5 (Leite Ninho)', 'Brownie', '12.00'),
('PROD008', 'Brownie Recheado 5x5 (Maracujá)', 'Brownie', '12.00'),
('PROD009', 'Brownie Recheado 7x7 (Brigadeiro)', 'Brownie', '17.00'),
('PROD010', 'Brownie Recheado 7x7 (Creme de avelã)', 'Brownie', '17.00'),
('PROD011', 'Brownie Recheado 7x7 (Doce de Leite)', 'Brownie', '17.00'),
('PROD012', 'Brownie Recheado 7x7 (Goiabada)', 'Brownie', '17.00'),
('PROD013', 'Brownie Recheado 7x7 (Leite Ninho)', 'Brownie', '17.00'),
('PROD014', 'Brownie Recheado 7x7 (Maracujá)', 'Brownie', '17.00'),
('PROD015', 'Brownie Simples 5x5', 'Brownie', '6.00'),
('PROD016', 'Brownie Simples 7x7', 'Brownie', '8.00'),
('PROD017', 'Kit 4 Bombons', 'Kit', '18.00')
) AS v(sku,name,category,sale_price)
JOIN public.categories c ON c.name = v.category
RETURNING id, sku, name, sale_price;

INSERT INTO public.historical_import_records(source_key, source_hash, entity_type, source_sheet, payload) VALUES ('CATALOG-SALES-2026-10-17-001', '8ea777ccfc69015ef3562283fd8ea66c21da111005f4b70cadfedae4409652d2', 'catalog_finished_products', '02_Cadastro_Produtos', '{"workbookSha256":"25aa62df5fc9b2e01402e9c242142322d9c6f54a345e800cb947b77865ce5b64","products":[{"sku":"PROD001","name":"Bombom Brownie Unitário","category":"Bombom","type":"finished_product","unit":"unit","isActive":true,"salePrice":"5.00"},{"sku":"PROD002","name":"Bordinhas","category":"Bordinha","type":"finished_product","unit":"unit","isActive":true,"salePrice":"5.00"},{"sku":"PROD003","name":"Brownie Recheado 5x5 (Brigadeiro)","category":"Brownie","type":"finished_product","unit":"unit","isActive":true,"salePrice":"12.00"},{"sku":"PROD004","name":"Brownie Recheado 5x5 (Creme de Avelã)","category":"Brownie","type":"finished_product","unit":"unit","isActive":true,"salePrice":"12.00"},{"sku":"PROD005","name":"Brownie Recheado 5x5 (Doce de Leite)","category":"Brownie","type":"finished_product","unit":"unit","isActive":true,"salePrice":"12.00"},{"sku":"PROD006","name":"Brownie Recheado 5x5 (Goiabada)","category":"Brownie","type":"finished_product","unit":"unit","isActive":true,"salePrice":"12.00"},{"sku":"PROD007","name":"Brownie Recheado 5x5 (Leite Ninho)","category":"Brownie","type":"finished_product","unit":"unit","isActive":true,"salePrice":"12.00"},{"sku":"PROD008","name":"Brownie Recheado 5x5 (Maracujá)","category":"Brownie","type":"finished_product","unit":"unit","isActive":true,"salePrice":"12.00"},{"sku":"PROD009","name":"Brownie Recheado 7x7 (Brigadeiro)","category":"Brownie","type":"finished_product","unit":"unit","isActive":true,"salePrice":"17.00"},{"sku":"PROD010","name":"Brownie Recheado 7x7 (Creme de avelã)","category":"Brownie","type":"finished_product","unit":"unit","isActive":true,"salePrice":"17.00"},{"sku":"PROD011","name":"Brownie Recheado 7x7 (Doce de Leite)","category":"Brownie","type":"finished_product","unit":"unit","isActive":true,"salePrice":"17.00"},{"sku":"PROD012","name":"Brownie Recheado 7x7 (Goiabada)","category":"Brownie","type":"finished_product","unit":"unit","isActive":true,"salePrice":"17.00"},{"sku":"PROD013","name":"Brownie Recheado 7x7 (Leite Ninho)","category":"Brownie","type":"finished_product","unit":"unit","isActive":true,"salePrice":"17.00"},{"sku":"PROD014","name":"Brownie Recheado 7x7 (Maracujá)","category":"Brownie","type":"finished_product","unit":"unit","isActive":true,"salePrice":"17.00"},{"sku":"PROD015","name":"Brownie Simples 5x5","category":"Brownie","type":"finished_product","unit":"unit","isActive":true,"salePrice":"6.00"},{"sku":"PROD016","name":"Brownie Simples 7x7","category":"Brownie","type":"finished_product","unit":"unit","isActive":true,"salePrice":"8.00"},{"sku":"PROD017","name":"Kit 4 Bombons","category":"Kit","type":"finished_product","unit":"unit","isActive":true,"salePrice":"18.00"}],"reference":"CATALOG-SALES-2026-10-17-001","projectId":"steep-brook-51659857","branchId":"br-lingering-wind-acwh5wap","database":"neondb","sourceSheet":"02_Cadastro_Produtos","scope":"17 finished products only; no stock, recipes, purchases, sales or historical events"}'::jsonb);

INSERT INTO public.operational_audit_events(action, entity_type, entity_id, operation_reference, reason)
SELECT 'catalog.product.import', 'product', id::text, 'CATALOG-SALES-2026-10-17-001', 'Cadastro solicitado explicitamente pelo usuario nesta conversa e executado por Codex via MCP; identidade Auth nao atribuida. Fonte workbook SHA256 25aa62df5fc9b2e01402e9c242142322d9c6f54a345e800cb947b77865ce5b64; somente produtos finais, sem estoque.'
FROM public.products WHERE sku IN ('PROD001','PROD002','PROD003','PROD004','PROD005','PROD006','PROD007','PROD008','PROD009','PROD010','PROD011','PROD012','PROD013','PROD014','PROD015','PROD016','PROD017');

DO $guard$ BEGIN
IF (SELECT count(*) FROM public.products) <> 17 THEN RAISE EXCEPTION 'Unexpected product count'; END IF;
IF (SELECT count(*) FROM jsonb_to_recordset('[{"sku":"PROD001","name":"Bombom Brownie Unitário","category":"Bombom","sale_price":"5.00"},{"sku":"PROD002","name":"Bordinhas","category":"Bordinha","sale_price":"5.00"},{"sku":"PROD003","name":"Brownie Recheado 5x5 (Brigadeiro)","category":"Brownie","sale_price":"12.00"},{"sku":"PROD004","name":"Brownie Recheado 5x5 (Creme de Avelã)","category":"Brownie","sale_price":"12.00"},{"sku":"PROD005","name":"Brownie Recheado 5x5 (Doce de Leite)","category":"Brownie","sale_price":"12.00"},{"sku":"PROD006","name":"Brownie Recheado 5x5 (Goiabada)","category":"Brownie","sale_price":"12.00"},{"sku":"PROD007","name":"Brownie Recheado 5x5 (Leite Ninho)","category":"Brownie","sale_price":"12.00"},{"sku":"PROD008","name":"Brownie Recheado 5x5 (Maracujá)","category":"Brownie","sale_price":"12.00"},{"sku":"PROD009","name":"Brownie Recheado 7x7 (Brigadeiro)","category":"Brownie","sale_price":"17.00"},{"sku":"PROD010","name":"Brownie Recheado 7x7 (Creme de avelã)","category":"Brownie","sale_price":"17.00"},{"sku":"PROD011","name":"Brownie Recheado 7x7 (Doce de Leite)","category":"Brownie","sale_price":"17.00"},{"sku":"PROD012","name":"Brownie Recheado 7x7 (Goiabada)","category":"Brownie","sale_price":"17.00"},{"sku":"PROD013","name":"Brownie Recheado 7x7 (Leite Ninho)","category":"Brownie","sale_price":"17.00"},{"sku":"PROD014","name":"Brownie Recheado 7x7 (Maracujá)","category":"Brownie","sale_price":"17.00"},{"sku":"PROD015","name":"Brownie Simples 5x5","category":"Brownie","sale_price":"6.00"},{"sku":"PROD016","name":"Brownie Simples 7x7","category":"Brownie","sale_price":"8.00"},{"sku":"PROD017","name":"Kit 4 Bombons","category":"Kit","sale_price":"18.00"}]'::jsonb) AS e(sku text,name text,category text,sale_price text) JOIN public.products p ON p.sku=e.sku JOIN public.categories c ON c.id=p.category_id WHERE p.name=e.name AND c.name=e.category AND c.is_active AND p.sale_price=e.sale_price::numeric AND p.product_type='finished_product' AND p.measurement_unit='unit' AND p.is_active) <> 17 THEN RAISE EXCEPTION 'Catalog readback mismatch'; END IF;
IF (SELECT count(*) FROM public.operational_audit_events WHERE operation_reference='CATALOG-SALES-2026-10-17-001' AND action='catalog.product.import') <> 17 THEN RAISE EXCEPTION 'Audit mismatch'; END IF;
END $guard$;

SELECT p.id,p.sku,p.name,c.name AS category,p.sale_price,p.is_active FROM public.products p JOIN public.categories c ON c.id=p.category_id ORDER BY p.sku;
COMMIT;
