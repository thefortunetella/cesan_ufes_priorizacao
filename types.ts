export enum CriticalityLevel {
  CRITICAL = 'CRITICO',
  HIGH = 'ALTO',
  MEDIUM = 'MEDIO',
  LOW = 'BAIXO'
}

export enum PredictionStatus {
  DELAYED = 'ATRASADO',
  WORRISOME = 'PREOCUPANTE',
  OK = 'OK',
  NO_HISTORY = 'SEM_HISTORICO'
}

export interface Equipment {
  id: number | null;
  name: string;
  type: string;
  location: string;
  
  // Metrics calculated from history
  totalOrders: number;
  frequencyAnnual: number;
  avgDowntimeDays: number;
  daysSinceLastOrder: number;
  lastMaintenanceDate: string; // ISO Date
  
  // Advanced metrics
  trend6m: number; // Difference in orders (Last 6m - Previous 6m)
  variability: number;
  intervalMeanDays: number | null;

  // Normalized Scores (0-100)
  scoreFreq: number;
  scoreDowntime: number;
  scoreTrend: number;
  scoreNegligence: number;
  scoreObsolescence: number;
  scoreFinal: number;
  
  // Classification
  category: CriticalityLevel;
  predictionStatus: PredictionStatus;
  predictedFailureDays: number | null;
  confidence: 'Alta' | 'Media' | 'Baixa' | null;
  justification: string; // Pipe separated string in logic, converted to array for UI if needed
  
  // Raw text
  lastWorkOrderText: string | null;
}

export interface FilterState {
  categories: CriticalityLevel[];
  search: string;
  minScore: number;
  dateRange: [string, string]; // ISO Strings
}

// Raw Excel Row Types
export interface RawOrderOpen {
  'Nota'?: number;
  'Ordem'?: number;
  'Data de entrada'?: number | string; // Excel serial or string
  'Hora de início'?: string;
  'Texto breve'?: string;
  'Campo ordenação'?: string;
  'Equipamento'?: number;
  'Denominação Equipamento'?: string;
  'Texto Longo da Ordem'?: string;
  [key: string]: any;
}

export interface RawOrderClosed {
  'Nota'?: number;
  'Ordem'?: number;
  'Data de entrada'?: number | string;
  'Data Encerramento'?: number | string;
  'Texto breve'?: string;
  'Denominação Local'?: string;
  'Equipamento'?: number;
  'Denominação Equipamento'?: string;
  'Texto Longo da Ordem'?: string;
  [key: string]: any;
}