import { useRouter } from 'next/navigation';
import { Book } from '@/types';

interface BookHeaderProps {
    book: Book;
}

export default function BookHeader({ book }: BookHeaderProps) {
    const router = useRouter();

    return (
        <header className="flex items-center gap-4 py-4">
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
        </header>
    );
}
