import { Transaction } from '@/types';
import { formatDate } from '@/utils/storage';
import TransactionItem from './TransactionItem';

interface TransactionListProps {
    transactions: Transaction[];
    bookType: 'normal' | 'fixed';
    selectedDate: string;
    onDateChange: (date: string) => void;
    editingTransactionId: string | null;
    editDescription: string;
    transactionMenuOpenId: string | null;
    onEditDescriptionChange: (value: string) => void;
    onStartEdit: (transaction: Transaction) => void;
    onSaveEdit: (e: React.FormEvent, transactionId: string) => void;
    onCancelEdit: () => void;
    onToggleMenu: (e: React.MouseEvent, transactionId: string) => void;
    onDelete: (transactionId: string) => void;
    menuRef: React.RefObject<HTMLDivElement | null>;
}

export default function TransactionList({
    transactions,
    bookType,
    selectedDate,
    onDateChange,
    editingTransactionId,
    editDescription,
    transactionMenuOpenId,
    onEditDescriptionChange,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onToggleMenu,
    onDelete,
    menuRef
}: TransactionListProps) {
    return (
        <div className="flex flex-col gap-4 pb-12">
            {/* Header with Transactions title and date filter */}
            <div className="flex items-center justify-between gap-4 px-1">
                <h3 className="text-xl font-semibold text-white/80">
                    Transactions {selectedDate ? `(${formatDate(selectedDate)})` : ''}
                </h3>

                <div className="relative">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/80 text-sm focus:outline-none focus:border-white/30"
                    />
                    {selectedDate && (
                        <button
                            onClick={() => onDateChange('')}
                            className="absolute -right-8 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Transaction list or empty state */}
            {transactions.length === 0 ? (
                <div className="text-center py-12 text-white/20 italic">
                    {selectedDate ? 'No transactions found on this date.' : 'No transactions yet.'}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {transactions.map((transaction) => (
                        <TransactionItem
                            key={transaction.id}
                            transaction={transaction}
                            bookType={bookType}
                            isEditing={editingTransactionId === transaction.id}
                            editDescription={editDescription}
                            isMenuOpen={transactionMenuOpenId === transaction.id}
                            onEditDescriptionChange={onEditDescriptionChange}
                            onStartEdit={() => onStartEdit(transaction)}
                            onSaveEdit={(e) => onSaveEdit(e, transaction.id)}
                            onCancelEdit={onCancelEdit}
                            onToggleMenu={(e) => onToggleMenu(e, transaction.id)}
                            onDelete={() => onDelete(transaction.id)}
                            menuRef={menuRef}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
