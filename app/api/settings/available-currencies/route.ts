// app/api/settings/available-currencies/route.ts
import { NextRequest, NextResponse } from "next/server";

// Top 5 main currencies including PKR
const TOP_CURRENCIES = [
  { code: "USD", description: "United States Dollar" },
  { code: "EUR", description: "Euro" },
  { code: "GBP", description: "British Pound" },
  { code: "PKR", description: "Pakistani Rupee" },
  { code: "AED", description: "United Arab Emirates Dirham" },
];

export async function GET(req: NextRequest) {
  try {
    const res = await fetch("https://api.frankfurter.app/currencies");
    
    if (!res.ok) {
      throw new Error(`Frankfurter API responded with status: ${res.status}`);
    }
    
    const data = await res.json();

    // Convert Frankfurter format to our format and filter for top currencies
    const allCurrencies = Object.keys(data).map((code) => ({
      code,
      description: data[code],
    }));

    // Filter to only include our top 5 currencies
    const filteredCurrencies = allCurrencies.filter(currency => 
      TOP_CURRENCIES.some(top => top.code === currency.code)
    );

    // If Frankfurter doesn't have all our top currencies, supplement with fallback
    const finalCurrencies = TOP_CURRENCIES.map(topCurrency => {
      const found = filteredCurrencies.find(c => c.code === topCurrency.code);
      return found || topCurrency;
    });

    return NextResponse.json({ currencies: finalCurrencies });
    
  } catch (err) {
    console.error("Available currencies fetch error:", err);
    // Return our top 5 currencies on error
    return NextResponse.json({ currencies: TOP_CURRENCIES });
  }
}