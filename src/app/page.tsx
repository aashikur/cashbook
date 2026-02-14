'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Book, Transaction } from '@/types';
import { loadBooks, saveBooks, calculateBookBalance, calculateTotalBalance, formatCurrency, formatDate } from '@/utils/storage';
import TransactionModal from '@/components/TransactionModal';

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [newBookName, setNewBookName] = useState('');
  const [isFixedBook, setIsFixedBook] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Date Filter State
  const [selectedDate, setSelectedDate] = useState('');

  // Menu State
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Quick Action Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');

  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const loadedBooks = loadBooks();
    setBooks(loadedBooks);
    setIsLoaded(true);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAddBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookName.trim()) return;

    const newBook: Book = {
      id: crypto.randomUUID(),
      name: newBookName,
      type: isFixedBook ? 'fixed' : 'normal',
      transactions: [],
      createdAt: new Date().toISOString(),
    };

    const updatedBooks = [...books, newBook];
    setBooks(updatedBooks);
    saveBooks(updatedBooks);
    setNewBookName('');
    setIsFixedBook(false);
    setIsAdding(false);
    // Clear date filter when adding new book to avoid confusion?
    // setSelectedDate(''); 
  };

  const handleEditBook = (e: React.FormEvent, bookId: string) => {
    e.preventDefault();
    if (!editName.trim()) return;

    const updatedBooks = books.map(book =>
      book.id === bookId ? { ...book, name: editName } : book
    );
    setBooks(updatedBooks);
    saveBooks(updatedBooks);
    setEditingId(null);
    setMenuOpenId(null);
  };

  const startEditing = (book: Book) => {
    setEditingId(book.id);
    setEditName(book.name);
    setMenuOpenId(null);
  };

  const deleteBook = (bookId: string) => {
    if (confirm('Are you sure you want to delete this book? All data will be lost.')) {
      const updatedBooks = books.filter(b => b.id !== bookId);
      setBooks(updatedBooks);
      saveBooks(updatedBooks);
    }
    setMenuOpenId(null);
  }

  const toggleMenu = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === bookId ? null : bookId);
  };

  // Quick Action Handlers
  const openQuickAction = (e: React.MouseEvent, bookId: string, type: 'income' | 'expense') => {
    e.stopPropagation();
    setActiveBookId(bookId);
    setTransactionType(type);
    setIsModalOpen(true);
  };

  const handleQuickTransaction = (amount: number, description: string) => {
    if (!activeBookId) return;

    const bookIndex = books.findIndex(b => b.id === activeBookId);
    if (bookIndex === -1) return;

    const book = books[bookIndex];

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

    const updatedBooks = [...books];
    updatedBooks[bookIndex] = updatedBook;

    setBooks(updatedBooks);
    saveBooks(updatedBooks);
    // Modal closes automatically via component prop
  };

  const activeBook = activeBookId ? books.find(b => b.id === activeBookId) : null;

  if (!isLoaded) return null;

  const totalBalance = calculateTotalBalance(books, selectedDate);

  // Sort books: Fixed first, then by creation (or kept in order)
  const sortedBooks = [...books].sort((a, b) => {
    if (a.type === 'fixed' && b.type !== 'fixed') return -1;
    if (a.type !== 'fixed' && b.type === 'fixed') return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white font-sans selection:bg-purple-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-lg mx-auto p-6 flex flex-col gap-6 min-h-screen">
        <header className="flex flex-col items-center pt-8 pb-4 gap-4">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 tracking-tight">
            CashBook
          </h1>
        </header>

        {/* Total Balance Card */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500" />
          <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center shadow-xl">
            <h2 className="text-white/60 text-sm font-medium uppercase tracking-wider mb-1">
              {selectedDate ? `Net Balance (${formatDate(selectedDate)})` : 'Net Balance'}
            </h2>
            <div className={`text-3xl sm:text-4xl font-bold tracking-tighter ${totalBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
              {formatCurrency(totalBalance)}
            </div>
          </div>
        </div>

        {/* Books List */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-1">
            <h3 className="text-lg sm:text-xl font-semibold text-white/80">Your Books</h3>
            <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
              {/* Date Filter - Moved here */}
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2 py-1.5 text-white/80 text-xs focus:outline-none focus:border-white/30 transition-colors"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="absolute -right-6 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex gap-2 ml-auto sm:ml-0">
                <button
                  onClick={() => { setIsFixedBook(true); setIsAdding(true); }}
                  className="text-xs bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors border border-indigo-500/20 whitespace-nowrap"
                >
                  + Fix Book
                </button>
                <button
                  onClick={() => { setIsFixedBook(false); setIsAdding(true); }}
                  className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors border border-white/5 whitespace-nowrap"
                >
                  + New Book
                </button>
              </div>
            </div>
          </div>

          {isAdding && (
            <form onSubmit={handleAddBook} className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
                  {isFixedBook ? 'Adding Fixed Book' : 'Adding Normal Book'}
                </span>
                <button type="button" onClick={() => setIsAdding(false)} className="text-white/40 hover:text-white">✕</button>
              </div>
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="Book Name (e.g. Wallet, Bank)"
                  className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white/30"
                  value={newBookName}
                  onChange={(e) => setNewBookName(e.target.value)}
                />
                <button type="submit" className="bg-white text-black font-semibold px-4 rounded-lg hover:bg-gray-200 transition-colors">
                  Add
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-col gap-3">
            {sortedBooks.length === 0 ? (
              <div className="text-center py-12 text-white/20 italic bg-white/5 rounded-xl border border-white/5 border-dashed">
                No books yet. Create one to start tracking.
              </div>
            ) : (
              sortedBooks.map(book => {
                const balance = calculateBookBalance(book, selectedDate);
                const isEditing = editingId === book.id;

                return (
                  <div
                    key={book.id}
                    className={`group relative flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/5 hover:border-white/10 rounded-xl transition-all active:scale-[0.98] ${menuOpenId === book.id ? 'z-50' : 'z-0'}`}
                    onClick={() => !isEditing && router.push(`/book/${book.id}${selectedDate ? `?date=${selectedDate}` : ''}`)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/5 text-white/60">
                        {book.type === 'fixed' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                        )}
                      </div>

                      {isEditing ? (
                        <form onSubmit={(e) => handleEditBook(e, book.id)} onClick={(e) => e.stopPropagation()} className="flex gap-2 w-full pr-4">
                          <input
                            autoFocus
                            type="text"
                            className="bg-black/40 border border-white/20 rounded px-2 py-1 text-white flex-1 min-w-0"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                          <button type="submit" className="text-xs bg-emerald-500/20 text-emerald-400 px-2 rounded shrink-0">Save</button>
                          <button type="button" onClick={() => setEditingId(null)} className="text-xs bg-white/10 px-2 rounded shrink-0">Cancel</button>
                        </form>
                      ) : (
                        <div className="min-w-0 truncate">
                          <h4 className="text-sm sm:text-base font-semibold text-white/90 flex items-center gap-2 truncate">
                            <span className="truncate">{book.name}</span>
                            {book.type === 'fixed' && (
                              <span className="shrink-0 text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded uppercase tracking-wider border border-indigo-500/10">Fixed</span>
                            )}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-white/40 truncate">{book.transactions.length} entries</p>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        {/* Quick Actions - Hidden on mobile, visible on sm and up */}
                        <div className="hidden sm:flex items-center gap-1 mr-1">
                          {book.type === 'fixed' ? (
                            <button
                              onClick={(e) => openQuickAction(e, book.id, 'income')}
                              className="w-8 h-8 rounded-full bg-indigo-500/10 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/20 flex items-center justify-center transition-colors"
                              title="Update Balance"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={(e) => openQuickAction(e, book.id, 'income')}
                                className="w-8 h-8 rounded-full bg-emerald-500/10 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 flex items-center justify-center transition-colors"
                                title="Add Income"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                              </button>
                              <button
                                onClick={(e) => openQuickAction(e, book.id, 'expense')}
                                className="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20 flex items-center justify-center transition-colors"
                                title="Add Expense"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>
                              </button>
                            </>
                          )}
                        </div>

                        <div className={`font-mono font-bold text-right text-sm sm:text-base ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(balance)}
                        </div>

                        <div className="relative">
                          <button
                            onClick={(e) => toggleMenu(e, book.id)}
                            className="p-1 text-white/40 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                          </button>

                          {menuOpenId === book.id && (
                            <div
                              ref={menuRef}
                              className="absolute right-0 top-8 w-32 bg-[#1a1a1f] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => startEditing(book)}
                                className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                Edit Name
                              </button>
                              <button
                                onClick={() => deleteBook(book.id)}
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
              })
            )}
          </div>
        </div>
      </main>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleQuickTransaction}
        type={transactionType}
        bookType={activeBook?.type || 'normal'}
      />
    </div>
  );
}
