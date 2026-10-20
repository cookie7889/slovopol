# Промт W2-1 — checkWord.ts: чистая функция проверки слова

**Роль:** кодер-агент OpenCode. **Проект:** «Словополь» (Vite + React + TS).
**Задача:** W2-1 из docs/plans/p2-week2-decomposition.md §2. Закрыты: AG-1, FIX-1, FIX-2, **W2-0** (в репо есть `src/game/types.ts`, `src/game/levels.ts` с `normalizeWord`, `getStop`, `getStopIds`; `src/data/levels.json` с 3 тестовыми остановками).

## Перед работой (обязательно прочитать)

1. `AGENTS.md` — команды, соглашения.
2. `docs/plans/p2-week2-decomposition.md` — §1 (сквозные ограничения) и §2, задача W2-1.
3. `docs/gdd/gdd-v1.md` — §2–3 (правила слов, таблица реакций на проверку).
4. `src/game/types.ts` и `src/game/levels.ts` — существующий код (перечитать перед написанием).

## Сквозные ограничения (кратко, полный список — §1 декомпозиции)

- TS strict: без `enum`/`namespace`/`any`/`as any`; импорт типов — `import type`.
- Чистая функция: без React, без DOM, без мутаций аргументов.
- Комментарии по-русски; код — в стиле проекта (prettier: одинарные кавычки, без `;`).
- Новые зависимости запрещены. Файлы вне задачи не трогать.

## Что сделать

Создать `src/game/checkWord.ts`.

### 1. Сигнатуры (реализация по GDD §2–3)

```ts
import type { StopData } from './types'
import { normalizeWord } from './levels'

export type WordStatus = 'correct' | 'bonus' | 'duplicate' | 'invalid'

export interface CheckResult {
  status: WordStatus
  word: string // нормализованное слово (upper, Ё→Е)
  reason?: 'short' | 'letters' | 'unknown' // только для status='invalid'
}

// raw — что набрал игрок (может быть в любом регистре, с Ё)
// guessed — уже найденные слова этой остановки (main + bonus)
export function checkWord(raw: string, stop: StopData, guessed: ReadonlySet<string>): CheckResult
```

### 2. Порядок проверок (важен, зафиксирован)

1. `normalizeWord(raw)` → длина < 3 → `invalid/short` (длина > 7 невозможна: ограничение колеса, но проверить и вернуть `short` тоже);
2. кратность букв: слово собирается из `stop.letters` без повторов (буквы набора уникальны по GDD §2, поэтому достаточно: каждая буква слова ∈ набора И повторов букв в слове нет) → иначе `invalid/letters`;
3. слово уже в `guessed` → `duplicate`;
4. слово есть в `stop.main` → `correct`;
5. слово есть в `stop.bonus` → `bonus`;
6. иначе `invalid/unknown`.

Во всех ветках возвращать нормализованное слово в `word`.

## Критерии приёмки

- [ ] Ручная проверка в dev-режиме (временно через консоль/вызов модуля) для остановки 1 (`ВОКЗАЛТ`):
  - `checkWord('вокзал', stop, empty)` → `correct`;
  - слово с Ё (например, `'ЁлКА'`-подобное из букв набора) нормализуется в Е перед проверкой;
  - `'ЗАЛ'` второй раз (в `guessed`) → `duplicate`;
  - `'ЗОНТ'` (буквы не из набора) → `invalid/letters`;
  - `'КЗАОЛВТ'`-подобный мусор (буквы из набора, слова нет) → `invalid/unknown`;
  - `'ТО'` → `invalid/short`.
- [ ] Случай «двух одинаковых букв в слове» (напр. `'ВОЛОВА'`) → `invalid/letters`.
- [ ] `npm run lint && npm run typecheck && npm run build` зелёные.
- [ ] Коммит `W2-1: checkWord (correct/bonus/duplicate/invalid)`.

## Ограничения

- НЕ подключать hunspell и внешние словари (неделя 4).
- «Бонусные» в неделю 2 = только слова из `stop.bonus`, никакого «угадывания редкости».
- Не менять `levels.ts`/`types.ts` — если для проверки нужен доступ к normalizeWord, он уже экспортируется.
- Временный тестовый код после ручной проверки убрать.

## Порядок сдачи

1. `npm run format` → `npm run lint` → `npm run typecheck` → `npm run build`.
2. Коммит `W2-1: …`, запуш.
3. Заполнить отчёт `docs/reports/week2-result-w2-1.md` и прислать оркестратору (включая результаты ручных проверок по критериям).
