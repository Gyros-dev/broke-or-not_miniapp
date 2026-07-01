import { storage } from './storage';
import type { ExchangeRates } from '../types';

const RATES_KEY_PREFIX = 'rates_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // сутки

export const COMMON_CURRENCIES = [
  'USD',
  'EUR',
  'RUB',
  'GBP',
  'CNY',
  'KZT',
  'UZS',
  'VND',
  'UAH',
  'TRY',
  'GEL',
  'AMD',
];

function isFresh(fetchedAt: string): boolean {
  return Date.now() - new Date(fetchedAt).getTime() < CACHE_TTL_MS;
}

async function fetchRatesFromApi(base: string): Promise<ExchangeRates | null> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.result !== 'success' || !data.rates) return null;
    return {
      base,
      rates: data.rates,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Возвращает курсы валют относительно базовой валюты. Использует кэш на
 * сутки в storage; если сеть недоступна — отдаёт последний сохранённый
 * результат (офлайн-режим), даже если он устарел.
 */
export async function getExchangeRates(base: string): Promise<ExchangeRates | null> {
  const cacheKey = `${RATES_KEY_PREFIX}${base}`;
  const cachedRaw = await storage.getItem(cacheKey);
  const cached: ExchangeRates | null = cachedRaw ? JSON.parse(cachedRaw) : null;

  if (cached && isFresh(cached.fetchedAt)) {
    return cached;
  }

  const fresh = await fetchRatesFromApi(base);
  if (fresh) {
    await storage.setItem(cacheKey, JSON.stringify(fresh));
    return fresh;
  }

  return cached;
}

export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: ExchangeRates | null,
): number {
  if (from === to) return amount;
  if (!rates) return amount;

  if (rates.base === from) {
    const rate = rates.rates[to];
    return rate ? amount * rate : amount;
  }

  if (rates.base === to) {
    const rate = rates.rates[from];
    return rate ? amount / rate : amount;
  }

  const rateFrom = rates.rates[from];
  const rateTo = rates.rates[to];
  if (!rateFrom || !rateTo) return amount;
  return (amount / rateFrom) * rateTo;
}
