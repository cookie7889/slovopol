import rawLevels from '../data/levels.json'
import type { LevelsFile, StopData } from './types'

// Нормализация строки: верхний регистр + Ё→Е
export function normalizeWord(raw: string): string {
  return raw.trim().toUpperCase().replaceAll('Ё', 'Е')
}

// Инварианты данных (ГДД §2 и комментарии в types.ts)
const LETTERS_COUNT = 7
const MIN_WORD_LENGTH = 3
const MAX_WORD_LENGTH = 7
const MAX_FACT_LENGTH = 180
const CYRILLIC_RE = /^[А-Я]+$/

// Тип-guard без any: Array.isArray иначе сужает unknown до any[]
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

// Разбор списка слов: строки 3–7 букв из А-Я, нормализованные (верхний регистр, Ё→Е)
function parseWords(
  value: unknown,
  field: string,
  label: string,
  problems: string[],
): string[] {
  if (!isUnknownArray(value)) {
    problems.push(`${label}: ${field} должен быть массивом`)
    return []
  }
  const words: string[] = []
  value.forEach((item, index) => {
    if (typeof item !== 'string') {
      problems.push(`${label}: ${field}[${index}] — не строка`)
      return
    }
    const word = normalizeWord(item)
    const length = Array.from(word).length
    if (length < MIN_WORD_LENGTH || length > MAX_WORD_LENGTH) {
      problems.push(
        `${label}: ${field}[${index}] «${word}» — длина ${length}, нужно ${MIN_WORD_LENGTH}–${MAX_WORD_LENGTH}`,
      )
      return
    }
    if (!CYRILLIC_RE.test(word)) {
      problems.push(`${label}: ${field}[${index}] «${word}» — только буквы А-Я`)
      return
    }
    words.push(word)
  })
  return words
}

// Разбор одной остановки. null — остановка с проблемами (проблемы уже в problems)
function parseStop(
  value: unknown,
  index: number,
  problems: string[],
): StopData | null {
  const fallbackLabel = `остановка #${index + 1}`
  if (!isRecord(value)) {
    problems.push(`${fallbackLabel}: ожидался объект остановки`)
    return null
  }

  const problemsBefore = problems.length

  const rawId = value.id
  let id = -1
  let idValid = false
  if (typeof rawId === 'number' && Number.isInteger(rawId)) {
    id = rawId
    idValid = true
  } else {
    problems.push(`${fallbackLabel}: id должен быть целым числом`)
  }
  const label = idValid ? `остановка ${id}` : fallbackLabel

  const rawCity = value.city
  let city = ''
  if (typeof rawCity === 'string' && rawCity.trim() !== '') {
    city = rawCity.trim()
  } else {
    problems.push(`${label}: city должен быть непустой строкой`)
  }

  const rawFact = value.fact
  let fact = ''
  if (typeof rawFact === 'string') {
    fact = rawFact.trim()
    if (fact.length > MAX_FACT_LENGTH) {
      problems.push(
        `${label}: fact длиннее ${MAX_FACT_LENGTH} символов (${fact.length})`,
      )
    }
  } else {
    problems.push(`${label}: fact должен быть строкой`)
  }

  const rawLetters = value.letters
  let letters: string[] = []
  if (typeof rawLetters !== 'string') {
    problems.push(
      `${label}: letters должен быть строкой из ${LETTERS_COUNT} букв`,
    )
  } else {
    const normalized = normalizeWord(rawLetters)
    const chars = Array.from(normalized)
    if (chars.length !== LETTERS_COUNT) {
      problems.push(
        `${label}: letters «${normalized}» — ${chars.length} симв. вместо ${LETTERS_COUNT}`,
      )
    }
    const wrong = chars.filter((char) => !CYRILLIC_RE.test(char))
    if (wrong.length > 0) {
      problems.push(
        `${label}: letters «${normalized}» — не буквы А-Я: ${wrong.join(', ')}`,
      )
    }
    if (new Set(chars).size !== chars.length) {
      problems.push(`${label}: letters «${normalized}» — повторяющиеся буквы`)
    }
    letters = chars
  }

  const main = parseWords(value.main, 'main', label, problems)
  if (main.length === 0) {
    problems.push(`${label}: main — пустой список слов`)
  }

  const bonus = parseWords(value.bonus, 'bonus', label, problems)

  if (problems.length > problemsBefore) {
    return null
  }

  return { id, city, fact, letters, main, bonus }
}

// Сборка и проверка файла остановок. Бросает Error, если данные битые
function buildLevels(raw: unknown): LevelsFile {
  const problems: string[] = []

  if (!isRecord(raw)) {
    console.error('levels.json: ожидался объект с полями version и stops')
    throw new Error('levels.json не прошёл проверку')
  }

  const rawVersion = raw.version
  let version = 0
  if (typeof rawVersion === 'number' && Number.isFinite(rawVersion)) {
    version = rawVersion
  } else {
    problems.push('version: ожидалось число')
  }

  const rawStops = raw.stops
  const stops: StopData[] = []
  if (!isUnknownArray(rawStops)) {
    problems.push('stops: ожидался массив остановок')
  } else if (rawStops.length === 0) {
    problems.push('stops: массив остановок пуст')
  } else {
    const ids = new Set<number>()
    rawStops.forEach((item, index) => {
      const stop = parseStop(item, index, problems)
      if (!stop) {
        return
      }
      if (ids.has(stop.id)) {
        problems.push(`остановка ${stop.id}: id повторяется`)
        return
      }
      ids.add(stop.id)
      stops.push(stop)
    })
  }

  if (problems.length > 0) {
    console.error(
      `levels.json не прошёл проверку:\n${problems
        .map((problem) => `- ${problem}`)
        .join('\n')}`,
    )
    throw new Error('levels.json не прошёл проверку')
  }

  return { version, stops }
}

// Проверка данных при импорте: битый файл роняет приложение сразу (fail fast)
export const levels: LevelsFile = buildLevels(rawLevels)

export function getStop(id: number): StopData {
  const stop = levels.stops.find((item) => item.id === id)
  if (!stop) {
    throw new Error(`Остановка ${id} не найдена`)
  }
  return stop
}

export function getStopIds(): number[] {
  return levels.stops.map((item) => item.id)
}
