import { formatCurrency, formatDate } from '@/utils/storage';

interface BalanceCardProps {
    balance: number;
    selectedDate: string;
}

export default function BalanceCard({ balance, selectedDate }: BalanceCardProps) {
    return (
        <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500" />
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center shadow-xl">
                <h2 className="text-white/60 text-xs sm:text-sm font-medium uppercase tracking-wider mb-1">
                    {selectedDate ? `Net Balance (${formatDate(selectedDate)})` : 'Net Balance'}
                </h2>
                <div className={`text-4xl sm:text-5xl font-bold tracking-tighter ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                    {formatCurrency(balance)}
                </div>
            </div>
        </div>
    );
}
