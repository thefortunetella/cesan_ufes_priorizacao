import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  color?: string; // Expecting complete class string
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, icon: Icon, color = 'text-slate-600' }) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between transition-all hover:shadow-md hover:border-slate-300">
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        {subValue && <p className="text-xs text-slate-400 mt-1 font-medium">{subValue}</p>}
      </div>
      <div className={`p-3 rounded-xl border ${color.replace('text-', 'bg-').replace('700', '50').replace('600', '50')} ${color.includes('border') ? '' : 'border-transparent'}`}>
        <Icon size={22} className={color.split(' ')[0]} />
      </div>
    </div>
  );
};