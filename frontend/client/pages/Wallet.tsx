import { useState } from "react";
import { ArrowUpRight, Banknote, ChevronLeft, ChevronRight, CreditCard, FileDown, Loader2, Plus, ShieldCheck, WalletCards, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BusinessShell } from "@/layout/BusinessShell";
import { useWallet, useTransactions, useContractProjects, useDeposit, useWithdraw, formatCurrency, TX_TYPE_LABELS } from "@/hooks/use-wallet";
import { toast } from "sonner";

type WalletTab = "overview" | "history" | "withdraw" | "deposit";

export default function Wallet() {
  const [activeTab, setActiveTab] = useState<WalletTab>("overview");
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState("");

  const navigate = useNavigate();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: transactions, isLoading: txLoading } = useTransactions(10);
  const { data: projects, isLoading: projectsLoading } = useContractProjects();
  const deposit = useDeposit();
  const withdraw = useWithdraw();

  const openDeposit = () => { setAmount(""); setShowDepositModal(true); };
  const openWithdraw = () => { setAmount(""); setShowWithdrawModal(true); };

  const handleDeposit = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Số tiền không hợp lệ"); return; }
    deposit.mutate(val, { onSuccess: () => { setShowDepositModal(false); setAmount(""); } });
  };

  const handleWithdraw = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Số tiền không hợp lệ"); return; }
    if (wallet && val > wallet.balance) { toast.error("Số dư không đủ"); return; }
    withdraw.mutate(val, { onSuccess: () => { setShowWithdrawModal(false); setAmount(""); } });
  };

  const balance = wallet?.balance ?? 0;
  const locked = wallet?.locked_balance ?? 0;
  const usdRate = 25100;
  const total = balance + locked;
  return (
    <BusinessShell active="Thanh toán">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-[11px] text-slate-400">Workspace / Thanh toán</p>
          <h1 className="text-[24px] font-extrabold tracking-tight">Ví / Ký quỹ / Lịch sử thanh toán</h1>
          <p className="mt-1 text-xs text-slate-500">Quản lý số dư, ký quỹ và lịch sử giao dịch cho doanh nghiệp.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={openWithdraw} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600">↥ Rút tiền</button>
          <button type="button" onClick={openDeposit} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-bold text-white"><Plus size={13} />Nạp tiền</button>
        </div>
      </div>
      <nav className="mb-5 flex gap-6 border-b border-slate-200 text-[10px] font-semibold text-slate-400">
        <button type="button" onClick={() => setActiveTab("overview")} className={`pb-3 ${activeTab === "overview" ? "border-b-2 border-indigo-600 text-indigo-600" : ""}`}>Tổng quan</button>
        <button type="button" onClick={() => setActiveTab("history")} className={`pb-3 ${activeTab === "history" ? "border-b-2 border-indigo-600 text-indigo-600" : ""}`}>Lịch sử giao dịch</button>
        <button type="button" onClick={openWithdraw} className={`pb-3 ${activeTab === "withdraw" ? "border-b-2 border-indigo-600 text-indigo-600" : ""}`}>Rút tiền</button>
        <button type="button" onClick={openDeposit} className={`pb-3 ${activeTab === "deposit" ? "border-b-2 border-indigo-600 text-indigo-600" : ""}`}>Nạp tiền</button>
      </nav>
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><WalletCards size={17} /></div>
            <button type="button" onClick={openDeposit} className="rounded border border-slate-200 px-2 py-1 text-[9px] font-bold text-indigo-600">Nạp tiền</button>
          </div>
          <p className="mt-3 text-[10px] text-slate-400">Số dư khả dụng</p>
          <p className="text-xl font-extrabold">{walletLoading ? "—" : formatCurrency(balance)}</p>
          <p className="text-[9px] text-slate-400">≈ ${walletLoading ? "—" : (balance / usdRate).toFixed(2)} USD</p>
        </section>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><ShieldCheck size={17} /></div>
            <button className="rounded border border-slate-200 px-2 py-1 text-[9px] font-bold text-indigo-600">Xem chi tiết</button>
          </div>
          <p className="mt-3 text-[10px] text-slate-400">Ký quỹ đang giữ</p>
          <p className="text-xl font-extrabold">{walletLoading ? "—" : formatCurrency(locked)}</p>
          <p className="text-[9px] text-slate-400">≈ ${walletLoading ? "—" : (locked / usdRate).toFixed(2)} USD</p>
        </section>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><ArrowUpRight size={17} /></div>
            <span className="text-[9px] font-bold text-emerald-600">↗ 18.6%</span>
          </div>
          <p className="mt-3 text-[10px] text-slate-400">Tổng đã chi</p>
          <p className="text-xl font-extrabold">184,320,000 ₫</p>
          <p className="text-[9px] text-slate-400">So với 30 ngày trước</p>
        </section>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-extrabold">Các dự án đang ký quỹ</h2>
              <button className="text-[10px] font-bold text-indigo-600">Xem tất cả (12)</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[9px]">
                <thead className="border-y border-slate-100 text-[8px] text-slate-400">
                  <tr>
                    <th className="py-2">Dự án</th>
                    <th>Freelancer</th>
                    <th>Ký quỹ (₫)</th>
                    <th>Đã giải ngân (₫)</th>
                    <th>Còn lại (₫)</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {projectsLoading ? (
                    <tr><td colSpan={7} className="py-6 text-center text-slate-400"><Loader2 size={18} className="mx-auto animate-spin" /></td></tr>
                  ) : !projects || projects.length === 0 ? (
                    <tr><td colSpan={7} className="py-6 text-center text-slate-400">Chưa có dự án ký quỹ nào.</td></tr>
                  ) : (projects ?? []).map((p) => {
                    const paidAmount = (p.milestones ?? []).filter((m) => m.status === "PAID").reduce((s, m) => s + m.amount, 0);
                    const statusLabel: Record<string, string> = { active: "Đang thực hiện", completed: "Hoàn thành", draft: "Bản nháp", disputed: "Tranh chấp" };
                    return (
                    <tr key={p.id} className="border-b border-slate-50">
                      <td className="py-3 font-semibold">{p.job_id.slice(0, 8).toUpperCase()}</td>
                      <td className="text-slate-500">{p.freelancer_id.slice(0, 8).toUpperCase()}</td>
                      <td>{formatCurrency(p.total_amount)}</td>
                      <td>{formatCurrency(paidAmount)}</td>
                      <td>{formatCurrency(p.total_amount - paidAmount)}</td>
                      <td><span className="rounded-full bg-sky-50 px-2 py-1 text-[8px] font-semibold text-sky-600">{statusLabel[p.status] ?? p.status}</span></td>
                      <td><button type="button" onClick={() => navigate("/project-workspace")} className="text-indigo-500">Xem chi tiết</button></td>
                    </tr>);
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex justify-between text-[9px] text-slate-400">
              <span>Hiển thị 5 trên mỗi trang</span>
              <div className="flex gap-3">
                <ChevronLeft size={13} />
                <b className="text-indigo-600">1</b>
                <span>2</span>
                <span>3</span>
                <ChevronRight size={13} />
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-extrabold">Giao dịch gần đây</h2>
              <button className="flex items-center gap-1 text-[10px] font-bold text-indigo-600"><FileDown size={12} />Xem tất cả</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-[9px]">
                <thead className="border-y border-slate-100 text-[8px] text-slate-400">
                  <tr>
                    <th className="py-2">Ngày giờ</th>
                    <th>Loại giao dịch</th>
                    <th>Dự án / Nội dung</th>
                    <th>Số tiền</th>
                    <th>Số dư sau giao dịch</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {txLoading ? (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400">Đang tải...</td></tr>
                  ) : !transactions || transactions.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400">Chưa có giao dịch nào.</td></tr>
                  ) : (
                  transactions.map((tx) => {
                    const isPositive = tx.transaction_type === "DEPOSIT" || tx.transaction_type === "ESCROW_RELEASE" || tx.transaction_type === "PAYMENT_RECEIVED";
                    const sign = isPositive ? "+" : "-";
                    return (
                    <tr key={tx.id} className="border-b border-slate-50">
                      <td className="py-3 text-slate-500">{new Date(tx.created_at).toLocaleString("vi-VN")}</td>
                      <td className="font-semibold">{TX_TYPE_LABELS[tx.transaction_type] ?? tx.transaction_type}</td>
                      <td>{tx.description ?? tx.reference_id ?? "—"}</td>
                      <td className={`font-bold ${isPositive ? "text-emerald-600" : "text-rose-500"}`}>{sign}{formatCurrency(tx.amount)}</td>
                      <td>—</td>
                      <td><span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-semibold text-emerald-600">Thành công</span></td>
                    </tr>);
                  })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold">Phân bổ ký quỹ theo dự án</h2>
              <button className="text-[9px] font-bold text-indigo-600">Xem báo cáo</button>
            </div>
            <div className="mx-auto mt-4 flex h-32 w-32 items-center justify-center rounded-full" style={{ background: "conic-gradient(#f97316 0 35%, #22c55e 35% 58%, #6366f1 58% 78%, #a78bfa 78% 100%)" }}>
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-[10px] text-slate-400">Tổng ký quỹ</span>
                <b className="text-base">96.250.000 ₫</b>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-[8px]">
              {["Xây dựng Website E-commerce", "Ứng dụng Mobile Banking", "Thiết kế UI/UX Dashboard", "Website tuyển dụng"].map((name, i) => (
                <div key={name} className="flex items-center justify-between">
                  <span><i className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${["bg-orange-500", "bg-emerald-500", "bg-indigo-500", "bg-violet-400"][i]}`} />{name}</span>
                  <b>{["25.000.000 ₫", "30.000.000 ₫", "12.000.000 ₫", "8.000.000 ₫"][i]}</b>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold">Phương thức thanh toán</h2>
              <button type="button" onClick={() => alert("Quản lý phương thức thanh toán — sẽ kết nối backend ở Sprint 4")} className="text-[9px] font-bold text-indigo-600">Quản lý</button>
            </div>
            <div className="mt-3 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <Banknote size={15} className="text-emerald-600" />
                <div>
                  <p className="text-[9px] font-bold">Vietcombank – CN Quận 1</p>
                  <p className="text-[8px] text-slate-400">1234 5678 9012 3456</p>
                </div>
                <span className="ml-auto rounded bg-emerald-50 px-1.5 py-1 text-[8px] text-emerald-600">Mặc định</span>
              </div>
            </div>
            <button type="button" onClick={() => alert("Thêm tài khoản ngân hàng — sẽ kết nối backend ở Sprint 4")} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-[9px] font-bold text-indigo-600"><Plus size={11} />Thêm tài khoản ngân hàng</button>
            <div className="mt-3 flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 p-2"><CreditCard size={14} className="text-pink-500" /><span className="text-[9px] font-bold">MoMo</span></div>
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 p-2"><CreditCard size={14} className="text-blue-500" /><span className="text-[9px] font-bold">ZaloPay</span></div>
            </div>
          </section>
        </aside>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold">Nạp tiền</h3>
              <button onClick={() => setShowDepositModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <p className="mb-3 text-xs text-slate-500">Nhập số tiền bạn muốn nạp vào ví.</p>
            <div className="mb-4 flex gap-2">
              {["500000", "1000000", "2000000", "5000000"].map((v) => (
                <button key={v} onClick={() => setAmount(v)} className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${amount === v ? "border-indigo-500 bg-indigo-50 text-indigo-600" : "border-slate-200 text-slate-500"}`}>
                  {formatCurrency(parseInt(v))}
                </button>
              ))}
            </div>
            <div className="mb-4 rounded-xl border border-slate-200 px-4 py-3">
              <p className="mb-1 text-[9px] text-slate-400">Số tiền (VNĐ)</p>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full text-lg font-bold outline-none" />
            </div>
            <button onClick={handleDeposit} disabled={deposit.isPending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white disabled:opacity-60">
              {deposit.isPending && <Loader2 size={14} className="animate-spin" />}
              Xác nhận nạp tiền
            </button>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold">Rút tiền</h3>
              <button onClick={() => setShowWithdrawModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <p className="mb-1 text-xs text-slate-500">Số dư khả dụng: <b className="text-indigo-600">{wallet ? formatCurrency(wallet.balance) : "—"}</b></p>
            <div className="mb-4 mt-3 flex gap-2">
              {["500000", "1000000", "2000000"].map((v) => (
                <button key={v} onClick={() => setAmount(v)} className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${amount === v ? "border-indigo-500 bg-indigo-50 text-indigo-600" : "border-slate-200 text-slate-500"}`}>
                  {formatCurrency(parseInt(v))}
                </button>
              ))}
            </div>
            <div className="mb-4 rounded-xl border border-slate-200 px-4 py-3">
              <p className="mb-1 text-[9px] text-slate-400">Số tiền rút (VNĐ)</p>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full text-lg font-bold outline-none" />
            </div>
            <button onClick={handleWithdraw} disabled={withdraw.isPending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white disabled:opacity-60">
              {withdraw.isPending && <Loader2 size={14} className="animate-spin" />}
              Xác nhận rút tiền
            </button>
          </div>
        </div>
      )}
    </BusinessShell>
  );
}