// Фабрика SDK. Выбор режима (real / mock) — ТОЛЬКО здесь:
// остальной код приложения знает лишь интерфейс ISdk.

import { createMockSdk } from './mock'
import { createRealSdk } from './real'
import type { ISdk } from './types'

export type { ISdk, PlayerData } from './types'

// Сколько ждать window.YaGames в prod. Запас 500мс до 3с: с учётом создания
// инстанса и init() mock-инициализация обязана появиться не позже 3с после загрузки
const YA_GAMES_TIMEOUT_MS = 2500

// Экземпляр кешируем: getSdk() можно вызывать много раз
let sdkInstance: Promise<ISdk> | null = null

/**
 * Возвращает SDK-экземпляр и кеширует выбор.
 * В dev — сразу mock, без ожидания window.YaGames (старт без 3-секундной паузы).
 * В prod — ждём window.YaGames до 3с → real; не дождались/ошибка → mock
 * (игра обязана работать и вне iframe Яндекса).
 * init() приложение вызывает само, когда будет готово к рекламе.
 */
export function getSdk(): Promise<ISdk> {
  if (!sdkInstance) {
    sdkInstance = createSdk()
  }
  return sdkInstance
}

async function createSdk(): Promise<ISdk> {
  // В dev SDK Яндекса не подключаем — mock сразу, без паузы
  if (import.meta.env.DEV) {
    console.log('[SDK:mock] dev-режим: SDK Яндекса не ждём')
    return createMockSdk()
  }
  const real = await createRealSdk(YA_GAMES_TIMEOUT_MS)
  return real ?? createMockSdk()
}
