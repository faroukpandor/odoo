import { z } from "zod"

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
})

export const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  position: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
  salary: z.number().min(0).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
})

export const inventorySchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  category: z.string().optional().or(z.literal("")),
  quantity_on_hand: z.number().min(0).default(0),
  reorder_level: z.number().min(0).default(0),
  unit_cost: z.number().min(0).optional(),
  unit_price: z.number().min(0).optional(),
})

export const invoiceSchema = z.object({
  invoice_number: z.string().min(1, "Invoice number is required"),
  customer_id: z.string().uuid().optional(),
  amount: z.number().min(0).optional(),
  tax_amount: z.number().min(0).optional(),
  total_amount: z.number().min(0).optional(),
  status: z.enum(["draft", "pending", "paid", "overdue"]).default("draft"),
  issue_date: z.string().optional(),
  due_date: z.string().optional(),
  notes: z.string().optional().or(z.literal("")),
})

export type CustomerInput = z.infer<typeof customerSchema>
export type EmployeeInput = z.infer<typeof employeeSchema>
export type InventoryInput = z.infer<typeof inventorySchema>
export type InvoiceInput = z.infer<typeof invoiceSchema>
