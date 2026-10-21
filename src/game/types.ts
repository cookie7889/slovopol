// Данные одной остановки. Ё в данных запрещена: нормализуется в Е при загрузке
export interface StopData {
  id: number
  city: string
  fact: string // ≤180 символов, тон «приятель-проводник»
  letters: string[] // ровно 7, все уникальные, ГДД §2
  main: string[] // основные слова, сущ. им.п. ед.ч.
  bonus: string[] // бонусные (редкие) слова
}

export interface LevelsFile {
  version: number
  stops: StopData[]
}
