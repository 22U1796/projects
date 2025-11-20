export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

export interface CovidDataPoint {
  date: string;
  cases: number;
  deaths: number;
}

export interface CountryData {
  stockIndexName: string;
  covidData: CovidDataPoint[];
  stockData: TimeSeriesDataPoint[];
}

export interface MockData {
  [country: string]: CountryData;
}

export interface SingleStockData {
  stockName: string;
  priceHistory: TimeSeriesDataPoint[];
}

export interface MockStockData {
  [ticker: string]: SingleStockData;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface CovidPredictionInput {
  pcrResult: string;
  antigenResult: string;
  ctScanNotes: string;
  bodyTemperature: number | null;
  symptoms: { [key: string]: boolean };
  otherSymptoms: string;
  respiratoryRate: number | null;
  age: number | null;
}
