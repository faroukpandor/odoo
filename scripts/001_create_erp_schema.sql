-- Drop existing tables if they exist (for development)
drop table if exists public.invoices cascade;
drop table if exists public.purchase_orders cascade;
drop table if exists public.customers cascade;
drop table if exists public.suppliers cascade;
drop table if exists public.inventory_items cascade;
drop table if exists public.stock_movements cascade;
drop table if exists public.employees cascade;
drop table if exists public.payroll cascade;
drop table if exists public.company_settings cascade;
drop table if exists public.organizations cascade;

-- Organizations (multi-tenant)
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan text default 'free',
  status text default 'active',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Company Settings
create table public.company_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  company_name text not null,
  email text,
  phone text,
  address text,
  city text,
  country text,
  tax_id text,
  currency text default 'USD',
  fiscal_year_start int default 1,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(org_id)
);

-- Employees
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  position text,
  department text,
  salary numeric(12, 2),
  hire_date date,
  status text default 'active',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Customers (CRM)
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  company text,
  address text,
  city text,
  country text,
  lifetime_value numeric(12, 2) default 0,
  status text default 'active',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Suppliers
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  payment_terms text,
  status text default 'active',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Inventory Items
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  sku text not null,
  name text not null,
  description text,
  category text,
  quantity_on_hand int default 0,
  reorder_level int default 10,
  unit_cost numeric(10, 2),
  unit_price numeric(10, 2),
  status text default 'active',
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(org_id, sku)
);

-- Stock Movements
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  movement_type text not null, -- 'in', 'out', 'adjustment'
  quantity int not null,
  reference_type text, -- 'purchase_order', 'invoice', 'adjustment'
  reference_id text,
  notes text,
  created_at timestamp default now()
);

-- Invoices
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id),
  invoice_number text not null,
  amount numeric(12, 2),
  tax_amount numeric(12, 2),
  total_amount numeric(12, 2),
  status text default 'draft',
  issue_date date,
  due_date date,
  notes text,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(org_id, invoice_number)
);

-- Purchase Orders
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid references public.suppliers(id),
  po_number text not null,
  amount numeric(12, 2),
  tax_amount numeric(12, 2),
  total_amount numeric(12, 2),
  status text default 'draft',
  order_date date,
  expected_delivery_date date,
  notes text,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(org_id, po_number)
);

-- Payroll
create table public.payroll (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  period_start date,
  period_end date,
  gross_amount numeric(12, 2),
  tax_amount numeric(12, 2),
  net_amount numeric(12, 2),
  status text default 'draft',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Enable RLS on all tables
alter table public.organizations enable row level security;
alter table public.company_settings enable row level security;
alter table public.employees enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.invoices enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.payroll enable row level security;

-- RLS Policies for organizations
create policy "orgs_owner_full_access" on public.organizations
  for all using (auth.uid() = owner_id);

create policy "orgs_select_owned" on public.organizations
  for select using (auth.uid() = owner_id);

-- Helper function to check org membership
create or replace function public.user_is_org_member(org_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.organizations
    where id = org_id and owner_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Generic RLS policies for org-scoped tables
create policy "company_settings_org_member" on public.company_settings
  for all using (public.user_is_org_member(org_id));

create policy "employees_org_member" on public.employees
  for all using (public.user_is_org_member(org_id));

create policy "customers_org_member" on public.customers
  for all using (public.user_is_org_member(org_id));

create policy "suppliers_org_member" on public.suppliers
  for all using (public.user_is_org_member(org_id));

create policy "inventory_items_org_member" on public.inventory_items
  for all using (public.user_is_org_member(org_id));

create policy "stock_movements_org_member" on public.stock_movements
  for all using (public.user_is_org_member(org_id));

create policy "invoices_org_member" on public.invoices
  for all using (public.user_is_org_member(org_id));

create policy "purchase_orders_org_member" on public.purchase_orders
  for all using (public.user_is_org_member(org_id));

create policy "payroll_org_member" on public.payroll
  for all using (public.user_is_org_member(org_id));
