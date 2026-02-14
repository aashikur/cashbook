
import { Book, Transaction } from "@/types";

export const loadBooks = (): Book[] => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('cashbook_data');
    if (!saved) return [];
    try {
        const books = JSON.parse(saved);
        // Migration: Add 'type' if missing
        return books.map((b: any) => ({
            ...b,
            type: b.type || 'normal'
        }));
    } catch (e) {
        console.error("Failed to parse books", e);
        return [];
    }
}

export const saveBooks = (books: Book[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('cashbook_data', JSON.stringify(books));
}

export const filterTransactionsByDate = (transactions: Transaction[], date?: string) => {
    if (!date) return transactions;
    return transactions.filter(t => {
        // Create date object and adjust for local timezone offset if needed, 
        // or just use toLocaleDateString if we trust the browser env.
        // Simple approach: compare YYYY-MM-DD parts
        const txnDate = new Date(t.date);
        const localTxnDate = txnDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
        return localTxnDate === date;
    });
}

// date is expected in YYYY-MM-DD format if provided
export const calculateBookBalance = (book: Book, date?: string) => {
    let txns = book.transactions;
    if (date) {
        txns = filterTransactionsByDate(txns, date);
    }

    if (book.type === 'fixed') {
        // For fixed books, the balance is the last transaction in the list
        // Assuming transactions are ordered new -> old (index 0 is newest)
        if (txns.length === 0) return 0;
        return txns[0].amount;
    }

    return txns.reduce((acc, curr) => {
        return curr.type === 'income' ? acc + curr.amount : acc - curr.amount;
    }, 0);
}

export const calculateTotalBalance = (books: Book[], date?: string) => {
    return books.reduce((acc, book) => acc + calculateBookBalance(book, date), 0);
}

export const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(val);
};

export const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};
