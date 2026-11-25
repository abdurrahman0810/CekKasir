import { useMemo } from "react";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  Banknote,
  ChevronRight,
  CreditCard,
  Receipt,
  TrendingUp,
} from "lucide-react";
import type { Order, OrderItem } from "../types";

type Props = {
  orders: Order[];
  items: OrderItem[];
  onOpenOrder: (order: Order) => void;
};

const formatIDR = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const sameDay = (value: string) =>
  new Date(value).toDateString() === new Date().toDateString();

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const isCashPayment = (method?: string | null) =>
  /tunai|cash/i.test(method ?? "");

export default function DashboardPage({ orders, items, onOpenOrder }: Props) {
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  const today = useMemo(
    () =>
      orders
        .filter((order) => sameDay(order.created_at))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
    [orders],
  );

  const valid = useMemo(
    () =>
      today.filter(
        (order) =>
          !order.voided_at &&
          !["void", "cancelled", "canceled"].includes(
            (order.status ?? "").toLowerCase(),
          ),
      ),
    [today],
  );

  const voidedCount = today.length - valid.length;

  const {
    revenue,
    profit,
    margin,
    avgOrder,
    cash,
    cashCount,
    digital,
    digitalCount,
  } = useMemo(() => {
    const validIds = new Set(valid.map((order) => order.id));
    const rev = valid.reduce(
      (sum, order) => sum + Number(order.total_amount ?? 0),
      0,
    );
    const prof = items
      .filter((item) => validIds.has(item.order_id))
      .reduce(
        (sum, item) =>
          sum +
          (Number(item.price_at_purchase) -
            Number(item.cost_at_purchase ?? 0)) *
            Number(item.quantity),
        0,
      );

    const cashOrders = valid.filter((order) =>
      isCashPayment(order.payment_method),
    );
    const cashVal = cashOrders.reduce(
      (sum, order) => sum + Number(order.total_amount ?? 0),
      0,
    );

    return {
      revenue: rev,
      profit: prof,
      margin: rev > 0 ? Math.round((prof / rev) * 100) : 0,
      avgOrder: valid.length > 0 ? Math.round(rev / valid.length) : 0,
      cash: cashVal,
      cashCount: cashOrders.length,
      digital: rev - cashVal,
      digitalCount: valid.length - cashOrders.length,
    };
  }, [valid, items]);

  const sources = useMemo(() => {
    const map = valid.reduce<Record<string, number>>((acc, order) => {
      const key = order.order_source || "Lainnya";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [valid]);

  const { bars, maxBar, peakHour } = useMemo(() => {
    const hourly = Array.from({ length: 12 }, (_, index) => {
      const hour = index + 8;
      const count = valid.filter(
        (order) => new Date(order.created_at).getHours() === hour,
      ).length;
      return { hour, count };
    });
    const max = Math.max(1, ...hourly.map((b) => b.count));
    const peak = hourly.reduce(
      (best, cur) => (cur.count > best.count ? cur : best),
      { hour: 8, count: 0 },
    );
    return { bars: hourly, maxBar: max, peakHour: peak };
  }, [valid]);

  const cashShare = revenue > 0 ? Math.round((cash / revenue) * 100) : 0;
  const digitalShare = revenue > 0 ? 100 - cashShare : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-[#1f2922]">
      {/* Header Editorial */}
      <header className="flex flex-col justify-between gap-4 border-b border-[#e5dfd4] pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#73796f]">
            <span>Ringkasan Harian</span>
            <span className="text-[#cfc7b8]">/</span>
            <span className="font-mono text-[#525b51]">{todayLabel}</span>
          </div>
          <h1 className="font-display mt-1.5 text-3xl font-medium tracking-tight text-[#1a241d] sm:text-4xl">
            Pantau bisnis Anda.
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-[#666e63]">
            Performa omzet, margin laba, dan arus transaksi kasir hari ini
            secara langsung.
          </p>
        </div>

        
      </header>

      {/* Typographic Ledger Strip */}
      <section className="grid grid-cols-2 divide-y divide-[#e6dfd3] overflow-hidden rounded-2xl border border-[#e6dfd3] bg-[#fffdf8] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <MetricCell
          label="Omzet Kotor"
          value={formatIDR(revenue)}
          sub={`${valid.length} transaksi selesai`}
          tone="accent"
        />
        <MetricCell
          label="Laba Bersih"
          value={formatIDR(profit)}
          sub={
            revenue > 0
              ? `Margin ${margin}% dari HPP`
              : "Dihitung dari HPP item"
          }
        />
        <MetricCell
          label="Rata-rata Struk"
          value={formatIDR(avgOrder)}
          sub="Nilai per transaksi"
        />
        <MetricCell
          label="Total Transaksi"
          value={String(valid.length)}
          sub={
            voidedCount > 0
              ? `${voidedCount} transaksi dibatalkan`
              : "Tanpa pembatalan hari ini"
          }
          tone={voidedCount > 0 ? "muted" : "neutral"}
        />
      </section>

      {/* Main Asymmetric Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kolom Kiri (7 kolom): Grafik + Transaksi Terbaru */}
        <div className="space-y-6 lg:col-span-7">
          {/* Aktivitas Penjualan */}
          <section className="rounded-2xl border border-[#e6dfd3] bg-[#fffdf8]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#efe9de] px-5 py-4">
              <div>
                <h2 className="font-display text-base font-semibold tracking-tight text-[#1f2922]">
                  Aktivitas Penjualan
                </h2>
                <p className="mt-0.5 text-xs text-[#73796f]">
                  Distribusi transaksi selesai per jam (08:00 – 19:00).
                </p>
              </div>

              {peakHour.count > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[#d9e4dc] bg-[#f2f7f3] px-2.5 py-1 font-mono text-[11px] font-medium text-[#2f5d3e]">
                  <TrendingUp size={12} />
                  Puncak {String(peakHour.hour).padStart(2, "0")}:00 (
                  {peakHour.count})
                </span>
              ) : (
                <span className="font-mono text-[11px] font-semibold tracking-wider text-[#838a80]">
                  HARI INI
                </span>
              )}
            </div>

            <div className="px-5 pb-4 pt-6">
              <div className="relative flex h-40 items-end gap-2 border-b border-[#e6dfd3] pb-1">
                {/* Garis bantu horizontal tipis */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-full">
                  <div className="h-1/3 border-t border-dashed border-[#efe9de]" />
                  <div className="h-1/3 border-t border-dashed border-[#efe9de]" />
                  <div className="h-1/3 border-t border-dashed border-[#efe9de]" />
                </div>

                {bars.map(({ hour, count }, index) => {
                  const isPeak = peakHour.count > 0 && count === peakHour.count;
                  const heightPct =
                    count === 0 ? 4 : Math.max(10, (count / maxBar) * 100);

                  return (
                    <div
                      key={hour}
                      className="group relative z-10 flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                    >
                      {/* Tooltip ringan saat hover */}
                      <span className="pointer-events-none mb-1.5 -translate-y-0.5 rounded bg-[#1f2922] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#fffdf8] opacity-0 transition-opacity group-hover:opacity-100">
                        {count}
                      </span>

                      <motion.div
                        className={`w-full max-w-[26px] rounded-t-md transition-colors ${
                          count === 0
                            ? "bg-[#ece6db]"
                            : isPeak
                              ? "bg-[#2f5d3e]"
                              : "bg-[#6c8a67] group-hover:bg-[#365a42]"
                        }`}
                        initial={{ height: 4 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{
                          type: "spring",
                          stiffness: 180,
                          damping: 22,
                          delay: index * 0.02,
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Label jam */}
              <div className="mt-2 flex gap-2">
                {bars.map(({ hour }, index) => (
                  <div key={hour} className="min-w-0 flex-1 text-center">
                    <span className="font-mono text-[10px] text-[#838a80]">
                      {index % 2 === 0
                        ? `${String(hour).padStart(2, "0")}`
                        : ""}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#f0e9df] pt-3 text-xs text-[#73796f]">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-xs bg-[#2f5d3e]" />
                  <span>Jam tersibuk</span>
                  <span className="ml-2 size-2 rounded-xs bg-[#6c8a67]" />
                  <span>Transaksi selesai</span>
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-[#2f5d3e]">
                  <ArrowUpRight size={13} />
                  Realtime
                </span>
              </div>
            </div>
          </section>

          {/* Transaksi Terbaru */}
          <section className="rounded-2xl border border-[#e6dfd3] bg-[#fffdf8]">
            <div className="flex items-center justify-between border-b border-[#efe9de] px-5 py-4">
              <div>
                <h2 className="font-display text-base font-semibold tracking-tight text-[#1f2922]">
                  Transaksi Terbaru
                </h2>
                <p className="mt-0.5 text-xs text-[#73796f]">
                  Klik baris transaksi untuk melihat detail struk.
                </p>
              </div>
              <span className="rounded-md bg-[#f4efe5] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#5b6257]">
                {today.length} TOTAL
              </span>
            </div>

            {today.length ? (
              <div className="divide-y divide-[#f0e9df]">
                {today.slice(0, 7).map((order) => {
                  const isVoid = Boolean(order.voided_at);
                  return (
                    <button
                      type="button"
                      key={order.id}
                      onClick={() => onOpenOrder(order)}
                      className="group flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-[#faf6ef]/80"
                    >
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-xl border ${
                          isVoid
                            ? "border-[#e8cbc4] bg-[#faf0ed] text-[#a3453c]"
                            : "border-[#dce6de] bg-[#f1f6f2] text-[#365a42]"
                        }`}
                      >
                        <Receipt size={16} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-[#1f2922]">
                            {order.customer_name || "Pelanggan Umum"}
                          </span>
                          {order.order_source && (
                            <span className="hidden rounded bg-[#f2eee5] px-1.5 py-0.5 text-[10px] font-medium text-[#666e63] sm:inline">
                              {order.order_source}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#7b8278]">
                          <span className="font-mono text-[11px]">
                            {formatTime(order.created_at)}
                          </span>
                          <span>·</span>
                          <span className="truncate">
                            {order.payment_method || "Pembayaran"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`tabular-nums text-sm font-semibold ${
                            isVoid
                              ? "text-[#9b3d35] line-through decoration-[#c9847c]"
                              : "text-[#1f2922]"
                          }`}
                        >
                          {formatIDR(Number(order.total_amount ?? 0))}
                        </div>
                        <div
                          className={`mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                            isVoid ? "text-[#a3453c]" : "text-[#365a42]"
                          }`}
                        >
                          {isVoid ? "Dibatalkan" : order.status || "Selesai"}
                        </div>
                      </div>

                      <ChevronRight
                        size={15}
                        className="shrink-0 text-[#b8b1a5] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1f2922]"
                      />
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Belum ada transaksi hari ini"
                description="Setiap pesanan yang masuk dari kasir akan langsung tampil di sini."
              />
            )}
          </section>
        </div>

        {/* Kolom Kanan (5 kolom): Metode Pembayaran + Sumber Pesanan */}
        <aside className="space-y-6 lg:col-span-5">
          {/* Metode Pembayaran */}
          <section className="rounded-2xl border border-[#e6dfd3] bg-[#fffdf8]">
            <div className="border-b border-[#efe9de] px-5 py-4">
              <h2 className="font-display text-base font-semibold tracking-tight text-[#1f2922]">
                Metode Pembayaran
              </h2>
              <p className="mt-0.5 text-xs text-[#73796f]">
                Komposisi pemasukan tunai dan non-tunai hari ini.
              </p>

              {/* Stacked Proportion Bar */}
              <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[#efe9de]">
                {revenue > 0 && (
                  <>
                    <div
                      className="h-full bg-[#365a42] transition-all duration-500"
                      style={{ width: `${cashShare}%` }}
                    />
                    <div
                      className="h-full bg-[#766285] transition-all duration-500"
                      style={{ width: `${digitalShare}%` }}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="divide-y divide-[#f0e9df]">
              <PayRow
                icon={Banknote}
                label="Tunai"
                value={cash}
                count={cashCount}
                share={cashShare}
                dotClass="bg-[#365a42]"
              />
              <PayRow
                icon={CreditCard}
                label="Non-tunai / QRIS"
                value={digital}
                count={digitalCount}
                share={digitalShare}
                dotClass="bg-[#766285]"
              />
            </div>
          </section>

          {/* Sumber Pesanan */}
          <section className="rounded-2xl border border-[#e6dfd3] bg-[#fffdf8]">
            <div className="flex items-center justify-between border-b border-[#efe9de] px-5 py-4">
              <div>
                <h2 className="font-display text-base font-semibold tracking-tight text-[#1f2922]">
                  Sumber Pesanan
                </h2>
                <p className="mt-0.5 text-xs text-[#73796f]">
                  Kanal transaksi yang paling aktif hari ini.
                </p>
              </div>
              <span className="font-mono text-[11px] font-semibold text-[#838a80]">
                {sources.length} KANAL
              </span>
            </div>

            {sources.length ? (
              <div className="space-y-4 px-5 py-4">
                {sources.map(([source, count]) => {
                  const pct = Math.round(
                    (count / Math.max(1, valid.length)) * 100,
                  );
                  return (
                    <div key={source}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="font-medium text-[#28352c]">
                          {source}
                        </span>
                        <div className="flex items-baseline gap-2 tabular-nums">
                          <span className="font-semibold text-[#1f2922]">
                            {count}
                          </span>
                          <span className="w-9 text-right font-mono text-[11px] text-[#838a80]">
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#efe9de]">
                        <div
                          className="h-full rounded-full bg-[#766285] transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Belum ada pesanan"
                description="Distribusi kanal pesanan akan muncul setelah ada transaksi."
              />
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "accent" | "muted";
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#7a8076]">
        {label}
      </p>
      <p
        className={`tabular-nums font-display mt-1.5 truncate text-xl font-semibold tracking-tight sm:text-2xl ${
          tone === "accent"
            ? "text-[#284b34]"
            : tone === "muted"
              ? "text-[#1f2922]"
              : "text-[#1f2922]"
        }`}
      >
        {value}
      </p>
      <p
        className={`mt-0.5 text-xs ${
          tone === "muted" ? "text-[#9b3d35]" : "text-[#838a80]"
        }`}
      >
        {sub}
      </p>
    </div>
  );
}

function PayRow({
  icon: Icon,
  label,
  value,
  count,
  share,
  dotClass,
}: {
  icon: typeof Banknote;
  label: string;
  value: number;
  count: number;
  share: number;
  dotClass: string;
}) {
  return (
    <div className="flex items-center gap-3.5 px-5 py-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#e6dfd3] bg-[#faf7f1] text-[#4c574d]">
        <Icon size={16} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${dotClass}`} />
          <span className="truncate text-sm font-medium text-[#1f2922]">
            {label}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[#7b8278]">
          {count} transaksi · <span className="font-mono">{share}%</span>
        </p>
      </div>

      <strong className="tabular-nums whitespace-nowrap text-sm font-semibold text-[#1f2922]">
        {formatIDR(value)}
      </strong>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="grid size-9 place-items-center rounded-full border border-[#e6dfd3] bg-[#faf7f1] text-[#838a80]">
        <Receipt size={16} />
      </div>
      <p className="mt-2.5 text-sm font-medium text-[#28352c]">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-[#838a80]">{description}</p>
    </div>
  );
}
