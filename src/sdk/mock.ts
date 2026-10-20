// Полная имитация SDK для локальной разработки:
// работает без интернета и без Яндекса, все вызовы пишут в консоль [SDK:mock]

import type { ISdk, PlayerData } from './types'

const LOG_PREFIX = '[SDK:mock]'

// Ключ локального сохранения (только для mock)
const STORAGE_KEY = 'slovopol:save'

export function createMockSdk(): ISdk {
  return {
    async init() {
      console.log(LOG_PREFIX, 'init')
    },

    async getPlayer(): Promise<PlayerData> {
      console.log(LOG_PREFIX, 'getPlayer')
      return { name: 'Тестер', avatar: null }
    },

    async loadData<T>(): Promise<T | null> {
      console.log(LOG_PREFIX, 'loadData')
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw !== null ? (JSON.parse(raw) as T) : null
      } catch {
        // Повреждённое сохранение — считаем, что его нет
        return null
      }
    },

    async saveData<T>(data: T): Promise<void> {
      console.log(LOG_PREFIX, 'saveData', data)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    },

    showRewarded(): Promise<boolean> {
      console.log(LOG_PREFIX, 'showRewarded')
      // Имитация показа: через 0.5с награда «засчитана»
      return new Promise((resolve) => setTimeout(() => resolve(true), 500))
    },

    async showInterstitial(): Promise<'shown' | 'unavailable'> {
      console.log(LOG_PREFIX, 'showInterstitial')
      return 'shown'
    },

    gameplayStart() {
      console.log(LOG_PREFIX, 'gameplayStart')
    },

    gameplayStop() {
      console.log(LOG_PREFIX, 'gameplayStop')
    },

    ready() {
      console.log(LOG_PREFIX, 'ready')
    },

    lang(): string {
      console.log(LOG_PREFIX, 'lang', 'ru')
      return 'ru'
    },

    isMobile(): boolean {
      console.log(LOG_PREFIX, 'isMobile', false)
      return false
    },

    async setScore(boardId: string, score: number): Promise<void> {
      console.log(LOG_PREFIX, 'setScore', boardId, score)
    },

    async purchase(id: string): Promise<void> {
      console.log(LOG_PREFIX, 'purchase', id)
    },

    async hasPurchase(id: string): Promise<boolean> {
      console.log(LOG_PREFIX, 'hasPurchase', id)
      return false
    },
  }
}
