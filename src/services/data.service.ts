import { Injectable } from '@angular/core';
import { of, Observable } from 'rxjs';
import { CountryData, MockData, SingleStockData, MockStockData } from '../models';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private mockData: MockData = {};
  private mockSingleStockData: MockStockData = {};

  constructor() {
    this.mockData['USA'] = this.generateCountryData('S&P 500', 1500, 1000, 4500, 3000);
    this.mockData['Germany'] = this.generateCountryData('DAX', 800, 8000, 15000, 12000);
    this.mockData['Japan'] = this.generateCountryData('Nikkei 225', 500, 7000, 30000, 25000);
    this.mockData['India'] = this.generateCountryData('NIFTY 50', 2000, 1500, 18000, 4000);

    this.mockSingleStockData['AAPL'] = this.generateSingleStockData('Apple Inc.', 150, 50);
    this.mockSingleStockData['GOOGL'] = this.generateSingleStockData('Alphabet Inc.', 2500, 800);
    this.mockSingleStockData['MSFT'] = this.generateSingleStockData('Microsoft Corp.', 300, 100);
  }

  getAvailableCountries(): string[] {
    return Object.keys(this.mockData);
  }

  getDataForCountry(country: string): Observable<CountryData> {
    return of(this.mockData[country]);
  }

  getAvailableStocks(): { ticker: string; name: string }[] {
    return Object.keys(this.mockSingleStockData).map(ticker => ({
      ticker,
      name: this.mockSingleStockData[ticker].stockName
    }));
  }

  getDataForStock(ticker: string): Observable<SingleStockData> {
    return of(this.mockSingleStockData[ticker]);
  }

  private generateCountryData(
    stockIndexName: string,
    covidScale: number,
    caseNoise: number,
    stockBase: number,
    stockVolatility: number
  ): CountryData {
    const data: { covidData: any[], stockData: any[] } = { covidData: [], stockData: [] };
    const startDate = new Date('2020-01-01');
    const numDays = 365 * 2; // 2 years of data

    for (let i = 0; i < numDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];

      // Simulate COVID waves
      const wave1 = Math.sin((i / 365) * Math.PI * 2) * 0.5 + 0.5; // Yearly cycle
      const wave2 = Math.sin((i / 180) * Math.PI * 2) * 0.3 + 0.3; // 6-month cycle
      const cases = Math.max(0, Math.floor(((wave1 + wave2) / 2) * covidScale + Math.random() * caseNoise));
      const deaths = Math.max(0, Math.floor(cases * (0.02 + Math.random() * 0.01)));

      // Simulate stock market with a dip and recovery
      const dip = 1 - (Math.exp(-((i - 60) ** 2) / (2 * 40 ** 2)) * 0.4); // Dip around day 60
      const recovery = 1 + (i / numDays) * 0.3; // Gradual recovery/growth
      const noise = (Math.random() - 0.5) * stockVolatility;
      const stockValue = (stockBase * dip * recovery) + noise;

      data.covidData.push({ date: dateString, cases, deaths });
      data.stockData.push({ date: dateString, value: parseFloat(stockValue.toFixed(2)) });
    }
    
    return { stockIndexName, ...data };
  }

  private generateSingleStockData(
    stockName: string,
    stockBase: number,
    stockVolatility: number
  ): SingleStockData {
    const priceHistory: { date: string; value: number }[] = [];
    const startDate = new Date('2022-01-01'); // More recent data for stocks
    const numDays = 365 * 2; // 2 years of data

    let lastPrice = stockBase;

    for (let i = 0; i < numDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];

      // Simulate stock price with random walk and slight upward trend
      const trend = 0.0005;
      const noise = (Math.random() - 0.49) * stockVolatility / 20; // smaller daily fluctuations
      const newPrice = lastPrice * (1 + trend) + noise;
      lastPrice = newPrice > 0 ? newPrice : lastPrice; // Ensure price doesn't go negative

      priceHistory.push({ date: dateString, value: parseFloat(lastPrice.toFixed(2)) });
    }
    
    return { stockName, priceHistory };
  }
}
