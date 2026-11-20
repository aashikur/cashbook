import { useSyncExternalStore } from 'react';
import { Book, Transaction } from "@/types";

export const DEMO_BOOKS: Book[] = [
    {
        id: "demo-wallet",
        name: "Cash Wallet",
        type: "normal",
        createdAt: "2026-11-14T09:00:00.000Z",
        transactions: [
            {
                id: "tx-w-1",
                amount: 35000,
                description: "Monthly Salary / Cash In",
                type: "income",
                date: "2026-11-15T10:30:00.000Z",
            },
            {
                id: "tx-w-2",
                amount: 4500,
                description: "Grocery & Kitchen Supplies",
                type: "expense",
                date: "2026-11-17T15:20:00.000Z",
            },
            {
                id: "tx-w-3",
                amount: 1200,
                description: "High-speed Internet Bill",
                type: "expense",
                date: "2026-11-18T18:00:00.000Z",
            },
            {
                id: "tx-w-4",
                amount: 8000,
                description: "Freelance UI Design Project",
                type: "income",
                date: "2026-11-19T14:45:00.000Z",
            },
            {
                id: "tx-w-5",
                amount: 1850,
                description: "Weekend Dining & Coffee",
                type: "expense",
                date: "2026-11-20T20:15:00.000Z",
            },
        ],
    },
    {
        id: "demo-bank",
        name: "City Bank Account",
        type: "normal",
        createdAt: "2026-11-10T12:00:00.000Z",
        transactions: [
            {
                id: "tx-b-1",
                amount: 85000,
                description: "Client Milestone Wire Transfer",
                type: "income",
                date: "2026-11-12T11:00:00.000Z",
            },
            {
                id: "tx-b-2",
                amount: 22000,
                description: "Apartment Rent Payment",
                type: "expense",
                date: "2026-11-14T08:30:00.000Z",
            },
            {
                id: "tx-b-3",
                amount: 3400,
                description: "Electricity & Utility Bills",
                type: "expense",
                date: "2026-11-16T16:10:00.000Z",
            },
            {
                id: "tx-b-4",
                amount: 15000,
                description: "Credit Card Monthly Settlement",
                type: "expense",
                date: "2026-11-19T19:00:00.000Z",
            },
        ],
    },
    {
        id: "demo-fixed",
        name: "Emergency Cash Vault",
        type: "fixed",
        createdAt: "2026-11-06T10:00:00.000Z",
        transactions: [
            {
                id: "tx-f-2",
                amount: 50000,
                description: "Mid-month Physical Cash Verification",
                type: "income",
                date: "2026-11-18T17:00:00.000Z",
            },
            {
                id: "tx-f-1",
                amount: 40000,
                description: "Initial Reserve Cash Snapshot",
                type: "income",
                date: "2026-11-08T11:30:00.000Z",
            },
        ],
    },
];

let cachedBooks: Book[] | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
    listeners.forEach((listener) => listener());
}

export const loadBooks = (): Book[] => {
    if (typeof window === 'undefined') return DEMO_BOOKS;
    const saved = localStorage.getItem('cashbook_data');
    if (!saved) {
        try {
            localStorage.setItem('cashbook_data', JSON.stringify(DEMO_BOOKS));
        } catch {
            // ignore storage quota/access errors
        }
        return DEMO_BOOKS;
    }
    try {
        const rawBooks = JSON.parse(saved);
        if (!Array.isArray(rawBooks)) return DEMO_BOOKS;
        return rawBooks.map((b: Partial<Book>) => ({
            id: b.id || crypto.randomUUID(),
            name: b.name || 'Untitled Book',
            type: (b.type === 'fixed' ? 'fixed' : 'normal') as 'normal' | 'fixed',
            transactions: Array.isArray(b.transactions) ? b.transactions : [],
            createdAt: b.createdAt || new Date().toISOString()
        }));
    } catch (e) {
        console.error("Failed to parse books", e);
        return DEMO_BOOKS;
    }
};

export const saveBooks = (books: Book[]) => {
    cachedBooks = books;
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem('cashbook_data', JSON.stringify(books));
        } catch (e) {
            console.error("Failed to save books to localStorage", e);
        }
    }
    notifyListeners();
};

export const resetToDemoData = () => {
    saveBooks(DEMO_BOOKS);
};

export const subscribeBooks = (callback: () => void) => {
    listeners.add(callback);
    const onStorage = (e: StorageEvent) => {
        if (e.key === 'cashbook_data') {
            cachedBooks = null;
            notifyListeners();
        }
    };
    if (typeof window !== 'undefined') {
        window.addEventListener('storage', onStorage);
    }
    return () => {
        listeners.delete(callback);
        if (typeof window !== 'undefined') {
            window.removeEventListener('storage', onStorage);
        }
    };
};

export const getBooksSnapshot = (): Book[] => {
    if (cachedBooks === null) {
        cachedBooks = loadBooks();
    }
    return cachedBooks;
};

const SERVER_SNAPSHOT: Book[] = [];
export const getServerSnapshot = (): Book[] => {
    return SERVER_SNAPSHOT;
};

const emptySubscribe = () => () => {};
export const useIsMounted = (): boolean => {
    return useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false
    );
};

export const useBooks = (): Book[] => {
    return useSyncExternalStore(
        subscribeBooks,
        getBooksSnapshot,
        getServerSnapshot
    );
};

export const filterTransactionsByDate = (transactions: Transaction[], date?: string) => {
    if (!date) return transactions;
    return transactions.filter(t => {
        const txnDate = new Date(t.date);
        const localTxnDate = txnDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
        return localTxnDate === date;
    });
};

export const calculateBookBalance = (book: Book, date?: string) => {
    let txns = book.transactions;
    if (date) {
        txns = filterTransactionsByDate(txns, date);
    }

    if (book.type === 'fixed') {
        if (txns.length === 0) {
            // If date filter is active and no snapshot was logged on this exact date,
            // fall back to the newest snapshot on or before that date
            if (date) {
                const priorTxns = book.transactions.filter(t => {
                    const localDate = new Date(t.date).toLocaleDateString('en-CA');
                    return localDate <= date;
                });
                if (priorTxns.length > 0) return priorTxns[0].amount;
            }
            return 0;
        }
        return txns[0].amount;
    }

    return txns.reduce((acc, curr) => {
        const amount = typeof curr.amount === 'number' && !isNaN(curr.amount) ? curr.amount : 0;
        return curr.type === 'income' ? acc + amount : acc - amount;
    }, 0);
};

export const calculateTotalBalance = (books: Book[], date?: string) => {
    return books.reduce((acc, book) => acc + calculateBookBalance(book, date), 0);
};

export const formatCurrency = (amount: number) => {
    const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `৳${validAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (dateString: string) => {
    if (!dateString) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};
