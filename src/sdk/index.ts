// Фабрика SDK. Выбор режима (real / mock) — ТОЛЬКО здесь:
// остальной код приложения знает лишь интерфейс ISdk.

import { createMockSdk } from './mock'
import { createRealSdk } from './real'
import type { ISdk } from './types'

export type { ISdk, PlayerData } from './types'

// Сколько ждать window.YaGames, пока загрузится официальный SDK
const YA_GAMES_TIMEOUT_MS = 3000

// Экземпляр кешируем: getSdk() можно вызывать много раз
let sdkInstance: Promise<ISdk> | null = null

/**
 * Возвращает SDK-экземпляр: реальный — если window.YaGames появился
 * за отведённое время, иначе mock. Полученный выбор кешируется.
 * init() приложение вызывает само, когда будет готово к рекламе.
 */
export function getSdk(): Promise<ISdk> {
  if (!sdkInstance) {
    sdkInstance = createSdk()
  }
  return sdkInstance
}

async function createSdk(): Promise<ISdk> {
  const real = await createRealSdk(YA_GAMES_TIMEOUT_MS)
  return real ?? createMockSdk()
}
