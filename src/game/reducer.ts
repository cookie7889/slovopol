// Состояние экрана остановки и редьюсер.
// Модуль чистый: без React, без DOM, без мутаций. Reducer — замыкание на
// StopData (создаётся фабрикой createGameReducer), чтобы в actions не тащить
// данные остановки и не хранить их в состоянии.

import type { StopData } from './types'
import { checkWord } from './checkWord'
import { scoreWord } from './score'

// Ключи строк статуса. Тексты — в src/strings.ts (game.status*).
export type StatusKey =
  | 'statusShort'
  | 'statusCorrect'
  | 'statusBonus'
  | 'statusDuplicate'
  | 'statusUnknown'

// Тип вспышки: ok — верное слово, bonus — бонусное, bad — ошибка,
// soft — мягкая подсказка (без тряски, GDD §3).
export type FlashKind = 'ok' | 'bonus' | 'bad' | 'soft'

export interface GameState {
  stopId: number
  current: string // набираемое слово (нормализованное)
  used: number[] // индексы занятых плиток для current
  guessed: Set<string> // main + bonus, найденные здесь
  guessedMain: string[]
  guessedBonus: string[]
  score: number // очки остановки (с учётом удвоения)
  doubled: boolean // «Удвоить» уже применено
  statusKey: StatusKey | null // ключ строки статуса для aria-live
  flash: { kind: FlashKind; seq: number } | null
  // seq — монотонный счётчик: различать одинаковые события подряд
  flashSeq: number // счётчик событий (монотонный, не обнуляется)
}

export type GameAction =
  | { type: 'TAP_TILE'; index: number }
  | { type: 'ERASE' }
  | { type: 'ACCEPT' }
  | { type: 'CLEAR_STATUS' }
  // Удвоение очков остановки (после просмотра рекламы)
  | { type: 'DOUBLE' }

// Минимальная длина слова (ГДД §2: слова 3–7 букв)
const MIN_WORD_LENGTH = 3

// Начальное состояние остановки
export function createGameState(stop: StopData): GameState {
  return {
    stopId: stop.id,
    current: '',
    used: [],
    guessed: new Set<string>(),
    guessedMain: [],
    guessedBonus: [],
    score: 0,
    doubled: false,
    statusKey: null,
    flash: null,
    flashSeq: 0,
  }
}

// Редьюсер остановки. Чистая функция: тот же state + action → новый state.
export type GameReducer = (state: GameState, action: GameAction) => GameState

export function createGameReducer(stop: StopData): GameReducer {
  return function reduce(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'TAP_TILE':
        return tapTile(state, action.index, stop)
      case 'ERASE':
        return eraseLast(state)
      case 'ACCEPT':
        return accept(state, stop)
      case 'CLEAR_STATUS':
        // Текст статуса гаснет, последняя вспышка остаётся (её использует
        // анимация W2-4), счётчик событий не обнуляется.
        return state.statusKey === null ? state : { ...state, statusKey: null }
      case 'DOUBLE':
        // Повторное удвоение запрещено: флаг doubled необратим.
        return state.doubled
          ? state
          : { ...state, score: state.score * 2, doubled: true }
      default:
        return state
    }
  }
}

// Тап по плитке: буква добавляется в набираемое слово, если плитка свободна
function tapTile(state: GameState, index: number, stop: StopData): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= stop.letters.length) {
    return state
  }
  if (state.used.includes(index)) {
    return state
  }
  return {
    ...state,
    current: state.current + stop.letters[index],
    used: [...state.used, index],
  }
}

// Стереть последнюю букву: плитка возвращается в колесо
function eraseLast(state: GameState): GameState {
  if (state.current.length === 0) {
    return state
  }
  return {
    ...state,
    current: state.current.slice(0, -1),
    used: state.used.slice(0, -1),
  }
}

// Проверка набранного слова и начисление очков
function accept(state: GameState, stop: StopData): GameState {
  if (state.current.length < MIN_WORD_LENGTH) {
    // Слишком коротко: слово остаётся в поле, можно дописать
    return withStatus(state, 'statusShort', 'bad')
  }

  const result = checkWord(state.current, stop, state.guessed)

  if (result.status === 'correct' || result.status === 'bonus') {
    const isBonus = result.status === 'bonus'
    const guessed = new Set(state.guessed)
    guessed.add(result.word)
    return withStatus(
      {
        ...state,
        guessed,
        guessedMain: isBonus
          ? state.guessedMain
          : [...state.guessedMain, result.word],
        guessedBonus: isBonus
          ? [...state.guessedBonus, result.word]
          : state.guessedBonus,
        score: state.score + scoreWord(result.word, isBonus),
        current: '',
        used: [],
      },
      isBonus ? 'statusBonus' : 'statusCorrect',
      isBonus ? 'bonus' : 'ok',
    )
  }

  if (result.status === 'duplicate') {
    // Уже найдено: мягко, без тряски. Поле очищаем — слово больше не нужно.
    return withStatus(
      { ...state, current: '', used: [] },
      'statusDuplicate',
      'soft',
    )
  }

  // Слова нет: поле очищаем, чтобы можно было начать заново
  return withStatus({ ...state, current: '', used: [] }, 'statusUnknown', 'bad')
}

// Обновить статус и записать событие (вспышку) с новым порядковым номером
function withStatus(
  state: GameState,
  statusKey: StatusKey,
  kind: FlashKind,
): GameState {
  const flashSeq = state.flashSeq + 1
  return {
    ...state,
    statusKey,
    flash: { kind, seq: flashSeq },
    flashSeq,
  }
}
