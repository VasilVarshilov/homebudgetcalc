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
 * Helper: stable month id for storage (YYYY-MM).
 * Use this as the canonical key for months so we avoid mismatched human-readable strings.
 */
const getMonthId = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("monthly");

  // human-readable display (Български), used only for UI labels
  const [currentMonthDisplay, setCurrentMonthDisplay] = useState<string>("");

  // canonical month id for storage (YYYY-MM)
  const [currentMonthId, setCurrentMonthId] = useState<string>(getMonthId());

  // all months data stored as { "2025-12": MonthlyRecord, ... }
  const [monthlyData, setMonthlyData] = useState<Record<string, MonthlyRecord>>(
    {}
  );

  // global lifetime savings (not per-month)
  const [globalSavings, setGlobalSavings] = useState<IncomeItem[]>([]);

  // Load once on mount
  useEffect(() => {
    setCurrentMonthDisplay(getCurrentMonthBulgarian());
    setCurrentMonthId(getMonthId());

    try {
      const raw = localStorage.getItem(STORAGE_KEY_MONTHLY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, MonthlyRecord>;
        // Safety: ensure parsed is an object
        if (parsed && typeof parsed === "object") {
          setMonthlyData(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to parse monthly data from localStorage", e);
    }

    try {
      const rawS = localStorage.getItem(STORAGE_KEY_SAVINGS);
      if (rawS) {
        const parsedS = JSON.parse(rawS) as IncomeItem[];
        if (Array.isArray(parsedS)) {
          setGlobalSavings(parsedS);
        }
      }
    } catch (e) {
      console.error("Failed to parse savings data from localStorage", e);
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
      console.error("Failed to save savings data", e);
    }
  }, []);

  /**
   * Handle saving electricity results (called from ElectricityTab).
   * We receive em2Amount and a record (should contain month info).
   * We merge safely into the month record and do NOT clobber other fields.
   */
  const handleSaveElectricity = useCallback(
    (em2Amount: number, record: MonthlyRecord) => {
      // choose canonical month id: prefer record.monthId if provided, otherwise currentMonthId
      const monthKey = (record && (record.month as string)) || currentMonthId;

      setMonthlyData((prev) => {
        const existing = prev[monthKey] || ({ month: monthKey } as MonthlyRecord);

        const updated: MonthlyRecord = {
          ...existing,
          // keep any existing meta/inputs/results and merge with record
          meta: existing.meta || record.meta || {},
          inputs: {
            ...(existing.inputs || {}),
            ...(record.inputs || {}),
          },
          results: {
            ...(existing.results || {}),
            ...(record.results || {}),
          },
          // expenses: merge but ensure we preserve additional_expenses array unless new provided
          expenses: {
            ...(existing.expenses || {}),
            ...(record.expenses || {}),
            saved_em2_eur:
              typeof em2Amount === "number" ? em2Amount : existing.expenses?.saved_em2_eur || 0,
            fixed_expenses: {
              ...(existing.expenses?.fixed_expenses || {}),
              ...(record.expenses?.fixed_expenses || {}),
            },
            // NOTE: do not auto-append here — we keep existing.additional_expenses unless explicit update from monthly tab
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

  /**
   * Handle saving monthly expenses (from MonthlyExpensesTab).
   * MonthlyExpensesTab will provide full object { saved_em2_eur, fixed_expenses, additional_expenses }.
   * We REPLACE additional_expenses for that month with the provided array (because the tab manages the full array).
   * We merge fixed_expenses so we don't lose other fields.
   */
  const handleSaveExpenses = useCallback(
    (expensesData: any) => {
      const monthKey = currentMonthId;

      setMonthlyData((prev) => {
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

            // fixed_expenses: merge values (new ones override existing)
            fixed_expenses: {
              ...(existing.expenses?.fixed_expenses || {}),
              ...(expensesData.fixed_expenses || {}),
            },

            // additional_expenses: replace with the array coming from the tab (no append)
            additional_expenses:
              Array.isArray(expensesData.additional_expenses)
                ? expensesData.additional_expenses
                : existing.expenses?.additional_expenses || [],

            // saved_em2_eur if provided in the payload, use it, else keep existing
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
    },
    [currentMonthId, saveMonthly]
  );

  const handleUpdateGlobalSavings = useCallback(
    (newSavings: IncomeItem[]) => {
      setGlobalSavings(newSavings);
      saveSavings(newSavings);
    },
    [saveSavings]
  );

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
                // ensure record.month uses canonical monthId if possible
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
