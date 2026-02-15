import { useState, useRef, useEffect } from 'react';
import { Transaction, Book } from '@/types';
import { formatCurrency, formatDate } from '@/utils/storage';

interface TransactionItemProps {
    transaction: Transaction;
    bookType: 'normal' | 'fixed';
    isEditing: boolean;
    editDescription: string;
    isMenuOpen: boolean;
    onEditDescriptionChange: (value: string) => void;
    onStartEdit: () => void;
    onSaveEdit: (e: React.FormEvent) => void;
    onCancelEdit: () => void;
    onToggleMenu: (e: React.MouseEvent) => void;
    onDelete: () => void;
    menuRef: React.RefObject<HTMLDivElement | null>;
}

export default function TransactionItem({
    transaction,
    bookType,
    isEditing,
    editDescription,
    isMenuOpen,
    onEditDescriptionChange,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onToggleMenu,
    onDelete,
    menuRef
}: TransactionItemProps) {
    const zIndexClass = isMenuOpen ? 'z-50' : 'z-0';

    return (
        <div
            className={`group relative flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/5 hover:border-white/10 rounded-2xl transition-all active:scale-[0.98] ${zIndexClass}`}
        >
            <div className="flex flex-col gap-1 flex-1">
                {isEditing ? (
                    <form onSubmit={onSaveEdit} onClick={(e) => e.stopPropagation()} className="flex gap-2 w-full pr-4">
                        <input
                            autoFocus
                            type="text"
                            className="bg-black/40 border border-white/20 rounded px-2 py-1 text-white flex-1"
                            value={editDescription}
                            onChange={(e) => onEditDescriptionChange(e.target.value)}
                        />
                        <button type="submit" className="text-xs bg-emerald-500/20 text-emerald-400 px-2 rounded">Save</button>
                        <button type="button" onClick={onCancelEdit} className="text-xs bg-white/10 px-2 rounded">Cancel</button>
                    </form>
                ) : (
                    <>
                        <span className="font-medium text-white/90 text-base sm:text-lg">{transaction.description}</span>
                        <span className="text-[10px] sm:text-xs text-white/40">{formatDate(transaction.date)}</span>
                    </>
                )}
            </div>

            {!isEditing && (
                <div className="flex items-center gap-4">
                    <span className={`font-mono font-semibold text-base sm:text-lg ${transaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {transaction.type === 'income' ? (bookType === 'fixed' ? '' : '+') : '-'}{formatCurrency(transaction.amount)}
                    </span>

                    <div className="relative">
                        <button
                            onClick={onToggleMenu}
                            className="p-1 text-white/40 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                        </button>

                        {isMenuOpen && (
                            <div
                                ref={menuRef}
                                className="absolute right-0 top-8 w-32 bg-[#1a1a1f] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={onStartEdit}
                                    className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                    Edit Text
                                </button>
                                <button
                                    onClick={onDelete}
                                    className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
