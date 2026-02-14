import React, { useState, useEffect } from 'react';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (amount: number, description: string) => void;
    type: 'income' | 'expense';
    bookType: 'normal' | 'fixed';
    initialData?: { amount: number; description: string };
}

export default function TransactionModal({
    isOpen,
    onClose,
    onSubmit,
    type,
    bookType,
    initialData
}: TransactionModalProps) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAmount(initialData ? initialData.amount.toString() : '');
            setDescription(initialData ? initialData.description : '');
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(parseFloat(amount), description);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1a1a1f] border border-white/10 p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                <h2 className="text-xl font-bold mb-6 text-center">
                    {bookType === 'fixed' ? (
                        <span className="text-indigo-400">Update Balance</span>
                    ) : (
                        type === 'income' ? (
                            <span className="text-emerald-400">Add Income</span>
                        ) : (
                            <span className="text-rose-400">Add Expense</span>
                        )
                    )}
                </h2>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                        <input
                            type="number"
                            placeholder={bookType === 'fixed' ? "New Balance" : "0.00"}
                            autoFocus
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-black/20 border border-white/5 rounded-xl px-4 pl-8 py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all text-2xl font-bold"
                            required
                            step="0.01"
                        />
                    </div>

                    <input
                        type="text"
                        placeholder="Description (e.g. Salary, Rent)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all"
                        required
                    />

                    <div className="flex gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`flex-1 py-3 font-bold text-black rounded-xl hover:opacity-90 transition-all shadow-lg ${bookType === 'fixed'
                                    ? 'bg-indigo-400 shadow-indigo-500/20'
                                    : (type === 'income' ? 'bg-emerald-400 shadow-emerald-500/20' : 'bg-rose-400 shadow-rose-500/20')
                                }`}
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
