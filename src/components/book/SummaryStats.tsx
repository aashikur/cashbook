import { formatCurrency } from '@/utils/storage';

interface SummaryStatsProps {
    totalIncome: number;
    totalExpense: number;
}

export default function SummaryStats({ totalIncome, totalExpense }: SummaryStatsProps) {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center bg-white/5 border border-white/5 rounded-xl p-4">
                <span className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Total In (+)</span>
                <span className="text-xl font-bold text-white/90">{formatCurrency(totalIncome)}</span>
            </div>
            <div className="flex flex-col items-center bg-white/5 border border-white/5 rounded-xl p-4">
                <span className="text-xs text-rose-400 uppercase tracking-wider mb-1">Total Out (-)</span>
                <span className="text-xl font-bold text-white/90">{formatCurrency(totalExpense)}</span>
            </div>
        </div>
    );
}
