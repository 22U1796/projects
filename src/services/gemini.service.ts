import { Injectable } from '@angular/core';
import { GoogleGenAI, Chat } from '@google/genai';
import { from } from 'rxjs';
import { CountryData, SingleStockData, CovidPredictionInput } from '../models';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI;
  private chat: Chat | null = null;

  constructor() {
    if (!process.env.API_KEY) {
      console.error('API_KEY environment variable not set.');
      throw new Error('API_KEY environment variable not set.');
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  startChat(): void {
    this.chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: 'You are a helpful and friendly AI assistant. Keep your responses concise and informative.'
        }
    });
  }

  async getChatResponse(message: string): Promise<string> {
    if (!this.chat) {
        this.startChat();
    }
    try {
        const response = await this.chat!.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error('Error sending chat message:', error);
        return 'Sorry, I encountered an error. Please try again.';
    }
  }

  async getHelp(query: string): Promise<string> {
    try {
      const prompt = `
        You are a specialized help assistant for a web application called "PredX".
        Your role is to provide clear, concise, and friendly help to users about the application's features. Do not go off-topic.

        PredX has 4 main sections accessible from the sidebar:
        1.  **Correlation Analysis:** This page lets users select a country (USA, Germany, Japan, India) to see a visual comparison between its COVID-19 trends (cases and deaths) and its main stock market index performance over time. It also provides an AI-generated analysis of the correlation.
        2.  **Stock Predictor:** This page allows users to select a single stock (AAPL, GOOGL, MSFT) and view its historical price chart. Users can then select a future timeframe (30, 90, or 180 days) to get an AI-powered price forecast.
        3.  **COVID-19 Predictor:** This page provides an AI-powered assessment of COVID-19 infection likelihood based on user-inputted health data like test results, symptoms, and vitals.
        4.  **AI Chatbot:** This is a general-purpose conversational chatbot for various questions and tasks, not specific to the application's data.

        Based on this information, answer the following user question: "${query}"
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error('Error calling Gemini API for help:', error);
      return 'An error occurred while getting help. Please check your connection and try again.';
    }
  }

  async analyzeData(country: string, data: CountryData): Promise<string> {
    try {
      // To stay within token limits, we'll summarize the data
      const covidSummary = this.summarize(data.covidData.map(d => d.cases));
      const stockSummary = this.summarize(data.stockData.map(d => d.value));
      const startDate = data.covidData[0].date;
      const endDate = data.covidData[data.covidData.length - 1].date;

      const prompt = `
        You are an expert financial and health data analyst.
        Analyze the provided data summaries for ${country} between ${startDate} and ${endDate}.
        The data covers COVID-19 daily cases and the daily closing value of the ${data.stockIndexName}.

        COVID-19 Data Summary:
        - Peak daily cases: ${covidSummary.max.toLocaleString()}
        - Average daily cases: ${covidSummary.avg.toLocaleString()}
        
        Stock Market (${data.stockIndexName}) Summary:
        - Highest value: ${stockSummary.max.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        - Lowest value: ${stockSummary.min.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

        Provide a concise, 2-3 sentence analysis on the potential correlation or notable patterns between COVID-19 trends and stock market performance. For example, did market dips coincide with surges in cases?
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return 'An error occurred while analyzing the data. Please check the API key and try again.';
    }
  }

  async predictStockPrice(country: string, data: CountryData): Promise<string> {
    try {
      const stockSummary = this.summarize(data.stockData.map(d => d.value));
      const lastPrice = data.stockData[data.stockData.length - 1].value;
      const startDate = data.stockData[0].date;
      const endDate = data.stockData[data.stockData.length - 1].date;

      const prompt = `
        You are an expert financial analyst providing stock market predictions.
        Analyze the provided historical data for the ${data.stockIndexName} in ${country} from ${startDate} to ${endDate}.

        Historical Data Summary:
        - Highest value: ${stockSummary.max.toLocaleString()}
        - Lowest value: ${stockSummary.min.toLocaleString()}
        - Average value: ${stockSummary.avg.toLocaleString()}
        - Last closing value: ${lastPrice.toLocaleString()}

        Based on this data, provide a concise, 2-3 sentence prediction for the stock market's likely performance over the next 30 days. Mention the overall trend (bullish, bearish, stable) and potential volatility. Do not give financial advice.
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      console.error('Error calling Gemini API for prediction:', error);
      return 'An error occurred while generating the stock prediction.';
    }
  }

  async predictSingleStock(ticker: string, data: SingleStockData, periodInDays: number): Promise<string> {
    try {
      const priceSummary = this.summarize(data.priceHistory.map(d => d.value));
      const lastPrice = data.priceHistory[data.priceHistory.length - 1].value;
      const startDate = data.priceHistory[0].date;
      const endDate = data.priceHistory[data.priceHistory.length - 1].date;

      const prompt = `
        You are an expert financial analyst providing stock market predictions for a single stock.
        Analyze the provided historical data for ${data.stockName} (${ticker}) from ${startDate} to ${endDate}.

        Historical Data Summary:
        - Highest price: ${priceSummary.max.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        - Lowest price: ${priceSummary.min.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        - Average price: ${priceSummary.avg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        - Last closing price: ${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

        Based on this historical performance, provide a concise, 2-3 sentence prediction for the stock's likely performance over the next ${periodInDays} days. Mention the overall trend (bullish, bearish, stable) and potential volatility. This is not financial advice.
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      console.error('Error calling Gemini API for single stock prediction:', error);
      return 'An error occurred while generating the stock prediction.';
    }
  }
  
  async predictCovidSeverity(data: CovidPredictionInput, symptomLabels: { [key: string]: string }): Promise<string> {
    try {
      const selectedSymptoms = Object.entries(data.symptoms)
        .filter(([, value]) => value)
        .map(([key]) => symptomLabels[key] || key)
        .join(', ');

      const prompt = `
        You are a helpful AI assistant with knowledge in medical data analysis.
        Your role is to provide a general assessment of COVID-19 likelihood and potential severity based on user-provided data.
        IMPORTANT: You must not provide a medical diagnosis. Your response must be purely informational and based on the data given.

        Here is the user's data:
        - Age: ${data.age || 'Not provided'}
        - RT-PCR Test Result: ${data.pcrResult}
        - Antigen Test Result: ${data.antigenResult}
        - Body Temperature: ${data.bodyTemperature ? data.bodyTemperature + ' °C' : 'Not provided'}
        - Respiratory Rate: ${data.respiratoryRate ? data.respiratoryRate + ' breaths/minute' : 'Not provided'}
        - Symptoms: ${selectedSymptoms || 'None reported'}
        - Other Symptoms: ${data.otherSymptoms || 'None'}
        - CT Scan / X-Ray Notes: ${data.ctScanNotes || 'None'}

        Based on this information, provide a concise, 3-4 sentence analysis covering:
        1.  A general assessment of the likelihood of a COVID-19 infection (e.g., low, moderate, high).
        2.  An observation on potential severity, considering factors like age, respiratory rate, and reported symptoms.
        3.  Mention which of the provided data points are most indicative.

        Conclude your response with the following disclaimer, exactly as written, on a new line:
        "Disclaimer: This is an AI-generated analysis and not a substitute for professional medical advice. Please consult a healthcare professional for diagnosis and treatment."
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      console.error('Error calling Gemini API for COVID prediction:', error);
      return 'An error occurred while generating the COVID-19 prediction. Please try again.';
    }
  }

  private summarize(data: number[]): { max: number; min: number; avg: number } {
    const sum = data.reduce((a, b) => a + b, 0);
    return {
      max: Math.max(...data),
      min: Math.min(...data),
      avg: sum / data.length || 0,
    };
  }
}
