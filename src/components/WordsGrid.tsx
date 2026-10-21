import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { FlashKind } from '../game/reducer'
import { fillTemplate, strings } from '../strings'
import './WordsGrid.css'

interface WordsGridProps {
  main: readonly string[]
  guessedMain: readonly string[]
  guessedBonus: readonly string[]
  // Последнее событие редьюсера: вид и порядковый номер (триггер анимаций)
  flash: { kind: FlashKind; seq: number } | null
}

// Группа слов одной длины
interface WordGroup {
  length: number
  words: string[]
}

// Стиль ячейки: кастомное свойство --i — номер буквы в слове (задержка анимации)
type CellStyle = CSSProperties & { '--i': string }

// Сортировка по русскому алфавиту (Ё — после Е, как в азбуке)
function byRussianAlphabet(a: string, b: string): number {
  return a.localeCompare(b, 'ru')
}

// Группировка слов по длине: уникальные длины по возрастанию, внутри группы —
// слова по алфавиту. Считается один раз на набор слов (useMemo), а не при
// каждом рендере.
function groupByLength(words: readonly string[]): WordGroup[] {
  const byLength = new Map<number, string[]>()
  for (const word of words) {
    const length = Array.from(word).length
    const group = byLength.get(length)
    if (group) {
      group.push(word)
    } else {
      byLength.set(length, [word])
    }
  }
  return Array.from(byLength.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([length, groupWords]) => ({
      length,
      words: [...groupWords].sort(byRussianAlphabet),
    }))
}

export default function WordsGrid({
  main,
  guessedMain,
  guessedBonus,
  flash,
}: WordsGridProps) {
  const groups = useMemo(() => groupByLength(main), [main])
  const foundMain = useMemo(() => new Set(guessedMain), [guessedMain])

  // Слово, найденное последним: слова дописываются в список в порядке
  // принятия, поэтому это последний элемент. Анимируется только оно.
  const popWord =
    flash?.kind === 'ok' ? (guessedMain[guessedMain.length - 1] ?? '') : ''
  const flashSeq = flash?.seq ?? 0

  return (
    <section className="grid">
      <h2 className="grid__title">{strings.grid.title}</h2>

      <div className="grid__groups">
        {groups.map((group) => (
          <div className="grid__group" key={group.length}>
            <h3 className="grid__group-title">
              {fillTemplate(strings.grid.group, { n: group.length })}
            </h3>
            <ul className="grid__rows">
              {group.words.map((word, rowIndex) => {
                const isFound = foundMain.has(word)
                const isPop = isFound && word === popWord
                // Найденное слово — строчными (скринридер не читает капс
                // по буквам), ненайденный ряд — с номером, чтобы ряды
                // различались для скринридера.
                const label = isFound
                  ? word.toLowerCase()
                  : fillTemplate(strings.grid.rowHidden, {
                      n: group.length,
                      i: rowIndex + 1,
                    })
                return (
                  <li className="grid__row" key={word} aria-label={label}>
                    {Array.from(word).map((letter, index) => {
                      const style: CellStyle = { '--i': String(index) }
                      // key с seq — одинаковые события подряд перезапускают pop
                      const cellKey = isPop
                        ? `${index}-${flashSeq}`
                        : String(index)
                      const className = isPop
                        ? 'grid__cell grid__cell--found grid__cell--pop'
                        : isFound
                          ? 'grid__cell grid__cell--found'
                          : 'grid__cell'
                      return (
                        <span
                          className={className}
                          style={style}
                          key={cellKey}
                          aria-hidden="true"
                        >
                          {isFound ? letter : strings.grid.placeholder}
                        </span>
                      )
                    })}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {guessedBonus.length > 0 && (
        <div className="grid__bonus">
          <h3 className="grid__bonus-title">{strings.grid.bonusTitle}</h3>
          <ul className="grid__chips">
            {guessedBonus.map((word) => (
              <li className="grid__chip" key={word}>
                <span className="grid__chip-word">{word}</span>
                <span className="grid__chip-label">
                  {strings.grid.bonusLabel}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
