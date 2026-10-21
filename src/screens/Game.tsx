import { useEffect, useMemo, useReducer } from 'react'
import type { CSSProperties } from 'react'
import { getSdk } from '../sdk'
import WordsGrid from '../components/WordsGrid'
import { createGameReducer, createGameState } from '../game/reducer'
import { normalizeWord } from '../game/levels'
import type { StopData } from '../game/types'
import { fillTemplate, strings } from '../strings'
import './Game.css'

interface GameProps {
  stop: StopData
  onExit: () => void
}

// Слотов в поле текущего слова — столько же, сколько букв в колесе
const SLOTS_COUNT = 7
// Шаг между плитками колеса (градусы)
const WHEEL_STEP_DEG = 360 / 7
// Через сколько миллисекунд гаснет строка статуса
const STATUS_TIMEOUT_MS = 4000
// Буква с клавиатуры (Ё нормализуется в Е)
const LETTER_RE = /^[а-яёА-ЯЁ]$/

// Стиль плитки с углом --a (кастомное свойство не входит в CSSProperties)
type WheelStyle = CSSProperties & { '--a': string }

// Первая свободная плитка с такой буквой; null — такой буквы больше нет
function findFreeTile(
  letters: string[],
  used: number[],
  letter: string,
): number | null {
  const busy = new Set(used)
  for (let index = 0; index < letters.length; index += 1) {
    if (letters[index] === letter && !busy.has(index)) {
      return index
    }
  }
  return null
}

export default function Game({ stop, onExit }: GameProps) {
  // Редьюсер привязан к остановке: пересоздаётся только при смене stop
  const reducer = useMemo(() => createGameReducer(stop), [stop])
  const [state, dispatch] = useReducer(reducer, stop, createGameState)
  // Номер последнего события (вспышки) и его вид — для статуса и анимаций
  const flashSeq = state.flash?.seq ?? 0
  const flashKind = state.flash?.kind ?? 'none'

  // Ввод с физической клавиатуры равен тапу по плитке
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        dispatch({ type: 'ERASE' })
        return
      }
      if (event.key === 'Enter') {
        // Enter на кнопке — это её нажатие, не «Принять»
        if (event.target instanceof HTMLButtonElement) {
          return
        }
        event.preventDefault()
        dispatch({ type: 'ACCEPT' })
        return
      }
      if (!LETTER_RE.test(event.key)) {
        return
      }
      const letter = normalizeWord(event.key)
      const index = findFreeTile(stop.letters, state.used, letter)
      if (index === null) {
        return
      }
      event.preventDefault()
      dispatch({ type: 'TAP_TILE', index })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state.used, stop.letters])

  // Сигналы платформе: геймплей начался / закончился
  useEffect(() => {
    let active = true
    getSdk()
      .then((sdk) => {
        if (active) {
          sdk.gameplayStart()
        }
      })
      .catch((error: unknown) => {
        console.warn('[game] сигнал gameplayStart не отправлен', error)
      })
    return () => {
      active = false
      getSdk()
        .then((sdk) => sdk.gameplayStop())
        .catch((error: unknown) => {
          console.warn('[game] сигнал gameplayStop не отправлен', error)
        })
    }
  }, [])

  // Строка статуса гаснет сама; новая попытка сбрасывает таймер
  useEffect(() => {
    if (state.statusKey === null) {
      return
    }
    const timer = window.setTimeout(() => {
      dispatch({ type: 'CLEAR_STATUS' })
    }, STATUS_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [state.statusKey, flashSeq])

  const statusText =
    state.statusKey === null ? '' : strings.game[state.statusKey]
  const title = fillTemplate(strings.game.title, {
    n: stop.id,
    city: stop.city,
  })
  const progress = fillTemplate(strings.game.progress, {
    n: state.guessedMain.length,
    N: stop.main.length,
  })
  const score = fillTemplate(strings.game.score, { score: state.score })
  const word = Array.from(state.current)
  const slots = Array.from(
    { length: SLOTS_COUNT },
    (_, index) => word[index] ?? '',
  )

  return (
    <div className="game">
      <header className="game__header">
        <button
          type="button"
          className="btn btn-ghost game__back"
          onClick={onExit}
        >
          {strings.game.back}
        </button>
        <h1 className="game__title">{title}</h1>
        <div className="game__meta">
          <span className="game__progress">{progress}</span>
          <span className="game__score">{score}</span>
        </div>
      </header>

      {/* key по flash.seq — одинаковые события подряд перезапускают анимацию */}
      <div className="game__word" key={flashSeq} data-flash={flashKind}>
        <div
          className="game__slots"
          role="group"
          aria-label={strings.game.slots}
        >
          {slots.map((letter, index) => (
            <span
              className={letter === '' ? 'slot' : 'slot slot--filled'}
              key={index}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>

      <p
        className="game__status"
        role="status"
        aria-live="polite"
        data-flash={flashKind}
      >
        {statusText}
      </p>

      <div className="wheel" role="group" aria-label={strings.game.letters}>
        {stop.letters.map((letter, index) => {
          const isUsed = state.used.includes(index)
          const style: WheelStyle = {
            '--a': `${(-90 + index * WHEEL_STEP_DEG).toFixed(2)}deg`,
          }
          return (
            <button
              type="button"
              key={`${letter}-${index}`}
              className={isUsed ? 'wheel__btn is-used' : 'wheel__btn'}
              style={style}
              disabled={isUsed}
              onClick={() => dispatch({ type: 'TAP_TILE', index })}
            >
              {letter}
            </button>
          )
        })}
      </div>

      <div className="game__actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => dispatch({ type: 'ERASE' })}
        >
          {strings.game.erase}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => dispatch({ type: 'ACCEPT' })}
        >
          {strings.game.accept}
        </button>
      </div>

      {/* Сетка слов — часть экрана остановки (ГДД §3, п. 3).
          Размер сетки не зависит от числа найденных слов — колесо не сдвигается. */}
      <WordsGrid
        main={stop.main}
        guessedMain={state.guessedMain}
        guessedBonus={state.guessedBonus}
        flash={state.flash}
      />
    </div>
  )
}
