import { useMemo } from "react";
import { Award, Receipt, UserCheck, Users } from "lucide-react";
import type { CashierSession, Order } from "../types";

type Props = {
  sessions: CashierSession[];
  orders: Order[];
};

const formatIDR = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const getInitials = (name?: string | null) => {
  if (!name?.trim()) return "K";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
};

export default function ShiftsPage({ sessions, orders }: Props) {
  const valid = useMemo(
    () =>
      orders.filter(
        (order) =>
          !order.voided_at &&
          !["void", "cancelled", "canceled"].includes(
            (order.status ?? "").toLowerCase(),
          ),
      ),
    [orders],
  );

  const totalSales = useMemo(
    () =>
      valid.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0),
    [valid],
  );

  const sessionMap = useMemo(() => {
    const map = new Map<string, CashierSession>();
    for (const session of sessions) {
      if (session.user_id) map.set(session.user_id, session);
    }
    return map;
  }, [sessions]);

  const leaderboard = useMemo(() => {
    const grouped = new Map<string, { count: number; total: number }>();
    for (const order of valid) {
      const id = order.created_by || order.user_id || "unknown";
      const entry = grouped.get(id) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += Number(order.total_amount ?? 0);
      grouped.set(id, entry);
    }

    return [...grouped.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([id, sales]) => {
        const session = sessionMap.get(id);
        const name =
          session?.profile?.full_name ||
          (id === "unknown"
            ? "Kasir belum diketahui"
            : `Kasir #${id.slice(0, 6).toUpperCase()}`);
        const role = session?.profile?.role || "Pegawai";
        const share =
          totalSales > 0 ? Math.round((sales.total / totalSales) * 100) : 0;
        const avgTicket =
          sales.count > 0 ? Math.round(sales.total / sales.count) : 0;

        return {
          id,
          name,
          role,
          isActive: Boolean(session),
          count: sales.count,
          total: sales.total,
          share,
          avgTicket,
        };
      });
  }, [valid, sessionMap, totalSales]);

  const salesByUserId = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const row of leaderboard) {
      map.set(row.id, { count: row.count, total: row.total });
    }
    return map;
  }, [leaderboard]);

  const avgPerCashier =
    leaderboard.length > 0 ? Math.round(totalSales / leaderboard.length) : 0;
  const topCashier = leaderboard[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-[#1f2922]">
      {/* Header Editorial */}
      <header className="flex flex-col justify-between gap-4 border-b border-[#e5dfd4] pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#73796f]">
            <span>Operasional</span>
            <span className="text-[#cfc7b8]">/</span>
            <span className="font-mono text-[#525b51]">SHIFT LEDGER</span>
          </div>
          <h1 className="font-display mt-1.5 text-3xl font-medium tracking-tight text-[#1a241d] sm:text-4xl">
            Kasir &amp; Shift
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-[#666e63]">
            Pantau sesi kasir yang sedang bertugas serta kontribusi penjualan
            masing-masing personel.
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2.5 self-start rounded-full border px-3.5 py-2 text-xs font-medium sm:self-auto ${
            sessions.length > 0
              ? "border-[#d3dfd6] bg-[#f1f6f2] text-[#2f5d3e]"
              : "border-[#e6dfd3] bg-[#faf7f1] text-[#73796f]"
          }`}
        >
          {sessions.length > 0 ? (
            <>
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4d845f] opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-[#365a42]" />
              </span>
              <span>
                <strong className="tabular-nums font-semibold">
                  {sessions.length}
                </strong>{" "}
                kasir sedang bertugas
              </span>
            </>
          ) : (
            <>
              <Users size={14} />
              <span>Tidak ada sesi aktif</span>
            </>
          )}
        </div>
      </header>

      {/* Typographic Ledger Strip */}
      <section className="grid grid-cols-2 divide-y divide-[#e6dfd3] overflow-hidden rounded-2xl border border-[#e6dfd3] bg-[#fffdf8] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <MetricCell
          label="Penjualan Hari Ini"
          value={formatIDR(totalSales)}
          sub={`${valid.length} transaksi valid`}
          tone="accent"
        />
        <MetricCell
          label="Kasir Aktif"
          value={String(sessions.length)}
          sub={
            sessions.length > 0
              ? "Sesi tercatat berjalan"
              : "Belum ada sesi dibuka"
          }
        />
        <MetricCell
          label="Rata-rata / Kasir"
          value={formatIDR(avgPerCashier)}
          sub={
            leaderboard.length > 0
              ? `Dari ${leaderboard.length} kasir bertransaksi`
              : "Belum ada transaksi"
          }
        />
        <MetricCell
          label="Kontributor Utama"
          value={topCashier ? `${topCashier.share}%` : "—"}
          sub={topCashier ? topCashier.name : "Menunggu transaksi"}
        />
      </section>

      {/* Main Asymmetric Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kolom Kiri (7 kolom): Performa Penjualan per Kasir */}
        <section className="rounded-2xl border border-[#e6dfd3] bg-[#fffdf8] lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#efe9de] px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold tracking-tight text-[#1f2922]">
                Performa Penjualan
              </h2>
              <p className="mt-0.5 text-xs text-[#73796f]">
                Peringkat omzet dan porsi transaksi berdasarkan kasir.
              </p>
            </div>
            <span className="rounded-md bg-[#f4efe5] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#5b6257]">
              {leaderboard.length} KASIR
            </span>
          </div>

          {leaderboard.length ? (
            <div className="divide-y divide-[#f0e9df]">
              {leaderboard.map((row, index) => {
                const isFirst = index === 0;
                return (
                  <article
                    key={row.id}
                    className="px-5 py-4 transition-colors hover:bg-[#faf6ef]/70"
                  >
                    <div className="flex items-start gap-3.5">
                      <span
                        className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg font-mono text-xs font-semibold ${
                          isFirst
                            ? "bg-[#2f5d3e] text-[#fffdf8]"
                            : "border border-[#e6dfd3] bg-[#faf7f1] text-[#6d766d]"
                        }`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-[#1f2922]">
                              {row.name}
                            </h3>
                            {isFirst && (
                              <span className="inline-flex items-center gap-1 rounded bg-[#eef4f0] px-1.5 py-0.5 text-[10px] font-medium text-[#2f5d3e]">
                                <Award size={10} />
                                Tertinggi
                              </span>
                            )}
                            {row.isActive && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#365a42]">
                                <span className="size-1.5 rounded-full bg-[#365a42]" />
                                Aktif
                              </span>
                            )}
                          </div>

                          <strong className="tabular-nums font-display text-base font-semibold text-[#1f2922]">
                            {formatIDR(row.total)}
                          </strong>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7b8278]">
                          <span>
                            <span className="tabular-nums font-medium text-[#4e594f]">
                              {row.count}
                            </span>{" "}
                            transaksi · rata-rata{" "}
                            <span className="tabular-nums font-mono text-[11px] text-[#4e594f]">
                              {formatIDR(row.avgTicket)}
                            </span>
                          </span>
                          <span className="font-mono text-[11px] font-medium text-[#5b6257]">
                            {row.share}% omzet
                          </span>
                        </div>

                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#efe9de]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isFirst ? "bg-[#365a42]" : "bg-[#7c9475]"
                            }`}
                            style={{ width: `${Math.max(4, row.share)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Receipt size={17} />}
              title="Belum ada penjualan hari ini"
              description="Performa masing-masing kasir akan terhitung otomatis setelah ada transaksi selesai."
            />
          )}
        </section>

        {/* Kolom Kanan (5 kolom): Kasir Sedang Aktif */}
        <aside className="lg:col-span-5">
          <section className="sticky top-6 rounded-2xl border border-[#e6dfd3] bg-[#fffdf8]">
            <div className="flex items-center justify-between border-b border-[#efe9de] px-5 py-4">
              <div>
                <h2 className="font-display text-base font-semibold tracking-tight text-[#1f2922]">
                  Kasir Sedang Aktif
                </h2>
                <p className="mt-0.5 text-xs text-[#73796f]">
                  Personel dengan sesi kasir terbuka saat ini.
                </p>
              </div>
              <span className="rounded-md bg-[#eef4f0] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#2f5d3e]">
                {sessions.length} SESI
              </span>
            </div>

            {sessions.length ? (
              <div className="divide-y divide-[#f0e9df]">
                {sessions.map((session) => {
                  const stats = session.user_id
                    ? salesByUserId.get(session.user_id)
                    : undefined;
                  const fullName =
                    session.profile?.full_name || "Nama kasir tidak ditemukan";

                  return (
                    <div
                      key={session.id}
                      className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-[#faf6ef]/60"
                    >
                      <span className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-[#e5deec] bg-[#f5f0f8] font-display text-xs font-semibold text-[#6b577a]">
                        {getInitials(session.profile?.full_name)}
                        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-[#365a42] ring-2 ring-[#fffdf8]" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#1f2922]">
                          {fullName}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-[#7b8278]">
                          <span className="rounded bg-[#f2eee5] px-1.5 py-0.5 text-[10px] font-medium text-[#5c655c]">
                            {session.profile?.role || "Pegawai"}
                          </span>
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#365a42]">
                            Aktif
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="tabular-nums text-xs font-semibold text-[#1f2922]">
                          {stats ? formatIDR(stats.total) : "Rp 0"}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-[#838a80]">
                          {stats ? `${stats.count} trx` : "Belum ada trx"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={<UserCheck size={17} />}
                title="Belum ada sesi kasir aktif"
                description="Kasir yang sedang login dan membuka shift akan tampil di daftar ini."
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
  tone?: "neutral" | "accent";
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#7a8076]">
        {label}
      </p>
      <p
        className={`tabular-nums font-display mt-1.5 truncate text-xl font-semibold tracking-tight sm:text-2xl ${
          tone === "accent" ? "text-[#284b34]" : "text-[#1f2922]"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-[#838a80]">{sub}</p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="grid size-10 place-items-center rounded-full border border-[#e6dfd3] bg-[#faf7f1] text-[#838a80]">
        {icon}
      </div>
      <p className="mt-3 text-sm font-medium text-[#28352c]">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-[#838a80]">{description}</p>
    </div>
  );
}
