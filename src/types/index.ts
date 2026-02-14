export interface Transaction {
    id: string;
    amount: number;
    description: string;
    type: 'income' | 'expense';
    date: string;
}

export interface Book {
    id: string;
    name: string;
    type: 'normal' | 'fixed';
    transactions: Transaction[];
    createdAt: string;
}
