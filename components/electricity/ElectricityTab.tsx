import React, { useState, useEffect, useMemo } from 'react';
import { ExternalLink, Calculator, Zap, Moon, Sun, Euro, FileText, AlertTriangle, AlertCircle, Save, Download } from 'lucide-react';
import { ElectricityInputs, MonthlyRecord } from '../../types';
import { calculateElectricity } from '../../utils/calculations';
import { formatCurrency, formatKWh, getCurrentMonthBulgarian } from '../../utils/formatting';
import { InputGroup } from '../ui/InputGroup';

const DEFAULT_INPUTS: ElectricityInputs = {
  oldT1: '',
  newT1: '',
  oldT2: '',
  newT2: '',
  priceT1: '0.14986',
  priceT2: '0.08870',
  invoiceTotal: ''
};

interface ElectricityTabProps {
  onSaveEm2: (amount: number, fullRecord: MonthlyRecord) => void;
}

export const ElectricityTab: React.FC<ElectricityTabProps> = ({ onSaveEm2 }) => {
  const [inputs, setInputs] = useState<ElectricityInputs>(DEFAULT_INPUTS);
  const [currentMonth, setCurrentMonth] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setCurrentMonth(getCurrentMonthBulgarian());
  }, []);

  const handleInputChange = (field: keyof ElectricityInputs, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    setSaveSuccess(false); // Reset success message on edit
  };

  const results = useMemo(() => calculateElectricity(inputs), [inputs]);

  // JSON output is generated internally for persistence/system use, but not displayed in UI.
  const jsonOutput: MonthlyRecord | null = useMemo(() => {
    if (!results.isValid) return null;

    return {
      month: currentMonth,
      tab: "ТОК",
      inputs: {
        old_t1: parseFloat(inputs.oldT1),
        new_t1: parseFloat(inputs.newT1),
        old_t2: parseFloat(inputs.oldT2),
        new_t2: parseFloat(inputs.newT2),
        day_price_with_vat: parseFloat(inputs.priceT1),
        night_price_with_vat: parseFloat(inputs.priceT2),
        invoice_total: parseFloat(inputs.invoiceTotal)
      },
      results: {
        cons_t1_kwh: Number(results.consT1.toFixed(3)),
        cons_t2_kwh: Number(results.consT2.toFixed(3)),
        total_cons_em1_kwh: Number(results.totalCons.toFixed(3)),
        cost_em1_eur: Number(results.costEm1.toFixed(2)),
        em2_remainder_eur: Number(results.em2Remainder.toFixed(2))
      },
      meta: {
        generated_at: new Date().toISOString()
      }
    };
  }, [inputs, results, currentMonth]);

  const handleSave = () => {
    if (jsonOutput && results.isValid) {
      onSaveEm2(results.em2Remainder, jsonOutput);
      setSaveSuccess(true);
      
      // Auto-hide success message
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleDownloadCalculation = () => {
    if (!results.isValid) return;

    const consT1 = results.consT1;
    const consT2 = results.consT2;
    const priceT1 = parseFloat(inputs.priceT1);
    const priceT2 = parseFloat(inputs.priceT2);
    const costT1 = consT1 * priceT1;
    const costT2 = consT2 * priceT2;
    const totalCost = costT1 + costT2;
    const invoice = parseFloat(inputs.invoiceTotal);
    const em2 = invoice - totalCost;

    const reportContent = `
ДЕТАЙЛНА СПРАВКА ЗА СМЕТКА ТОК
Месец: ${currentMonth}
Дата на генериране: ${new Date().toLocaleString('bg-BG')}
===================================================

1. ДНЕВНА ТАРИФА (Т1)
---------------------------------------------------
Старо показание:      ${inputs.oldT1}
Ново показание:       ${inputs.newT1}
---------------------------------------------------
Калкулация Консумация:
${inputs.newT1} - ${inputs.oldT1} = ${consT1.toFixed(3)} kWh

Калкулация Стойност:
${consT1.toFixed(3)} kWh * ${priceT1.toFixed(5)} EUR = ${costT1.toFixed(2)} EUR


2. НОЩНА ТАРИФА (Т2)
---------------------------------------------------
Старо показание:      ${inputs.oldT2}
Ново показание:       ${inputs.newT2}
---------------------------------------------------
Калкулация Консумация:
${inputs.newT2} - ${inputs.oldT2} = ${consT2.toFixed(3)} kWh

Калкулация Стойност:
${consT2.toFixed(3)} kWh * ${priceT2.toFixed(5)} EUR = ${costT2.toFixed(2)} EUR


3. ОБОБЩЕНИЕ ЕЛЕКТРОМЕР 1
---------------------------------------------------
Обща консумация:      ${results.totalCons.toFixed(3)} kWh
Обща стойност (Т1+Т2): ${costT1.toFixed(2)} + ${costT2.toFixed(2)} = ${totalCost.toFixed(2)} EUR


4. РАЗПРЕДЕЛЕНИЕ ПО ФАКТУРА
---------------------------------------------------
Обща сума по фактура: ${invoice.toFixed(2)} EUR
Сметка Електромер 1:  ${totalCost.toFixed(2)} EUR
---------------------------------------------------
ОСТАТЪК ЗА ЕЛЕКТРОМЕР 2:
${invoice.toFixed(2)} - ${totalCost.toFixed(2)} = ${em2.toFixed(2)} EUR

===================================================
Home Budget Application
`;

    const element = document.createElement("a");
    const file = new Blob([reportContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `calculation_report_${currentMonth.replace(/\s/g, '_')}.txt`;
    document.body.appendChild(element); // Required for Firefox
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* External Links Header */}
      <div className="flex flex-wrap gap-4 justify-between bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <a 
          href="https://evn.bg/Home/Electricity.aspx" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors font-medium text-sm flex-1 justify-center sm:justify-start"
        >
          <ExternalLink className="w-4 h-4" />
          EVN цени
        </a>
        <a 
          href="https://onlineplus.evn.bg/account/login?ReturnUrl=%2Fopeninvoices" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors font-medium text-sm flex-1 justify-center sm:justify-start"
        >
          <ExternalLink className="w-4 h-4" />
          EVN проверка сметка
        </a>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Input Section */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            Въвеждане на данни
          </h2>

          <div className="space-y-6">
            {/* T1 Section */}
            <div className="p-4 bg-yellow-50/50 rounded-lg border border-yellow-100 space-y-4">
              <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
                <Sun className="w-4 h-4" /> Дневна тарифа (Т1)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputGroup 
                  label="Дневно Т1 – старо показание" 
                  value={inputs.oldT1} 
                  onChange={(v) => handleInputChange('oldT1', v)} 
                />
                <InputGroup 
                  label="Дневно Т1 – ново показание" 
                  value={inputs.newT1} 
                  onChange={(v) => handleInputChange('newT1', v)} 
                />
              </div>
            </div>

            {/* T2 Section */}
            <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-4">
              <h3 className="font-semibold text-indigo-800 flex items-center gap-2">
                <Moon className="w-4 h-4" /> Нощна тарифа (Т2)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputGroup 
                  label="Нощно Т2 – старо показание" 
                  value={inputs.oldT2} 
                  onChange={(v) => handleInputChange('oldT2', v)} 
                />
                <InputGroup 
                  label="Нощно Т2 – ново показание" 
                  value={inputs.newT2} 
                  onChange={(v) => handleInputChange('newT2', v)} 
                />
              </div>
            </div>

            {/* Prices Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <InputGroup 
                label="Дневна цена (с ДДС)" 
                value={inputs.priceT1} 
                onChange={(v) => handleInputChange('priceT1', v)}
                icon={<Sun className="w-3 h-3 text-slate-400" />}
              />
              <InputGroup 
                label="Нощна цена (с ДДС)" 
                value={inputs.priceT2} 
                onChange={(v) => handleInputChange('priceT2', v)} 
                icon={<Moon className="w-3 h-3 text-slate-400" />}
              />
            </div>

            {/* Total Invoice */}
            <div className="pt-2">
              <InputGroup 
                label="Обща сума по фактура" 
                value={inputs.invoiceTotal} 
                onChange={(v) => handleInputChange('invoiceTotal', v)}
                icon={<FileText className="w-4 h-4 text-slate-400" />}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="space-y-6">
          
          {/* Results Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-xl shadow-lg sticky top-6">
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-yellow-400">
              <Zap className="w-5 h-5" />
              Сметка ТОК
            </h2>
            <p className="text-slate-400 text-sm mb-6 uppercase tracking-wider font-semibold">
              ( {currentMonth} )
            </p>

            {/* Validation Errors */}
            {results.errors.length > 0 && (
              <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-md p-4">
                {results.errors.map((err, idx) => (
                  <p key={idx} className="text-red-300 text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    {err}
                  </p>
                ))}
              </div>
            )}

            {results.isValid && results.errors.length === 0 ? (
              <div className="space-y-6">
                
                {/* Consumption Stats */}
                <div className="space-y-2 text-sm text-slate-300 border-b border-slate-700/50 pb-4">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2"><Sun className="w-3 h-3" /> Консумация Т1 (дневна):</span>
                    <span className="font-mono text-white">{formatKWh(results.consT1)} kWh</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2"><Moon className="w-3 h-3" /> Консумация Т2 (нощна):</span>
                    <span className="font-mono text-white">{formatKWh(results.consT2)} kWh</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-slate-100 pt-1">
                    <span className="flex items-center gap-2"><Zap className="w-3 h-3" /> Общо електромер 1:</span>
                    <span className="font-mono">{formatKWh(results.totalCons)} kWh</span>
                  </div>
                </div>

                {/* Costs */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
                    <span className="flex items-center gap-2 text-yellow-200">
                      💡 Сметка електромер 1:
                    </span>
                    <span className="text-xl font-bold font-mono">
                      €{formatCurrency(results.costEm1)}
                    </span>
                  </div>

                  <div className={`flex justify-between items-center p-3 rounded-lg border transition-colors ${results.em2Remainder < 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                    <span className="flex items-center gap-2 text-emerald-200">
                      🔌 Сметка електромер 2:
                    </span>
                    <span className={`text-xl font-bold font-mono ${results.em2Remainder < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                      €{formatCurrency(results.em2Remainder)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-400 text-sm flex items-center gap-2">
                      <FileText className="w-3 h-3" /> Обща сума по фактурата:
                    </span>
                    <span className="text-lg font-semibold text-slate-200">
                      €{formatCurrency(parseFloat(inputs.invoiceTotal) || 0)}
                    </span>
                  </div>
                </div>

                {/* Warnings */}
                {results.warnings.length > 0 && (
                  <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded text-orange-200 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      {results.warnings.map((w, i) => <p key={i}>{w}</p>)}
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="pt-2 border-t border-slate-700/50 space-y-3">
                  <button 
                    onClick={handleSave}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    <Save className="w-5 h-5" />
                    Запази за електромер 2
                  </button>
                  {saveSuccess && (
                    <p className="text-emerald-400 text-xs text-center animate-in fade-in">
                      Данните за електромер 2 са запазени успешно!
                    </p>
                  )}
                  
                  <button 
                    onClick={handleDownloadCalculation}
                    className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all border border-slate-600"
                  >
                    <Download className="w-5 h-5" />
                    Калкулации
                  </button>
                </div>

              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                 Въведете данни за калкулация
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};