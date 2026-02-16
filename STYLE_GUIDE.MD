Main Interface (font-sans):

The entire application is wrapped in the font-sans class.

What this means: It uses the standard system sans-serif stack. On iOS/macOS, this renders as San Francisco; on Android, it renders as Roboto; and on Windows, it renders as Segoe UI.

This provides a native, "app-like" feel that is highly legible and clean.

Net Balance (font-mono):

The balance amount (৳591,477.00) specifically uses the font-mono class.

What this means: It renders in a monospaced font (like SF Mono, Menlo, or Consolas).

Why use it here? In financial apps, monospaced fonts are preferred for numbers because every character has the same width. This prevents the numbers from "jumping" or shifting horizontally if the balance updates frequently, ensuring a stable visual alignment.

Typography Styling:

Boldness: Classes like font-bold (700 weight), font-black (900 weight), and font-semibold (600 weight) are used extensively to create a visual hierarchy between titles and descriptions.

Tracking: The tracking-tighter class is used on the main balance to make the large numbers look more modern and compact, while tracking-widest is used on uppercase labels (like "NET BALANCE") to give them an elegant, professional look.


//DESIGN

import React, { useState } from 'react';
import { 
  User, 
  MoreVertical, 
  Plus, 
  Calendar, 
  Wallet, 
  Search, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Filter,
  ChevronRight,
  Home,
  PieChart,
  Settings,
  Bell
} from 'lucide-react';

const App = () => {
  const [currentDate] = useState(new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }));

  // Mock data for transactions
  const transactions = [
    { id: 1, title: 'Office Rent', category: 'Expense', amount: 25000, type: 'out', time: '10:30 AM' },
    { id: 2, title: 'Project Payment', category: 'Income', amount: 85000, type: 'in', time: 'Yesterday' },
    { id: 3, title: 'Grocery Shopping', category: 'Personal', amount: 1200, type: 'out', time: 'Yesterday' },
    { id: 4, title: 'Freelance Gig', category: 'Income', amount: 15000, type: 'in', time: '2 days ago' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans pb-24">
      {/* --- TOP HEADER --- */}
      <div className="p-6 pb-2">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 p-[2px]">
              <div className="w-full h-full rounded-full bg-[#0a0a0c] flex items-center justify-center">
                <User size={20} className="text-purple-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold leading-none">Amar CashBook</h2>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Premium Account</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-2 bg-white/5 rounded-full border border-white/10 relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#0a0a0c]"></span>
            </button>
            <button className="p-2 bg-white/5 rounded-full border border-white/10">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* --- MAIN BALANCE CARD (Design 1 Variation) --- */}
        <div className="bg-gradient-to-br from-purple-600/30 via-blue-600/10 to-transparent p-6 rounded-[2rem] border border-white/10 relative overflow-hidden group shadow-2xl shadow-purple-900/10">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
          
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-blue-300 font-medium mb-1 tracking-widest uppercase">Net Balance</p>
              <h1 className="text-4xl font-bold font-mono tracking-tighter">৳591,477<span className="text-xl text-white/50">.00</span></h1>
            </div>
            <div className="bg-black/40 p-2 rounded-xl backdrop-blur-md">
              <Wallet size={24} className="text-purple-400" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-gray-400 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
              <Calendar size={12} className="text-blue-400" />
              <span>Today: {currentDate}</span>
            </div>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
            </div>
          </div>
        </div>
      </div>

      {/* --- QUICK ACTIONS --- */}
      <div className="flex gap-4 px-6 mb-8">
        <button className="flex-1 py-4 bg-indigo-600 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30 hover:bg-indigo-700 transition-all active:scale-95">
          <Plus size={18} /> Add Cash In
        </button>
        <button className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-95">
          <Plus size={18} /> Add Cash Out
        </button>
      </div>

      {/* --- TRANSACTION SECTION --- */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Recent History</h3>
          <button className="p-2 text-gray-400 hover:text-white">
            <Filter size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {transactions.map((tx) => (
            <div 
              key={tx.id} 
              className="bg-[#121214] p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-purple-500/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${tx.type === 'in' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {tx.type === 'in' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                </div>
                <div>
                  <h4 className="font-bold text-sm">{tx.title}</h4>
                  <p className="text-[10px] text-gray-500 uppercase tracking-tight">{tx.category} • {tx.time}</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <p className={`font-bold ${tx.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'in' ? '+' : '-'} ৳{tx.amount.toLocaleString()}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
              </div>
            </div>
          ))}
        </div>

        <button className="w-full mt-6 py-3 text-sm text-gray-500 font-medium hover:text-purple-400 transition-colors">
          View All Transactions
        </button>
      </div>

      {/* --- BOTTOM NAVIGATION --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0c]/80 backdrop-blur-xl border-t border-white/5 p-4 flex justify-around items-center">
        <button className="flex flex-col items-center gap-1 text-purple-500">
          <Home size={24} />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-300">
          <PieChart size={24} />
          <span className="text-[10px] font-bold">Reports</span>
        </button>
        <div className="relative -top-8">
           <button className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-2xl shadow-xl shadow-purple-600/40 flex items-center justify-center rotate-45 group hover:scale-110 transition-transform">
             <Plus size={32} className="-rotate-45" />
           </button>
        </div>
        <button className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-300">
          <Search size={24} />
          <span className="text-[10px] font-bold">Search</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-300">
          <Settings size={24} />
          <span className="text-[10px] font-bold">Settings</span>
        </button>
      </div>
    </div>
  );
};

export default App;
