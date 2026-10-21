import { normalizeWord } from './levels'

// Константы формулы — правятся без изменения механики (GDD §4)
export const POINTS_PER_LETTER = 5
export const BONUS_MULTIPLIER = 2

// Очки за одно слово: длина × 5, бонусное × 2.
// Длина считается по нормализованному слову (верхний регистр, Ё→Е, без
// окружающих пробелов) — длина при нормализации не меняется, но пробелы
// по краям не должны попадать в очки.
export function scoreWord(word: string, isBonus: boolean): number {
  const length = Array.from(normalizeWord(word)).length
  const base = length * POINTS_PER_LETTER
  return isBonus ? base * BONUS_MULTIPLIER : base
}

// Звёзды — мера полноты (GDD §4):
// 1 ★ — все основные найдены; 2 ★★ — + хотя бы одно бонусное;
// 3 ★★★ — все слова, включая все бонусные.
// ВРЕМЕННОЕ правило для тестовых наборов без бонусных (totalBonus === 0):
// все основные найдены → 3 ★. Финальные остановки всегда содержат 2–3 бонусных.
export function starsFor(
  guessedMain: number,
  totalMain: number,
  guessedBonus: number,
  totalBonus: number,
): 1 | 2 | 3 {
  // Остановка не завершена (найдено меньше основных, чем всего) — 1 ★,
  // независимо от найденных бонусных.
  if (guessedMain < totalMain) {
    return 1
  }

  // Временное правило: в тестовых наборах бонусных нет вовсе — сразу 3 ★
  // (иначе на остановках без бонусных нельзя было бы получить 3 ★).
  if (totalBonus === 0) {
    return 3
  }

  // Найдены все бонусные — 3 ★
  if (guessedBonus >= totalBonus) {
    return 3
  }

  // Найдено хотя бы одно бонусное, но не все — 2 ★
  if (guessedBonus >= 1) {
    return 2
  }

  // Все основные найдены, бонусные — нет — 1 ★
  // Граничный случай 0/0 (totalMain === 0, totalBonus === 0): набор пуст,
  // загрузчик levels.ts такие данные отвергает; формально основные
  // «найдены все», поэтому по правилу totalBonus === 0 → 3 ★.
  return 1
}
