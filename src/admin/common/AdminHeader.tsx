import { LogOut, ArrowLeftRight, Shield, Pizza, Hotel, FileText, CreditCard } from 'lucide-react';

interface AdminHeaderProps {
  userEmail?: string;
  activeDept: 'gateway' | 'pizza' | 'resort' | 'docs' | 'payments';
  onSelectDept: (dept: 'gateway' | 'pizza' | 'resort' | 'docs' | 'payments') => void;
  onLogout: () => void;
}

export function AdminHeader({ userEmail, activeDept, onSelectDept, onLogout }: AdminHeaderProps) {
  return (
    <header className="bg-stone-900/90 backdrop-blur-md border-b border-stone-800 static sm:sticky sm:top-0 z-40 px-3 sm:px-6 py-3 w-full">
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm shadow-inner">
            FP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-extrabold text-sm tracking-tight">
                Flower Power Admin
              </h1>
              <span className="inline-flex items-center gap-1 bg-stone-800 border border-stone-700 text-stone-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                <Shield className="w-3 h-3 text-emerald-400" />
                Staff Portal
              </span>
            </div>
            <p className="text-stone-400 text-[11px]">
              Ranong & Koh Phayam Management System
            </p>
          </div>
        </div>

        {/* Center / Active Dept Indicator */}
        <div className="flex items-center gap-2 bg-stone-950/80 p-1.5 rounded-2xl border border-stone-800">
          {activeDept === 'gateway' && (
            <span className="text-xs font-bold text-amber-400 px-3 py-1 bg-amber-500/10 rounded-xl border border-amber-500/20">
              🔀 Seleziona Reparto (Bivio)
            </span>
          )}
          {activeDept === 'pizza' && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 px-3 py-1 bg-red-500/10 rounded-xl border border-red-500/20">
                <Pizza className="w-3.5 h-3.5" /> Pizzeria & Delivery (Ranong)
              </span>
              <button
                onClick={() => onSelectDept('gateway')}
                className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-700 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                title="Torna alla selezione reparto"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline font-semibold">Cambia Reparto</span>
              </button>
            </div>
          )}
          {activeDept === 'resort' && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 px-3 py-1 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Hotel className="w-3.5 h-3.5" /> Resort & Booking (Koh Phayam)
              </span>
              <button
                onClick={() => onSelectDept('gateway')}
                className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-700 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                title="Torna alla selezione reparto"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline font-semibold">Cambia Reparto</span>
              </button>
            </div>
          )}
          {activeDept === 'docs' && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-400 px-3 py-1 bg-sky-500/10 rounded-xl border border-sky-500/20">
                <FileText className="w-3.5 h-3.5" /> Web Reader & Documenti
              </span>
              <button
                onClick={() => onSelectDept('gateway')}
                className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-700 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                title="Torna alla selezione reparto"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline font-semibold">Cambia Reparto</span>
              </button>
            </div>
          )}
          {activeDept === 'payments' && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 px-3 py-1 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <CreditCard className="w-3.5 h-3.5" /> Centro Pagamenti & Gateway
              </span>
              <button
                onClick={() => onSelectDept('gateway')}
                className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-700 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                title="Torna alla selezione reparto"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline font-semibold">Cambia Reparto</span>
              </button>
            </div>
          )}
        </div>

        {/* Right User Info & Logout */}
        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="text-xs text-stone-400 font-medium hidden lg:inline">
              {userEmail}
            </span>
          )}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-300 hover:text-red-400 bg-stone-800 hover:bg-red-950/40 border border-stone-700 hover:border-red-800/60 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Esci</span>
          </button>
        </div>
      </div>
    </header>
  );
}
