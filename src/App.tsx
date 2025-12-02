// src/App.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Calendar,
  LayoutDashboard,
  PieChart,
  PiggyBank,
} from "lucide-react";

import { ElectricityTab } from "@components/electricity/ElectricityTab";
import { MonthlyExpensesTab } from "@components/monthly/MonthlyExpensesTab";
import { MonthlyReportsTab } from "@components/reports/MonthlyReportsTab";
import { SavingsTab } from "@components/savings/SavingsTab";

import { getCurrentMonthBulgarian } from "@utils/formatting";
import { MonthlyRecord, IncomeItem } from "@types";

type Tab = "monthly" | "electricity" | "reports" | "savings";

const STORAGE_KEY_MONTHLY = "HomeBudget_Data";
const STORAGE_KEY_SAVINGS = "HomeBudget_GlobalSavings";

/**
 * Bulgarian month name variants to month index (0-based).
 * Covers common Bulgarian month names/abbreviations that might appear in legacy keys.
 */
const BG_MONTHS: Record<string, number> = {
  "януари": 0, "яну": 0, "ян": 0,
  "февруари": 1, "фев": 1,
  "март": 2, "мар": 2,
  "април": 3, "апр": 3,
  "май": 4,
  "юни": 5,
  "юли": 6,
  "август": 7, "авг": 7,
  "септември": 8, "сеп": 8,
  "октомври": 9, "окт": 9,
  "ноември": 10, "ное": 10,
  "декември": 11, "дек": 11
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const getMonthIdFromDate = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

/**
 * Try to convert a legacy key (e.g. "Декември 2025" or "December 2025") to YYYY-MM.
 * If cannot parse, returns null.
 */
function tryParseMonthKeyToId(key: string): string | null {
  if (!key) return null;
  key = key.trim();

  // If already in YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(key)) return key;

  // Try to find year
  const yearMatch = key.match(/(20\d{2}|19\d{2})/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : null;

  // find month name in Bulgarian map (case-insensitive)
  const lower = key.toLowerCase();
  for (const [name, idx] of Object.entries(BG_MONTHS)) {
    if (lower.includes(name)) {
      if (year) {
        return `${year}-${pad2(idx + 1)}`;
      } else {
        // no year present — use current year as fallback
        const y = new Date().getFullYear();
        return `${y}-${pad2(idx + 1)}`;
      }
    }
  }

  // try English month names (simple)
  const english = [
    "january","february","march","april","may","june","july","august","september","october","november","december"
  ];
  for (let i=0;i<english.length;i++){
    if (lower.includes(english[i])) {
      const y = year ?? new Date().getFullYear();
      return `${y}-${pad2(i+1)}`;
    }
  }

  return null;
}

/**
 * Normalize stored monthly data keys into canonical format { "YYYY-MM": MonthlyRecord }.
 * Preserves all nested content.
 */
function normalizeStoredMonthlyData(raw: any): Record<string, MonthlyRecord> {
  if (!raw || typeof raw !== "object") return {};

  // if already looks like correct mapping (all keys are YYYY-MM) return as-is
  const allKeys = Object.keys(raw);
  const looksCanonical = allKeys.length > 0 && allKeys.every(k => /^\d{4}-\d{2}$/.test(k));
  if (looksCanonical) {
    return raw as Record<string, MonthlyRecord>;
  }

  // otherwise, try to map each legacy key to a YYYY-MM; if fail, store under legacy-<index>
  const out: Record<string, MonthlyRecord> = {};
  let legacyIdx = 0;
  for (const key of Object.keys(raw)) {
    const val = raw[key];
    const monthId = tryParseMonthKeyToId(key);
    if (monthId) {
      out[monthId] = val;
    } else {
      // ensure uniqueness
      const id = `legacy-${pad2(legacyIdx)}`;
      out[id] = val;
      legacyIdx++;
    }
  }
  return out;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("monthly");

  // display month name (BG) for UI
  const [currentMonthDisplay, setCurrentMonthDisplay] = useState<string>("");
  // canonical month id (YYYY-MM) used as key in storage
  const [currentMonthId, setCurrentMonthId] = useState<string>(getMonthIdFromDate());

  const [monthlyData, setMonthlyData] = useState<Record<string, MonthlyRecord>>({});
  const [globalSavings, setGlobalSavings] = useState<IncomeItem[]>([]);

  // on mount: load & migrate if necessary
  useEffect(() => {
    setCurrentMonthDisplay(getCurrentMonthBulgarian());
    setCurrentMonthId(getMonthIdFromDate());

    try {
      const raw = localStorage.getItem(STORAGE_KEY_MONTHLY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = normalizeStoredMonthlyData(parsed);
        // If normalization changed keys, we re-save normalized structure (safe, non-destructive)
        // Compare keys: if any non-canonical keys existed, we will write back normalized.
        const hadNonCanonical = Object.keys(parsed).some(k => !/^\d{4}-\d{2}$/.test(k));
        setMonthlyData(normalized);
        if (hadNonCanonical) {
          try {
            localStorage.setItem(STORAGE_KEY_MONTHLY, JSON.stringify(normalized));
          } catch (e) {
            console.warn("Could not overwrite normalized monthly data to localStorage", e);
          }
        }
      } else {
        setMonthlyData({});
      }
    } catch (e) {
      console.error("Failed to load or parse HomeBudget_Data", e);
      setMonthlyData({});
    }

    try {
      const s = localStorage.getItem(STORAGE_KEY_SAVINGS);
      if (s) {
        const parsedS = JSON.parse(s);
        if (Array.isArray(parsedS)) {
          setGlobalSavings(parsedS);
        } else {
          setGlobalSavings([]);
        }
      }
    } catch (e) {
      console.error("Failed to load savings", e);
      setGlobalSavings([]);
    }
  }, []);

  const saveMonthly = useCallback((updated: Record<string, MonthlyRecord>) => {
    try {
      localStorage.setItem(STORAGE_KEY_MONTHLY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save monthly data", e);
    }
  }, []);

  const saveSavings = useCallback((updated: IncomeItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_SAVINGS, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save savings", e);
    }
  }, []);

  // Electricity save: merge safely, DO NOT overwrite additional_expenses unless explicitly provided elsewhere
  const handleSaveElectricity = useCallback(
    (em2Amount: number, record: MonthlyRecord) => {
      const monthKey = record?.month || currentMonthId;

      setMonthlyData(prev => {
        const existing = prev[monthKey] || ({ month: monthKey } as MonthlyRecord);

        const updated: MonthlyRecord = {
          ...existing,
          month: monthKey,
          meta: existing.meta || record.meta || {},
          inputs: { ...(existing.inputs || {}), ...(record.inputs || {}) },
          results: { ...(existing.results || {}), ...(record.results || {}) },

          expenses: {
            ...(existing.expenses || {}),
            ...(record.expenses || {}),
            saved_em2_eur: typeof em2Amount === "number" ? em2Amount : existing.expenses?.saved_em2_eur ?? 0,
            fixed_expenses: {
              ...(existing.expenses?.fixed_expenses || {}),
              ...(record.expenses?.fixed_expenses || {}),
            },
            // keep existing additional_expenses unless an explicit replacement happens from Monthly tab
            additional_expenses: existing.expenses?.additional_expenses || [],
          },

          incomes: existing.incomes || [],
        };

        const newData = { ...prev, [monthKey]: updated };
        saveMonthly(newData);
        return newData;
      });
    },
    [currentMonthId, saveMonthly]
  );

  // Monthly expenses save: the MonthlyExpensesTab manages the full additional_expenses array,
  // so here we REPLACE with the provided array (no accidental append).
  const handleSaveExpenses = useCallback((expensesData: any) => {
    const monthKey = currentMonthId;

    setMonthlyData(prev => {
      const existing = prev[monthKey] || ({ month: monthKey } as MonthlyRecord);

      const updated: MonthlyRecord = {
        ...existing,
        month: monthKey,
        meta: existing.meta || { generated_at: new Date().toISOString() },
        inputs: existing.inputs || {},
        results: existing.results || {},
        incomes: existing.incomes || [],

        expenses: {
          ...(existing.expenses || {}),

          fixed_expenses: {
            ...(existing.expenses?.fixed_expenses || {}),
            ...(expensesData.fixed_expenses || {}),
          },

          // REPLACE additional_expenses with the array provided by the tab
          additional_expenses: Array.isArray(expensesData.additional_expenses)
            ? expensesData.additional_expenses
            : existing.expenses?.additional_expenses || [],

          saved_em2_eur:
            typeof expensesData.saved_em2_eur === "number"
              ? expensesData.saved_em2_eur
              : existing.expenses?.saved_em2_eur ?? null,
        },
      };

      const newData = { ...prev, [monthKey]: updated };
      saveMonthly(newData);
      return newData;
    });
  }, [currentMonthId, saveMonthly]);

  const handleUpdateGlobalSavings = useCallback((newSavings: IncomeItem[]) => {
    setGlobalSavings(newSavings);
    saveSavings(newSavings);
  }, [saveSavings]);

  const currentMonthRecord = monthlyData[currentMonthId];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-slate-800 text-lg hidden sm:block">
                Home Budget
              </span>
            </div>

            <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-2">
              <button
                onClick={() => setActiveTab("monthly")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  activeTab === "monthly"
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Месечни разходи
              </button>

              <button
                onClick={() => setActiveTab("electricity")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  activeTab === "electricity"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Zap className="w-4 h-4" />
                ТОК
              </button>

              <button
                onClick={() => setActiveTab("reports")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  activeTab === "reports"
                    ? "bg-purple-50 text-purple-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <PieChart className="w-4 h-4" />
                Месечни отчети
              </button>

              <button
                onClick={() => setActiveTab("savings")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  activeTab === "savings"
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <PiggyBank className="w-4 h-4" />
                Спестявания
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {activeTab === "monthly" && (
          <MonthlyExpensesTab
            currentMonth={currentMonthDisplay}
            savedEm2Value={currentMonthRecord?.expenses?.saved_em2_eur ?? null}
            initialData={currentMonthRecord}
            onSaveExpenses={handleSaveExpenses}
          />
        )}

        {activeTab === "electricity" && (
          <ElectricityTab
            onSaveEm2={(em2Amount: number, rec: MonthlyRecord) =>
              handleSaveElectricity(em2Amount, {
                ...rec,
                month: rec?.month || currentMonthId,
              })
            }
          />
        )}

        {activeTab === "savings" && (
          <SavingsTab
            onUpdateSavings={handleUpdateGlobalSavings}
            savingsData={globalSavings}
          />
        )}

        {activeTab === "reports" && (
          <MonthlyReportsTab monthlyData={monthlyData} />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <p className="text-center text-xs text-slate-400">
            Home Budget Application &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
