-- Seed sample organization
INSERT INTO public.organizations (name, slug, owner_id, plan, status)
SELECT 'My Company', 'my-company', id, 'free', 'active'
FROM auth.users
WHERE email = 'user@example.com'
LIMIT 1;

-- Add company settings
INSERT INTO public.company_settings (org_id, company_name, email, phone, address, city, country, tax_id, currency)
SELECT id, 'My Company', 'contact@mycompany.com', '+1 (555) 123-4567', '123 Main Street', 'New York', 'USA', 'US123456789', 'USD'
FROM public.organizations
WHERE slug = 'my-company'
LIMIT 1;

-- Add sample employees
INSERT INTO public.employees (org_id, name, email, phone, position, department, salary, hire_date, status)
SELECT 
  o.id,
  'John Smith',
  'john@mycompany.com',
  '+1 (555) 111-2222',
  'Sales Manager',
  'Sales',
  65000,
  '2022-01-15',
  'active'
FROM public.organizations o
WHERE slug = 'my-company'
LIMIT 1;

-- Add sample customers
INSERT INTO public.customers (org_id, name, email, phone, company, city, lifetime_value, status)
SELECT
  o.id,
  'Acme Corporation',
  'contact@acme.com',
  '+1 (555) 999-8888',
  'Acme Corp',
  'Chicago',
  45000,
  'active'
FROM public.organizations o
WHERE slug = 'my-company'
LIMIT 1;

-- Add sample inventory
INSERT INTO public.inventory_items (org_id, sku, name, category, quantity_on_hand, reorder_level, unit_cost, unit_price)
SELECT
  o.id,
  'SKU-001',
  'Widget A',
  'Widgets',
  245,
  50,
  15.00,
  29.99
FROM public.organizations o
WHERE slug = 'my-company'
LIMIT 1;
