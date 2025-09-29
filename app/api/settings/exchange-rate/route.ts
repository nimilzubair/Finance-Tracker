// app/api/settings/exchange-rate/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Cache for valid currencies
let validCurrenciesCache: Set<string> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Top 5 main currencies including PKR
const TOP_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'PKR', 'AED']);

async function getValidCurrencies(): Promise<Set<string>> {
  const now = Date.now();
  
  // Return cached currencies if still valid
  if (validCurrenciesCache && now - cacheTimestamp < CACHE_DURATION) {
    return validCurrenciesCache;
  }

  try {
    const res = await fetch("https://api.frankfurter.app/currencies");
    
    if (!res.ok) {
      throw new Error(`Frankfurter API responded with status: ${res.status}`);
    }
    
    const data = await res.json();

    if (data) {
      // Filter to only include our top currencies
      const allCurrencies = new Set(Object.keys(data));
      const filteredCurrencies = new Set(
        Array.from(allCurrencies).filter(currency => TOP_CURRENCIES.has(currency))
      );
      
      // Add any missing top currencies (especially PKR)
      TOP_CURRENCIES.forEach(currency => {
        filteredCurrencies.add(currency);
      });

      validCurrenciesCache = filteredCurrencies;
      cacheTimestamp = now;
      return validCurrenciesCache;
    }
    
    throw new Error('No data received from Frankfurter API');
  } catch (error) {
    console.error('Failed to fetch currency symbols from Frankfurter:', error);
    
    // If we have stale cache, use it as fallback
    if (validCurrenciesCache) {
      console.log('Using stale cache due to API failure');
      return validCurrenciesCache;
    }
    
    // Final fallback to our top currencies
    console.log('Using top currencies fallback');
    return TOP_CURRENCIES;
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const from = (url.searchParams.get('from') || 'PKR').toUpperCase();
    const to = url.searchParams.get('to')?.toUpperCase();
    
    if (!to) {
      return NextResponse.json(
        { error: 'Target currency (to) parameter is required' }, 
        { status: 400 }
      );
    }

    // Validate both currencies
    const validCurrencies = await getValidCurrencies();

    if (!validCurrencies.has(from)) {
      return NextResponse.json(
        { error: `Invalid source currency: ${from}. Supported: USD, EUR, GBP, PKR, AED` }, 
        { status: 400 }
      );
    }

    if (!validCurrencies.has(to)) {
      return NextResponse.json(
        { error: `Invalid target currency: ${to}. Supported: USD, EUR, GBP, PKR, AED` }, 
        { status: 400 }
      );
    }

    // Use ExchangeRate-API with your key
    const API_KEY = process.env.EXCHANGE_RATE_API_KEY || '5fb8c3b9bf3c88e5a5291e49';
    
    const rateRes = await fetch(`https://v6.exchangerate-api.com/v6/${API_KEY}/pair/${from}/${to}`);
    
    if (!rateRes.ok) {
      throw new Error(`ExchangeRate-API responded with status: ${rateRes.status}`);
    }
    
    const data = await rateRes.json();
    
    if (data.result !== 'success' || !data.conversion_rate) {
      console.error('ExchangeRate-API error:', data);
      return NextResponse.json(
        { error: 'Failed to get exchange rate from external service' }, 
        { status: 502 }
      );
    }

    return NextResponse.json({ 
      rate: data.conversion_rate,
      from,
      to,
      date: new Date().toISOString().split('T')[0]
    });
    
  } catch (err) {
    console.error('Exchange rate fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rate' }, 
      { status: 500 }
    );
  }
}