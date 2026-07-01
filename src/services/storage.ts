import { tg } from '../telegram/webapp';

// Лимиты Telegram CloudStorage
const CLOUD_MAX_KEYS = 1024;
const CLOUD_MAX_VALUE_BYTES = 4096;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function cloudStorageAvailable(): boolean {
  return !!tg?.CloudStorage;
}

function cloudGetItem(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    tg!.CloudStorage.getItem(key, (err, value) => {
      resolve(err || !value ? null : value);
    });
  });
}

function cloudSetItem(key: string, value: string): Promise<boolean> {
  return new Promise((resolve) => {
    tg!.CloudStorage.setItem(key, value, (err, ok) => {
      resolve(!err && !!ok);
    });
  });
}

function cloudRemoveItem(key: string): Promise<void> {
  return new Promise((resolve) => {
    tg!.CloudStorage.removeItem(key, () => resolve());
  });
}

function cloudGetKeys(): Promise<string[]> {
  return new Promise((resolve) => {
    tg!.CloudStorage.getKeys((err, keys) => {
      resolve(err || !keys ? [] : keys);
    });
  });
}

/**
 * Абстракция хранилища: пишет в localStorage синхронно (источник истины на
 * устройстве) и зеркалирует в Telegram CloudStorage для синхронизации между
 * устройствами, если значение укладывается в лимиты API. Так первый этап без
 * бэкенда позже можно заменить на облачный/серверный источник, поменяв только
 * этот файл.
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    const local = localStorage.getItem(key);
    if (local !== null) return local;
    if (cloudStorageAvailable()) {
      const cloudValue = await cloudGetItem(key);
      if (cloudValue !== null) {
        localStorage.setItem(key, cloudValue);
        return cloudValue;
      }
    }
    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
    if (cloudStorageAvailable() && byteLength(value) <= CLOUD_MAX_VALUE_BYTES) {
      await cloudSetItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
    if (cloudStorageAvailable()) {
      await cloudRemoveItem(key);
    }
  },

  async syncFromCloud(keys: string[]): Promise<void> {
    if (!cloudStorageAvailable()) return;
    const availableKeys = await cloudGetKeys();
    const keysToFetch = keys.filter((k) => availableKeys.includes(k));
    for (const key of keysToFetch) {
      const cloudValue = await cloudGetItem(key);
      if (cloudValue !== null) {
        localStorage.setItem(key, cloudValue);
      }
    }
  },

  limits: { CLOUD_MAX_KEYS, CLOUD_MAX_VALUE_BYTES },
};
