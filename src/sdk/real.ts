// Реальная обёртка над официальным Yandex Games SDK.
// ВАЖНО: все обращения к window.YaGames — ТОЛЬКО в этом файле.

import type { ISdk, PlayerData } from './types'

// Минимальные типы структур официального SDK — только то, чем мы пользуемся.
// Без any: возможные расхождения с реальным API гасятся try/catch и
// optional chaining, а не роняют игру.

interface YaGamesPlayerApi {
  getData(): Promise<Record<string, unknown>>
  setData(data: Record<string, unknown>, flush?: boolean): Promise<void>
  getName(): string
  getPhoto(): string | null
}

interface YaGamesAdvApi {
  showRewardedVideo(callbacks: {
    onRewarded?: () => void
    onClose?: () => void
    onError?: (error: unknown) => void
  }): void
  showFullscreenAdv(callbacks: {
    onClose?: (wasShown: boolean) => void
    onError?: (error: unknown) => void
  }): void
}

interface YaGamesSdkInstance {
  player(): YaGamesPlayerApi
  adv?: YaGamesAdvApi
  features?: { LoadingAPI?: { ready: () => void } }
  deviceInfo?: { isMobile?: () => boolean }
  environment?: { i18n?: { lang?: string } }
  leaderboards?: {
    setScore?(
      leaderboardName: string,
      score: number,
      extraData?: string,
    ): Promise<void>
  }
  payments?: {
    purchase?(data: { id: string }): Promise<unknown>
    getPurchases?(): Promise<unknown>
  }
  gameplayStart?: () => void
  gameplayStop?: () => void
}

interface YaGamesGlobal {
  ready(): Promise<YaGamesSdkInstance>
}

declare global {
  interface Window {
    YaGames?: YaGamesGlobal
  }
}

// Как часто опрашиваем появление window.YaGames при загрузке страницы
const POLL_INTERVAL_MS = 50

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Ждёт появления window.YaGames (sdk.js может загружаться с задержкой)
async function waitForYaGames(
  timeoutMs: number,
): Promise<YaGamesGlobal | null> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const yaGames = window.YaGames
    if (yaGames) return yaGames
    await delay(POLL_INTERVAL_MS)
  }
  return window.YaGames ?? null
}

function createSdk(ysdk: YaGamesSdkInstance): ISdk {
  // Игрока кешируем: повторный player() мог бы сбросить состояние сессии
  let player: YaGamesPlayerApi | null = null
  function getPlayerApi(): YaGamesPlayerApi {
    if (!player) player = ysdk.player()
    return player
  }

  return {
    async init() {
      // Сообщаем платформе, что игра загрузилась (если API доступен)
      ysdk.features?.LoadingAPI?.ready?.()
    },

    async getPlayer(): Promise<PlayerData> {
      const p = getPlayerApi()
      return {
        name: p.getName(),
        avatar: p.getPhoto(),
      }
    },

    async loadData<T>(): Promise<T | null> {
      try {
        const data = await getPlayerApi().getData()
        // Пустой объект означает «сохранений нет»
        return Object.keys(data).length > 0 ? (data as unknown as T) : null
      } catch {
        // Оффлайн или гость без прав: сохранения недоступны — не роняем игру
        return null
      }
    },

    async saveData<T>(data: T): Promise<void> {
      try {
        await getPlayerApi().setData(
          data as unknown as Record<string, unknown>,
          true,
        )
      } catch {
        // Облачное сохранение недоступно — игра продолжает работу без него
      }
    },

    showRewarded(): Promise<boolean> {
      return new Promise((resolve) => {
        const adv = ysdk.adv
        if (!adv) {
          resolve(false)
          return
        }
        let earned = false
        adv.showRewardedVideo({
          onRewarded: () => {
            earned = true
          },
          onClose: () => resolve(earned),
          onError: () => resolve(false),
        })
      })
    },

    showInterstitial(): Promise<'shown' | 'unavailable'> {
      return new Promise((resolve) => {
        const adv = ysdk.adv
        if (!adv) {
          resolve('unavailable')
          return
        }
        adv.showFullscreenAdv({
          onClose: (wasShown) => resolve(wasShown ? 'shown' : 'unavailable'),
          onError: () => resolve('unavailable'),
        })
      })
    },

    gameplayStart() {
      ysdk.gameplayStart?.()
    },

    gameplayStop() {
      ysdk.gameplayStop?.()
    },

    ready() {
      try {
        ysdk.features?.LoadingAPI?.ready()
      } catch {
        // Сигнал загрузки недоступен — игра продолжает работу
      }
    },

    lang(): string {
      // Дока: yandex.ru/dev/games/doc/ru/sdk/sdk-environment.md, «Структура i18n»
      try {
        return ysdk.environment?.i18n?.lang ?? 'ru'
      } catch {
        return 'ru'
      }
    },

    isMobile(): boolean {
      // Дока: yandex.ru/dev/games/doc/ru/sdk/sdk-params.md, «Объект deviceInfo»
      try {
        return ysdk.deviceInfo?.isMobile?.() ?? false
      } catch {
        return false
      }
    },

    async setScore(boardId: string, score: number): Promise<void> {
      // Дока: yandex.ru/dev/games/doc/ru/sdk/sdk-leaderboard.md, «Инициализация»:
      // устаревший ysdk.getLeaderboards() → ysdk.leaderboards.setScore()
      try {
        await ysdk.leaderboards?.setScore?.(boardId, score)
      } catch {
        // Лидерборд не создан в Консоли (404) или оффлайн — не роняем игру
      }
    },

    async purchase(id: string): Promise<void> {
      // Дока: yandex.ru/dev/games/doc/ru/sdk/sdk-purchases.md, «Активация
      // процесса покупки»: ysdk.payments.purchase({ id })
      try {
        await ysdk.payments?.purchase?.({ id })
      } catch {
        // Отмена покупки игроком или платежи недоступны — не роняем игру
      }
    },

    async hasPurchase(id: string): Promise<boolean> {
      // Дока: yandex.ru/dev/games/doc/ru/sdk/sdk-purchases.md, «Получение
      // списка купленных товаров»: payments.getPurchases() → IPurchase[]
      try {
        const purchases: unknown = await ysdk.payments?.getPurchases?.()
        if (!Array.isArray(purchases)) return false
        return purchases.some(
          (item: unknown) =>
            typeof item === 'object' &&
            item !== null &&
            'productID' in item &&
            item.productID === id,
        )
      } catch {
        return false
      }
    },
  }
}

/**
 * Пытается создать реальный SDK: ждёт window.YaGames не дольше timeoutMs,
 * затем вызывает YaGames.ready(). Возвращает null, если SDK не появился
 * или произошла ошибка — тогда фабрика уйдёт в mock.
 */
export async function createRealSdk(timeoutMs: number): Promise<ISdk | null> {
  try {
    const yaGames = await waitForYaGames(timeoutMs)
    if (!yaGames) return null
    const ysdk = await yaGames.ready()
    return createSdk(ysdk)
  } catch {
    return null
  }
}
