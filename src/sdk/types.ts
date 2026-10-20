// Типы обёртки Yandex Games SDK.
// Остальной код приложения знает ТОЛЬКО эти типы и не трогает window.YaGames.

export interface PlayerData {
  name: string
  avatar: string | null
}

export interface ISdk {
  /** Инициализация: резолвится, когда SDK готов к работе */
  init(): Promise<void>
  /** Данные игрока (имя и аватар) */
  getPlayer(): Promise<PlayerData>
  /** Загрузка сохранённых данных; null — если сохранений нет или ошибка */
  loadData<T>(): Promise<T | null>
  /** Сохранение данных */
  saveData<T>(data: T): Promise<void>
  /** Реклама с наградой: true — награда засчитана (onRewarded сработал) */
  showRewarded(): Promise<boolean>
  /** Межстраничная реклама: 'shown' — показана, 'unavailable' — не показать */
  showInterstitial(): Promise<'shown' | 'unavailable'>
  /** Сигнал платформе: начался геймплей (ограничения на рекламу сняты) */
  gameplayStart(): void
  /** Сигнал платформе: геймплей остановлен */
  gameplayStop(): void
}
