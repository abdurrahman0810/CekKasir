import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Activity, Boxes, ChartNoAxesCombined, LayoutDashboard, LoaderCircle, RefreshCw, ShieldAlert, Users, X } from 'lucide-react'
import { loadMonitorData } from '../lib/monitorData'
import { supabase } from '../lib/supabase'
import type { MonitorData, Order } from '../types'

type PageId = 'dashboard' | 'shifts' | 'audit' | 'stock'
const pages: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'shifts', label: 'Kasir & Shift', icon: Users },
  { id: 'audit', label: 'Audit & Alert', icon: ShieldAlert },
  { id: 'stock', label: 'Pantauan Stok', icon: Boxes }
]
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const ShiftsPage = lazy(() => import('../pages/ShiftsPage'))
const AuditPage = lazy(() => import('../pages/AuditPage'))
const StockPage = lazy(() => import('../pages/StockPage'))
const emptyData: MonitorData = { orders: [], items: [], sessions: [], profiles: [], audit: [], approvals: [], failures: [], stock: [], errors: [] }

export default function OwnerLayout() {
  const [page, setPage] = useState<PageId>('dashboard')
  const [data, setData] = useState<MonitorData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const refresh = useCallback(async () => {
    setLoading(true)
    const next = await loadMonitorData()
    setData(next)
    setUpdatedAt(new Date())
    setLoading(false)
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    const client = supabase
    if (!client) return
    const channel = client.channel('owner-monitor-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { void refresh() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => { void refresh() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discount_approvals' }, () => { void refresh() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_failures' }, () => { void refresh() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cashier_active_sessions' }, () => { void refresh() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, () => { void refresh() })
      .subscribe(status => setLive(status === 'SUBSCRIBED'))
    return () => { void client.removeChannel(channel) }
  }, [refresh])

  const title = pages.find(item => item.id === page)?.label ?? 'Ringkasan'
  const currentPage = useMemo(() => {
    if (page === 'dashboard') return <DashboardPage orders={data.orders} items={data.items} onOpenOrder={setSelectedOrder}/>
    if (page === 'shifts') return <ShiftsPage sessions={data.sessions} orders={data.orders}/>
    if (page === 'audit') return <AuditPage orders={data.orders} audit={data.audit} approvals={data.approvals} failures={data.failures}/>
    return <StockPage stock={data.stock}/>
  }, [page, data])

  return <div className="flex min-h-[calc(100dvh-40px)] bg-[radial-gradient(ellipse_at_78%_0%,#eee8dc,transparent_38%),#f5f1e8]">
    <aside className="sticky top-0 hidden h-[calc(100dvh-40px)] w-[218px] shrink-0 flex-col border-r border-[#e4ded3] bg-[#f0ece3]/90 px-3 py-5 lg:flex">
      <div className="mb-7 flex items-center gap-2.5 px-2"><BrandMark/><div className="flex flex-col gap-1"><b className="font-display text-[10px] tracking-[.08em]">HEBBUNA</b><small className="text-[9px] tracking-[.1em] text-[#73796f]">OWNER MONITOR</small></div></div>
      <p className="mb-2 px-2 text-[9px] font-bold tracking-[.13em] text-[#73796f]">MENU UTAMA</p>
      <PageNav pages={pages} current={page} onSelect={setPage} alertCount={data.failures.length} desktop/>
      <div className="mt-auto flex items-center gap-2 px-2 py-3 text-[10px] text-[#73796f]"><span className={`size-1.5 rounded-full ${live ? 'bg-[#365a42] shadow-[0_0_8px_#365a4277]' : 'bg-[#806e73]'}`}/>{live ? 'Realtime tersambung' : 'Menyiapkan koneksi'}</div>
    </aside>

    <div className="min-w-0 flex-1 pb-[calc(65px+env(safe-area-inset-bottom))] lg:pb-0">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[#e4ded3] bg-[#fffdf8]/95 px-4 backdrop-blur-xl sm:px-6 lg:h-[59px] lg:px-7">
        <div className="flex items-center gap-2 text-[11px] text-[#365a42] lg:hidden"><ChartNoAxesCombined size={18}/><b className="font-display text-[#28352c]">HEBBUNA <span className="font-sans text-[10px] text-[#73796f]">OWNER</span></b></div>
        <div className="hidden font-display text-[11px] font-semibold text-[#28352c] lg:block">{title}</div>
        <div className="flex items-center gap-2.5"><span className={`flex items-center gap-1.5 text-[10px] font-bold tracking-[.08em] ${live ? 'text-[#365a42]' : 'text-[#746e74]'}`}><i className={`size-1.5 rounded-full ${live ? 'bg-[#365a42] shadow-[0_0_8px_#365a4277]' : 'bg-[#806e73]'}`}/>{live ? 'LIVE' : 'SYNC'}</span><button onClick={() => void refresh()} disabled={loading} aria-label="Segarkan data" className="grid size-8 place-items-center rounded-[10px] border border-[#e4ded3] bg-[#f0ece3] text-[#697269] hover:bg-[#eee9df] disabled:opacity-50">{loading ? <LoaderCircle className="animate-spin" size={16}/> : <RefreshCw size={16}/>}</button></div>
      </header>

      <main className="mx-auto w-full max-w-[900px] px-3.5 py-5 sm:px-6 sm:py-7 lg:px-7">
        {data.errors.length > 0 && <div className="mb-3 flex items-start gap-2 rounded-xl border border-[#e8cbc4] bg-[#f4e4df] p-2.5 text-[10px] leading-relaxed text-[#8f3e36]"><ShieldAlert size={16} className="shrink-0"/><span className="min-w-0 flex-1 break-words">{data.errors[0]}</span><button onClick={() => void refresh()} className="shrink-0 text-[10px] underline">Coba lagi</button></div>}
        <AnimatePresence mode="wait"><motion.div key={page} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ type: 'spring', stiffness: 240, damping: 26 }}><Suspense fallback={<div className="grid min-h-20 place-items-center text-xs text-[#73796f]">Membuka halaman…</div>}>{currentPage}</Suspense></motion.div></AnimatePresence>
        {updatedAt && <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-[#73796f]"><Activity size={13}/>{live ? 'Pembaruan realtime aktif' : `Diperbarui ${updatedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}</div>}
      </main>
    </div>

    <nav aria-label="Navigasi halaman" className="fixed inset-x-0 bottom-0 z-20 grid h-[calc(65px+env(safe-area-inset-bottom))] grid-cols-4 border-t border-[#e4ded3] bg-[#f0ece3]/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur-xl lg:hidden"><PageNav pages={pages} current={page} onSelect={setPage} alertCount={data.failures.length}/></nav>

    <AnimatePresence>{selectedOrder && <><motion.button className="fixed inset-0 z-30 border-0 bg-black/60 backdrop-blur-sm" aria-label="Tutup detail transaksi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedOrder(null)}/><motion.section className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[680px] rounded-t-[22px] border border-b-0 border-[#e4ded3] bg-[#fffdf8] px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-2 shadow-2xl shadow-black/50" role="dialog" aria-modal="true" aria-labelledby="order-sheet-title" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 250 }}><div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#c9c3b8]"/><div className="flex items-center justify-between"><p className="text-[10px] font-bold tracking-[.15em] text-[#73796f]">DETAIL TRANSAKSI</p><button aria-label="Tutup" onClick={() => setSelectedOrder(null)} className="grid size-8 place-items-center rounded-lg bg-[#e4ded3] text-[#4e594f]"><X size={17}/></button></div><h2 id="order-sheet-title" className="mt-2 font-display text-lg font-semibold">{selectedOrder.customer_name || 'Pelanggan'}</h2><div className="py-3 text-[22px] font-bold tracking-tight text-[#365a42]">Rp {Number(selectedOrder.total_amount ?? 0).toLocaleString('id-ID')}</div><Detail label="Waktu" value={new Date(selectedOrder.created_at).toLocaleString('id-ID')}/><Detail label="Metode bayar" value={selectedOrder.payment_method || '—'}/><Detail label="Sumber pesanan" value={selectedOrder.order_source || '—'}/>{selectedOrder.voided_at && <div className="mt-3 flex flex-col gap-1.5 rounded-xl bg-[#f1dfda] p-3 text-[10px] text-[#a3453c]"><b>Transaksi dibatalkan</b><span className="text-[#75433d]">{selectedOrder.void_reason || 'Alasan tidak dicantumkan'}</span></div>}</motion.section></>}</AnimatePresence>
  </div>
}

function PageNav({ pages: items, current, onSelect, alertCount, desktop = false }: { pages: typeof pages; current: PageId; onSelect: (page: PageId) => void; alertCount: number; desktop?: boolean }) {
  return <>{items.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => onSelect(id)} className={desktop ? `relative my-0.5 flex min-h-[39px] items-center gap-2.5 rounded-lg px-2.5 text-left text-[10px] ${current === id ? 'bg-[#e1e9dc] text-[#365a42]' : 'text-[#73796f] hover:bg-white/5'}` : `relative flex flex-col items-center justify-center gap-1 text-[#73796f] ${current === id ? 'text-[#365a42]' : ''}`}><span className="relative grid place-items-center">{desktop && current === id && <i className="absolute -left-2.5 h-5 w-0.5 rounded bg-[#365a42]"/>}<Icon size={desktop ? 18 : 19}/>{id === 'audit' && alertCount > 0 && <i className="absolute -right-1 -top-0.5 size-1.5 rounded-full bg-[#a3453c]"/>}</span><span className={desktop ? '' : 'text-[9px]'}>{label}</span></button>)}</>
}

function BrandMark() { return <span className="grid size-9 place-items-center rounded-[11px] bg-[#e1e9dc] text-[#365a42]"><ChartNoAxesCombined size={20}/></span> }
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-3 border-t border-[#e4ded3] py-2.5 text-[10px] text-[#73796f]"><span>{label}</span><b className="text-right font-medium text-[#28352c]">{value}</b></div> }
