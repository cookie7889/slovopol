import type { StopData } from './types'
import { normalizeWord } from './levels'

export type WordStatus = 'correct' | 'bonus' | 'duplicate' | 'invalid'

export interface CheckResult {
  status: WordStatus
  word: string // нормализованное слово (upper, Ё→Е)
  reason?: 'short' | 'letters' | 'unknown' // только для status='invalid'
}

// Минимальная длина слова (ГДД §2: слова 3–7 букв)
const MIN_WORD_LENGTH = 3

// Проверка слова остановки. Чистая функция: React, DOM и мутации — нет.
// Порядок проверок зафиксирован: длина → кратность букв → дубликат →
// наличие в main → наличие в bonus → неизвестное слово.
// raw — что набрал игрок (любой регистр, может содержать Ё).
// guessed — уже найденные слова остановки (нормализованные).
export function checkWord(
  raw: string,
  stop: StopData,
  guessed: ReadonlySet<string>,
): CheckResult {
  const word = normalizeWord(raw)

  // 1) Слишком короткое слово
  if (Array.from(word).length < MIN_WORD_LENGTH) {
    return { status: 'invalid', word, reason: 'short' }
  }

  // 2) Кратность букв: каждая буква слова есть в наборе, повторов нет.
  // Набор уникален (ГДД §2), поэтому повтор в слове всегда лишний.
  const available = new Set(stop.letters)
  const used = new Set<string>()
  for (const letter of Array.from(word)) {
    if (!available.has(letter) || used.has(letter)) {
      return { status: 'invalid', word, reason: 'letters' }
    }
    used.add(letter)
  }

  // 3) Слово уже найдено
  if (guessed.has(word)) {
    return { status: 'duplicate', word }
  }

  // 4) Основное слово остановки
  if (stop.main.includes(word)) {
    return { status: 'correct', word }
  }

  // 5) Бонусное (редкое) слово
  if (stop.bonus.includes(word)) {
    return { status: 'bonus', word }
  }

  // 6) Слова нет в остановке
  return { status: 'invalid', word, reason: 'unknown' }
}
