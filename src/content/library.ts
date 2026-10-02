/** Public donation link used on every localized library page. */
export const PROJECT_SUPPORT_URL =
  "https://boosty.to/islamovdenis/single-payment/donation/832184/target?share=target_link";

/** Update these totals manually as contributions arrive. Amounts are in rubles. */
export const PROJECT_FUNDING = { raised: 12_500, goal: 60_000 };

export const plannedBooks = [
  {
    id: "russian",
    title: "Русский язык",
    color: "#b87b63",
    pale: "#f3e6da",
    symbol: "Аа",
  },
  {
    id: "reading",
    title: "Чтение",
    color: "#697d96",
    pale: "#e5eaf0",
    symbol: "АБВ",
  },
  {
    id: "nature",
    title: "Мир природы",
    color: "#89906a",
    pale: "#ebeddc",
    symbol: "✳",
  },
  {
    id: "physics",
    title: "Физика",
    color: "#6c8290",
    pale: "#edf1f3",
    symbol: "F",
  },
  {
    id: "geography",
    title: "География",
    color: "#698779",
    pale: "#edf0de",
    symbol: "◉",
  },
  {
    id: "history",
    title: "История",
    color: "#a77c64",
    pale: "#f5e9d4",
    symbol: "I–II",
  },
  {
    id: "biology",
    title: "Биология",
    color: "#81946d",
    pale: "#f0efdb",
    symbol: "❧",
  },
  {
    id: "chemistry",
    title: "Химия",
    color: "#8b7894",
    pale: "#f3eaf2",
    symbol: "H₂O",
  },
  {
    id: "algebra",
    title: "Алгебра",
    color: "#b3935f",
    pale: "#faf0d8",
    symbol: "x + y",
  },
] as const;
