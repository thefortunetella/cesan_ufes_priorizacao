import React, { useState } from 'react';
import { Equipment, CriticalityLevel, PredictionStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { ChevronRight, ChevronLeft, ChevronRight as ChevronNext, HelpCircle } from 'lucide-react';

interface EquipmentTableProps {
  data: Equipment[];
  onSelect: (item: Equipment) => void;
}

export const EquipmentTable: React.FC<EquipmentTableProps> = ({ data, onSelect }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Pagination Logic
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentData = rowsPerPage === -1 ? data : data.slice(startIndex, startIndex + rowsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col">
      <div className="overflow-x-visible min-h-[400px] pb-12">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
              <th className="px-6 py-4">Equipamento / Tipo</th>
              <th className="px-6 py-4">Localização</th>
              <th className="px-6 py-4 w-32 group cursor-help relative">
                 <div className="flex items-center gap-1">
                   Índice Prioridade
                   <HelpCircle size={14} />
                 </div>
                 {/* Tooltip Header */}
                 <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none normal-case font-normal leading-relaxed">
                   Calculado com base na Frequência de quebra (35%), Tempo de Reparo (30%), Tendência (20%) e Negligência (10%). Quanto maior, mais crítico.
                 </div>
              </th>
              <th className="px-6 py-4 text-center">Criticidade</th>
              <th className="px-6 py-4">Predição Falha</th>
              <th className="px-6 py-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {currentData.length > 0 ? currentData.map((item) => (
              <tr 
                key={item.id || Math.random()} 
                onClick={() => onSelect(item)}
                className="hover:bg-brand-50/30 transition-colors cursor-pointer group"
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                    <span className="text-xs text-slate-400 mt-0.5 font-mono">{item.type} {item.id ? `• ID: ${item.id}` : ''}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                  {item.location}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.scoreFinal > 75 ? 'bg-red-600' : 
                          item.scoreFinal > 50 ? 'bg-orange-500' : 
                          item.scoreFinal > 25 ? 'bg-yellow-500' : 'bg-green-600'
                        }`} 
                        style={{ width: `${item.scoreFinal}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-700 w-8 text-right">{Math.round(item.scoreFinal)}</span>
                  </div>
                </td>
                
                {/* Criticality Column with Tooltip */}
                <td className="px-6 py-4 text-center relative group/tooltip">
                  <div className="inline-block cursor-help">
                     <StatusBadge type="criticality" value={item.category} />
                  </div>
                  {/* Custom Tooltip */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[150%] w-64 p-3 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50 pointer-events-none shadow-xl border border-slate-700">
                    <div className="font-bold mb-1.5 border-b border-slate-600 pb-1 text-slate-200">Motivo da Classificação</div>
                    <div className="text-[11px] leading-relaxed text-slate-300">
                      {item.justification.replace(/\|/g, ', ')}
                    </div>
                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 rotate-45 border-r border-b border-slate-700"></div>
                  </div>
                </td>
                
                {/* Prediction Column with Tooltip */}
                <td className="px-6 py-4 relative group/pred">
                   <div className="flex flex-col items-start cursor-help">
                      <StatusBadge type="prediction" value={item.predictionStatus} />
                      {item.predictedFailureDays !== null && item.predictedFailureDays <= 30 && (
                        <span className="text-[10px] font-bold text-red-600 mt-1 pl-1">
                          {item.predictedFailureDays <= 0 
                            ? `Venceu há ${Math.abs(item.predictedFailureDays)} dias` 
                            : `Vence em ${item.predictedFailureDays} dias`}
                        </span>
                      )}
                   </div>
                   {/* Custom Tooltip */}
                   <div className="absolute top-0 left-0 -translate-y-[110%] w-72 p-3 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover/pred:opacity-100 transition-opacity z-50 pointer-events-none shadow-xl text-left border border-slate-700">
                      <div className="font-bold mb-1.5 border-b border-slate-600 pb-1 text-slate-200">Análise de Predição</div>
                      {item.predictionStatus === PredictionStatus.NO_HISTORY ? (
                        <span className="text-slate-300">Dados insuficientes para calcular média de falhas.</span>
                      ) : (
                        <div className="space-y-1 text-[11px] text-slate-300">
                          <p>• Média Histórica de Falhas: a cada <strong>{Math.round(item.intervalMeanDays || 0)}</strong> dias.</p>
                          <p>• Última Manutenção: <strong>{item.daysSinceLastOrder}</strong> dias atrás.</p>
                          <p className="mt-2 pt-1 border-t border-slate-700 font-semibold text-white">
                            {item.predictedFailureDays && item.predictedFailureDays <= 0 
                              ? `STATUS: O prazo estatístico foi excedido em ${Math.abs(item.predictedFailureDays)} dias.`
                              : `STATUS: Dentro do prazo. Previsão de falha em ${item.predictedFailureDays} dias.`
                            }
                          </p>
                        </div>
                      )}
                      <div className="absolute bottom-[-5px] left-6 w-3 h-3 bg-slate-800 rotate-45 border-r border-b border-slate-700"></div>
                   </div>
                </td>

                <td className="px-6 py-4 text-right">
                  <button className="p-2 rounded-full text-slate-300 hover:text-brand-600 hover:bg-brand-50 transition-all">
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                  Nenhum equipamento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {data.length > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Mostrar</span>
            <select 
              value={rowsPerPage} 
              onChange={handleRowsPerPageChange}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={-1}>Todos</option>
            </select>
            <span>por página</span>
            <span className="ml-4 text-slate-400">
              Total: {data.length} registros
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-slate-700">
              Página {currentPage} de {totalPages || 1}
            </span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronNext size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};