export type Order = {
  id: string
  order_source: string | null
  customer_name: string | null
  total_amount: number | null
  payment_method: string | null
  status: string | null
  created_at: string
  user_id: string | null
  discount_amount: number | null
  discount_approved_by: string | null
  created_by: string | null
  amount_paid: number | null
  change_amount: number | null
  void_reason: string | null
  voided_by: string | null
  voided_at: string | null
}

export type OrderItem = { id: string; order_id: string; quantity: number; price_at_purchase: number; cost_at_purchase: number | null }
export type UserProfile = { id: string; full_name: string | null; role: string | null; is_active: boolean | null; phone: string | null }
export type CashierSession = { id: string; user_id: string; profile?: UserProfile }
export type AuditEntry = { id: string; aksi: string | null; detail: unknown; dilakukan_oleh: string | null; created_at: string }
export type StockVariant = { id: string; product_id: string; size: string | null; color: string | null; stock: number; barcode: string | null; product?: { name: string; image_url: string | null } }
export type ApprovalEntry = { id: string; requested_by?: string; approved_by?: string; amount?: number; created_at?: string; used?: boolean }
export type MonitorData = { orders: Order[]; items: OrderItem[]; sessions: CashierSession[]; profiles: UserProfile[]; audit: AuditEntry[]; approvals: ApprovalEntry[]; failures: ApprovalEntry[]; stock: StockVariant[]; errors: string[] }
