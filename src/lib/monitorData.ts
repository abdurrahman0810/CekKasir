import { supabase } from './supabase'
import type { ApprovalEntry, AuditEntry, CashierSession, MonitorData, Order, OrderItem, StockVariant, UserProfile } from '../types'

const startOfToday = () => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

async function readRows<T>(name: string, query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>, errors: string[]): Promise<T[]> {
  const { data, error } = await query
  if (error) {
    errors.push(`${name}: ${error.message}`)
    return []
  }
  return data ?? []
}

export async function loadMonitorData(): Promise<MonitorData> {
  const empty: MonitorData = { orders: [], items: [], sessions: [], profiles: [], audit: [], approvals: [], failures: [], stock: [], errors: [] }
  if (!supabase) return { ...empty, errors: ['Supabase belum dikonfigurasi pada file .env.'] }
  const errors: string[] = []
  const since = startOfToday()

  const [orders, sessions, audit, approvals, failures, stock] = await Promise.all([
    readRows<Order>('orders', supabase.from('orders').select('id,order_source,customer_name,total_amount,payment_method,status,created_at,user_id,discount_amount,discount_approved_by,created_by,amount_paid,change_amount,void_reason,voided_by,voided_at').gte('created_at', since).order('created_at', { ascending: false }).limit(300), errors),
    readRows<CashierSession>('cashier_active_sessions', supabase.from('cashier_active_sessions').select('id,user_id'), errors),
    readRows<AuditEntry>('audit_logs', supabase.from('audit_logs').select('id,aksi,detail,dilakukan_oleh,created_at').order('created_at', { ascending: false }).limit(30), errors),
    readRows<ApprovalEntry>('discount_approvals', supabase.from('discount_approvals').select('*').order('created_at', { ascending: false }).limit(15), errors),
    readRows<ApprovalEntry>('approval_failures', supabase.from('approval_failures').select('*').limit(15), errors),
    readRows<StockVariant>('product_variants', supabase.from('product_variants').select('id,product_id,size,color,stock,barcode,products(name,image_url)').lte('stock', 5).order('stock', { ascending: true }), errors)
  ])

  const goodOrders = orders.filter(order => !order.voided_at && !['void', 'cancelled', 'canceled'].includes((order.status ?? '').toLowerCase()))
  const ids = goodOrders.map(order => order.id)
  const items = ids.length
    ? await readRows<OrderItem>('order_items', supabase.from('order_items').select('id,order_id,quantity,price_at_purchase,cost_at_purchase').in('order_id', ids), errors)
    : []

  const profileIds = [...new Set([
    ...sessions.map(session => session.user_id),
    ...orders.flatMap(order => [order.created_by, order.user_id, order.voided_by]).filter((id): id is string => Boolean(id))
  ])]
  const profiles = profileIds.length
    ? await readRows<UserProfile>('user_profiles', supabase.from('user_profiles').select('id,full_name,role,is_active,phone').in('id', profileIds), errors)
    : []
  const profileMap = new Map(profiles.map(profile => [profile.id, profile]))
  const variants = stock.map(variant => ({ ...variant, product: variant.product as StockVariant['product'] }))

  return {
    orders,
    items,
    sessions: sessions.map(session => ({ ...session, profile: profileMap.get(session.user_id) })),
    profiles,
    audit,
    approvals,
    failures,
    stock: variants,
    errors
  }
}
