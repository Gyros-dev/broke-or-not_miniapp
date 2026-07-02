import { tg } from '../telegram/webapp';

// Лимиты Telegram CloudStorage
const CLOUD_MAX_KEYS = 1024;
const CLOUD_MAX_VALUE_BYTES = 4096;
// Оставляем запас на неточности при подсчёте байт
const CHUNK_SIZE_BYTES = 3800;
const CHUNK_KEY_PREFIX = '__c';
const META_KEY_SUFFIX = '__meta';

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** Режет строку на части по границам символов UTF-8, не превышая maxBytes на часть. */
function splitIntoChunks(value: string, maxBytes: number): string[] {
  const bytes = new TextEncoder().encode(value);
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + maxBytes, bytes.length);
    while (end > start && (bytes[end] & 0xc0) === 0x80) {
      end--;
    }
    chunks.push(decoder.decode(bytes.slice(start, end)));
    start = end;
  }
  return chunks;
}

// Наличие window.Telegram.WebApp.CloudStorage не гарантирует, что вызовы
// реально сработают на конкретном клиенте — это лишь быстрая проверка перед
// попыткой. Каждый вызов ниже всё равно защищён try/catch на случай отказа.
function cloudStorageAvailable(): boolean {
  return !!tg?.CloudStorage;
}

// Методы CloudStorage могут не только вернуть ошибку через callback, но и
// бросить исключение синхронно (например, на старых клиентах Telegram, не
// поддерживающих метод). Каждый вызов защищён try/catch, чтобы сбой облака
// никогда не ломал загрузку данных из localStorage.

function cloudGetItem(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      tg!.CloudStorage.getItem(key, (err, value) => {
        if (err) console.error('[CloudStorage] getItem failed', key, err);
        resolve(err || !value ? null : value);
      });
    } catch (err) {
      console.error('[CloudStorage] getItem threw', key, err);
      resolve(null);
    }
  });
}

function cloudSetItem(key: string, value: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      tg!.CloudStorage.setItem(key, value, (err, ok) => {
        if (err) console.error('[CloudStorage] setItem failed', key, err);
        resolve(!err && !!ok);
      });
    } catch (err) {
      console.error('[CloudStorage] setItem threw', key, err);
      resolve(false);
    }
  });
}

function cloudRemoveItem(key: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      tg!.CloudStorage.removeItem(key, (err) => {
        if (err) console.error('[CloudStorage] removeItem failed', key, err);
        resolve();
      });
    } catch (err) {
      console.error('[CloudStorage] removeItem threw', key, err);
      resolve();
    }
  });
}

function cloudGetKeys(): Promise<string[]> {
  return new Promise((resolve) => {
    try {
      tg!.CloudStorage.getKeys((err, keys) => {
        if (err) console.error('[CloudStorage] getKeys failed', err);
        resolve(err || !keys ? [] : keys);
      });
    } catch (err) {
      console.error('[CloudStorage] getKeys threw', err);
      resolve([]);
    }
  });
}

/** Читает значение из CloudStorage, прозрачно собирая его из частей, если оно было разбито. */
async function cloudRead(key: string): Promise<string | null> {
  const meta = await cloudGetItem(`${key}${META_KEY_SUFFIX}`);
  if (meta) {
    const chunkCount = Number(meta) || 0;
    const parts: string[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const part = await cloudGetItem(`${key}${CHUNK_KEY_PREFIX}${i}`);
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  }
  return cloudGetItem(key);
}

/** Пишет значение в CloudStorage, разбивая его на части при превышении лимита в 4096 байт. */
async function cloudWrite(key: string, value: string): Promise<boolean> {
  if (byteLength(value) <= CLOUD_MAX_VALUE_BYTES) {
    const ok = await cloudSetItem(key, value);
    await cloudRemoveOldChunks(key, 0);
    return ok;
  }

  const chunks = splitIntoChunks(value, CHUNK_SIZE_BYTES);
  for (let i = 0; i < chunks.length; i++) {
    const ok = await cloudSetItem(`${key}${CHUNK_KEY_PREFIX}${i}`, chunks[i]);
    if (!ok) return false;
  }
  await cloudSetItem(`${key}${META_KEY_SUFFIX}`, String(chunks.length));
  await cloudRemoveItem(key);
  await cloudRemoveOldChunks(key, chunks.length);
  return true;
}

/** Удаляет "хвост" частей от предыдущей более длинной версии значения. */
async function cloudRemoveOldChunks(key: string, fromIndex: number): Promise<void> {
  if (fromIndex === 0) {
    await cloudRemoveItem(`${key}${META_KEY_SUFFIX}`);
  }
  for (let i = fromIndex; i < fromIndex + 20; i++) {
    const exists = await cloudGetItem(`${key}${CHUNK_KEY_PREFIX}${i}`);
    if (exists === null) break;
    await cloudRemoveItem(`${key}${CHUNK_KEY_PREFIX}${i}`);
  }
}

/**
 * Абстракция хранилища: пишет в localStorage синхронно (источник истины на
 * устройстве) и зеркалирует в Telegram CloudStorage для синхронизации между
 * устройствами. Значения крупнее лимита CloudStorage (4096 байт на ключ)
 * прозрачно разбиваются на несколько ключей и собираются обратно при чтении.
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    const local = localStorage.getItem(key);
    if (local !== null) return local;
    if (cloudStorageAvailable()) {
      try {
        const cloudValue = await cloudRead(key);
        if (cloudValue !== null) {
          localStorage.setItem(key, cloudValue);
          return cloudValue;
        }
      } catch (err) {
        console.error('[storage] cloud getItem failed', key, err);
      }
    }
    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
    if (cloudStorageAvailable()) {
      try {
        await cloudWrite(key, value);
      } catch (err) {
        console.error('[storage] cloud setItem failed', key, err);
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
    if (cloudStorageAvailable()) {
      try {
        await cloudRemoveItem(key);
        await cloudRemoveOldChunks(key, 0);
      } catch (err) {
        console.error('[storage] cloud removeItem failed', key, err);
      }
    }
  },

  async syncFromCloud(keys: string[]): Promise<void> {
    if (!cloudStorageAvailable()) return;
    try {
      const availableKeys = await cloudGetKeys();
      for (const key of keys) {
        const hasPlainKey = availableKeys.includes(key);
        const hasChunkedKey = availableKeys.includes(`${key}${META_KEY_SUFFIX}`);
        if (!hasPlainKey && !hasChunkedKey) continue;
        const cloudValue = await cloudRead(key);
        if (cloudValue !== null) {
          localStorage.setItem(key, cloudValue);
        }
      }
    } catch (err) {
      console.error('[storage] syncFromCloud failed', err);
    }
  },

  limits: { CLOUD_MAX_KEYS, CLOUD_MAX_VALUE_BYTES },
};

/** Доступна ли синхронизация через Telegram CloudStorage на этом устройстве/клиенте. */
export function isCloudSyncAvailable(): boolean {
  return cloudStorageAvailable();
}

/** Полностью удаляет локальные и облачные данные по заданным ключам (для сброса приложения). */
export async function resetAllData(keys: string[]): Promise<void> {
  for (const key of keys) {
    localStorage.removeItem(key);
  }
  if (!cloudStorageAvailable()) return;
  for (const key of keys) {
    try {
      await cloudRemoveItem(key);
      await cloudRemoveOldChunks(key, 0);
    } catch (err) {
      console.error('[storage] resetAllData failed for', key, err);
    }
  }
}

export interface CloudDiagnostics {
  hasWebApp: boolean;
  hasCloudStorageObject: boolean;
  platform: string;
  version: string;
  colorScheme: string;
  themeParamsKeys: number;
  cloudKeysCount: number | null;
  cloudKeysError: string | null;
  roundTripOk: boolean | null;
  roundTripError: string | null;
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Живая проверка CloudStorage "на месте": не полагается на то, что уже
 * известно о клиенте, а реально пытается записать и прочитать тестовое
 * значение, чтобы увидеть точную причину сбоя синхронизации на конкретном
 * устройстве.
 */
export async function runCloudDiagnostics(): Promise<CloudDiagnostics> {
  const result: CloudDiagnostics = {
    hasWebApp: !!tg,
    hasCloudStorageObject: !!tg?.CloudStorage,
    platform: tg?.platform ?? 'неизвестно',
    version: tg?.version ?? 'неизвестно',
    colorScheme: tg?.colorScheme ?? 'неизвестно',
    themeParamsKeys: tg?.themeParams ? Object.keys(tg.themeParams).length : 0,
    cloudKeysCount: null,
    cloudKeysError: null,
    roundTripOk: null,
    roundTripError: null,
  };

  if (!result.hasCloudStorageObject) return result;

  try {
    const keys = await new Promise<string[]>((resolve, reject) => {
      tg!.CloudStorage.getKeys((err, keys) =>
        err ? reject(new Error(err)) : resolve(keys ?? []),
      );
    });
    result.cloudKeysCount = keys.length;
  } catch (err) {
    result.cloudKeysError = describeError(err);
  }

  try {
    const testKey = '__diag_test__';
    const testValue = String(Date.now());
    const wrote = await new Promise<boolean>((resolve, reject) => {
      tg!.CloudStorage.setItem(testKey, testValue, (err, ok) =>
        err ? reject(new Error(err)) : resolve(!!ok),
      );
    });
    if (!wrote) throw new Error('setItem вернул ok=false без текста ошибки');

    const readBack = await new Promise<string | undefined>((resolve, reject) => {
      tg!.CloudStorage.getItem(testKey, (err, value) =>
        err ? reject(new Error(err)) : resolve(value),
      );
    });
    result.roundTripOk = readBack === testValue;
    if (!result.roundTripOk) {
      result.roundTripError = `записали "${testValue}", прочитали "${readBack}"`;
    }

    await new Promise<void>((resolve) => {
      tg!.CloudStorage.removeItem(testKey, () => resolve());
    });
  } catch (err) {
    result.roundTripOk = false;
    result.roundTripError = describeError(err);
  }

  return result;
}
