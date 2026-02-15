import { Transaction } from '@/types';
import { formatDate } from '@/utils/storage';
import TransactionItem from './TransactionItem';

interface TransactionListProps {
    transactions: Transaction[];
    bookType: 'normal' | 'fixed';
    selectedDate: string;
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
    if (transactions.length === 0) {
        return (
            <div className="text-center py-12 text-white/20 italic">
                {selectedDate ? 'No transactions found on this date.' : 'No transactions yet.'}
            </div>
        );
    }

    return (
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
    );
}
