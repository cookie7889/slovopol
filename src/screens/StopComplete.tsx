import { useMemo, useReducer, useState } from 'react'
import Stars from '../components/Stars'
import { getSdk } from '../sdk'
import { createGameReducer } from '../game/reducer'
import type { GameState } from '../game/reducer'
import { starsFor } from '../game/score'
import type { StopData } from '../game/types'
import { fillTemplate, strings } from '../strings'
import './StopComplete.css'

interface StopCompleteProps {
  stop: StopData
  // Итог остановки на момент завершения: очки, найденные слова, флаг удвоения
  result: GameState
  // Всего очков за сессию (считает App)
  total: number
  // Есть ли следующая остановка маршрута
  hasNext: boolean
  // Сообщить App новое значение очков остановки (после удвоения)
  onDouble: (stopId: number, doubledScore: number) => void
  onNext: () => void
  onMenu: () => void
}

export default function StopComplete({
  stop,
  result,
  total,
  hasNext,
  onDouble,
  onNext,
  onMenu,
}: StopCompleteProps) {
  // Редьюсер тот же, что на экране остановки: действие DOUBLE удваивает очки
  const reducer = useMemo(() => createGameReducer(stop), [stop])
  const [state, dispatch] = useReducer(reducer, result)
  // Показ rewarded — асинхронный: на время ожидания кнопку гасим
  const [pending, setPending] = useState(false)
  // Реклама не показана: очки не трогаем, кнопка остаётся доступной (ГДД §1)
  const [adFailed, setAdFailed] = useState(false)

  const stars = starsFor(
    state.guessedMain.length,
    stop.main.length,
    state.guessedBonus.length,
    stop.bonus.length,
  )

  // Удвоение очков — только по явному действию игрока и только один раз
  async function handleDouble() {
    if (state.doubled || pending) {
      return
    }
    setPending(true)
    setAdFailed(false)
    try {
      const sdk = await getSdk()
      const rewarded = await sdk.showRewarded()
      if (!rewarded) {
        setPending(false)
        setAdFailed(true)
        return
      }
      if (state.doubled) {
        setPending(false)
        return
      }
      dispatch({ type: 'DOUBLE' })
      onDouble(stop.id, state.score * 2)
      setPending(false)
    } catch (error: unknown) {
      console.warn('[complete] rewarded не показан', error)
      setPending(false)
      setAdFailed(true)
    }
  }

  const scoreText = fillTemplate(strings.complete.scoreLabel, {
    score: state.score,
  })
  const totalText = fillTemplate(strings.complete.totalLabel, { total })

  return (
    <div className="complete">
      <h1 className="complete__title">{strings.complete.title}</h1>

      <Stars count={stars} />

      <h2 className="complete__city">{stop.city}</h2>
      <p className="complete__fact">{stop.fact}</p>

      <div className="complete__scores">
        <p className="complete__score">{scoreText}</p>
        <p className="complete__total">{totalText}</p>
      </div>

      <div className="complete__actions">
        <button
          type="button"
          className="btn btn-primary complete__double"
          onClick={() => {
            void handleDouble()
          }}
          disabled={state.doubled || pending}
        >
          {state.doubled ? strings.complete.doubled : strings.complete.double}
        </button>

        <p className="complete__ad" role="status">
          {adFailed ? strings.complete.adUnavailable : ''}
        </p>

        {/* Здесь interstitial по ГДД §10 (не раньше 2-й остановки и не в первые
            3 минуты) — подключается в неделю 3 вместе с картой маршрута. */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={hasNext ? onNext : onMenu}
        >
          {hasNext ? strings.complete.next : strings.complete.toMenu}
        </button>

        {hasNext ? null : (
          <p className="complete__route">{strings.complete.routeFinished}</p>
        )}

        <button
          type="button"
          className="btn btn-ghost complete__back"
          onClick={onMenu}
        >
          {strings.complete.back}
        </button>
      </div>
    </div>
  )
}
