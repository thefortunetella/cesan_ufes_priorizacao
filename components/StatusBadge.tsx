import React from 'react';
import { CriticalityLevel, PredictionStatus } from '../types';

interface BadgeProps {
  type: 'criticality' | 'prediction';
  value: string;
}

export const StatusBadge: React.FC<BadgeProps> = ({ type, value }) => {
  let styles = "bg-slate-100 text-slate-800 border-slate-200";

  if (type === 'criticality') {
    switch (value) {
      case CriticalityLevel.CRITICAL:
        styles = "bg-red-50 text-red-700 border-red-200";
        break;
      case CriticalityLevel.HIGH:
        styles = "bg-orange-50 text-orange-700 border-orange-200";
        break;
      case CriticalityLevel.MEDIUM:
        styles = "bg-yellow-50 text-yellow-700 border-yellow-200";
        break;
      case CriticalityLevel.LOW:
        styles = "bg-green-50 text-green-700 border-green-200";
        break;
    }
  } else {
    switch (value) {
      case PredictionStatus.DELAYED:
        styles = "bg-red-50 text-red-700 border-red-200";
        break;
      case PredictionStatus.WORRISOME:
        styles = "bg-amber-50 text-amber-700 border-amber-200";
        break;
      case PredictionStatus.OK:
        styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
        break;
      case PredictionStatus.NO_HISTORY:
        styles = "bg-slate-50 text-slate-500 border-slate-200";
        break;
      default:
        styles = "bg-slate-50 text-slate-500 border-slate-200";
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles} tracking-wide`}>
      {value}
    </span>
  );
};