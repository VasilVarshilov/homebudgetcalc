import React, { useState, useEffect } from "react";
import { MonthlyExpensesTab } from "./components/monthly/MonthlyExpensesTab";
import { MonthlyReportsTab } from "./components/monthly/MonthlyReportsTab";
import { SavingsTab } from "./components/savings/SavingsTab";
import { ElectricityTab } from "./components/electricity/ElectricityTab";

type StoredData = {
  expenses?: any;
  savings?: any;
  electricity?: any;
};

const STORAGE_KEY = "homebudget_data_v2";

export default function App() {
  const [activeTab, setActiveTab] = useState("expenses");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [data, setData] = useState<StoredData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Save to localStorage on every update
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // Handlers for tabs
  const handleSaveExpenses = (expenses: any) => {
    setData((prev) => ({
      ...prev,
      expenses: {
        ...expenses,
        month: currentMonth,
      },
    }));
  };

  const handleSaveElectricity = (electricity: any) => {
    setData((prev) => ({
      ...prev,
      electricity,
    }));
  };

  const handleSaveSavings = (savings: any) => {
    setData((prev) => ({
      ...prev,
      savings,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: "expenses", label: "Месечни разходи" },
          { id: "reports", label: "Отчети" },
          { id: "electricity", label: "Ток" },
          { id: "savings", label: "Спестявания" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === tab.id
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="max-w-4xl mx-auto">
        {activeTab === "expenses" && (
          <MonthlyExpensesTab
            currentMonth={currentMonth}
            savedEm2Value={data.electricity?.saved_em2_eur ?? null}
            initialData={data}
            onSaveExpenses={handleSaveExpenses}
          />
        )}

        {activeTab === "reports" && (
          <MonthlyReportsTab
            currentMonth={currentMonth}
            expenses={data.expenses}
            electricity={data.electricity}
            savings={data.savings}
          />
        )}

        {activeTab === "electricity" && (
          <ElectricityTab
            currentMonth={currentMonth}
            initialData={data.electricity}
            onSaveElectricity={handleSaveElectricity}
          />
        )}

        {activeTab === "savings" && (
          <SavingsTab initialData={data.savings} onSave={handleSaveSavings} />
        )}
      </div>
    </div>
  );
}
