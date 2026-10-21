import { useState } from 'react'
import { getStop, getStopIds } from './game/levels'
import type { GameState } from './game/reducer'
import { fillTemplate, strings } from './strings'
import Game from './screens/Game'
import StopComplete from './screens/StopComplete'
import './styles/base.css'

// Временная навигация: меню-заглушка и экраны остановки/итогов.
// Итоговый Home-экран с картой появится в W3-1.
type Screen =
  | { name: 'menu' }
  | { name: 'game'; stopId: number }
  | { name: 'complete'; stopId: number; result: GameState }

function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' })
  const [total, setTotal] = useState(0)
  // Чтобы не добавлять очки при удвоении дважды — запоминаем базу по остановке
  const [baseByStop, setBaseByStop] = useState<Record<number, number>>({})

  if (screen.name === 'game') {
    const stop = getStop(screen.stopId)
    return (
      <Game
        key={stop.id}
        stop={stop}
        onExit={() => setScreen({ name: 'menu' })}
        onComplete={(result) => {
          // Добавляем очки остановки при первом завершении
          setBaseByStop((prev) => {
            if (prev[stop.id] !== undefined) {
              return prev
            }
            setTotal((t) => t + result.score)
            return { ...prev, [stop.id]: result.score }
          })
          setScreen({ name: 'complete', stopId: stop.id, result })
        }}
      />
    )
  }

  if (screen.name === 'complete') {
    const stop = getStop(screen.stopId)
    const stopIds = getStopIds()
    const hasNext = stopIds.includes(stop.id + 1)
    return (
      <StopComplete
        key={stop.id}
        stop={stop}
        result={screen.result}
        total={total}
        hasNext={hasNext}
        onDouble={(stopId) => {
          // «ещё раз при удвоении»: добавляем базовый счёт остановки
          const base = baseByStop[stopId]
          if (base === undefined) {
            return
          }
          // Добавляем только разницу базовый счёт (ещё раз) — без двойного начисления
          setTotal((t) => t + base)
          // Помечаем, что базу уже учли повторно
          setBaseByStop((prev) => ({ ...prev, [stopId]: base * 1000 }))
        }}
        onNext={() => {
          setScreen({ name: 'game', stopId: stop.id + 1 })
        }}
        onMenu={() => setScreen({ name: 'menu' })}
      />
    )
  }

  // Заглушка навигации до W3-1: список остановок вместо карты
  return (
    <div className="menu">
      <h1 className="menu__title">{strings.menu.title}</h1>
      <p className="menu__hint">{strings.menu.pickStop}</p>
      <ul className="menu__list">
        {getStopIds().map((id) => {
          const stop = getStop(id)
          const label = fillTemplate(strings.menu.stop, {
            n: stop.id,
            city: stop.city,
          })
          return (
            <li key={stop.id}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setScreen({ name: 'game', stopId: stop.id })}
              >
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default App
