import React from 'react';
import { Equipment, PredictionStatus } from '../types';
import { X, Activity, Clock, Wrench, AlertTriangle, FileText, BarChart2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface DetailDrawerProps {
  equipment: Equipment | null;
  onClose: () => void;
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({ equipment, onClose }) => {
  if (!equipment) return null;

  // Parsing justifications
  const justificationList = equipment.justification.split('|').map(s => s.trim()).filter(s => s);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-white sticky top-0 z-10">
          <div>
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wider bg-brand-50 px-2 py-0.5 rounded-sm border border-brand-100">
              {equipment.type}
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-2 leading-tight">{equipment.name}</h2>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
              📍 {equipment.location}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-50 rounded-full border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          
          {/* Score Hero */}
          <div className="flex items-stretch gap-4">
            <div className="flex-1 bg-brand-900 rounded-2xl p-6 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Activity size={80} />
               </div>
               <p className="text-brand-200 text-xs font-bold uppercase tracking-wider mb-2">Score Final</p>
               <div className="flex items-baseline gap-2">
                 <span className="text-5xl font-bold">{Math.round(equipment.scoreFinal)}</span>
                 <span className="text-brand-300 text-lg">/100</span>
               </div>
               <div className="mt-4">
                 <StatusBadge type="criticality" value={equipment.category} />
               </div>
            </div>

            <div className={`w-1/3 rounded-2xl p-4 flex flex-col justify-between border ${
               equipment.predictionStatus === PredictionStatus.DELAYED ? 'bg-red-50 border-red-100' :
               equipment.predictionStatus === PredictionStatus.WORRISOME ? 'bg-amber-50 border-amber-100' :
               'bg-emerald-50 border-emerald-100'
            }`}>
              <Clock size={24} className={
                equipment.predictionStatus === PredictionStatus.DELAYED ? 'text-red-500' :
                equipment.predictionStatus === PredictionStatus.WORRISOME ? 'text-amber-500' :
                'text-emerald-500'
              } />
              <div>
                <p className="text-xs font-semibold uppercase opacity-60 mb-1">Predição</p>
                <p className="font-bold text-sm leading-tight">{equipment.predictionStatus}</p>
                {equipment.predictedFailureDays && (
                   <p className="text-xs mt-1 font-medium">
                     {equipment.predictedFailureDays <= 0 ? 'Atrasado ' : 'Faltam '}
                     {Math.abs(equipment.predictedFailureDays)}d
                   </p>
                )}
              </div>
            </div>
          </div>

          {/* Justifications */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500"/> Fatores de Risco
            </h3>
            <div className="flex flex-wrap gap-2">
              {justificationList.length > 0 ? justificationList.map((reason, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-slate-50 text-slate-700 text-sm rounded-lg border border-slate-200 font-medium">
                  {reason}
                </span>
              )) : (
                <span className="text-sm text-slate-400 italic">Nenhum fator crítico detectado.</span>
              )}
            </div>
          </div>

          {/* Technical Metrics */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
              <BarChart2 size={16} className="text-brand-500"/> Métricas Históricas
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <MetricBox label="Frequência Anual" value={equipment.frequencyAnnual.toFixed(2)} unit="/ ano" />
              <MetricBox label="Ordens Totais" value={equipment.totalOrders} />
              <MetricBox label="Downtime Médio" value={equipment.avgDowntimeDays.toFixed(1)} unit="dias" />
              <MetricBox label="Variabilidade" value={equipment.variability.toFixed(2)} unit="CV" />
              <MetricBox label="Última Ordem" value={equipment.daysSinceLastOrder} unit="dias atrás" fullWidth />
              <MetricBox 
                label="Tendência (6m)" 
                value={equipment.trend6m > 0 ? `+${equipment.trend6m}` : equipment.trend6m} 
                unit="ordens vs período anterior" 
                trend={equipment.trend6m}
                fullWidth 
              />
            </div>
          </div>

          {/* Last Work Order Text */}
          {equipment.lastWorkOrderText && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                 <FileText size={14} /> Última Nota de Manutenção
               </h3>
               <p className="text-sm text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
                 {equipment.lastWorkOrderText}
               </p>
            </div>
          )}

          <div className="pt-4">
             <button className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 active:scale-95">
              <Wrench size={18} />
              Gerar Relatório Técnico
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Subcomponent
const MetricBox = ({ label, value, unit, fullWidth, trend }: any) => (
  <div className={`p-4 bg-white rounded-xl border border-slate-200 shadow-sm ${fullWidth ? 'col-span-2' : ''}`}>
    <p className="text-xs text-slate-500 mb-1 font-medium uppercase">{label}</p>
    <div className="flex items-baseline gap-1">
      <p className={`text-xl font-bold ${
        trend > 0 ? 'text-red-600' : trend < 0 ? 'text-emerald-600' : 'text-slate-800'
      }`}>
        {value}
      </p>
      {unit && <span className="text-xs font-normal text-slate-400">{unit}</span>}
    </div>
  </div>
);