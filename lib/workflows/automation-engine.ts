// Workflow automation engine (Zapier-like but native)
export interface Workflow {
  id: string
  name: string
  triggers: Trigger[]
  actions: Action[]
  conditions: Condition[]
  enabled: boolean
}

export interface Trigger {
  type: "invoice_created" | "inventory_low" | "employee_hired" | "order_received" | "time_based"
  config: Record<string, any>
}

export interface Action {
  type: "send_email" | "create_record" | "update_record" | "notify" | "generate_report"
  config: Record<string, any>
}

export interface Condition {
  field: string
  operator: "equals" | "greater_than" | "less_than" | "contains"
  value: any
}

// Example workflows
export const defaultWorkflows: Workflow[] = [
  {
    id: "auto-low-stock-alert",
    name: "Auto Low Stock Alert",
    enabled: true,
    triggers: [{ type: "inventory_low", config: { threshold: 10 } }],
    actions: [{ type: "send_email", config: { recipients: "manager@company.com", subject: "Low Stock Alert" } }],
    conditions: [],
  },
  {
    id: "auto-invoice-reminder",
    name: "Auto Invoice Reminder",
    enabled: true,
    triggers: [{ type: "time_based", config: { frequency: "daily", time: "09:00" } }],
    actions: [
      { type: "generate_report", config: { type: "overdue_invoices" } },
      { type: "send_email", config: { recipients: "finance@company.com" } },
    ],
    conditions: [{ field: "status", operator: "equals", value: "overdue" }],
  },
  {
    id: "auto-new-employee-welcome",
    name: "Auto New Employee Welcome",
    enabled: true,
    triggers: [{ type: "employee_hired", config: {} }],
    actions: [
      { type: "create_record", config: { table: "notifications", data: "Welcome email" } },
      { type: "notify", config: { message: "New employee onboarded" } },
    ],
    conditions: [],
  },
]
