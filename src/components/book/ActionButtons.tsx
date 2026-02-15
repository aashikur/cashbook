interface ActionButtonsProps {
    bookType: 'normal' | 'fixed';
    onIncomeClick: () => void;
    onExpenseClick: () => void;
}

export default function ActionButtons({ bookType, onIncomeClick, onExpenseClick }: ActionButtonsProps) {
    if (bookType === 'fixed') {
        return (
            <div className="flex gap-4 mb-4">
                <button
                    onClick={onIncomeClick}
                    className="flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 group"
                >
                    <span className="bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20">↻</span>
                    <span className="tracking-wide text-sm opacity-80 group-hover:opacity-100">UPDATE BALANCE</span>
                </button>
            </div>
        );
    }

    return (
        <div className="flex gap-4 mb-4">
            <button
                onClick={onIncomeClick}
                className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 group"
            >
                <span className="bg-emerald-500 text-black rounded-full w-6 h-6 flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">+</span>
                <span className="tracking-wide text-sm opacity-80 group-hover:opacity-100">INCOME</span>
            </button>
            <button
                onClick={onExpenseClick}
                className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 group"
            >
                <span className="bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform shadow-lg shadow-rose-500/20">-</span>
                <span className="tracking-wide text-sm opacity-80 group-hover:opacity-100">EXPENSE</span>
            </button>
        </div>
    );
}
