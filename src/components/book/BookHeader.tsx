import { useRouter } from 'next/navigation';
import { Book } from '@/types';

interface BookHeaderProps {
    book: Book;
    selectedDate: string;
    onDateChange: (date: string) => void;
}

export default function BookHeader({ book, selectedDate, onDateChange }: BookHeaderProps) {
    const router = useRouter();

    return (
        <header className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push('/')}
                    className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    {book.name}
                    {book.type === 'fixed' && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">FIXED</span>}
                </h1>
            </div>

            <div className="relative self-center">
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
        </header>
    );
}
