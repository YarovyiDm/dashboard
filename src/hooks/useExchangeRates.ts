import { useEffect, useState } from 'react';

export interface Rates {
  USD: number; // UAH per 1 USD
  PLN: number; // UAH per 1 PLN
  UAH: number; // always 1
}

// Used when the NBU request fails (offline / CORS / downtime). Rough mid-2026 levels.
const FALLBACK: Rates = { USD: 42, PLN: 11, UAH: 1 };

interface NbuRate {
  cc: string;
  rate: number;
}

// National Bank of Ukraine — public, no-auth daily reference rates (UAH per unit).
const NBU_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json';

export function useExchangeRates() {
  const [rates, setRates] = useState<Rates>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(NBU_URL)
      .then(r => r.json())
      .then((rows: NbuRate[]) => {
        const byCc = Object.fromEntries(rows.map(r => [r.cc, r.rate]));
        setRates({
          USD: byCc.USD ?? FALLBACK.USD,
          PLN: byCc.PLN ?? FALLBACK.PLN,
          UAH: 1,
        });
      })
      .catch(() => setRates(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  return { rates, loading };
}
