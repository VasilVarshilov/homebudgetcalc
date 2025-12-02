import React, { useEffect, useState, useRef } from "react";
import { MonthlyRecord, ExpenseItem } from "@types";
import { formatNumber } from "@utils/formatting";

interface Props {
  data: MonthlyRecord | null;
  onSaveExpenses: (data: MonthlyRecord) => void;
}

const MonthlyExpensesTab: React.FC<Props> = ({ data, onSaveExpenses }) => {
  // ------------------------------
  // INITIAL LOAD PROTECTION
  // ------------------------------
  const hasLoadedInitial.current ?? (hasLoadedInitial.current = false);
  const hasLoadedInitial = useRef(false);

  // ------------------------------
  // LOCAL STATE
  // ------------------------------
  const [em2Value, setEm2Value] = useState<number>(0);
  const [credit, setCredit] = useState<number>(0);
  const [phone, setPhone] = useState<number>(0);
  const [internet, setInternet] = useState<number>(0);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);

  // ------------------------------
  // 1) Load data FROM props (initialData)
  // ------------------------------
  useEffect(() => {
    if (!data || hasLoadedInitial.current) return;

    setEm2Value(data.em2 ?? 0);
    setCredit(data.credit ?? 0);
    setPhone(data.phone ?? 0);
    setInternet(data.internet ?? 0);
    setExpenses(Array.isArray(data.expenses) ? data.expenses : []);

    hasLoadedInitial.current = true; // Prevent overwrite on first render
  }, [data]);

  // ------------------------------
  // 2) Auto-save AFTER initial load
  // ------------------------------
  const prevSnapshot = useRef<string>("");

  useEffect(() => {
    if (!hasLoadedInitial.current) return; // ❗ Prevent destroying saved data

    const payload: MonthlyRecord = {
      em2: em2Value,
      credit,
      phone,
      internet,
      expenses,
      savings: data?.savings ?? [],      // keep existing savings intact
      monthlyReports: data?.monthlyReports ?? [], // keep existing reports intact
    };

    const snapshot = JSON.stringify(payload);
    if (snapshot !== prevSnapshot.current) {
      prevSnapshot.current = snapshot;
      onSaveExpenses(payload);
    }
  }, [em2Value, credit, phone, internet, expenses]);

  // ------------------------------
  // ADD EXPENSE
  // ------------------------------
  const addExpense = () => {
    setExpenses((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: "Нов разход",
        amount: 0,
      },
    ]);
  };

  const updateExpense = (id: string, field: "name" | "amount", value: any) => {
    setExpenses((prev) =>
      prev.map((exp) =>
        exp.id === id ? { ...exp, [field]: field === "amount" ? Number(value) : value } : exp
      )
    );
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));
  };

  // ------------------------------
  // UI
  // ------------------------------
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Месечни разходи</h2>

      {/* EM2 */}
      <div>
        <label className="text-sm">ЕМ2</label>
        <input
          type="number"
          value={em2Value}
          onChange={(e) => setEm2Value(Number(e.target.value))}
          className="w-full p-2 rounded bg-white border"
        />
      </div>

      {/* Кредит */}
      <div>
        <label className="text-sm">Кредит</label>
        <input
          type="number"
          value={credit}
          onChange={(e) => setCredit(Number(e.target.value))}
          className="w-full p-2 rounded bg-white border"
        />
      </div>

      {/* Телефон */}
      <div>
        <label className="text-sm">Телефон</label>
        <input
          type="number"
          value={phone}
          onChange={(e) => setPhone(Number(e.target.value))}
          className="w-full p-2 rounded bg-white border"
        />
      </div>

      {/* Интернет */}
      <div>
        <label className="text-sm">Интернет</label>
        <input
          type="number"
          value={internet}
          onChange={(e) => setInternet(Number(e.target.value))}
          className="w-full p-2 rounded bg-white border"
        />
      </div>

      {/* Допълнителни разходи */}
      <div className="mt-4">
        <h3 className="font-medium">Допълнителни разходи</h3>
        <button
          className="px-3 py-2 bg-slate-700 text-white rounded mt-2"
          onClick={addExpense}
        >
          + Добави разход
        </button>

        <div className="mt-3 space-y-3">
          {expenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-white border p-3 rounded flex items-center gap-2"
            >
              <input
                value={exp.name}
                onChange={(e) => updateExpense(exp.id, "name", e.target.value)}
                className="flex-1 p-2 border rounded"
              />
              <input
                type="number"
                value={exp.amount}
                onChange={(e) => updateExpense(exp.id, "amount", e.target.value)}
                className="w-32 p-2 border rounded"
              />
              <button
                onClick={() => deleteExpense(exp.id)}
                className="px-3 py-2 bg-red-500 text-white rounded"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="mt-6 p-4 bg-slate-100 rounded text-lg font-medium">
        Общо:{" "}
        {formatNumber(
          em2Value +
            credit +
            phone +
            internet +
            expenses.reduce((sum, x) => sum + x.amount, 0)
        )}{" "}
        лв
      </div>
    </div>
  );
};

export default MonthlyExpensesTab;
