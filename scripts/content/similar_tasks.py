"""Source contexts for tasks asking for the same relation with different givens.

Verified against PDF scans 069, 070, 116, 124, 125, 134, 138 and 141.
The preceding exercise supplies each original tuple. Variables have the same
roles as FORMULAS in overrides.py; context placeholders are filled by the UI.
Only the exact original tuple is excluded: a new problem may have the same
answer, and it is sufficient to change one given while keeping the relation.
"""

SIMILAR = {
    # №277 → №278: price plus the difference in price.
    278: {
        "context": "Варежки стоят {a} руб., а платок на {b} руб. дороже. Сколько стоит платок?",
        "unit": "рубли",
        "excludedInputs": {"a": 12, "b": 6},
        "inputLabels": {
            "a": "Стоимость варежек, рубли",
            "b": "На сколько рублей платок дороже",
        },
    },
    # №279 → №280: the sister is older, not younger.
    280: {
        "context": "Возраст брата — {a} лет. Сестра на {b} лет старше брата. Сколько лет сестре?",
        "unit": "годы",
        "excludedInputs": {"a": 10, "b": 3},
        "inputLabels": {
            "a": "Возраст брата, лет",
            "b": "На сколько лет сестра старше",
        },
    },
    # №292 → №293: the second log is longer.
    293: {
        "context": "Из лесу привезли два бревна. Длина одного бревна — {a} м, другое на {b} м длиннее. Какой длины другое бревно?",
        "unit": "метры",
        "excludedInputs": {"a": 4, "b": 3},
        "inputLabels": {
            "a": "Длина первого бревна, метры",
            "b": "На сколько метров другое бревно длиннее",
        },
    },
    # №295 → №296: the new house is taller.
    296: {
        "context": "Высота старого дома — {a} м. Новый дом на {b} м выше старого. Какой высоты новый дом?",
        "unit": "метры",
        "excludedInputs": {"a": 6, "b": 14},
        "inputLabels": {
            "a": "Высота старого дома, метры",
            "b": "На сколько метров новый дом выше",
        },
    },
    # №644 → №645: FORMULAS keeps the source division into three parts fixed.
    645: {
        "context": "Лесорубы спилили две сосны: одну длиной {a} м, а другую на {b} м короче. Короткую сосну распилили на 3 равные части. Какой длины вышла каждая часть?",
        "unit": "метры",
        "excludedInputs": {"a": 20, "b": 8},
        "inputLabels": {
            "a": "Длина длинной сосны, метры",
            "b": "На сколько метров другая сосна короче",
        },
    },
    # №714 → №715: a beans per pupil, b pupils, c equal planting rows.
    715: {
        "context": "Для посадки каждый ученик принёс по {a} бобов. Учеников было {b}. Все бобы посадили в ящике поровну; одинаковых рядов — {c}. Сколько бобов посадили в каждом ряду?",
        "unit": "бобы",
        "excludedInputs": {"a": 9, "b": 2, "c": 3},
        "inputLabels": {
            "a": "Бобов у каждого ученика",
            "b": "Число учеников",
            "c": "Число одинаковых рядов",
        },
    },
    # №719 → №720: two planting batches, then equal rows (trees, not apples).
    720: {
        "context": "В школьном саду посадили сначала {a} яблонь, а потом ещё {b}. Все яблони посадили поровну; одинаковых рядов — {c}. Сколько яблонь было в каждом ряду?",
        "unit": "яблони",
        "excludedInputs": {"a": 7, "b": 11, "c": 2},
        "inputLabels": {
            "a": "Яблонь посадили сначала",
            "b": "Яблонь посадили потом",
            "c": "Число одинаковых рядов",
        },
    },
    # №810 → №811: a desks required, b days, c desks manufactured per day.
    811: {
        "context": "В столярной мастерской нужно изготовить {a} парт. Работали {b} дней, изготавливая по {c} парт в день. Сколько парт осталось ещё изготовить?",
        "unit": "парты",
        "excludedInputs": {"a": 80, "b": 6, "c": 10},
        "inputLabels": {
            "a": "Всего парт нужно изготовить",
            "b": "Сколько дней работали",
            "c": "Сколько парт изготавливали в день",
        },
    },
    # №850 → №851: a pupils make b drawings each, one other pupil makes c.
    851: {
        "context": "Для стенной газеты рисовали {a} пионеров, каждый сделал по {b} рисунков. Ещё один пионер нарисовал {c} рисунков. Сколько всего рисунков получилось?",
        "unit": "рисунки",
        "excludedInputs": {"a": 4, "b": 2, "c": 3},
        "inputLabels": {
            "a": "Сколько пионеров рисовало поровну",
            "b": "Рисунков у каждого из них",
            "c": "Рисунков у ещё одного пионера",
        },
    },
    # №882 → №883: a boys and b girls divide into c equal play groups.
    883: {
        "context": "Для игры собрались мальчики — {a} и девочки — {b}. Дети разделились на равные группы; групп было {c}. Сколько детей было в каждой группе?",
        "unit": "дети",
        "excludedInputs": {"a": 9, "b": 7, "c": 2},
        "inputLabels": {
            "a": "Число мальчиков",
            "b": "Число девочек",
            "c": "Число равных групп",
        },
    },
}

# Remaining source-linked constructors. Do not add an exclusion when the book
# only asks for a similar situation, or asks about the child's own experience.
SIMILAR.update({
    # №334 → №335 (p075).
    335: {
        "context": "Кастрюля стоит {a} руб., а чайник на {b} руб. дешевле. Сколько стоит чайник?",
        "unit": "рубли",
        "excludedInputs": {"a": 20, "b": 5},
        "inputLabels": {
            "a": "Стоимость кастрюли, рубли",
            "b": "На сколько рублей чайник дешевле",
        },
    },
    # №336 → №337 (p075).
    337: {
        "context": "Возраст брата — {a} лет. Сестра на {b} лет моложе брата. Сколько лет сестре?",
        "unit": "годы",
        "excludedInputs": {"a": 16, "b": 5},
        "inputLabels": {
            "a": "Возраст брата, лет",
            "b": "На сколько лет сестра моложе",
        },
    },
    # №348 → №349 (p076).
    349: {
        "context": "Длина одной доски — {a} м. Другая доска на {b} м короче. Какова длина другой доски?",
        "unit": "метры",
        "excludedInputs": {"a": 9, "b": 3},
        "inputLabels": {
            "a": "Длина первой доски, метры",
            "b": "На сколько метров другая доска короче",
        },
    },
    # №410 → №411 (p084): a sparrows plus (a + b) tits.
    411: {
        "context": "Дети устроили кормушку для птиц. К кормушке прилетели {a} воробышков, а синичек на {b} больше. Сколько всего птичек прилетело к кормушке?",
        "unit": "птицы",
        "excludedInputs": {"a": 7, "b": 5},
        "inputLabels": {
            "a": "Сколько прилетело воробышков",
            "b": "На сколько синичек больше, чем воробышков",
        },
    },
    # №487 → №488 (p092): a required, b first batch, c second batch.
    488: {
        "context": "Мальчику нужно выстрогать {a} палочек. Он выстрогал сначала {b} палочек, а потом ещё {c}. Сколько палочек ему осталось выстрогать?",
        "unit": "палочки",
        "inputLabels": {
            "a": "Всего палочек нужно выстрогать",
            "b": "Палочек выстрогал сначала",
            "c": "Палочек выстрогал потом",
        },
    },
    # №562 → №563 (p104): a fish per jar, b jars, c fish in the aquarium.
    563: {
        "context": "В живом уголке стоят банки; в каждой по {a} рыбок. Банок — {b}. В аквариуме ещё {c} рыбок. Сколько всего рыбок в живом уголке?",
        "unit": "рыбки",
        "inputLabels": {
            "a": "Рыбок в каждой банке",
            "b": "Сколько всего банок",
            "c": "Рыбок в аквариуме",
        },
    },
    # №580 (p106) → №581 (p107): a kg per weighing, b weighings, c extra kg.
    581: {
        "context": "В магазине покупателю отвесили капусту по {a} кг за раз. Таких порций было {b}, затем отвесили ещё {c} кг. Сколько всего килограммов капусты получил покупатель?",
        "unit": "килограммы",
        "excludedInputs": {"a": 5, "b": 2, "c": 2},
        "inputLabels": {
            "a": "Килограммов капусты в одной порции",
            "b": "Сколько одинаковых порций отвесили",
            "c": "Сколько килограммов добавили потом",
        },
    },
    # №706 → №707 (p123): explicitly about the child's February/March reading.
    707: {
        "context": "Составь задачу про свои прочитанные книги. Я прочитал(а) в феврале {a} книг, а в марте на {b} книг больше. Сколько книг я прочитал(а) в феврале и в марте вместе?",
        "unit": "книги",
        "inputLabels": {
            "a": "Сколько книг ты прочитал(а) в феврале",
            "b": "На сколько книг больше ты прочитал(а) в марте",
        },
    },
    # №769 → №770 (p131): a first-day books plus (a + b) second-day books.
    770: {
        "context": "Дети принесли для классной библиотечки в первый день {a} книг, а во второй день на {b} книг больше. Сколько всего книг принесли дети?",
        "unit": "книги",
        "inputLabels": {
            "a": "Книг принесли в первый день",
            "b": "На сколько книг больше принесли во второй день",
        },
    },
})

# The unnumbered continuation of №561 (p104) belongs to its existing extra ID.
# a examples per column, b columns, c additional examples solved by a classmate.
SIMILAR_561 = {
    "context": "Составь задачу про свой класс. В нашем классе один ученик решил столбики примеров: по {a} примеров в каждом, столбиков — {b}. Другой ученик решил на {c} примеров больше. Сколько примеров решил другой ученик?",
    "unit": "примеры",
    "inputLabels": {
        "a": "Примеров в каждом столбике",
        "b": "Сколько столбиков решил первый ученик",
        "c": "На сколько примеров больше решил другой ученик",
    },
    "minResult": 1,
}

# A price, age, measured length or existing collection is positive. A remaining
# amount of unfinished work can be zero: all sticks/desks have been made.
for number, metadata in SIMILAR.items():
    metadata["minResult"] = 0 if number in {488, 811} else 1
