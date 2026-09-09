/** Small arithmetic parser. Never executes JavaScript or accepts names/functions. */
export function calculate(source: string): number | undefined {
  const text = source
    .replace(/[×·∙]/g, "*")
    .replace(/[÷:]/g, "/")
    .replace(/−/g, "-")
    .replace(/\s/g, "");
  if (!text || text.length > 100 || /[^0-9+*/().-]/.test(text))
    return undefined;
  const tokens = text.match(/\d+|[+*/().-]/g) ?? [];
  let at = 0;
  function atom(): number {
    if (tokens[at] === "(") {
      at++;
      const v = sum();
      if (tokens[at++] !== ")") throw Error();
      return v;
    }
    const token = tokens[at++];
    if (!token || !/^\d+$/.test(token)) throw Error();
    return Number(token);
  }
  function product(): number {
    let v = atom();
    while (tokens[at] === "*" || tokens[at] === "/") {
      const op = tokens[at++],
        n = atom();
      v = op === "*" ? v * n : v / n;
    }
    return v;
  }
  function sum(): number {
    let v = product();
    while (tokens[at] === "+" || tokens[at] === "-") {
      const op = tokens[at++],
        n = product();
      v = op === "+" ? v + n : v - n;
    }
    return v;
  }
  try {
    const v = sum();
    return at === tokens.length &&
      Number.isSafeInteger(v) &&
      Math.abs(v) <= 10000
      ? v
      : undefined;
  } catch {
    return undefined;
  }
}
