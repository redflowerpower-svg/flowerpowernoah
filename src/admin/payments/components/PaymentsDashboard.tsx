import React, { useEffect } from 'react';
import {
  CreditCard,
  QrCode,
  Zap,
  FlaskConical,
  Settings,
  ShieldCheck,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { usePaymentsAdminStore } from '../store/usePaymentsAdminStore';
import { GatewaySelectorCard } from './GatewaySelectorCard';
import { StripeTab } from './StripeTab';
import { KsherTab } from './KsherTab';
import { OmiseTab } from './OmiseTab';
import { PayPalTab } from './PayPalTab';
import { PaymentTestLab } from './PaymentTestLab';
import { AccountingReportsTab } from './AccountingReportsTab';
import { Receipt } from 'lucide-react';

export const PaymentsDashboard: React.FC = () => {
  const {
    settings,
    loading,
    activeTab,
    setActiveTab,
    fetchSettings,
    errorMessage
  } = usePaymentsAdminStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const navItems = [
    { id: 'overview', label: 'Panoramica & Switch', icon: <Settings className="w-4 h-4" /> },
    { id: 'ksher', label: 'Ksher (THB)', icon: <QrCode className="w-4 h-4" />, badge: 'Primario' },
    { id: 'paypal', label: 'PayPal', icon: <span className="font-bold text-xs">P</span>, badge: settings.paypal_config.enabled ? 'Attivo' : 'Off' },
    { id: 'accounting', label: '📊 Fatture & Commercialista', icon: <Receipt className="w-4 h-4" />, badge: 'Report' },
    { id: 'stripe', label: 'Stripe Global', icon: <CreditCard className="w-4 h-4" />, badge: settings.stripe_config.target },
    { id: 'omise', label: 'Omise', icon: <Zap className="w-4 h-4" />, badge: 'Sandbox' },
    { id: 'testlab', label: '🧪 Test Lab', icon: <FlaskConical className="w-4 h-4" />, badge: 'Simulatore' }
  ];

  return (
    <div className="space-y-6 w-full max-w-full font-sans text-stone-100 pb-12">
      {/* Top Header Card */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-emerald-500/5 to-transparent pointer-events-none rounded-full blur-3xl"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-extrabold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Reparto Stagno Autonomo
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Centro Pagamenti & Multi-Gateway
            </h1>
            <p className="text-stone-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Pannello di controllo centralizzato per gestire, alternare e testare i gateway di pagamento (Stripe, Ksher, Omise e PayPal) in totale sicurezza e isolamento.
            </p>
          </div>

          {/* Real-time Status Badges */}
          <div className="flex flex-wrap items-center gap-2.5 bg-stone-950/80 p-3 rounded-2xl border border-stone-800 self-start lg:self-center">
            <div className="flex items-center gap-1.5 text-xs text-stone-300 font-semibold px-2">
              <span className="text-stone-500 text-[11px]">Primario:</span>
              <span className="font-mono text-emerald-400 font-bold uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                {settings.active_primary_gateway}
              </span>
            </div>
            <div className="h-4 w-px bg-stone-800"></div>
            <div className="flex items-center gap-1.5 text-xs text-stone-300 font-semibold px-2">
              <span className="text-stone-500 text-[11px]">PayPal:</span>
              <span className={`font-mono text-xs px-2 py-0.5 rounded border ${
                settings.paypal_config.enabled
                  ? 'text-blue-400 bg-blue-950/60 border-blue-800/60'
                  : 'text-stone-500 bg-stone-900 border-stone-800'
              }`}>
                {settings.paypal_config.enabled ? 'Attivo' : 'Disattivato'}
              </span>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="flex items-center gap-2 mt-8 pt-4 border-t border-stone-800 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const isTabActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  isTabActive
                    ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-lg shadow-amber-500/20 font-black'
                    : 'bg-stone-950/60 hover:bg-stone-850 text-stone-300 border-stone-800 hover:border-stone-700'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase tracking-wider font-mono ${
                      isTabActive
                        ? 'bg-stone-950/40 text-stone-950 font-black'
                        : 'bg-stone-900 text-stone-400 border border-stone-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error / Loading State */}
      {loading && (
        <div className="p-6 bg-stone-900/60 border border-stone-800 rounded-3xl flex items-center justify-center gap-3 text-stone-400 text-xs font-semibold">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
          Caricamento impostazioni gateway in corso...
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-950/30 border border-red-800/50 rounded-2xl flex items-center gap-3 text-xs text-red-300">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tab Panels */}
      {!loading && (
        <div>
          {activeTab === 'overview' && <GatewaySelectorCard />}
          {activeTab === 'ksher' && <KsherTab />}
          {activeTab === 'paypal' && <PayPalTab />}
          {activeTab === 'accounting' && <AccountingReportsTab />}
          {activeTab === 'stripe' && <StripeTab />}
          {activeTab === 'omise' && <OmiseTab />}
          {activeTab === 'testlab' && <PaymentTestLab />}
        </div>
      )}
    </div>
  );
};
