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

// ---------------------------
// STORAGE KEYS
// ---------------------------
const STORAGE_KEY_MONTHLY = "HomeBudget_Data";
const STORAGE_KEY_SAVINGS = "HomeBudget_GlobalSavings";

type Tab = "monthly" | "electricity" | "reports" | "savings";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("monthly");
  const [currentMonth, setCurrentMonth] = useState("");

  const [monthlyData, setMonthlyData] = useState<
    Record<string, MonthlyRecord>
  >({});
  const [globalSavings, setGlobalSavings] = useState<IncomeItem[]>([]);

  // ---------------------------
  // LOAD FROM LOCALSTORAGE
  // ---------------------------
  useEffect(() => {
    const month = getCurrentMonthBulgarian();
    setCurrentMonth(month);

    try {
      const stored = localStorage.getItem(STORAGE_KEY_MONTHLY);
      if (stored) setMonthlyData(JSON.parse(stored));
    } catch (e) {
      console.error("Failed to load monthly data", e);
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVINGS);
      if (saved) setGlobalSavings(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to load savings data", e);
    }
  }, []);

  const saveMonthly = (updated: Record<string, MonthlyRecord>) => {
    localStorage.setItem(STORAGE_KEY_MONTHLY, JSON.stringify(updated));
  };

  const saveSavings = (updated: IncomeItem[]) => {
    localStorage.setItem(STORAGE_KEY_SAVINGS, JSON.stringify(updated));
  };

  // ======================================================
  // ELECTRICITY SAVE — MERGES, DOES NOT OVERWRITE ANYTHING
  // ======================================================
  const handleSaveElectricity = useCallback(
    (em2Amount: number, record: MonthlyRecord) => {
      setMonthlyData((prev) => {
        const monthKey = record.month;

        const existing = prev[monthKey] || {
          month: monthKey,
          expenses: {
            fixed_expenses: {},
            additional_expenses: [],
            saved_em2_eur: 0,
          },
          incomes: [],
          results: {},
          inputs: {},
          meta: { generated_at: new Date().toISOString() },
        };

        const updated: MonthlyRecord = {
          ...existing,
          ...record,
          expenses: {
            ...existing.expenses,
            ...record.expenses,
            saved_em2_eur: em2Amount,
            fixed_expenses: {
              ...(existing.expenses?.fixed_expenses || {}),
              ...(record.expenses?.fixed_expenses || {}),
            },
            additional_expenses: [
              ...(existing.expenses?.additional_expenses || []),
            ],
          },
        };

        const newData = { ...prev, [monthKey]: updated };
        saveMonthly(newData);
        return newData;
      });
    },
    []
  );

  // ======================================================
  // MONTHLY EXPENSES SAVE — **FIXED**, **MERGED**, **SAFE**
  // ======================================================
  const handleSaveExpenses = useCallback((expensesData: any) => {
    setMonthlyData((prev) => {
      const monthKey = getCurrentMonthBulgarian();

      // Пълен fallback за да няма липсващи части
      const existing = prev[monthKey] || {
        month: monthKey,
        expenses: {
          fixed_expenses: {},
          additional_expenses: [],
          saved_em2_eur: 0,
        },
        incomes: [],
        results: {},
        inputs: {},
        meta: { generated_at: new Date().toISOString() },
      };

      const updated: MonthlyRecord = {
        ...existing,

        expenses: {
          ...existing.expenses,

          // ============ FIXED EXPENSES MERGE ============
          fixed_expenses: {
            ...(existing.expenses.fixed_expenses || {}),
            ...(expensesData.fixed_expenses || {}),
          },

          // ============ ADDITIONAL EXPENSES (NO OVERWRITE) ============
          additional_expenses:
            expensesData.additional_expenses ??
            existing.expenses.additional_expenses ??
            [],

          saved_em2_eur:
            expensesData.saved_em2_eur ??
            existing.expenses.saved_em2_eur ??
            0,
        },

        incomes: existing.incomes || [],
        results: existing.results || {},
        inputs: existing.inputs || {},

        meta: {
          ...(existing.meta || {}),
          generated_at:
            existing.meta?.generated_at ||
            new Date().toISOString(),
        },
      };

      const newData = { ...prev, [monthKey]: updated };
      saveMonthly(newData);
      return newData;
    });
  }, []);

  // ======================================================
  // SAVINGS SAVE
  // ======================================================
  const handleUpdateGlobalSavings = useCallback((newSavings: IncomeItem[]) => {
    setGlobalSavings(newSavings);
    saveSavings(newSavings);
  }, []);

  const currentMonthRecord = monthlyData[currentMonth];

  // ======================================================
  // UI
  // ======================================================
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
                Месечни
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
                Отчети
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
            currentMonth={currentMonth}
            savedEm2Value={currentMonthRecord?.expenses?.saved_em2_eur ?? null}
            initialData={currentMonthRecord}
            onSaveExpenses={handleSaveExpenses}
          />
        )}

        {activeTab === "electricity" && (
          <ElectricityTab onSaveEm2={handleSaveElectricity} />
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
            Home Budget © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
