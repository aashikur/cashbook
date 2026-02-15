'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Book, Transaction } from '@/types';
import { loadBooks, saveBooks, calculateBookBalance, formatDate } from '@/utils/storage';
import TransactionModal from '@/components/TransactionModal';
import LoadingScreen from '@/components/LoadingScreen';
import BookHeader from '@/components/book/BookHeader';
import BalanceCard from '@/components/book/BalanceCard';
import SummaryStats from '@/components/book/SummaryStats';
import ActionButtons from '@/components/book/ActionButtons';
import TransactionList from '@/components/book/TransactionList';

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
    }, [id, router, isLoaded]);

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

    if (!isLoaded || !book) return <LoadingScreen />;

    const balance = calculateBookBalance(book, selectedDate);

    // Filter transactions for display
    const displayTransactions = selectedDate
        ? book.transactions.filter(t => new Date(t.date).toLocaleDateString('en-CA') === selectedDate)
        : book.transactions;

    const totalIncome = displayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = displayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    return (
        <div className="min-h-screen bg-[#0f0f13] text-white font-sans selection:bg-purple-500/30">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
            </div>

            <main className="relative z-10 max-w-lg mx-auto p-6 flex flex-col gap-6 min-h-screen">
                <BookHeader book={book} />

                <BalanceCard
                    balance={balance}
                    selectedDate={selectedDate}
                />

                {book.type !== 'fixed' && (
                    <SummaryStats
                        totalIncome={totalIncome}
                        totalExpense={totalExpense}
                    />
                )}

                <ActionButtons
                    bookType={book.type}
                    onIncomeClick={() => openModal('income')}
                    onExpenseClick={() => openModal('expense')}
                />

                <TransactionList
                    transactions={displayTransactions}
                    bookType={book.type}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    editingTransactionId={editingTransactionId}
                    editDescription={editDescription}
                    transactionMenuOpenId={transactionMenuOpenId}
                    onEditDescriptionChange={setEditDescription}
                    onStartEdit={startEditingTransaction}
                    onSaveEdit={handleEditTransaction}
                    onCancelEdit={() => setEditingTransactionId(null)}
                    onToggleMenu={toggleTransactionMenu}
                    onDelete={deleteTransaction}
                    menuRef={menuRef}
                />
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
