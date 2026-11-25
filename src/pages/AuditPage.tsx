import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import type { ApprovalEntry, AuditEntry, Order } from "../types";

type Props = {
  orders: Order[];
  audit: AuditEntry[];
  approvals: ApprovalEntry[];
  failures: ApprovalEntry[];
};

const formatTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";

const formatIDR = (value?: number | string | null) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const shortId = (value?: string | null) =>
  value ? `#${value.slice(0, 8).toUpperCase()}` : "SISTEM";

export default function AuditPage({
  orders,
  audit,
  approvals,
  failures,
}: Props) {
  const [query, setQuery] = useState("");
  const [alertFilter, setAlertFilter] = useState<
    "all" | "failure" | "approval"
  >("all");

  const voided = useMemo(
    () =>
      orders
        .filter((order) => order.voided_at)
        .sort(
          (a, b) =>
            new Date(b.voided_at ?? 0).getTime() -
            new Date(a.voided_at ?? 0).getTime(),
        ),
    [orders],
  );

  const totalVoidValue = useMemo(
    () =>
      voided.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0),
    [voided],
  );

  const reviewCount = voided.length + failures.length;

  const filteredAudit = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return audit;
    return audit.filter((entry) => {
      const detailStr =
        typeof entry.detail === "string"
          ? entry.detail
          : JSON.stringify(entry.detail ?? {});
      return (
        (entry.aksi ?? "").toLowerCase().includes(q) ||
        (entry.dilakukan_oleh ?? "").toLowerCase().includes(q) ||
        detailStr.toLowerCase().includes(q)
      );
    });
  }, [audit, query]);

  const alerts = useMemo(() => {
    const merged = [
      ...failures.map((entry) => ({
        ...entry,
        status: "failure" as const,
        label: "Persetujuan ditolak / gagal",
      })),
      ...approvals.map((entry) => ({
        ...entry,
        status: "approval" as const,
        label: "Diskon disetujui",
      })),
    ].sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime(),
    );

    if (alertFilter === "all") return merged.slice(0, 24);
    return merged.filter((item) => item.status === alertFilter).slice(0, 24);
  }, [approvals, failures, alertFilter]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-[#1f2922]">
      {/* Header Editorial */}
      <header className="flex flex-col justify-between gap-4 border-b border-[#e5dfd4] pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#73796f]">
            <span>Keamanan & Kepatuhan</span>
            <span className="text-[#cfc7b8]">/</span>
            <span className="font-mono text-[#525b51]">LIVE LEDGER</span>
          </div>
          <h1 className="font-display mt-1.5 text-3xl font-medium tracking-tight text-[#1a241d] sm:text-4xl">
            Audit &amp; Alert
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-[#666e63]">
            Rekam jejak pembatalan transaksi, otorisasi diskon, dan aktivitas
            sensitif kasir.
          </p>
        </div>

        {/* Status Pill */}
        <div
          className={`inline-flex items-center gap-2.5 self-start rounded-full border px-3.5 py-2 text-xs font-medium sm:self-auto ${
            reviewCount > 0
              ? "border-[#e4c4bc] bg-[#faf0ed] text-[#9b3d35]"
              : "border-[#d3dfd6] bg-[#f1f6f2] text-[#2f5d3e]"
          }`}
        >
          {reviewCount > 0 ? (
            <>
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c4564d] opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-[#a3453c]" />
              </span>
              <span>
                <strong className="tabular-nums font-semibold">
                  {reviewCount}
                </strong>{" "}
                item perlu ditinjau
              </span>
            </>
          ) : (
            <>
              <ShieldCheck size={15} />
              <span>Semua aktivitas terpantau aman</span>
            </>
          )}
        </div>
      </header>

      {/* Typographic Ledger Strip (Pengganti KPI Cards generik) */}
      <section className="grid grid-cols-2 divide-y divide-[#e6dfd3] overflow-hidden rounded-2xl border border-[#e6dfd3] bg-[#fffdf8] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <MetricCell
          label="Total Nilai Void"
          value={formatIDR(totalVoidValue)}
          sub={`${voided.length} transaksi dibatalkan`}
          tone={voided.length > 0 ? "danger" : "neutral"}
        />
        <MetricCell
          label="Gagal Persetujuan"
          value={String(failures.length)}
          sub="Otorisasi tidak lolos"
          tone={failures.length > 0 ? "danger" : "neutral"}
        />
        <MetricCell
          label="Diskon Disetujui"
          value={String(approvals.length)}
          sub="Tercatat valid"
        />
        <MetricCell
          label="Entri Log Audit"
          value={String(audit.length)}
          sub="Aktivitas sistem terbaru"
        />
      </section>

      {/* Main Asymmetric Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kolom Kiri (7 kolom): Void + Audit Log */}
        <div className="space-y-6 lg:col-span-7">
          {/* Transaksi Void */}
          <section className="rounded-2xl border border-[#e6dfd3] bg-[#fffdf8]">
            <div className="flex items-center justify-between border-b border-[#efe9de] px-5 py-4">
              <div>
                <h2 className="font-display text-base font-semibold tracking-tight text-[#1f2922]">
                  Transaksi Dibatalkan
                </h2>
                <p className="mt-0.5 text-xs text-[#73796f]">
                  Daftar pesanan yang di-void beserta nominal dan alasannya.
                </p>
              </div>
              <span className="rounded-md bg-[#f5e6e2] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#9b3d35]">
                {voided.length} VOID
              </span>
            </div>

            {voided.length ? (
              <div className="divide-y divide-[#f0e9df]">
                {voided.map((order) => (
                  <article
                    key={order.id}
                    className="group flex flex-col gap-2.5 px-5 py-4 transition-colors hover:bg-[#faf6ef]/70"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded bg-[#a3453c] px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#fffdf8]">
                          <Ban size={10} />
                          VOID
                        </span>
                        <span className="font-mono text-xs text-[#6d766d]">
                          {shortId(order.id)}
                        </span>
                      </div>

                      <span className="tabular-nums font-display text-base font-semibold text-[#1f2922]">
                        {formatIDR(order.total_amount)}
                      </span>
                    </div>

                    <p className="border-l-2 border-[#e4c8c0] pl-3 text-sm leading-relaxed text-[#5c3631]">
                      {order.void_reason || (
                        <span className="italic text-[#948a82]">
                          Alasan pembatalan tidak dicantumkan
                        </span>
                      )}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#73796f]">
                      <span className="inline-flex items-center gap-1.5">
                        <User size={12} className="text-[#999f95]" />
                        <span className="font-mono text-[11px]">
                          {shortId(order.voided_by)}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={12} className="text-[#999f95]" />
                        <span>{formatTime(order.voided_at)}</span>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<ShieldCheck size={18} />}
                title="Tidak ada transaksi void"
                description="Belum ada pembatalan pesanan yang tercatat pada periode ini."
              />
            )}
          </section>

          {/* Log Aktivitas */}
          <section className="rounded-2xl border border-[#e6dfd3] bg-[#fffdf8]">
            <div className="flex flex-col gap-3 border-b border-[#efe9de] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-base font-semibold tracking-tight text-[#1f2922]">
                  Log Aktivitas
                </h2>
                <p className="mt-0.5 text-xs text-[#73796f]">
                  Riwayat mentah perubahan dan aksi sensitif sistem.
                </p>
              </div>

              <div className="relative sm:w-56">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8d948a]"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari aksi atau aktor..."
                  className="w-full rounded-lg border border-[#e3dcd0] bg-[#faf7f0] py-1.5 pl-8 pr-3 text-xs text-[#1f2922] placeholder:text-[#969c92] focus:border-[#766285] focus:bg-[#fffdf8] focus:outline-none"
                />
              </div>
            </div>

            {filteredAudit.length ? (
              <div className="divide-y divide-[#f0e9df]">
                {filteredAudit.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3.5 px-5 py-3.5 transition-colors hover:bg-[#faf6ef]/60"
                  >
                    <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-[#e6deec] bg-[#f5f0f8] text-[#6d597c]">
                      <FileText size={14} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-sm font-medium text-[#1f2922]">
                          {entry.aksi || "Aktivitas sistem"}
                        </h3>
                        <time className="font-mono text-[11px] text-[#838a80]">
                          {formatTime(entry.created_at)}
                        </time>
                      </div>

                      <DetailBlock detail={entry.detail} />

                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#7b8278]">
                        <span>Oleh</span>
                        <span className="rounded bg-[#f2eee5] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#4a5349]">
                          {shortId(entry.dilakukan_oleh)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Search size={18} />}
                title={
                  query ? "Tidak ada log yang cocok" : "Belum ada log audit"
                }
                description={
                  query
                    ? `Pencarian "${query}" tidak ditemukan di riwayat aktivitas.`
                    : "Aktivitas sensitif akan muncul otomatis di sini."
                }
              />
            )}
          </section>
        </div>

        {/* Kolom Kanan (5 kolom): Timeline Persetujuan & Kegagalan */}
        <aside className="lg:col-span-5">
          <section className="sticky top-6 rounded-2xl border border-[#e6dfd3] bg-[#fffdf8]">
            <div className="border-b border-[#efe9de] px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-semibold tracking-tight text-[#1f2922]">
                    Otorisasi Diskon
                  </h2>
                  <p className="mt-0.5 text-xs text-[#73796f]">
                    Alur persetujuan dan percobaan yang gagal.
                  </p>
                </div>
                <span className="grid size-8 place-items-center rounded-lg bg-[#f4efe5] text-[#6e675c]">
                  <ShieldAlert size={16} />
                </span>
              </div>

              {/* Segmented Filter */}
              <div className="mt-3.5 inline-flex rounded-lg border border-[#e6dfd3] bg-[#f6f2e9] p-0.5 text-xs">
                {(
                  [
                    {
                      key: "all",
                      label: `Semua (${approvals.length + failures.length})`,
                    },
                    { key: "failure", label: `Gagal (${failures.length})` },
                    {
                      key: "approval",
                      label: `Disetujui (${approvals.length})`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setAlertFilter(tab.key)}
                    className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                      alertFilter === tab.key
                        ? "bg-[#fffdf8] text-[#1f2922] shadow-xs"
                        : "text-[#73796f] hover:text-[#1f2922]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {alerts.length ? (
              <ol className="relative space-y-0 px-5 py-4 before:absolute before:bottom-6 before:left-[29px] before:top-6 before:w-px before:bg-[#e8e1d5]">
                {alerts.map((entry, index) => {
                  const isFailure = entry.status === "failure";
                  return (
                    <li
                      key={`${entry.status}-${entry.id}-${index}`}
                      className="relative flex items-start gap-3.5 py-2.5"
                    >
                      <span
                        className={`relative z-10 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-4 ring-[#fffdf8] ${
                          isFailure
                            ? "bg-[#a3453c] text-[#fffdf8]"
                            : "bg-[#e7eee9] text-[#356344]"
                        }`}
                      >
                        {isFailure ? (
                          <AlertTriangle size={11} />
                        ) : (
                          <CheckCircle2 size={11} />
                        )}
                      </span>

                      <div className="min-w-0 flex-1 rounded-xl border border-transparent bg-[#faf7f1]/70 px-3.5 py-2.5 transition-colors hover:border-[#e6dfd3] hover:bg-[#faf7f1]">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`text-xs font-semibold ${
                              isFailure ? "text-[#9b3d35]" : "text-[#28352c]"
                            }`}
                          >
                            {entry.label}
                          </span>
                          {entry.amount !== undefined && (
                            <span className="tabular-nums font-mono text-xs font-semibold text-[#1f2922]">
                              {formatIDR(entry.amount)}
                            </span>
                          )}
                        </div>
                        <time className="mt-1 block font-mono text-[11px] text-[#838a80]">
                          {formatTime(entry.created_at)}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState
                icon={<CheckCircle2 size={18} />}
                title="Tidak ada catatan otorisasi"
                description="Belum ada aktivitas persetujuan pada filter ini."
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
  tone?: "neutral" | "danger";
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#7a8076]">
        {label}
      </p>
      <p
        className={`tabular-nums font-display mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl ${
          tone === "danger" ? "text-[#a3453c]" : "text-[#1f2922]"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-[#838a80]">{sub}</p>
    </div>
  );
}

function DetailBlock({ detail }: { detail: AuditEntry["detail"] }) {
  if (!detail) return null;

  if (typeof detail === "string") {
    return (
      <p className="mt-1 break-words text-xs leading-relaxed text-[#5c655c]">
        {detail}
      </p>
    );
  }

  if (typeof detail === "object") {
    const entries = Object.entries(detail as Record<string, unknown>);
    if (!entries.length) return null;
    return (
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {entries.map(([k, v]) => (
          <span
            key={k}
            className="inline-flex max-w-full items-center gap-1 rounded-md border border-[#ebe5d9] bg-[#faf7f1] px-2 py-0.5 text-[11px] text-[#555e55]"
          >
            <span className="font-medium text-[#7b8278]">{k}:</span>
            <span className="truncate font-mono text-[#28352c]">
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </span>
          </span>
        ))}
      </div>
    );
  }

  return null;
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
