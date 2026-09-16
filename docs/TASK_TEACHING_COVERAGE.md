# Покрытие учебных объяснений

Реестр: `src/lib/taskTeaching.ts`. Срез runtime `allBlocks`: 1324 заданий, 16 используемых `kind`, 162 семейств объяснений. Union `choice` также поддержан, но в текущем курсе таких заданий нет.

Семейство определяется смыслом работы, а не только жестом: размер, длина и количество; счёт, поиск цифры, отметка нескольких предметов; точки, открытая линия, замкнутый контур, письмо цифры; прибавление, вычитание, умножение, деление; неизвестное число, вопрос к задаче, порядок чисел; монеты, размен, мера длины, масса, объём, десятки; отдельные и последовательные практические действия; составление задач с заданными или своими числами.

План содержит детский заголовок и последовательность шагов. `focus` связывает объяснение с инструкцией, иллюстрацией, ответом или проверкой. Наглядный пример помечен «Пример» и не выдаётся за ответ текущего задания. В последовательностях из текущего задания используется подпись «В этом задании». Жесты на настоящих объектах выполняет UI отдельно; этот модуль не меняет ответы и прогресс.

Идентификатор сохраняемого семейства содержит значимые подвиды (например, размен/набор монет, прямой/обратный счёт, дополнение условия/готовое условие, одно/несколько действий). Повторный показ после первого знакомства определяется провайдером интерфейса.

В `work` исходные `flavor` отсутствуют во всех 776 заданиях: классификация использует реальные подписи полей и условие. Подписи имеют приоритет над описаниями иллюстраций: «пучок хвои» и пучки моркови не являются десятками. Для новой модели задания необходимо проверить её педагогический смысл, добавить ветвь и тест; отсутствие неизвестных union-вариантов проверяется исчерпывающим `switch`.

Проверки: `node --experimental-strip-types --test tests/task-teaching.test.ts`; `npm run typecheck`. Тесты проверяют весь runtime, первые вхождения, различение четырёх операций и важных подвидов, последовательный счёт 1 → 2 → 3, работу с рецептами и отсутствие неверного определения десятков. Это проверка содержимого планов; визуальная привязка пальца и показ на устройстве требуют отдельной UI-проверки.

Порядок понятий проверяется по фактическим исходным блокам: десятки появляются на странице 59, умножение — 97, деление — 113. До этих страниц примеры и текст не вводят следующие темы. До страницы 126 примеры десятков остаются в пределах двадцати. Для рядов клеток используется 3 + 3 = 6. Неизвестное первое слагаемое, второе слагаемое и вычитаемое имеют отдельные сценарии. Проверяются точные названия кнопок: «Проверить ответ», «Проверить задачу», «Проверить все задачи», «Открыть карточку».

## Первые вхождения

| Семейство | Первое задание | Всего |
| --- | --- | ---: |
| `read` | `p001-block01` | 211 |
| `picture.find-digit` | `p001-block02` | 10 |
| `picture.compare-size` | `p003-block02` | 2 |
| `picture.compare-length` | `p003-block04` | 2 |
| `draw.line-and-dot` | `p003-block06` | 4 |
| `number.count-picture` | `p004-block02` | 9 |
| `counters.same-amount` | `p004-block05` | 6 |
| `draw.closed` | `p004-block07` | 2 |
| `draw.open.bidirectional` | `p004-block08` | 1 |
| `counters.visible` | `p005-block01` | 1 |
| `location` | `p006-block02` | 4 |
| `draw.closed-and-dot` | `p006-block06` | 1 |
| `draw.open` | `p006-block07` | 3 |
| `picture.compare-quantity` | `p007-block02` | 1 |
| `picture.find-object` | `p007-block03` | 3 |
| `picture.number-meaning.1` | `p007-block07` | 1 |
| `draw.numeral` | `p007-block09` | 10 |
| `draw.picture-and-numeral` | `p007-block10` | 10 |
| `number.quantity-symbol` | `p007-block11` | 3 |
| `picture.mark-many` | `p008-block01` | 9 |
| `practical.place-count+add.multi` | `p008-block05` | 8 |
| `shape.sticks` | `p008-block06` | 11 |
| `picture.number-meaning.2` | `p008-block08` | 1 |
| `picture.add` | `p009-block01` | 1 |
| `picture.number-meaning.3` | `p010-block06` | 1 |
| `work.word-reasoning.add` | `p011-lesson01` | 9 |
| `activity.count-slots` | `p011-lesson02` | 1 |
| `activity.composition.another` | `p011-lesson03` | 8 |
| `activity.coins.sum` | `p011-lesson04` | 9 |
| `activity.sequence.numbers.forward.ones` | `p011-lesson05` | 7 |
| `work.count-and-record` | `p011-lesson06` | 15 |
| `practical.place-count.multi` | `p012-lesson05` | 1 |
| `work.word-reasoning.add-subtract` | `p013-lesson01` | 12 |
| `activity.composition.fixed` | `p013-lesson03` | 7 |
| `activity.count` | `p014-lesson04` | 3 |
| `work.calculate.add` | `p016-lesson05` | 53 |
| `activity.composition.free` | `p019-lesson06` | 11 |
| `work.number-order` | `p019-lesson08` | 8 |
| `activity.sequence.numbers.backward.ones` | `p019-lesson10` | 5 |
| `work.calculate.subtract` | `p021-lesson03` | 27 |
| `practical.draw-count` | `p022-lesson02` | 1 |
| `work.calculate.add-subtract` | `p023-lesson10` | 92 |
| `work.word-problem.add` | `p030-source06` | 62 |
| `work.word-problem.subtract` | `p030-source13` | 56 |
| `work.chain.add` | `p031-source11` | 6 |
| `work.chain.subtract` | `p032-source07` | 10 |
| `compose.example.add` | `p034-source13` | 7 |
| `compose.example.subtract` | `p035-source02` | 6 |
| `story.add.single.given.choose` | `p037-source02` | 2 |
| `practical.same-amount` | `p037-source05` | 2 |
| `practical.place-count+remove.multi` | `p037-source10` | 2 |
| `compose.story.subtract` | `p039-source03` | 8 |
| `work.word-problem.add-subtract` | `p039-source07` | 35 |
| `practical.two-parts` | `p040-source04` | 2 |
| `compose.story.add` | `p040-source13` | 8 |
| `work.choose-question.single` | `p042-source07` | 27 |
| `practical.two-parts.multi` | `p043-source06` | 4 |
| `practical.place-count+add+remove.multi` | `p044-source08` | 1 |
| `compose.story.add-subtract` | `p048-source04` | 1 |
| `practical.add.multi` | `p048-source10` | 1 |
| `story.add-subtract.single.given.choose` | `p050-source04` | 1 |
| `compose.example.add-subtract` | `p050-source08` | 2 |
| `work.chain.add-subtract` | `p053-source05` | 40 |
| `activity.ruler.measure` | `p054-source04` | 6 |
| `activity.ruler.mark` | `p054-source07` | 4 |
| `story.subtract.single.given.choose` | `p056-source08` | 1 |
| `story.add.single.complete.choose` | `p057-source03` | 4 |
| `number-game.hidden` | `p058-source04` | 1 |
| `practical.bundles.multi` | `p059-source03` | 4 |
| `activity.place-value` | `p059-source05` | 6 |
| `practical.place-count+bundles.multi` | `p059-source06` | 1 |
| `work.place-value` | `p060-source02` | 6 |
| `practical.digit-cards.multi` | `p061-source01` | 1 |
| `number-game.read` | `p061-source02` | 1 |
| `activity.sequence.numbers.runs` | `p066-source11` | 7 |
| `work.compare.more` | `p067-source07` | 41 |
| `practical.compare-more` | `p067-source08` | 2 |
| `practical.draw-more` | `p068-source03` | 1 |
| `recipe.add.similar` | `p069-source02` | 7 |
| `relation.more` | `p070-source10` | 2 |
| `practical.two-parts+remove.multi` | `p074-source02` | 1 |
| `work.compare.less` | `p074-source03` | 29 |
| `practical.draw-less` | `p074-source05` | 1 |
| `practical.compare-less` | `p074-source06` | 1 |
| `recipe.subtract.similar` | `p075-source05` | 3 |
| `relation.less` | `p076-source10` | 2 |
| `story.add-subtract.multi.complete.choose` | `p078-source05` | 1 |
| `work.missing-number.second-addend` | `p079-source05` | 7 |
| `work.missing-number.subtrahend` | `p084-source06` | 5 |
| `story.subtract.single.complete.choose` | `p088-source05` | 1 |
| `activity.balance` | `p089-source06` | 2 |
| `story.add-subtract.single.given.all` | `p090-source06` | 1 |
| `recipe.add-subtract.similar` | `p092-source09` | 1 |
| `activity.liquid.cups` | `p093-source04` | 1 |
| `activity.liquid.litres` | `p093-source05` | 1 |
| `work.missing-number.first-addend` | `p095-source04` | 1 |
| `work.choose-question.multi` | `p096-source03` | 4 |
| `activity.sequence.numbers.forward.groups` | `p097-source03` | 4 |
| `work.calculate.add-multiply` | `p097-source04` | 3 |
| `work.chain.add-multiply` | `p097-source05` | 20 |
| `work.word-problem.multiply` | `p097-source08` | 32 |
| `work.calculate.multiply` | `p097-source10` | 15 |
| `work.chain.add-subtract-multiply` | `p098-source08` | 16 |
| `work.word-problem.subtract-multiply` | `p099-source04` | 10 |
| `practical.construct-triangle` | `p100-source05` | 1 |
| `story.multiply.single.given.all` | `p101-source02` | 1 |
| `work.equal-groups-total` | `p101-source08` | 2 |
| `practical.draw-rows` | `p102-source05` | 3 |
| `practical.construct-square` | `p103-source04` | 1 |
| `work.calculate.subtract-multiply` | `p103-source09` | 1 |
| `work.word-problem.add-multiply` | `p104-source03` | 19 |
| `recipe.add-multiply.similar` | `p104-source04` | 4 |
| `work.chain.subtract-multiply` | `p104-source05` | 3 |
| `work.reasoned-choice` | `p108-source03` | 2 |
| `story.multiply.single.complete.all` | `p108-source06` | 1 |
| `story.multiply-add.multi.given.choose` | `p109-source06` | 1 |
| `compose.example.multiply` | `p110-source06` | 3 |
| `activity.coins.exchange` | `p110-source07` | 1 |
| `story.multiply.single.complete.choose` | `p110-source08` | 3 |
| `work.calculate.add-subtract-multiply` | `p111-source06` | 1 |
| `work.calculate.divide` | `p113-source04` | 10 |
| `work.word-problem.divide` | `p113-source05` | 25 |
| `work.calculate.multiply-divide` | `p113-source07` | 7 |
| `work.chain.add-subtract-multiply-divide` | `p114-source06` | 23 |
| `work.word-problem.subtract-divide` | `p114-source07` | 13 |
| `activity.equal-groups` | `p115-source05` | 3 |
| `practical.equal-groups` | `p115-source07` | 1 |
| `recipe.subtract-divide.similar` | `p116-source06` | 1 |
| `work.calculate.add-multiply-divide` | `p116-source08` | 1 |
| `work.word-problem.add-divide` | `p117-source03` | 9 |
| `work.chain.subtract-multiply-divide` | `p117-source05` | 2 |
| `practical.equal-groups.multi` | `p118-source03` | 3 |
| `work.word-problem.multiply-divide` | `p118-source05` | 5 |
| `work.chain.add-multiply-divide` | `p118-source07` | 3 |
| `story.subtract-divide.multi.given.choose` | `p120-source07` | 1 |
| `practical.divide-length` | `p121-source07` | 5 |
| `story.divide.single.given.choose` | `p122-source05` | 4 |
| `compose.example.divide` | `p122-source10` | 3 |
| `story.add-divide.multi.given.choose` | `p123-source02` | 1 |
| `work.calculate.add-subtract-multiply-divide` | `p123-source05` | 2 |
| `story.multiply.single.given.choose` | `p124-source04` | 1 |
| `compose.story.multiply-divide` | `p124-source05` | 1 |
| `recipe.multiply-divide.similar` | `p124-source07` | 1 |
| `recipe.add-divide.similar` | `p125-source04` | 2 |
| `activity.sequence.numbers.listed` | `p127-source08` | 1 |
| `work.number-words` | `p127-source10` | 2 |
| `activity.sequence.pages.listed` | `p128-source02` | 1 |
| `activity.sequence.hundred.runs` | `p128-source04` | 1 |
| `compose.story.multiply` | `p128-source08` | 1 |
| `compose.story.divide` | `p129-source01` | 1 |
| `work.chain.multiply-divide` | `p129-source02` | 5 |
| `activity.ruler.mark.fine` | `p129-source07` | 1 |
| `practical.draw-length` | `p129-source11` | 3 |
| `practical.cut-length` | `p129-source14` | 2 |
| `activity.sequence.numbers.backward.groups` | `p131-source10` | 1 |
| `recipe.subtract-multiply.similar` | `p134-source14` | 1 |
| `practical.divide-shape` | `p136-source05` | 1 |
| `story.add-subtract-multiply-divide.single.complete.choose` | `p139-source01` | 1 |
| `compose.story.add-subtract-multiply-divide` | `p139-source09` | 1 |
| `compose.example.subtract-divide` | `p140-source03` | 1 |
| `story.multiply.multi.complete.choose` | `p140-source12` | 1 |
| `target-game` | `p142-play892` | 1 |
