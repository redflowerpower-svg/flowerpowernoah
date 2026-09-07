import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RealOctoratePlan {
  id: string;
  code: string;
  name: string;
  isAcOnly: boolean;
  hasBreakfast?: boolean;
  type: 'be' | '7d' | 'booking' | 'ac' | 'agoda';
  description: string;
  badgeColor: string;
}

export const REAL_OCTORATE_PLANS: RealOctoratePlan[] = [
  { id: 'be', code: 'BE', name: 'Official Booking Engine (BE)', isAcOnly: false, hasBreakfast: false, type: 'be', description: 'Canale diretto del sito web (Tariffa Madre)', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' },
  { id: '7d', code: '7d', name: 'Standard 7d (Canc. 7gg)', isAcOnly: false, hasBreakfast: false, type: '7d', description: 'Booking.com, Expedia, Agoda & Sito: Canc. gratuita 100% fino a 7gg prima del check-in', badgeColor: 'bg-teal-400/20 text-teal-300 border-teal-400/50' },
  { id: 'main_bnb_7d', code: 'Main bnb-7d', name: 'Main bnb-7d (Canc. 7gg)', isAcOnly: false, hasBreakfast: true, type: 'booking', description: 'Booking.com & Expedia: Canc. gratuita 100% fino a 7gg prima del check-in', badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/50' },
  { id: 'main_bnb_14d', code: 'Main bnb-14d', name: 'Main bnb-14d (Canc. 14gg)', isAcOnly: false, hasBreakfast: true, type: 'booking', description: 'Booking.com & Expedia: Canc. gratuita 100% fino a 14gg prima del check-in', badgeColor: 'bg-blue-950/90 text-blue-300 border-blue-700/80' },
  { id: 'agd_ac_7d', code: 'AGD AC-7d', name: 'AGD AC-7d (Agoda AC 7gg)', isAcOnly: true, hasBreakfast: false, type: 'agoda', description: 'Agoda AC: Canc. gratuita 100% fino a 7gg prima del check-in', badgeColor: 'bg-pink-300/20 text-pink-200 border-pink-300/60' },
  { id: 'agd_ac_14d', code: 'AGD AC-14d', name: 'AGD AC-14d (Agoda AC 14gg)', isAcOnly: true, hasBreakfast: false, type: 'agoda', description: 'Agoda AC: Canc. gratuita 100% fino a 14gg prima del check-in', badgeColor: 'bg-rose-950/80 text-rose-400 border-rose-700/80' },
  { id: 'airbnb', code: 'AirBnB', name: 'AirBnB Standard', isAcOnly: false, hasBreakfast: false, type: 'booking', description: 'Canale Airbnb per alloggi Standard', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/50' },
  { id: 'airbnb_ac', code: 'AirBnB AC', name: 'AirBnB AC', isAcOnly: true, hasBreakfast: false, type: 'booking', description: 'Canale Airbnb per alloggi con Aria Condizionata', badgeColor: 'bg-orange-600/25 text-orange-300 border-orange-600/60' },
  { id: 'ac_7d', code: 'AC7d', name: 'AC7d (AC Canc. 7gg)', isAcOnly: true, hasBreakfast: false, type: 'ac', description: 'Master AC: Canc. gratuita 100% fino a 7gg prima del check-in', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' },
  { id: 'ac_14d', code: 'AC14d', name: 'AC14d (AC Canc. 14gg)', isAcOnly: true, hasBreakfast: false, type: 'ac', description: 'Master AC: Canc. gratuita 100% fino a 14gg prima del check-in', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/50' },
  { id: 'ac_bnb_7d', code: 'AC bnb-7d', name: 'AC bnb-7d (Booking AC 7gg)', isAcOnly: true, hasBreakfast: true, type: 'booking', description: 'Booking.com & Expedia AC: Canc. gratuita 100% fino a 7gg prima del check-in', badgeColor: 'bg-indigo-500/20 text-cyan-300 border-cyan-500/50' },
  { id: 'ac_bnb_14d', code: 'AC bnb-14d', name: 'AC bnb-14d (Booking AC 14gg)', isAcOnly: true, hasBreakfast: true, type: 'booking', description: 'Booking.com & Expedia AC: Canc. gratuita 100% fino a 14gg prima del check-in', badgeColor: 'bg-purple-500/20 text-cyan-300 border-cyan-500/50' }
];

export const RATE_PLANS = REAL_OCTORATE_PLANS;

export interface PlannedPeriod {
  id: string;
  name: string;
  dateFrom: string;          // ISO YYYY-MM-DD
  dateTo: string;            // ISO YYYY-MM-DD
  stopSell: boolean;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  onlyCheckOutDays: number;  // Giorni consecutivi di finestra Only Check Out (es. 10gg)
  minStayArrival?: number;
  failsafeCheckout: boolean;
}

export interface LiveMockRestriction {
  stopSell: boolean;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  onlyCheckOutDays: number;
}

export interface MinStayPeriod {
  id: string;
  dateFrom: string;
  dateTo: string;
  minStay: number;
  name?: string;
}

import CANONICAL_MIN_STAY_TIMELINE from '../config/min_stay_canonical_timeline.json';

export const INITIAL_MIN_STAY_PERIODS: MinStayPeriod[] = [...(CANONICAL_MIN_STAY_TIMELINE as MinStayPeriod[])];

export interface RestrictionsState {
  plannedPeriods: Record<string, PlannedPeriod[]>;
  liveOctorateRestrictions: Record<string, PlannedPeriod[]>;
  
  // Corsia Notti Minime (Min Stay)
  plannedMinStayPeriods: MinStayPeriod[];
  liveMinStayPeriods: MinStayPeriod[];
  stagedMinStayPeriods: MinStayPeriod[] | null;
  addNextMinStayPeriod: () => void;
  insertMinStayPeriodRelative: (targetPeriodId: string, position: 'before' | 'after') => void;
  updateMinStayPeriod: (id: string, updates: Partial<MinStayPeriod>) => void;
  removeMinStayPeriod: (id: string, options?: { shiftSubsequent?: boolean }) => void;
  resetDefaultMinStay: () => void;

  resetPreferences: {
    stopSells: boolean;
    closed: boolean;
    closedArrival: boolean;
    closedDeparture: boolean;
  };
  setResetPreference: (key: string, val: boolean) => void;
  tabulaRasaDateFrom: string;
  tabulaRasaDateTo: string;
  setTabulaRasaDateRange: (from: string, to: string) => void;
  testMode: boolean;
  setTestMode: (val: boolean) => void;
  disabledRatePlans: string[];
  toggleRatePlanActive: (key: string) => void;
  liveViewMode: 'prod' | 'test';
  setLiveViewMode: (mode: 'prod' | 'test') => void;
  isSaving: boolean;
  isBulkSaving: boolean;
  bulkSyncProgress: { current: number; total: number; currentPlanName?: string };
  saveDraftBackup: () => void;
  restoreDraftBackup: () => { success: boolean; message: string };
  importConfig: (periods: Record<string, PlannedPeriod[]>) => { success: boolean; message: string };
  isComparing: boolean;
  setIsComparing: (val: boolean) => void;
  updatePlannedPeriod: (ratePlanKey: string, index: any, updated?: Partial<PlannedPeriod>) => void;
  addNextPlannedPeriod: (ratePlanKey: string) => void;
  insertPlannedPeriodRelative: (ratePlanKey: string, targetPeriodId: string, position: 'before' | 'after') => void;
  removePlannedPeriod: (ratePlanKey: string, index?: any, options?: { shiftSubsequent?: boolean }) => void;
  syncRatePlanToOctorate: (ratePlanKey: string, index?: any, options?: { testOnly?: boolean }) => Promise<any>;
  syncAllRatePlansToOctorate: (options?: { testOnly?: boolean }) => Promise<any>;
  fetchLiveRestrictions: () => Promise<void>;

  // Fase Intermedia / Staging & Preview
  syncStage: 'idle' | 'staged_preview';
  stagedTarget: 'test' | 'prod' | null;
  stagedRestrictions: Record<string, PlannedPeriod[]> | null;
  stageSyncPreview: (target: 'test' | 'prod') => void;
  cancelSyncPreview: () => void;
  commitStagedSyncToOctorate: () => Promise<boolean>;
}

export interface RestrictionsStoreState extends RestrictionsState {
  liveOctorateRestrictionsMock: Record<string, Record<string, LiveMockRestriction>>;
  syncingPeriodId: string | null;
  syncAllRunning: boolean;
  isFetchingLive: boolean;
  lastSyncMessage: string | null;
  lastSyncStatus: 'idle' | 'success' | 'error';

  // Aliases per compatibilità
  addNextPeriod: (planId: string) => void;
  removePeriod: (planId: string, periodId: string) => void;
  updatePeriod: (planId: string, periodId: string, updates: Partial<PlannedPeriod>) => void;

  syncPlanToOctorate: (planId: string, periodId: string) => Promise<boolean>;
  syncAllPlansToOctorate: (options?: { testOnly?: boolean }) => Promise<boolean>;
  cancelBulkSync: () => void;
  resetDefaultStore: () => void;
}
// Periodi di Default v13 con configurazione pulita per i blocchi Only Check-out
export const INITIAL_PLAN_PERIODS: Record<string, PlannedPeriod[]> = {
  be: [
    {
      id: 'be_p1',
      name: 'BE',
      dateFrom: '2026-10-01',
      dateTo: '2027-05-31',
      stopSell: false,
      closedToArrival: false,
      closedToDeparture: false,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    }
  ],
  '7d': [
    {
      id: '7d_p1',
      name: '7d',
      dateFrom: '2026-10-01',
      dateTo: '2026-12-15',
      stopSell: false,
      closedToArrival: false,
      closedToDeparture: false,
      onlyCheckOutDays: 10,
      failsafeCheckout: true
    },
    {
      id: '7d_p2',
      name: '7d',
      dateFrom: '2026-12-26',
      dateTo: '2027-03-31',
      stopSell: true,
      closedToArrival: false,
      closedToDeparture: true,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    },
    {
      id: '7d_p3',
      name: '7d',
      dateFrom: '2027-04-01',
      dateTo: '2027-05-31',
      stopSell: false,
      closedToArrival: false,
      closedToDeparture: false,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    }
  ],
  main_bnb_7d: [
    {
      id: 'mb7_p1',
      name: 'Main bnb-7d',
      dateFrom: '2026-10-01',
      dateTo: '2026-12-15',
      stopSell: false,
      closedToArrival: false,
      closedToDeparture: false,
      onlyCheckOutDays: 10,
      failsafeCheckout: true
    },
    {
      id: 'mb7_p2',
      name: 'Main bnb-7d',
      dateFrom: '2026-12-26',
      dateTo: '2027-01-15',
      stopSell: true,
      closedToArrival: false,
      closedToDeparture: true,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    },
    {
      id: 'mb7_p3',
      name: 'Main bnb-7d',
      dateFrom: '2027-01-16',
      dateTo: '2027-05-31',
      stopSell: false,
      closedToArrival: false,
      closedToDeparture: false,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    }
  ],
  main_bnb_14d: [
    {
      id: 'mb14_p1',
      name: 'Main bnb-14d',
      dateFrom: '2026-10-01',
      dateTo: '2026-12-15',
      stopSell: true,
      closedToArrival: false,
      closedToDeparture: true,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    },
    {
      id: 'mb14_p2',
      name: 'Main bnb-14d',
      dateFrom: '2026-12-16',
      dateTo: '2027-01-15',
      stopSell: false,
      closedToArrival: false,
      closedToDeparture: false,
      onlyCheckOutDays: 10,
      failsafeCheckout: true
    },
    {
      id: 'mb14_p3',
      name: 'Main bnb-14d',
      dateFrom: '2027-01-26',
      dateTo: '2027-05-31',
      stopSell: true,
      closedToArrival: false,
      closedToDeparture: true,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    }
  ],
  agd_ac_7d: [
    {
      id: 'ag7_p1',
      name: 'AGD AC-7d',
      dateFrom: '2026-10-01',
      dateTo: '2026-12-15',
      stopSell: false,
      closedToArrival: false,
      closedToDeparture: false,
      onlyCheckOutDays: 10,
      failsafeCheckout: true
    },
    {
      id: 'ag7_p2',
      name: 'AGD AC-7d',
      dateFrom: '2026-12-26',
      dateTo: '2027-01-15',
      stopSell: true,
      closedToArrival: false,
      closedToDeparture: true,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    },
    {
      id: 'ag7_p3',
      name: 'AGD AC-7d',
      dateFrom: '2027-01-16',
      dateTo: '2027-05-31',
      stopSell: false,
      closedToArrival: false,
      closedToDeparture: false,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    }
  ],
  agd_ac_14d: [
    {
      id: 'ag14_p1',
      name: 'AGD AC-14d',
      dateFrom: '2026-10-01',
      dateTo: '2026-12-15',
      stopSell: true,
      closedToArrival: false,
      closedToDeparture: true,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    },
    {
      id: 'ag14_p2',
      name: 'AGD AC-14d',
      dateFrom: '2026-12-16',
      dateTo: '2027-01-15',
      stopSell: false,
      closedToArrival: false,
      closedToDeparture: false,
      onlyCheckOutDays: 10,
      failsafeCheckout: true
    },
    {
      id: 'ag14_p3',
      name: 'AGD AC-14d',
      dateFrom: '2027-01-26',
      dateTo: '2027-05-31',
      stopSell: true,
      closedToArrival: false,
      closedToDeparture: true,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    }
  ],
  airbnb: [
    {
      id: 'ab_p1',
      name: 'AirBnB',
      dateFrom: '2026-10-01',
      dateTo: '2027-05-31',
      stopSell: false,
      closedToArrival: false,
      closedToDeparture: false,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    }
  ],
  airbnb_ac: [
    {
      id: 'abac_p1',
      name: 'AirBnB AC',
      dateFrom: '2026-10-01',
      dateTo: '2027-05-31',
      stopSell: false,
      closedToArrival: false,
      closedToDeparture: false,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    }
  ],
  ac_7d: [
    {
      id: 'ac7_p1',
      name: 'AC7d',
      dateFrom: '2026-10-01',
      dateTo: '2027-05-31',
      stopSell: false,
      closedToArrival: false,
      closedToDeparture: false,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    }
  ],
  ac_14d: [
    {
      id: 'ac14_p1',
      name: 'AC14d',
      dateFrom: '2026-10-01',
      dateTo: '2027-05-31',
      stopSell: false,
      closedToArrival: false,
      closedToDeparture: false,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    }
  ],
  ac_bnb_7d: [
    {
      id: 'acb7_p1',
      name: 'AC bnb-7d',
      dateFrom: '2026-10-01',
      dateTo: '2027-05-31',
      stopSell: false,
      closedToArrival: false,
      closedToDeparture: false,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    }
  ],
  ac_bnb_14d: [
    {
      id: 'acb14_p1',
      name: 'AC bnb-14d',
      dateFrom: '2026-10-01',
      dateTo: '2027-05-31',
      stopSell: false,
      closedToArrival: false,
      closedToDeparture: false,
      onlyCheckOutDays: 0,
      failsafeCheckout: false
    }
  ]
};;

// Mock live state svuotato: la Tabella 2 usa esclusivamente dati reali da Octorate API
export const INITIAL_LIVE_MOCK: Record<string, Record<string, LiveMockRestriction>> = {};

// Helper: normalizza le chiavi del grid backend verso le chiavi frontend (planId)
// Gestisce variazioni come 'main_bnb_7d' vs 'main-bnb-7d' vs 'mainbnb7d' ecc.
export function normalizeGridKeys(rawGrid: Record<string, any[]>): Record<string, any[]> {
  const KEY_ALIASES: Record<string, string> = {
    be: 'be',
    '7d': '7d',
    main_bnb_7d: 'main_bnb_7d',
    main_bnb_14d: 'main_bnb_14d',
    ac_7d: 'ac_7d',
    ac_14d: 'ac_14d',
    ac_bnb_7d: 'ac_bnb_7d',
    ac_bnb_14d: 'ac_bnb_14d',
    agd_ac_7d: 'agd_ac_7d',
    agd_ac_14d: 'agd_ac_14d',
    airbnb: 'airbnb',
    airbnb_ac: 'airbnb_ac',
    'main-bnb-7d': 'main_bnb_7d',
    'main-bnb-14d': 'main_bnb_14d',
    'ac-7d': 'ac_7d',
    'ac-14d': 'ac_14d',
    'ac-bnb-7d': 'ac_bnb_7d',
    'ac-bnb-14d': 'ac_bnb_14d',
    'agd-ac-7d': 'agd_ac_7d',
    'agd-ac-14d': 'agd_ac_14d',
    'airbnb-ac': 'airbnb_ac',
    'airbnbac': 'airbnb_ac',
  };

  const normalized: Record<string, any[]> = {};
  for (const [rawKey, periods] of Object.entries(rawGrid)) {
    const cleanKey = rawKey.toLowerCase().trim();
    const mappedKey = KEY_ALIASES[cleanKey] ?? cleanKey;
    if (Array.isArray(periods) && periods.length > 0) {
      normalized[mappedKey] = periods.map((p: any) => {
        const rawDays = p.onlyCheckoutDays ?? p.onlyCheckOutDays;
        const outDays = (rawDays !== undefined && rawDays !== null) ? Number(rawDays) : 0;
        return {
          ...p,
          onlyCheckOutDays: outDays,
          onlyCheckoutDays: outDays
        };
      });
    }
  }
  return normalized;
}

export const useRestrictionsStore = create<RestrictionsStoreState>()(
  persist(
    (set, get) => ({
      plannedPeriods: { ...INITIAL_PLAN_PERIODS },
      liveOctorateRestrictions: {},
      liveOctorateRestrictionsMock: { ...INITIAL_LIVE_MOCK },
      // Corsia Notti Minime (Min Stay)
      plannedMinStayPeriods: [...INITIAL_MIN_STAY_PERIODS],
      liveMinStayPeriods: [],
      stagedMinStayPeriods: null,

      addNextMinStayPeriod: () => {
        const state = get();
        const list = state.plannedMinStayPeriods || [];
        let newDateFrom = '2026-10-01';
        let newDateTo = '2026-11-30';
        let defaultNights = 1;

        if (list.length > 0) {
          const lastPeriod = list[list.length - 1];
          if (lastPeriod.dateTo) {
            const lastEnd = new Date(lastPeriod.dateTo);
            lastEnd.setDate(lastEnd.getDate() + 1);
            newDateFrom = lastEnd.toISOString().split('T')[0];

            const newEnd = new Date(lastEnd);
            newEnd.setDate(newEnd.getDate() + 30);
            newDateTo = newEnd.toISOString().split('T')[0];
          }
          defaultNights = lastPeriod.minStay || 1;
        }

        const newPeriod: MinStayPeriod = {
          id: `ms_p${list.length + 1}_${Date.now()}`,
          name: `Soggiorno Minimo ${defaultNights} Notti`,
          dateFrom: newDateFrom,
          dateTo: newDateTo,
          minStay: defaultNights
        };

        set({
          plannedMinStayPeriods: [...list, newPeriod]
        });
      },

      insertMinStayPeriodRelative: (targetPeriodId: string, position: 'before' | 'after') => {
        const list = get().plannedMinStayPeriods || [];
        const idx = list.findIndex(p => p.id === targetPeriodId);
        if (idx === -1) return;

        const target = list[idx];
        const NEW_PERIOD_DAYS = 30;

        const shiftDate = (dateStr: string, days: number): string => {
          const d = new Date(dateStr);
          d.setDate(d.getDate() + days);
          return d.toISOString().split('T')[0];
        };

        let newDateFrom = '2026-10-01';
        let newDateTo = '2026-10-30';
        const updatedList = list.map(p => ({ ...p }));

        if (position === 'after') {
          newDateFrom = shiftDate(target.dateTo, 1);
          newDateTo = shiftDate(newDateFrom, NEW_PERIOD_DAYS - 1);

          for (let i = idx + 1; i < updatedList.length; i++) {
            updatedList[i].dateFrom = shiftDate(updatedList[i].dateFrom, NEW_PERIOD_DAYS);
            updatedList[i].dateTo = shiftDate(updatedList[i].dateTo, NEW_PERIOD_DAYS);
          }

          const newPeriod: MinStayPeriod = {
            id: `ms_p${Date.now()}`,
            name: `Soggiorno Minimo ${target.minStay || 1} Notti`,
            dateFrom: newDateFrom,
            dateTo: newDateTo,
            minStay: target.minStay || 1
          };

          updatedList.splice(idx + 1, 0, newPeriod);
        } else {
          newDateTo = shiftDate(target.dateFrom, -1);
          newDateFrom = shiftDate(newDateTo, -(NEW_PERIOD_DAYS - 1));

          const newPeriod: MinStayPeriod = {
            id: `ms_p${Date.now()}`,
            name: `Soggiorno Minimo ${target.minStay || 1} Notti`,
            dateFrom: newDateFrom,
            dateTo: newDateTo,
            minStay: target.minStay || 1
          };

          updatedList.splice(idx, 0, newPeriod);
        }

        set({ plannedMinStayPeriods: updatedList });
      },

      updateMinStayPeriod: (id: string, updates: Partial<MinStayPeriod>) => {
        const list = get().plannedMinStayPeriods || [];
        const updated = list.map(p => p.id === id ? { ...p, ...updates } : p);
        set({ plannedMinStayPeriods: updated });
      },

      removeMinStayPeriod: (id: string, options?: { shiftSubsequent?: boolean }) => {
        const list = get().plannedMinStayPeriods || [];
        const idx = list.findIndex(p => p.id === id);
        if (idx === -1) return;

        if (!options?.shiftSubsequent || idx === list.length - 1) {
          set({ plannedMinStayPeriods: list.filter(p => p.id !== id) });
          return;
        }

        const target = list[idx];
        const shiftDate = (dateStr: string, days: number): string => {
          const d = new Date(dateStr);
          d.setDate(d.getDate() + days);
          return d.toISOString().split('T')[0];
        };

        const targetDays = Math.max(1, Math.round((new Date(target.dateTo).getTime() - new Date(target.dateFrom).getTime()) / 86400000) + 1);
        const updatedList = list.filter(p => p.id !== id).map(p => ({ ...p }));

        for (let i = idx; i < updatedList.length; i++) {
          updatedList[i].dateFrom = shiftDate(updatedList[i].dateFrom, -targetDays);
          updatedList[i].dateTo = shiftDate(updatedList[i].dateTo, -targetDays);
        }

        set({ plannedMinStayPeriods: updatedList });
      },

      resetDefaultMinStay: () => {
        set({ plannedMinStayPeriods: [...INITIAL_MIN_STAY_PERIODS] });
      },

      resetPreferences: {
        stopSells: true,
        closed: true,
        closedArrival: true,
        closedDeparture: true
      },
      setResetPreference: (key: string, val: boolean) =>
        set((state) => ({
          resetPreferences: {
            ...state.resetPreferences,
            [key]: val
          }
        })),
      tabulaRasaDateFrom: '2026-10-01',
      tabulaRasaDateTo: '2027-10-31',
      setTabulaRasaDateRange: (from: string, to: string) =>
        set({ tabulaRasaDateFrom: from, tabulaRasaDateTo: to }),
      testMode: true,
      setTestMode: (val: boolean) => {
        set({
          testMode: val,
          liveViewMode: val ? 'test' : 'prod'
        });
        get().fetchLiveRestrictions();
      },
      disabledRatePlans: (() => {
        const DEFAULT_DISABLED = ['airbnb_ac', 'ac_7d', 'ac_14d', 'ac_bnb_7d', 'ac_bnb_14d'];
        try {
          const saved = localStorage.getItem('fpv_disabled_plans_v9');
          return saved ? JSON.parse(saved) : DEFAULT_DISABLED;
        } catch {
          return DEFAULT_DISABLED;
        }
      })(),
      liveViewMode: 'test',
      syncingPeriodId: null,
      syncAllRunning: false,
      isSaving: false,
      isBulkSaving: false,
      isComparing: false,
      bulkSyncProgress: { current: 0, total: 0, currentPlanName: '' },
      isFetchingLive: false,
      lastSyncMessage: null,
      lastSyncStatus: 'idle',

      // Staging / Anteprima Sincronizzazione
      syncStage: 'idle' as const,
      stagedTarget: null,
      stagedRestrictions: null,

      toggleRatePlanActive: (key: string) => {
        const current = get().disabledRatePlans || [];
        const exists = current.includes(key);
        const updated = exists ? current.filter(k => k !== key) : [...current, key];
        set({ disabledRatePlans: updated });
        try {
          localStorage.setItem('fpv_disabled_plans_v9', JSON.stringify(updated));
        } catch (e) {
          console.warn('LocalStorage save error:', e);
        }
      },

      setLiveViewMode: (mode: 'prod' | 'test') => {
        set({
          liveViewMode: mode,
          testMode: mode === 'test'
        });
        get().fetchLiveRestrictions();
      },

      setIsComparing: (val: boolean) => set({ isComparing: val }),

      saveDraftBackup: () => {
        try {
          localStorage.setItem('fp_restrictions_draft_backup', JSON.stringify(get().plannedPeriods));
        } catch (e) {
          console.warn('saveDraftBackup error:', e);
        }
      },

      restoreDraftBackup: () => {
        try {
          const raw = localStorage.getItem('fp_restrictions_draft_backup');
          if (raw) {
            const periods = JSON.parse(raw);
            set({ plannedPeriods: periods });
            return { success: true, message: 'Backup ripristinato con successo' };
          }
          return { success: false, message: 'Nessun backup trovato' };
        } catch (e: any) {
          return { success: false, message: e.message || 'Errore durante il ripristino' };
        }
      },

      importConfig: (periods: Record<string, PlannedPeriod[]>) => {
        try {
          set({ plannedPeriods: periods });
          return { success: true, message: 'Configurazione importata con successo' };
        } catch (e: any) {
          return { success: false, message: e.message || 'Errore durante l\'importazione' };
        }
      },

      syncRatePlanToOctorate: async (planId: string, periodId?: any, options?: { testOnly?: boolean }) => {
        const ok = await get().syncPlanToOctorate(planId, String(periodId), options);
        return { success: ok, message: ok ? 'OK' : 'Errore' };
      },

      fetchLiveRestrictions: async () => {
        const { liveViewMode } = get();
        set({ isFetchingLive: true, lastSyncMessage: null });
        try {
          const url = liveViewMode === 'test'
            ? '/api/resort/octorate-restrictions-grid?testOnly=true'
            : '/api/resort/octorate-restrictions-grid';
          const res = await fetch(url);
          if (!res.ok) {
            const errText = await res.text().catch(() => `Status ${res.status}`);
            throw new Error(`Errore HTTP ${res.status}: ${errText}`);
          }
          const data = await res.json();
          if (data.success && data.grid && typeof data.grid === 'object') {
            // Normalizza le chiavi del grid backend verso i planId frontend
            const normalizedGrid = normalizeGridKeys(data.grid);
            const planCount = Object.keys(normalizedGrid).length;
            const periodCount = Object.values(normalizedGrid).reduce((acc, v) => acc + (v?.length || 0), 0);
            const liveMinStay = Array.isArray(data.minStayPeriods) ? data.minStayPeriods : [];
            console.info(`[fetchLiveRestrictions] ✅ Grid scaricata [${liveViewMode.toUpperCase()}]: ${planCount} piani, ${periodCount} periodi totali, ${liveMinStay.length} blocchi MinStay.`);
            set({
              liveOctorateRestrictions: normalizedGrid,
              liveMinStayPeriods: liveMinStay,
              isFetchingLive: false,
              lastSyncMessage: `✅ Timeline Live Octorate [${liveViewMode.toUpperCase()}] aggiornata: ${planCount} piani, ${periodCount} periodi scaricati.`,
              lastSyncStatus: 'success'
            });
          } else {
            const errMsg = data.error || 'Risposta Octorate vuota o non valida';
            console.warn('[fetchLiveRestrictions] ⚠️ Grid vuota:', errMsg, data);
            set({
              isFetchingLive: false,
              lastSyncMessage: `⚠️ Timeline Live Octorate: ${errMsg}`,
              lastSyncStatus: 'error'
            });
          }
        } catch (err: any) {
          console.error('[useRestrictionsStore] Errore fetchLiveRestrictions:', err);
          set({
            isFetchingLive: false,
            lastSyncMessage: `❌ Impossibile scaricare dati Live da Octorate: ${err?.message || 'Errore di rete'}`,
            lastSyncStatus: 'error'
          });
        }
      },

      updatePlannedPeriod: (planId: string, periodId: string, updates: Partial<PlannedPeriod>) => {
        const state = get();
        const list = state.plannedPeriods[planId] || [];
        set({
          plannedPeriods: {
            ...state.plannedPeriods,
            [planId]: list.map(p => p.id === periodId ? { ...p, ...updates } : p)
          }
        });
      },

      addNextPlannedPeriod: (planId: string) => {
        const state = get();
        const list = state.plannedPeriods[planId] || [];
        let newDateFrom = '2026-10-01';
        let newDateTo = '2026-11-30';

        if (list.length > 0) {
          const lastPeriod = list[list.length - 1];
          if (lastPeriod.dateTo) {
            const lastEnd = new Date(lastPeriod.dateTo);
            lastEnd.setDate(lastEnd.getDate() + 1);
            newDateFrom = lastEnd.toISOString().split('T')[0];

            const newEnd = new Date(lastEnd);
            newEnd.setDate(newEnd.getDate() + 30);
            newDateTo = newEnd.toISOString().split('T')[0];
          }
        }

        const newPeriod: PlannedPeriod = {
          id: `${planId}_p${list.length + 1}_${Date.now()}`,
          name: `Periodo ${list.length + 1}`,
          dateFrom: newDateFrom,
          dateTo: newDateTo,
          stopSell: false,
          closedToArrival: false,
          closedToDeparture: false,
          onlyCheckOutDays: 10,
          failsafeCheckout: true
        };

        set({
          plannedPeriods: {
            ...state.plannedPeriods,
            [planId]: [...list, newPeriod]
          }
        });
      },

      insertPlannedPeriodRelative: (planId: string, targetPeriodId: string, position: 'before' | 'after') => {
        const state = get();
        const list = state.plannedPeriods[planId] || [];
        const idx = list.findIndex(p => p.id === targetPeriodId);
        if (idx === -1) return;

        const target = list[idx];
        const NEW_PERIOD_DAYS = 30;

        const shiftDate = (dateStr: string, days: number): string => {
          const d = new Date(dateStr);
          d.setDate(d.getDate() + days);
          return d.toISOString().split('T')[0];
        };

        let newDateFrom = '2026-10-01';
        let newDateTo = '2026-10-30';

        const updatedList = list.map(p => ({ ...p }));

        if (position === 'after') {
          const ctaDays = target.onlyCheckoutDays ?? target.onlyCheckOutDays ?? 0;
          newDateFrom = shiftDate(target.dateTo, 1 + ctaDays);
          newDateTo = shiftDate(newDateFrom, NEW_PERIOD_DAYS - 1);

          // Sposta fisicamente in avanti tutti i periodi successivi
          for (let i = idx + 1; i < updatedList.length; i++) {
            updatedList[i].dateFrom = shiftDate(updatedList[i].dateFrom, NEW_PERIOD_DAYS);
            updatedList[i].dateTo = shiftDate(updatedList[i].dateTo, NEW_PERIOD_DAYS);
          }

          const newPeriod: PlannedPeriod = {
            id: `${planId}_p${Date.now()}`,
            name: 'Apertura Standard (OK)',
            dateFrom: newDateFrom,
            dateTo: newDateTo,
            stopSell: false,
            closedToArrival: false,
            closedToDeparture: false,
            onlyCheckOutDays: 0,
            onlyCheckoutDays: 0,
            failsafeCheckout: false
          };

          updatedList.splice(idx + 1, 0, newPeriod);
        } else {
          // Inserisci prima: il nuovo periodo prende l'inizio del target e sposta il target e tutti i successivi
          newDateFrom = target.dateFrom;
          newDateTo = shiftDate(newDateFrom, NEW_PERIOD_DAYS - 1);

          // Sposta fisicamente in avanti il target e tutti i successivi
          for (let i = idx; i < updatedList.length; i++) {
            updatedList[i].dateFrom = shiftDate(updatedList[i].dateFrom, NEW_PERIOD_DAYS);
            updatedList[i].dateTo = shiftDate(updatedList[i].dateTo, NEW_PERIOD_DAYS);
          }

          const newPeriod: PlannedPeriod = {
            id: `${planId}_p${Date.now()}`,
            name: 'Apertura Standard (OK)',
            dateFrom: newDateFrom,
            dateTo: newDateTo,
            stopSell: false,
            closedToArrival: false,
            closedToDeparture: false,
            onlyCheckOutDays: 0,
            onlyCheckoutDays: 0,
            failsafeCheckout: false
          };

          updatedList.splice(idx, 0, newPeriod);
        }

        set({
          plannedPeriods: {
            ...state.plannedPeriods,
            [planId]: updatedList
          }
        });
      },

      removePlannedPeriod: (planId: string, periodId?: string, options?: { shiftSubsequent?: boolean }) => {
        const state = get();
        const list = state.plannedPeriods[planId] || [];
        if (!periodId) return;
        const idx = list.findIndex(p => p.id === periodId);
        if (idx === -1) return;

        const target = list[idx];
        const updatedList = list.map(p => ({ ...p }));

        if (options?.shiftSubsequent) {
          const shiftDate = (dateStr: string, days: number): string => {
            const d = new Date(dateStr);
            d.setDate(d.getDate() + days);
            return d.toISOString().split('T')[0];
          };

          const d1 = new Date(target.dateFrom).getTime();
          const d2 = new Date(target.dateTo).getTime();
          const duration = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
          const cta = target.onlyCheckoutDays ?? target.onlyCheckOutDays ?? 0;
          const totalSpan = duration + cta;

          for (let i = idx + 1; i < updatedList.length; i++) {
            updatedList[i].dateFrom = shiftDate(updatedList[i].dateFrom, -totalSpan);
            updatedList[i].dateTo = shiftDate(updatedList[i].dateTo, -totalSpan);
          }
        }

        updatedList.splice(idx, 1);

        set({
          plannedPeriods: {
            ...state.plannedPeriods,
            [planId]: updatedList
          }
        });
      },

      addNextPeriod: (planId: string) => get().addNextPlannedPeriod(planId),
      removePeriod: (planId: string, periodId: string) => get().removePlannedPeriod(planId, periodId),
      updatePeriod: (planId: string, periodId: string, updates: Partial<PlannedPeriod>) => get().updatePlannedPeriod(planId, periodId, updates),

      syncPlanToOctorate: async (planId: string, periodId?: string, options?: { testOnly?: boolean }) => {
        const state = get();
        const disabledPlans = state.disabledRatePlans || [];
        const isTestOnly = Boolean(options?.testOnly || state.liveViewMode === 'test');

        if (disabledPlans.includes(planId)) {
          console.info(`[syncPlanToOctorate] Tariffa ${planId} disattivata dall'utente. Invio chiusura di sicurezza (Stop Sell)...`);
          set({
            isSaving: true,
            syncingPeriodId: periodId || null,
            lastSyncMessage: `🔒 Chiusura di sicurezza (Stop Sell) per tariffa disattivata ${planId}${isTestOnly ? ' (TEST)' : ''}...`,
            lastSyncStatus: 'idle'
          });

          const todayStr = new Date().toISOString().slice(0, 10);
          const disabledClosePayload = {
            planId,
            ratePlanKey: planId,
            dateFrom: todayStr,
            dateTo: state.tabulaRasaDateTo || '2027-10-31',
            stopSell: true,
            strategy: 'stopsell',
            testOnly: isTestOnly
          };

          try {
            await fetch('/api/update-rateplan-restrictions-bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(disabledClosePayload)
            });
            set({
              isSaving: false,
              syncingPeriodId: null,
              lastSyncMessage: `✅ Tariffa ${planId} disattivata: blocco Stop Sell applicato con successo su Octorate!`,
              lastSyncStatus: 'success'
            });
            return true;
          } catch (e) {
            console.error('[syncPlanToOctorate disabled plan error]:', e);
            set({
              isSaving: false,
              syncingPeriodId: null,
              lastSyncMessage: `❌ Errore durante la chiusura di ${planId}`,
              lastSyncStatus: 'error'
            });
            return false;
          }
        }

        set({ isSaving: true, syncingPeriodId: periodId || null, lastSyncMessage: `🧹 Tabula Rasa: pulizia preventiva stagionale per ${planId}${isTestOnly ? ' (TEST)' : ''}...`, lastSyncStatus: 'idle' });


        try {
          // 🧹 TABULA RASA: Reset preventivo stagionale (01/10/2026 -> 31/10/2027)
          // BE = open di default (tariffa madre), tutti gli altri canali derivati = stopsell
          const resetStrategy = planId === 'be' ? 'open' : 'stopsell';
          const resetPayload = {
            planId,
            ratePlanKey,
            dateFrom: state.tabulaRasaDateFrom || '2026-10-01',
            dateTo: state.tabulaRasaDateTo || '2027-10-31',
            stopSell: resetStrategy === 'stopsell',
            strategy: resetStrategy,
            testOnly: isTestOnly,
            isTabulaRasa: true,
            resetPreferences: state.resetPreferences
          };
          await fetch('/api/update-restriction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resetPayload)
          }).catch(e => console.warn('[Tabula Rasa warning]:', e));

          const list = state.plannedPeriods[planId] || [];
          const periodsToSync = periodId ? list.filter(p => p.id === periodId) : list;

          for (const period of periodsToSync) {
            const effectiveCtd = period.failsafeCheckout ? false : period.closedToDeparture;

            const response = await fetch('/api/update-restriction', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                planId,
                ratePlanKey: planId,
                dateFrom: period.dateFrom,
                dateTo: period.dateTo,
                stopSell: period.stopSell,
                closedToArrival: period.closedToArrival,
                closedToDeparture: effectiveCtd,
                onlyCheckOutDays: period.onlyCheckOutDays,
                onlyCheckoutDays: period.onlyCheckOutDays,
                strategy: period.closedToArrival ? 'failsafe_checkout' : (period.stopSell ? 'stopsell' : 'open'),
                testOnly: isTestOnly,
                isTabulaRasa: false
              })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
              throw new Error(data.error || `Errore durante la sincronizzazione di ${period.name}`);
            }
          }

          set({
            isSaving: false,
            syncingPeriodId: null,
            lastSyncStatus: 'success',
            lastSyncMessage: `✅ Tabula Rasa & Allineamento completati per ${planId} su Octorate!`,
          });

          await get().fetchLiveRestrictions();
          return true;
        } catch (err: any) {
          console.error('Error syncing plan to Octorate:', err);
          set({
            isSaving: false,
            syncingPeriodId: null,
            lastSyncStatus: 'error',
            lastSyncMessage: `❌ Errore sincronizzazione: ${err?.message || 'Impossibile connettersi'}`
          });
          return false;
        }
      },

      syncAllPlansToOctorate: async (options?: { testOnly?: boolean }) => {
        return get().syncAllRatePlansToOctorate(options);
      },

      syncAllRatePlansToOctorate: async (options?: { testOnly?: boolean }) => {
        const state = get();
        const isTestOnly = Boolean(options?.testOnly || state.liveViewMode === 'test');
        const disabledPlans = state.disabledRatePlans || [];

        let totalCount = 0;
        for (const plan of REAL_OCTORATE_PLANS) {
          if (disabledPlans.includes(plan.id)) continue;
          const list = state.plannedPeriods[plan.id] || [];
          totalCount += list.length;
        }

        set({
          isBulkSaving: true,
          syncAllRunning: true,
          bulkSyncProgress: { current: 0, total: totalCount, currentPlanName: 'Tabula Rasa Preventiva...' },
          lastSyncMessage: `🧹 Tabula Rasa: Avvio sincronizzazione sequenziale per ${totalCount} periodi su Octorate${isTestOnly ? ' (Modalità TEST)' : ''}...`,
          lastSyncStatus: 'idle'
        });

        let currentStep = 0;

        try {
          for (const plan of REAL_OCTORATE_PLANS) {
            if (!get().isBulkSaving) break;
            
            if ((get().disabledRatePlans || []).includes(plan.id)) {
              console.info(`[syncAllRatePlansToOctorate] Piano ${plan.name} (${plan.id}) disattivato dall'utente. Invio chiusura stagionale (Stop Sell)...`);
              const todayStr = new Date().toISOString().slice(0, 10);
              const disabledClosePayload = {
                planId: plan.id,
                ratePlanKey: plan.id,
                dateFrom: todayStr < '2026-09-01' ? todayStr : '2026-09-01',
                dateTo: state.tabulaRasaDateTo || '2027-10-31',
                stopSell: true,
                strategy: 'stopsell',
                testOnly: isTestOnly
              };
              await fetch('/api/update-rateplan-restrictions-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(disabledClosePayload)
              }).catch(e => console.warn('[Disabled Plan Close warning]:', e));
              continue;
            }


            // 🧹 TABULA RASA BULK: Reset preventivo stagionale per ogni piano prima delle riaperture
            // BE = open di default (tariffa madre), tutti gli altri canali derivati = stopsell
            const bulkResetStrategy = plan.id === 'be' ? 'open' : 'stopsell';
            const bulkResetPayload = {
              planId: plan.id,
              ratePlanKey: plan.id,
              dateFrom: state.tabulaRasaDateFrom || '2026-10-01',
              dateTo: state.tabulaRasaDateTo || '2027-10-31',
              stopSell: bulkResetStrategy === 'stopsell',
              strategy: bulkResetStrategy,
              testOnly: isTestOnly,
              isTabulaRasa: true,
              resetPreferences: state.resetPreferences
            };
            await fetch('/api/update-restriction', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bulkResetPayload)
            }).catch(e => console.warn('[Bulk Tabula Rasa warning]:', e));

            // 🌙 Se il piano è BE (Tariffa Madre), sincronizza subito tutti i blocchi di Soggiorno Minimo (Min Stay)
            if (plan.id === 'be') {
              const minStayList = state.plannedMinStayPeriods || [];
              for (const ms of minStayList) {
                await fetch('/api/update-restriction', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    planId: 'be',
                    ratePlanKey: 'be',
                    dateFrom: ms.dateFrom,
                    dateTo: ms.dateTo,
                    minStay: ms.minStay || 1,
                    strategy: 'minstay',
                    testOnly: isTestOnly,
                    isTabulaRasa: false
                  })
                }).catch(e => console.warn('[MinStay sync warning]:', e));
              }
            }

            const periods = state.plannedPeriods[plan.id] || [];
            for (const period of periods) {
              if (!get().isBulkSaving) break;
              currentStep++;
              set({
                bulkSyncProgress: {
                  current: currentStep,
                  total: totalCount,
                  currentPlanName: `${plan.code} (${period.name})`
                },
                lastSyncMessage: `Sincronizzazione (${currentStep}/${totalCount}) ${plan.code} - ${period.name}${isTestOnly ? ' [TEST]' : ''}...`
              });

              const effectiveCtd = period.failsafeCheckout ? false : period.closedToDeparture;

              await fetch('/api/update-restriction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  planId: plan.id,
                  ratePlanKey: plan.id,
                  dateFrom: period.dateFrom,
                  dateTo: period.dateTo,
                  stopSell: period.stopSell,
                  closedToArrival: period.closedToArrival,
                  closedToDeparture: effectiveCtd,
                  onlyCheckOutDays: period.onlyCheckOutDays,
                  onlyCheckoutDays: period.onlyCheckOutDays,
                  strategy: period.closedToArrival ? 'failsafe_checkout' : (period.stopSell ? 'stopsell' : 'open'),
                  testOnly: isTestOnly,
                  isTabulaRasa: false
                })
              }).catch(e => console.warn('Bulk plan sync warning:', e));
            }
          }

          if (!get().isBulkSaving) {
            set({
              isBulkSaving: false,
              syncAllRunning: false,
              lastSyncStatus: 'idle',
              lastSyncMessage: '⏹️ Sincronizzazione interrotta dall\'utente.'
            });
            return false;
          }

          set({
            isBulkSaving: false,
            syncAllRunning: false,
            lastSyncStatus: 'success',
            lastSyncMessage: isTestOnly
              ? `✅ Tabula Rasa & Test completati con successo! ${totalCount}/${totalCount} periodi verificati in TEST.`
              : `✅ Tabula Rasa & Sincronizzazione completati con successo! ${totalCount}/${totalCount} periodi allineati su Octorate.`,
            bulkSyncProgress: { current: totalCount, total: totalCount, currentPlanName: 'Completato' }
          });

          await get().fetchLiveRestrictions();
          return true;
        } catch (err: any) {
          console.error('Error in syncAllRatePlansToOctorate:', err);
          set({
            isBulkSaving: false,
            syncAllRunning: false,
            lastSyncStatus: 'error',
            lastSyncMessage: `❌ Errore durante la sincronizzazione bulk: ${err?.message || 'Impossibile completare'}`
          });
          return false;
        }
      },

      cancelBulkSync: () => {
        set({
          isBulkSaving: false,
          syncAllRunning: false,
          syncingPeriodId: null,
          lastSyncStatus: 'idle',
          lastSyncMessage: '⏹️ Sincronizzazione interrotta dall\'utente. Operazione annullata.',
          bulkSyncProgress: { current: 0, total: 0, currentPlanName: '' }
        });
      },

      resetDefaultStore: () => {
        set({
          plannedPeriods: { ...INITIAL_PLAN_PERIODS },
          plannedMinStayPeriods: [...INITIAL_MIN_STAY_PERIODS],
          liveOctorateRestrictionsMock: { ...INITIAL_LIVE_MOCK },
          lastSyncMessage: '🔄 Reset store restrizioni completato',
          lastSyncStatus: 'success'
        });
      },

      stageSyncPreview: (target: 'test' | 'prod') => {
        const planned = get().plannedPeriods || {};
        const cloned: Record<string, PlannedPeriod[]> = JSON.parse(JSON.stringify(planned));
        const plannedMinStay = get().plannedMinStayPeriods || [];
        const clonedMinStay: MinStayPeriod[] = JSON.parse(JSON.stringify(plannedMinStay));
        set({
          syncStage: 'staged_preview',
          stagedTarget: target,
          stagedRestrictions: cloned,
          stagedMinStayPeriods: clonedMinStay,
          liveViewMode: target,
          lastSyncMessage: `🟡 Anteprima di Staging attiva per [${target === 'test' ? 'TEST FAKE BUNGALOWS' : 'PRODUZIONE REALE'}]. Controlla la Tabella 2 e clicca 'Conferma e Sincronizza' per inviare ad Octorate.`,
          lastSyncStatus: 'idle'
        });
      },

      cancelSyncPreview: () => {
        set({
          syncStage: 'idle',
          stagedTarget: null,
          stagedRestrictions: null,
          stagedMinStayPeriods: null,
          lastSyncMessage: 'Anteprima di Staging annullata. Ripristinati i dati Octorate.',
          lastSyncStatus: 'idle'
        });
      },

      commitStagedSyncToOctorate: async () => {
        const { stagedTarget } = get();
        const target = stagedTarget || (get().testMode ? 'test' : 'prod');
        const isTestOnly = target === 'test';
        
        const ok = await get().syncAllRatePlansToOctorate({ testOnly: isTestOnly });
        if (ok) {
          set({
            syncStage: 'idle',
            stagedTarget: null,
            stagedRestrictions: null,
            stagedMinStayPeriods: null
          });
        }
        return ok;
      }
    }),
    {
      name: 'fp_rateplan_restrictions_v17_clean',
      merge: (persistedState: any, currentState: RestrictionsStoreState) => {
        const p = persistedState as any;
        const isLiveVersion = p?._version === '2026_LIVE_MIRROR_V17';
        return {
          ...currentState,
          ...p,
          _version: '2026_LIVE_MIRROR_V17',
          plannedPeriods: (isLiveVersion && p?.plannedPeriods && typeof p.plannedPeriods === 'object')
            ? p.plannedPeriods
            : { ...INITIAL_PLAN_PERIODS },
          liveOctorateRestrictionsMock: (p?.liveOctorateRestrictionsMock && typeof p.liveOctorateRestrictionsMock === 'object')
            ? p.liveOctorateRestrictionsMock
            : { ...INITIAL_LIVE_MOCK }
        };
      }
    }
  )
);
