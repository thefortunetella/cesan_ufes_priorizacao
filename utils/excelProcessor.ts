import * as XLSX from 'xlsx';
import { Equipment, CriticalityLevel, PredictionStatus } from '../types';

// Constants from Python script
const PESOS = {
  frequencia: 0.35,
  downtime: 0.30,
  tendencia: 0.20,
  negligencia: 0.10,
  obsolescencia: -0.05
};

const LIMITES = {
  CRITICO: 75,
  ALTO: 50,
  MEDIO: 25
};

// Helper to parse Excel dates (which can be serial numbers or strings)
const parseExcelDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  
  // If number (Excel Serial Date)
  if (typeof value === 'number') {
    // Excel base date is Dec 30 1899
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }
  
  // If string
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

// Helper to calculate days between dates
const diffDays = (d1: Date, d2: Date) => {
  return Math.floor((d1.getTime() - d2.getTime()) / (1000 * 3600 * 24));
};

export const processExcelFile = async (file: File): Promise<Equipment[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer);

  // Validate Sheets
  if (!workbook.SheetNames.includes('Ordens Abertas') || !workbook.SheetNames.includes('Ordens Encerradas')) {
    throw new Error("O arquivo deve conter as abas 'Ordens Abertas' e 'Ordens Encerradas'.");
  }

  // Read Data
  const rawClosed = XLSX.utils.sheet_to_json(workbook.Sheets['Ordens Encerradas']) as any[];
  
  // Group by Equipment Name
  const groups = new Map<string, any[]>();
  const now = new Date();

  rawClosed.forEach(row => {
    // Normalizing column names (handling aliases as per script)
    const equipName = row['Denominação Equipamento'] || row['Denominacao Equipamento'] || row['Denominação do Equipamento'];
    const equipId = row['Equipamento'];
    const entryDate = parseExcelDate(row['Data de entrada']);
    const closeDate = parseExcelDate(row['Data Encerramento'] || row['Data Encerrramento']);
    const location = row['Denominação Local'] || row['Denominacao Local'] || row['Local'] || 'Não informado';
    const longText = row['Texto Longo da Ordem'] || row['Texto Longo'] || '';

    if (!equipName || !entryDate || !closeDate) return;

    // Filter invalid logic as per script
    const daysToSolve = diffDays(closeDate, entryDate);
    if (daysToSolve < 0) return; // Inconsistent
    if (daysToSolve > 1095) return; // Too old (> 3 years to solve)

    if (!groups.has(equipName)) {
      groups.set(equipName, []);
    }
    
    groups.get(equipName)?.push({
      equipId,
      equipName,
      location,
      entryDate,
      closeDate,
      daysToSolve,
      longText
    });
  });

  // PASS 1: Calculate Raw Metrics
  let rawList: any[] = [];
  
  groups.forEach((orders, name) => {
    // Sort by Close Date Ascending
    orders.sort((a, b) => a.closeDate.getTime() - b.closeDate.getTime());
    
    const lastOrder = orders[orders.length - 1];
    const firstDate = orders.reduce((min, o) => o.entryDate < min ? o.entryDate : min, orders[0].entryDate);
    const lastDate = orders.reduce((max, o) => o.closeDate > max ? o.closeDate : max, orders[0].closeDate);
    
    const totalOrders = orders.length;
    const daysHistory = diffDays(lastDate, firstDate) + 1;
    const years = Math.max(1, daysHistory / 365);
    
    const freqAnnual = totalOrders / years;
    const avgDowntime = orders.reduce((sum, o) => sum + o.daysToSolve, 0) / totalOrders;
    
    // Trend (Last 6m vs Previous 6m)
    // Precise calculation using milliseconds to match Timedelta(days=180)
    const msInDay = 24 * 60 * 60 * 1000;
    const cutoff6m = new Date(now.getTime() - (180 * msInDay));
    const cutoff12m = new Date(now.getTime() - (360 * msInDay)); // 180 * 2
    
    const recentOrders = orders.filter(o => o.entryDate >= cutoff6m).length;
    const prevOrders = orders.filter(o => o.entryDate >= cutoff12m && o.entryDate < cutoff6m).length;
    const trend = recentOrders - prevOrders;

    // Variability (CV = StdDev / Mean)
    // LOGIC FIX: Use Sample Standard Deviation (N-1) to match Pandas .std()
    let variability = 0;
    if (totalOrders > 1 && avgDowntime > 0) {
      const variance = orders.reduce((sum, o) => sum + Math.pow(o.daysToSolve - avgDowntime, 2), 0) / (totalOrders - 1);
      const stdDev = Math.sqrt(variance);
      variability = stdDev / avgDowntime;
    }

    const daysSinceLast = diffDays(now, lastOrder.closeDate);

    // Interval Mean for prediction
    // LOGIC FIX: Filter intervals > 0 exactly like Python script (intervalos[intervalos > 0])
    let intervalMean = 0;
    if (totalOrders > 1) {
      const validIntervals: number[] = [];
      for (let i = 1; i < totalOrders; i++) {
        const diff = diffDays(orders[i].closeDate, orders[i-1].closeDate);
        if (diff > 0) {
          validIntervals.push(diff);
        }
      }
      
      if (validIntervals.length > 0) {
        intervalMean = validIntervals.reduce((a, b) => a + b, 0) / validIntervals.length;
      }
    }

    rawList.push({
      id: lastOrder.equipId,
      name: name,
      type: name.split(' ')[0],
      location: lastOrder.location,
      totalOrders,
      frequencyAnnual: freqAnnual,
      avgDowntimeDays: avgDowntime,
      daysSinceLastOrder: daysSinceLast,
      lastMaintenanceDate: lastOrder.closeDate.toISOString(),
      trend6m: trend,
      variability,
      intervalMeanDays: intervalMean > 0 ? intervalMean : null,
      lastWorkOrderText: lastOrder.longText
    });
  });

  // PASS 2: Find Global Min/Max for Normalization
  if (rawList.length === 0) return [];

  const stats = {
    freq: { min: Infinity, max: -Infinity },
    downtime: { min: Infinity, max: -Infinity },
    trend: { min: Infinity, max: -Infinity },
    negligence: { min: Infinity, max: -Infinity }
  };

  rawList.forEach(item => {
    stats.freq.min = Math.min(stats.freq.min, item.frequencyAnnual);
    stats.freq.max = Math.max(stats.freq.max, item.frequencyAnnual);

    stats.downtime.min = Math.min(stats.downtime.min, item.avgDowntimeDays);
    stats.downtime.max = Math.max(stats.downtime.max, item.avgDowntimeDays);

    stats.trend.min = Math.min(stats.trend.min, item.trend6m);
    stats.trend.max = Math.max(stats.trend.max, item.trend6m);

    stats.negligence.min = Math.min(stats.negligence.min, item.daysSinceLastOrder);
    stats.negligence.max = Math.max(stats.negligence.max, item.daysSinceLastOrder);
  });

  // Helper for normalization: (val - min) / (max - min) * 100
  const normalize = (val: number, min: number, max: number) => {
    if (max === min) return 0;
    return ((val - min) / (max - min)) * 100;
  };

  // PASS 3: Calculate Scores & Classify
  return rawList.map(eq => {
    const scoreFreq = normalize(eq.frequencyAnnual, stats.freq.min, stats.freq.max);
    const scoreDowntime = normalize(eq.avgDowntimeDays, stats.downtime.min, stats.downtime.max);
    
    // Trend: Higher positive trend (worsening) -> Higher Score (Closer to Max)
    // Lower negative trend (improving) -> Lower Score (Closer to Min)
    const scoreTrend = normalize(eq.trend6m, stats.trend.min, stats.trend.max);
    
    const scoreNegligence = normalize(eq.daysSinceLastOrder, stats.negligence.min, stats.negligence.max);
    const scoreObsolescence = eq.daysSinceLastOrder > 540 ? 100 : 0;

    // Apply Weights
    let final = (
      (scoreFreq * PESOS.frequencia) +
      (scoreDowntime * PESOS.downtime) +
      (scoreTrend * PESOS.tendencia) +
      (scoreNegligence * PESOS.negligencia) +
      (scoreObsolescence * PESOS.obsolescencia)
    );
    final = Math.max(0, Math.min(100, final));

    // Category
    let cat = CriticalityLevel.LOW;
    if (final >= LIMITES.CRITICO) cat = CriticalityLevel.CRITICAL;
    else if (final >= LIMITES.ALTO) cat = CriticalityLevel.HIGH;
    else if (final >= LIMITES.MEDIO) cat = CriticalityLevel.MEDIUM;

    // Prediction
    let predStatus = PredictionStatus.NO_HISTORY;
    let predDays = null;
    let confidence: 'Alta' | 'Media' | 'Baixa' | null = null;

    if (eq.intervalMeanDays && eq.intervalMeanDays > 0) {
      predDays = Math.floor(eq.intervalMeanDays - eq.daysSinceLastOrder);
      
      if (predDays <= 0) predStatus = PredictionStatus.DELAYED;
      else if (predDays <= 30) predStatus = PredictionStatus.WORRISOME;
      else predStatus = PredictionStatus.OK;

      if (eq.variability < 0.3) confidence = 'Alta';
      else if (eq.variability < 0.7) confidence = 'Media';
      else confidence = 'Baixa';
    }

    // Justification Generation
    const justifications: string[] = [];
    if (eq.frequencyAnnual >= 2) justifications.push(`Frequência Alta (${eq.frequencyAnnual.toFixed(1)}/ano)`);
    if (eq.avgDowntimeDays > 30) justifications.push(`Downtime Alto (${eq.avgDowntimeDays.toFixed(0)} dias)`);
    if (eq.trend6m > 0) justifications.push(`Tendência de Piora (+${eq.trend6m})`);
    if (eq.daysSinceLastOrder > 365) justifications.push(`Sem manutenção há ${eq.daysSinceLastOrder} dias`);
    if (eq.variability > 0.7) justifications.push(`Imprevisível`);
    if (justifications.length === 0) justifications.push('Estável');

    return {
      ...eq,
      scoreFreq,
      scoreDowntime,
      scoreTrend,
      scoreNegligence,
      scoreObsolescence,
      scoreFinal: final,
      category: cat,
      predictionStatus: predStatus,
      predictedFailureDays: predDays,
      confidence,
      justification: justifications.join(' | ')
    };
  }).sort((a, b) => b.scoreFinal - a.scoreFinal);
};