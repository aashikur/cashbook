import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Book, Transaction } from '@/types';
import { loadBooks, saveBooks, calculateBookBalance, formatCurrency, formatDate } from '@/utils/storage';
import TransactionModal from '@/components/TransactionModal';

export default function BookDetails() {
    const { id } = useParams();
    const router = useRouter();
    const [book, setBook] = useState<Book | null>(null);
    const [books, setBooks] = useState<Book[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Date Filter State
    const [selectedDate, setSelectedDate] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');

    // Menu & Edit State for Transactions
    const [transactionMenuOpenId, setTransactionMenuOpenId] = useState<string | null>(null);
    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
    const [editDescription, setEditDescription] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadedBooks = loadBooks();
        setBooks(loadedBooks);
        const foundBook = loadedBooks.find((b: Book) => b.id === id);
        if (!foundBook && isLoaded) {
            router.push('/');
        } else {
            setBook(foundBook || null);
        }

        // Initialize Date Filter from URL
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const dateParam = params.get('date');
            if (dateParam) {
                setSelectedDate(dateParam);
            }
        }

        setIsLoaded(true);
    }, [id, router]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setTransactionMenuOpenId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const openModal = (type: 'income' | 'expense') => {
        setTransactionType(type);
        setIsModalOpen(true);
    };

    const handleAddTransaction = (amount: number, description: string) => {
        if (!book) return;

        const newTransaction: Transaction = {
            id: crypto.randomUUID(),
            amount: amount,
            description,
            // For fixed books, we can just treat everything as 'income' for simplicity or 'fixed'
            type: book.type === 'fixed' ? 'income' : transactionType,
            date: selectedDate
                ? (() => {
                    const d = new Date();
                    const [year, month, day] = selectedDate.split('-').map(Number);
                    d.setFullYear(year, month - 1, day);
                    return d.toISOString();
                })()
                : new Date().toISOString(),
        };

        const updatedTransactions = [newTransaction, ...book.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const updatedBook = { ...book, transactions: updatedTransactions };

        const updatedBooks = books.map(b => b.id === book.id ? updatedBook : b);

        setBooks(updatedBooks);
        setBook(updatedBook);
        saveBooks(updatedBooks);
        // Modal closing handled by parent/props usually, but component calls on submit? 
        // Component calls onSubmit then onClose. So logic is fine.
    };

    const deleteTransaction = (transactionId: string) => {
        if (!book) return;
        if (confirm("Are you sure you want to delete this transaction?")) {
            const updatedTransactions = book.transactions.filter(t => t.id !== transactionId);
            const updatedBook = { ...book, transactions: updatedTransactions };
            const updatedBooks = books.map(b => b.id === book.id ? updatedBook : b);

            setBooks(updatedBooks);
            setBook(updatedBook);
            saveBooks(updatedBooks);
        }
        setTransactionMenuOpenId(null);
    };

    const toggleTransactionMenu = (e: React.MouseEvent, tId: string) => {
        e.stopPropagation();
        setTransactionMenuOpenId(transactionMenuOpenId === tId ? null : tId);
    };

    const startEditingTransaction = (t: Transaction) => {
        setEditingTransactionId(t.id);
        setEditDescription(t.description);
        setTransactionMenuOpenId(null);
    };

    const handleEditTransaction = (e: React.FormEvent, tId: string) => {
        e.preventDefault();
        if (!book || !editDescription.trim()) return;

        const updatedTransactions = book.transactions.map(t =>
            t.id === tId ? { ...t, description: editDescription } : t
        );
        const updatedBook = { ...book, transactions: updatedTransactions };
        const updatedBooks = books.map(b => b.id === book.id ? updatedBook : b);

        setBooks(updatedBooks);
        setBook(updatedBook);
        saveBooks(updatedBooks);
        setEditingTransactionId(null);
    };

    // Add z-index logic similar to home page
    const getZIndexClass = (tId: string) => {
        return transactionMenuOpenId === tId ? 'z-50' : 'z-0';
    };

    if (!isLoaded || !book) return null;

    const balance = calculateBookBalance(book, selectedDate);

    // Filter transactions for display
    const displayTransactions = selectedDate
        ? book.transactions.filter(t => new Date(t.date).toLocaleDateString('en-CA') === selectedDate)
        : book.transactions;

    const totalIncome = displayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = displayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    return (
        <div className="min-h-screen bg-[#0f0f13] text-white font-sans selection:bg-purple-500/30">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
            </div>

            <main className="relative z-10 max-w-lg mx-auto p-6 flex flex-col gap-6 min-h-screen">
                <header className="flex flex-col gap-4 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {book.name}
                            {book.type === 'fixed' && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">FIXED</span>}
                        </h1>
                    </div>

                    {/* Date Filter */}
                    <div className="relative self-center">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/80 text-sm focus:outline-none focus:border-white/30"
                        />
                        {selectedDate && (
                            <button
                                onClick={() => setSelectedDate('')}
                                className="absolute -right-8 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </header>

                {/* Book Summary Card */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500" />
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center shadow-xl">
                        <h2 className="text-white/60 text-sm font-medium uppercase tracking-wider mb-1">
                            {selectedDate ? `Net Balance (${formatDate(selectedDate)})` : 'Net Balance'}
                        </h2>
                        <div className={`text-5xl font-bold tracking-tighter ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                            {formatCurrency(balance)}
                        </div>
                    </div>
                </div>

                {/* Income / Expense Summary - Only for Normal Books */}
                {book.type !== 'fixed' && (
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
                )}

                {/* Floating Add Buttons */}
                <div className="flex gap-4 mb-4">
                    {book.type === 'fixed' ? (
                        <button
                            onClick={() => openModal('income')}
                            className="flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 group"
                        >
                            <span className="bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20">↻</span>
                            <span className="tracking-wide text-sm opacity-80 group-hover:opacity-100">UPDATE BALANCE</span>
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => openModal('income')}
                                className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 group"
                            >
                                <span className="bg-emerald-500 text-black rounded-full w-6 h-6 flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">+</span>
                                <span className="tracking-wide text-sm opacity-80 group-hover:opacity-100">INCOME</span>
                            </button>
                            <button
                                onClick={() => openModal('expense')}
                                className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 group"
                            >
                                <span className="bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform shadow-lg shadow-rose-500/20">-</span>
                                <span className="tracking-wide text-sm opacity-80 group-hover:opacity-100">EXPENSE</span>
                            </button>
                        </>
                    )}
                </div>

                {/* Transaction History */}
                <div className="flex flex-col gap-4 pb-12">
                    <h3 className="text-xl font-semibold text-white/80 px-1">Transactions {selectedDate ? `(${formatDate(selectedDate)})` : ''}</h3>

                    {displayTransactions.length === 0 ? (
                        <div className="text-center py-12 text-white/20 italic">
                            {selectedDate ? 'No transactions found on this date.' : 'No transactions yet.'}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {displayTransactions.map((t) => {
                                const isEditing = editingTransactionId === t.id;
                                return (
                                    <div
                                        key={t.id}
                                        className={`group relative flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/5 hover:border-white/10 rounded-2xl transition-all active:scale-[0.98] ${getZIndexClass(t.id)}`}
                                    >
                                        <div className="flex flex-col gap-1 flex-1">
                                            {isEditing ? (
                                                <form onSubmit={(e) => handleEditTransaction(e, t.id)} onClick={(e) => e.stopPropagation()} className="flex gap-2 w-full pr-4">
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        className="bg-black/40 border border-white/20 rounded px-2 py-1 text-white flex-1"
                                                        value={editDescription}
                                                        onChange={(e) => setEditDescription(e.target.value)}
                                                    />
                                                    <button type="submit" className="text-xs bg-emerald-500/20 text-emerald-400 px-2 rounded">Save</button>
                                                    <button type="button" onClick={() => setEditingTransactionId(null)} className="text-xs bg-white/10 px-2 rounded">Cancel</button>
                                                </form>
                                            ) : (
                                                <>
                                                    <span className="font-medium text-white/90 text-lg">{t.description}</span>
                                                    <span className="text-xs text-white/40">{formatDate(t.date)}</span>
                                                </>
                                            )}
                                        </div>

                                        {!isEditing && (
                                            <div className="flex items-center gap-4">
                                                <span className={`font-mono font-semibold text-lg ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                                                    }`}>
                                                    {t.type === 'income' ? (book.type === 'fixed' ? '' : '+') : '-'}{formatCurrency(t.amount)}
                                                </span>

                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => toggleTransactionMenu(e, t.id)}
                                                        className="p-1 text-white/40 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                                    </button>

                                                    {transactionMenuOpenId === t.id && (
                                                        <div
                                                            ref={menuRef}
                                                            className="absolute right-0 top-8 w-32 bg-[#1a1a1f] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <button
                                                                onClick={() => startEditingTransaction(t)}
                                                                className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                                                            >
                                                                Edit Text
                                                            </button>
                                                            <button
                                                                onClick={() => deleteTransaction(t.id)}
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
                                )
                            })}
                        </div>
                    )}
                </div>
            </main>

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAddTransaction}
                type={transactionType}
                bookType={book.type}
            />
        </div>
    );
}
import { useParams, useRouter } from 'next/navigation';
import { Book, Transaction } from '@/types';
import { loadBooks, saveBooks, calculateBookBalance, formatCurrency, formatDate } from '@/utils/storage';

export default function BookDetails() {
    const { id } = useParams();
    const router = useRouter();
    const [book, setBook] = useState<Book | null>(null);
    const [books, setBooks] = useState<Book[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Date Filter State
    const [selectedDate, setSelectedDate] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    // Menu & Edit State for Transactions
    const [transactionMenuOpenId, setTransactionMenuOpenId] = useState<string | null>(null);
    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
    const [editDescription, setEditDescription] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadedBooks = loadBooks();
        setBooks(loadedBooks);
        const foundBook = loadedBooks.find((b: Book) => b.id === id);
        if (!foundBook && isLoaded) {
            router.push('/');
        } else {
            setBook(foundBook || null);
        }

        // Initialize Date Filter from URL
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const dateParam = params.get('date');
            if (dateParam) {
                setSelectedDate(dateParam);
            }
        }

        setIsLoaded(true);
    }, [id, router]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setTransactionMenuOpenId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const openModal = (type: 'income' | 'expense') => {
        setTransactionType(type);
        setAmount('');
        setDescription('');
        setIsModalOpen(true);
    };

    import TransactionModal from '@/components/TransactionModal';

    // ... (inside component)

    const handleAddTransaction = (amount: number, description: string) => {
        if (!book) return;

        const newTransaction: Transaction = {
            id: crypto.randomUUID(),
            amount: amount,
            description,
            // For fixed books, we can just treat everything as 'income' for simplicity or 'fixed'
            type: book.type === 'fixed' ? 'income' : transactionType,
            date: selectedDate
                ? (() => {
                    const d = new Date();
                    const [year, month, day] = selectedDate.split('-').map(Number);
                    d.setFullYear(year, month - 1, day);
                    return d.toISOString();
                })()
                : new Date().toISOString(),
        };

        const updatedTransactions = [newTransaction, ...book.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const updatedBook = { ...book, transactions: updatedTransactions };

        const updatedBooks = books.map(b => b.id === book.id ? updatedBook : b);

        setBooks(updatedBooks);
        setBook(updatedBook);
        saveBooks(updatedBooks);
        // Modal closing is handled by the component's onSubmit prop or separate onClose
    };

    // ...

    <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTransaction}
        type={transactionType}
        bookType={book.type}
    />
        </div >
    );
}
