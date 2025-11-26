import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  List, 
  UploadCloud, 
  Search, 
  LayoutDashboard,
  AlertOctagon,
  Clock,
  Download,
  FileSpreadsheet,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Activity,
  Calculator,
  Target,
  Filter
} from 'lucide-react';

import { Equipment, CriticalityLevel, FilterState, PredictionStatus } from './types';
import { processExcelFile } from './utils/excelProcessor';
import { EquipmentTable } from './components/EquipmentTable';
import { StatCard } from './components/StatCard';
import { DetailDrawer } from './components/DetailDrawer';

const App: React.FC = () => {
  const [data, setData] = useState<Equipment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filters
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    search: '',
    minScore: 0,
    dateRange: ['', '']
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const processedData = await processExcelFile(file);
      setData(processedData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao processar o arquivo. Verifique se é um Excel válido com as abas corretas.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (data.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(data.map(item => ({
      ID: item.id,
      Equipamento: item.name,
      Tipo: item.type,
      Local: item.location,
      'Índice de Prioridade': item.scoreFinal.toFixed(2),
      Categoria: item.category,
      'Frequência (ano)': item.frequencyAnnual.toFixed(2),
      'Tempo Reparo Médio (dias)': item.avgDowntimeDays.toFixed(1),
      'Dias Desde Última': item.daysSinceLastOrder,
      'Status Predição': item.predictionStatus,
      'Dias para Falha (Est.)': item.predictedFailureDays,
      'Confiança Estatística': item.confidence,
      'Justificativa': item.justification
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ranking Priorização");
    XLSX.writeFile(workbook, `CESAN_Priorizacao_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Filter Logic
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(filters.search.toLowerCase()) || 
                            item.type.toLowerCase().includes(filters.search.toLowerCase()) ||
                            item.location.toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory = filters.categories.length === 0 || filters.categories.includes(item.category);
      const matchesScore = item.scoreFinal >= filters.minScore;
      
      return matchesSearch && matchesCategory && matchesScore;
    });
  }, [data, filters]);

  // Derived Statistics
  const stats = useMemo(() => {
    return {
      total: filteredData.length,
      delayed: filteredData.filter(d => d.predictionStatus === PredictionStatus.DELAYED).length,
      critical: filteredData.filter(d => d.category === CriticalityLevel.CRITICAL).length,
      high: filteredData.filter(d => d.category === CriticalityLevel.HIGH).length,
      medium: filteredData.filter(d => d.category === CriticalityLevel.MEDIUM).length,
      low: filteredData.filter(d => d.category === CriticalityLevel.LOW).length,
    };
  }, [filteredData]);

  // --- RENDER ---

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
        <header className="bg-brand-800 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg">
                <LayoutDashboard size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">CESAN <span className="font-light opacity-80">| Priorização</span></h1>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-12 text-center border border-slate-100">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileSpreadsheet size={40} className="text-brand-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Carregar Dados de Manutenção</h2>
            <p className="text-slate-500 mb-8 max-w-lg mx-auto leading-relaxed">
              Faça upload da planilha Excel padrão (SAP) contendo as abas <strong className="text-brand-700">Ordens Abertas</strong> e <strong className="text-brand-700">Ordens Encerradas</strong>. O sistema processará automaticamente os indicadores de saúde e criticidade.
            </p>
            
            <div 
              className={`border-2 border-dashed rounded-2xl p-10 transition-all ${
                isProcessing ? 'border-brand-300 bg-brand-50' : 'border-slate-300 hover:border-brand-500 hover:bg-slate-50'
              }`}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mb-4"></div>
                  <p className="font-semibold text-brand-700">Processando dados e calculando scores...</p>
                  <p className="text-xs text-brand-500 mt-2">Isso pode levar alguns segundos dependendo do tamanho do arquivo.</p>
                </div>
              ) : (
                <>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    id="file-upload"
                    ref={fileInputRef}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <UploadCloud size={48} className="text-slate-400 mb-4" />
                    <span className="bg-brand-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20">
                      Selecionar Arquivo Excel
                    </span>
                    <p className="text-xs text-slate-400 mt-4">Suporta arquivos .xlsx e .xls</p>
                  </label>
                </>
              )}
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 text-left border border-red-100">
                <XCircle size={24} className="shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Header */}
      <header className="bg-brand-900 text-white shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-sm cursor-pointer" onClick={() => setData([])}>
              <LayoutDashboard size={20} className="text-brand-100" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">CESAN <span className="font-normal opacity-70">| Priorização</span></h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex relative group">
              <input 
                type="text" 
                placeholder="Buscar equipamento, local..." 
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9 pr-4 py-1.5 bg-brand-800/50 border border-brand-700 rounded-full text-sm text-white placeholder-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-brand-800 transition-all w-64"
              />
              <Search className="absolute left-3 top-2 text-brand-300" size={14} />
            </div>
            
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-full text-sm font-medium transition-colors border border-brand-500 shadow-sm"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Exportar</span>
            </button>

            <button 
              onClick={() => setData([])}
              className="p-2 text-brand-200 hover:text-white hover:bg-brand-800 rounded-full transition-colors"
              title="Novo Arquivo"
            >
              <UploadCloud size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Methodology Accordion - FULLY DETAILED */}
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <button 
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors text-left group"
          >
             <div className="flex items-center gap-3">
               <div className="bg-white p-1.5 rounded-md border border-slate-200 group-hover:border-brand-300 transition-colors">
                 <Info size={20} className="text-brand-600" />
               </div>
               <div>
                 <span className="font-bold text-slate-800 block text-sm">Metodologia Detalhada & Regras de Negócio</span>
                 <span className="text-xs text-slate-500 font-normal">Clique para entender como os cálculos, classificações e predições são realizados.</span>
               </div>
             </div>
             {showMethodology ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
          </button>
          
          {showMethodology && (
            <div className="px-8 py-8 border-t border-slate-200 bg-white">
               <div className="grid md:grid-cols-2 gap-12">
                 
                 {/* COLUMN 1: SCORE & CLASSIFICATION */}
                 <div className="space-y-8">
                   <div>
                      <h4 className="flex items-center gap-2 font-bold text-slate-900 mb-4 uppercase tracking-wide text-xs border-b border-slate-100 pb-2">
                        <Calculator size={16} className="text-brand-500" /> 
                        Composição do Índice de Prioridade (Score)
                      </h4>
                      <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                        O score final (0 a 100) é resultado de uma soma ponderada. Antes da ponderação, cada variável é <strong>normalizada globalmente</strong> usando a fórmula <code>(Valor - Mín) / (Máx - Mín) * 100</code>, garantindo equidade matemática.
                      </p>
                      <ul className="space-y-3 text-sm text-slate-700">
                        <li className="flex justify-between items-center border-b border-dashed border-slate-100 pb-1">
                          <span><strong className="text-brand-700">Frequência (35%)</strong>: Volume de ordens/ano.</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">Peso 0.35</span>
                        </li>
                        <li className="flex justify-between items-center border-b border-dashed border-slate-100 pb-1">
                          <span><strong className="text-brand-700">Tempo de Reparo (30%)</strong>: Média de dias parado (Downtime).</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">Peso 0.30</span>
                        </li>
                        <li className="flex justify-between items-center border-b border-dashed border-slate-100 pb-1">
                          <span><strong className="text-brand-700">Tendência (20%)</strong>: Delta de ordens (Últimos 6m vs Anteriores).</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">Peso 0.20</span>
                        </li>
                        <li className="flex justify-between items-center border-b border-dashed border-slate-100 pb-1">
                          <span><strong className="text-brand-700">Negligência (10%)</strong>: Dias desde a última manutenção.</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">Peso 0.10</span>
                        </li>
                        <li className="flex justify-between items-center pb-1">
                          <span><strong className="text-green-700">Obsolescência (-5%)</strong>: Penalidade se > 540 dias sem ordem.</span>
                          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-mono">Peso -0.05</span>
                        </li>
                      </ul>
                   </div>

                   <div>
                      <h4 className="flex items-center gap-2 font-bold text-slate-900 mb-4 uppercase tracking-wide text-xs border-b border-slate-100 pb-2">
                        <Target size={16} className="text-brand-500" /> 
                        Régua de Classificação (Criticidade)
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-800">
                          <strong className="block text-xs uppercase mb-1 opacity-70">Crítico</strong>
                          <span className="text-lg font-bold">Score ≥ 75</span>
                        </div>
                        <div className="p-3 rounded-lg bg-orange-50 border border-orange-100 text-orange-800">
                          <strong className="block text-xs uppercase mb-1 opacity-70">Alto</strong>
                          <span className="text-lg font-bold">50 a 74.9</span>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800">
                          <strong className="block text-xs uppercase mb-1 opacity-70">Médio</strong>
                          <span className="text-lg font-bold">25 a 49.9</span>
                        </div>
                        <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-green-800">
                          <strong className="block text-xs uppercase mb-1 opacity-70">Baixo</strong>
                          <span className="text-lg font-bold">Score &lt; 25</span>
                        </div>
                      </div>
                   </div>
                 </div>

                 {/* COLUMN 2: PREDICTION & FILTERS */}
                 <div className="space-y-8">
                   <div>
                      <h4 className="flex items-center gap-2 font-bold text-slate-900 mb-4 uppercase tracking-wide text-xs border-b border-slate-100 pb-2">
                        <Clock size={16} className="text-brand-500" /> 
                        Algoritmo de Predição Estatística
                      </h4>
                      <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                        Utiliza a média histórica de intervalos entre falhas para projetar a próxima. Equipamentos com menos de 2 ordens no histórico são classificados como "Sem Histórico".
                      </p>
                      
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                        <code className="text-xs text-brand-800 font-mono block mb-2">
                          Próxima Falha = (Média Intervalos) - (Dias Desde Última Ordem)
                        </code>
                        <div className="space-y-2 mt-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-3 h-3 rounded-full bg-red-500"></span>
                            <span className="font-bold text-slate-700">Atrasado:</span>
                            <span className="text-slate-500">Resultado ≤ 0 dias (Prazo estourado)</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                            <span className="font-bold text-slate-700">Preocupante:</span>
                            <span className="text-slate-500">Resultado entre 1 e 30 dias</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                            <span className="font-bold text-slate-700">OK:</span>
                            <span className="text-slate-500">Resultado &gt; 30 dias</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-slate-600">
                        <strong className="text-slate-900">Nível de Confiança:</strong> Baseado no Coeficiente de Variação (CV = Desvio Padrão Amostral / Média).
                        <ul className="mt-1 ml-4 list-disc text-xs text-slate-500">
                          <li>CV &lt; 0.3: Alta (Comportamento Previsível)</li>
                          <li>0.3 ≤ CV &lt; 0.7: Média</li>
                          <li>CV ≥ 0.7: Baixa (Comportamento Errático)</li>
                        </ul>
                      </div>
                   </div>

                   <div>
                      <h4 className="flex items-center gap-2 font-bold text-slate-900 mb-4 uppercase tracking-wide text-xs border-b border-slate-100 pb-2">
                        <Filter size={16} className="text-brand-500" /> 
                        Saneamento e Exclusões
                      </h4>
                      <ul className="space-y-2 text-sm text-slate-600">
                        <li className="flex items-start gap-2">
                          <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                          <span><strong>Inconsistência Temporal:</strong> Ordens com data de encerramento anterior à data de entrada são removidas.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                          <span><strong>Dados Antigos:</strong> Ordens que levaram mais de <strong>3 anos (1095 dias)</strong> para serem resolvidas são desconsideradas como outliers.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                          <span><strong>Identificação:</strong> Equipamentos sem código/ID são removidos da análise.</span>
                        </li>
                      </ul>
                   </div>
                 </div>

               </div>
            </div>
          )}
        </div>

        {/* KPI Grid - Updated Layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard 
            label="Total" 
            value={stats.total} 
            icon={List} 
            color="text-slate-700 bg-slate-50 border-slate-200"
          />
          <StatCard 
            label="Atrasados" 
            value={stats.delayed} 
            subValue="Prazo excedido"
            icon={Clock} 
            color="text-purple-700 bg-purple-50 border-purple-200"
          />
          <StatCard 
            label="Críticos" 
            value={stats.critical} 
            icon={AlertOctagon} 
            color="text-red-700 bg-red-50 border-red-200"
          />
          <StatCard 
            label="Alto" 
            value={stats.high} 
            icon={ShieldAlert} 
            color="text-orange-700 bg-orange-50 border-orange-200"
          />
          <StatCard 
            label="Médio" 
            value={stats.medium} 
            icon={Shield} 
            color="text-amber-700 bg-amber-50 border-amber-200"
          />
          <StatCard 
            label="Baixo" 
            value={stats.low} 
            icon={ShieldCheck} 
            color="text-emerald-700 bg-emerald-50 border-emerald-200"
          />
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity size={20} className="text-brand-600"/> 
              Equipamentos Analisados
            </h2>
            
            {/* Quick Filters */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-2 hidden sm:inline">Filtrar por:</span>
              {[
                 { label: 'Todos', val: null },
                 { label: 'Crítico', val: CriticalityLevel.CRITICAL, color: 'text-red-700 bg-red-50 border-red-200' },
                 { label: 'Alto', val: CriticalityLevel.HIGH, color: 'text-orange-700 bg-orange-50 border-orange-200' },
                 { label: 'Atrasados', val: 'DELAYED', color: 'text-purple-700 bg-purple-50 border-purple-200' }
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => {
                     if (opt.val === 'DELAYED') {
                        setFilters(prev => ({ ...prev, categories: [] }));
                     } else {
                        setFilters(prev => ({ ...prev, categories: opt.val ? [opt.val as CriticalityLevel] : [] }));
                     }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    (opt.val && filters.categories.includes(opt.val as CriticalityLevel)) || (!opt.val && filters.categories.length === 0)
                      ? opt.color || 'bg-brand-800 text-white border-brand-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          
          <EquipmentTable data={filteredData} onSelect={setSelectedEquipment} />
        </div>

      </main>

      {selectedEquipment && (
        <DetailDrawer 
          equipment={selectedEquipment} 
          onClose={() => setSelectedEquipment(null)} 
        />
      )}
    </div>
  );
};

export default App;