"""Lint block headings and task texts against the editorial rules from review round 1.

Rules (review/review_1_plan.md, E6.1):
  T1  title is a name, not a sentence: no trailing period, at most 7 words;
  T2  title does not literally repeat the prompt;
  P1  prompt starts with an imperative verb ("Сосчитай", "Нарисуй", "Положи" …) or a question word;
  P2  prompt is at most 24 words per sentence (children hear it, they do not read it);
  P3  prompt has no bare exercise number as its only text ("№ 500").
Usage: python3 scripts/content/lint_texts.py [--report docs/TEXT_LINT.md]
"""
import json, re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
raw = (ROOT / "src/content/fullBookData.ts").read_text(encoding="utf-8")
data = json.loads(raw[raw.index("["): raw.rindex("]") + 1])
IMPERATIVE = re.compile(r"^(?:[А-ЯЁ][а-яё]+(?:и|й|ь|те|йте|ьте|ись|йся|ься)|Сколько|Что|Кто|Как|Какой|Какая|Какие|Где|Чего|Чем|Кому|Куда|Почему|Считай|Реши|Запиши|Прочитай|Назови|Покажи|Составь|Сравни|Найди|Продолжи|Нарисуй|Начерти|Обведи|Положи|Возьми|Отсчитай|Измерь|Разложи|Набери|Сделай|Придумай|Вычисли|Выполни|Заполни|Рассмотри|Посчитай|Сосчитай|Отметь|Проверь|Раскрась|Дополни|Расскажи|Объясни|Напиши|Подбери|Выбери|Узнай|Подумай|Вспомни|Повтори|Расставь|Переставь|Ответь|Дорисуй|Слушай|Смотри)\b")
def words(t): return [w for w in re.split(r"\s+", t.strip()) if w]
def normalize(t): return re.sub(r"[.!:]+$", "", re.sub(r"\s+", " ", t.strip())).lower()
issues = []
for page in data:
    for b in page["blocks"]:
        title, prompt = b.get("title", ""), b.get("prompt", "")
        found = []
        if title.rstrip().endswith(".") and not re.fullmatch(r"№\s*\d+\.?", title.strip()): found.append("T1 заголовок — предложение с точкой")
        if len(words(title)) > 7: found.append(f"T1 заголовок из {len(words(title))} слов")
        if b["kind"] != "read" and normalize(title) == normalize(prompt): found.append("T2 заголовок повторяет задание")
        # A story may narrate first; some sentence must still tell the child what to do or ask.
        sentences = [x for x in re.split(r"(?<=[.!?])\s+|\n+", prompt.strip()) if x]
        if b["kind"] not in ("read",) and sentences and not any(IMPERATIVE.match(x) or x.rstrip().endswith("?") for x in sentences):
            found.append(f"P1 ни одна фраза не говорит, что делать: «{sentences[0][:50]}»")
        for sent in re.split(r"(?<=[.!?])\s+", prompt.strip()):
            if len(words(sent)) > 24: found.append(f"P2 фраза из {len(words(sent))} слов")
        if re.fullmatch(r"№\s*\d+\.?", prompt.strip()): found.append("P3 вместо задания только номер")
        if found: issues.append((page["number"], b["id"], b["kind"], title[:60], found))
counts = {}
for *_, found in issues:
    for f in found: counts[f[:2]] = counts.get(f[:2], 0) + 1
total = sum(len(p["blocks"]) for p in data)
report = [f"# Проверка заголовков и текстов заданий", "", f"Блоков: {total}. Блоков с замечаниями: {len(issues)}. По правилам: " + ", ".join(f"{k} — {v}" for k, v in sorted(counts.items())) + ".", "",
          "| стр. | блок | вид | заголовок | замечания |", "| --- | --- | --- | --- | --- |"]
for n, i, k, t, f in issues: report.append(f"| {n} | `{i}` | {k} | {t} | {'; '.join(f)} |")
out = None
if "--report" in sys.argv: out = pathlib.Path(sys.argv[sys.argv.index("--report") + 1])
text = "\n".join(report) + "\n"
if out: out.write_text(text, encoding="utf-8"); print(f"{len(issues)} blocks with issues → {out}")
else: print("\n".join(report[:3])); print("…", len(issues), "rows")
if "--check" in sys.argv and issues: sys.exit(1)
