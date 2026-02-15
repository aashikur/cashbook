import Image from 'next/image';

export default function LoadingScreen() {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f0f13]">

            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-6 animate-in fade-in duration-500">
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 animate-pulse">
                    <Image
                        src="/loading.png"
                        alt="Loading"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>

                <div className="flex flex-col items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                        CashBook
                    </h2>
                    <div className="flex gap-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
