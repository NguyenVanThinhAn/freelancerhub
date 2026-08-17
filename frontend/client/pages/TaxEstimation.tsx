import { useState, useMemo } from "react";
import { Calculator, Info, Receipt, PiggyBank, WalletCards, Percent, AlertTriangle } from "lucide-react";
import { BusinessShell } from "@/layout/BusinessShell";
import { useTransactions } from "@/hooks/use-wallet";
import { formatCurrency } from "@/hooks/use-wallet";

export default function TaxEstimation() {
  const { data: transactions } = useTransactions(200);
  const [taxRate, setTaxRate] = useState(10);
  const [registerTaxService, setRegisterTaxService] = useState(false);

  const stats = useMemo(() => {
    const txs = transactions ?? [];

    // Tổng doanh thu = tất cả PAYMENT_RECEIVED
    const totalRevenue = txs
      .filter((tx) => tx.transaction_type === "PAYMENT_RECEIVED")
      .reduce((s, tx) => s + tx.amount, 0);

    // Phí sàn (2%)
    const platformFee = totalRevenue * 0.02;

    // Thu nhập chịu thuế
    const taxableIncome = totalRevenue - platformFee;

    // Ước tính thuế TNCN (đơn giản: flat rate)
    const estimatedTax = taxableIncome * (taxRate / 100);

    // Thu nhập ròng ước tính
    const netIncome = taxableIncome - estimatedTax;

    return { totalRevenue, platformFee, taxableIncome, estimatedTax, netIncome };
  }, [transactions, taxRate]);

  return (
    <BusinessShell active="Tìm việc">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-[11px] text-slate-400">Freelancer / Thuế</p>
          <h1 className="text-[24px] font-extrabold tracking-tight">Ước tính thuế TNCN</h1>
          <p className="mt-1 text-xs text-slate-500">
            Công cụ tính thuế thu nhập cá nhân dành cho freelancer.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <WalletCards size={17} />
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Tổng doanh thu</p>
          <p className="mt-1 text-[18px] font-extrabold text-slate-900">
            {formatCurrency(stats.totalRevenue)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Receipt size={17} />
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Phí sàn</p>
          <p className="mt-1 text-[18px] font-extrabold text-amber-600">
            -{formatCurrency(stats.platformFee)}
          </p>
          <p className="mt-0.5 text-[9px] text-slate-400">2% doanh thu</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <Calculator size={17} />
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Ước tính thuế</p>
          <p className="mt-1 text-[18px] font-extrabold text-rose-600">
            -{formatCurrency(stats.estimatedTax)}
          </p>
          <p className="mt-0.5 text-[9px] text-slate-400">{taxRate}% thu nhập chịu thuế</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <PiggyBank size={17} />
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-600">Thu nhập ròng ước tính</p>
          <p className="mt-1 text-[18px] font-extrabold text-emerald-700">
            {formatCurrency(stats.netIncome)}
          </p>
          <p className="mt-0.5 text-[9px] text-emerald-500">Sau thuế và phí sàn</p>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {/* Tax rate slider */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
              <Percent size={14} className="text-indigo-500" />
              Tỷ lệ thuế suất
            </h2>
            <p className="mt-1 text-[10px] text-slate-400">
              Thuế TNCN Việt Nam áp dụng biểu thuế lũy tiến từng phần. Chọn tỷ lệ quy đổi để ước tính.
            </p>

            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="text-slate-500">Tỷ lệ thuế</span>
                <span className="text-[22px] font-extrabold text-indigo-600">{taxRate}%</span>
              </div>

              <input
                type="range"
                min={5}
                max={25}
                step={1}
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />

              <div className="mt-2 flex justify-between text-[9px] text-slate-400">
                <span>5%</span>
                <span>10%</span>
                <span>15%</span>
                <span>20%</span>
                <span>25%</span>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-1.5 text-[10px] text-slate-600">
              <p className="font-bold text-slate-700">Biểu thuế TNCN lũy tiến (theo năm):</p>
              <p>• 0 – 60 triệu: <b>Miễn thuế</b></p>
              <p>• 60 – 120 triệu: <b>5%</b></p>
              <p>• 120 – 216 triệu: <b>10%</b></p>
              <p>• 216 – 384 triệu: <b>15%</b></p>
              <p>• 384 – 624 triệu: <b>20%</b></p>
              <p>• 624 – 960 triệu: <b>25%</b></p>
            </div>
          </section>

          {/* Breakdown table */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-[13px] font-extrabold text-slate-900">Chi tiết tính toán</h2>
            <table className="w-full text-[11px]">
              <tbody>
                {[
                  ["Tổng doanh thu", stats.totalRevenue, false],
                  ["Phí sàn (-2%)", -stats.platformFee, false],
                  ["Thu nhập chịu thuế", stats.taxableIncome, false],
                  [`Thuế TNCN (-${taxRate}%)`, -stats.estimatedTax, true],
                  ["Thu nhập ròng ước tính", stats.netIncome, false],
                ].map(([label, value, isTax]) => (
                  <tr key={String(label)} className={`border-b border-slate-50 ${isTax ? "text-rose-600 font-bold" : ""}`}>
                    <td className={`py-2.5 ${isTax ? "text-rose-600 font-bold" : "text-slate-500"}`}>{label}</td>
                    <td className={`py-2.5 text-right font-extrabold ${isTax ? "text-rose-600" : value < 0 ? "text-rose-500" : "text-slate-900"}`}>
                      {value < 0 ? "-" : ""}{formatCurrency(Math.abs(value))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <aside className="space-y-5">
          {/* Disclaimer */}
          <section className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="text-[11px] font-bold text-amber-700">Cảnh báo quan trọng</p>
                <p className="mt-1 text-[10px] leading-relaxed text-amber-600">
                  Số liệu trên chỉ mang tính <b>ước tính tham khảo</b>. Sàn không tự động trích thu hay giữ thuế TNCN của bạn. Bạn có trách nhiệm tự kê khai và nộp thuế theo quy định pháp luật Việt Nam.
                </p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-2.5">
              <Info size={15} className="mt-0.5 shrink-0 text-indigo-500" />
              <div>
                <p className="text-[11px] font-bold text-slate-700">Cần hỗ trợ kê khai thuế?</p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                  Đăng ký dịch vụ hỗ trợ kê khai thuế từ đối tác của chúng tôi — nhanh chóng, chính xác, chi phí hợp lý.
                </p>
              </div>
            </div>
            <label className="mt-3 flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={registerTaxService}
                onChange={(e) => setRegisterTaxService(e.target.checked)}
                className="mt-0.5 accent-indigo-600"
              />
              <span className="text-[10px] text-slate-600">Đăng ký nhận tư vấn dịch vụ hỗ trợ kê khai thuế</span>
            </label>
            {registerTaxService && (
              <button
                type="button"
                className="mt-3 w-full rounded-lg bg-indigo-600 py-2 text-[11px] font-bold text-white hover:bg-indigo-700"
              >
                Gửi yêu cầu tư vấn
              </button>
            )}
          </section>

          {/* Info */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm text-[10px] text-slate-500 space-y-2">
            <p className="font-bold text-slate-700">Căn cứ pháp lý:</p>
            <p>• Luật Thuế thu nhập cá nhân số 04/2007/QH12</p>
            <p>• Nghị định 65/2013/NĐ-CP</p>
            <p>• Thông tư 111/2013/TT-BTC</p>
            <p>• Công văn 4663/TCT-DNNCN về thuế TNCN cho freelancer</p>
          </section>
        </aside>
      </div>
    </BusinessShell>
  );
}
