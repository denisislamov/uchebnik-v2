import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors as c, fonts as f } from "../theme";
import { CELL } from "../lib/grid";
import { Button } from "./Controls";
import { Rows } from "./HandDrawn";

/** A neutral educational coin with only its value. */
function Coin({ value, size }: { value: number; size: number }) {
  return (
    <View
      style={[s.coin, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <View
        style={[
          s.coinRim,
          {
            width: size - 10,
            height: size - 10,
            borderRadius: (size - 10) / 2,
          },
        ]}
      >
        <Text
          style={[s.coinValue, size < 60 && { fontSize: 20, lineHeight: 22 }]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
/**
 * Coins to choose from and a purse they are put into. What lies in the purse
 * is seen — every coin, in the order it was put — and written as a sum under
 * it: «1 + 2 = 3». A press on a coin in the purse takes it back.
 */
export function CoinPurse({
  target,
  coins,
  denominations,
  onAdd,
  onTake,
  onReset,
}: {
  target: number;
  /** What lies in the purse, in the order it was put there. */
  coins: number[];
  denominations: number[];
  onAdd: (value: number) => void;
  onTake: (index: number) => void;
  onReset: () => void;
}) {
  const sum = coins.reduce((a, b) => a + b, 0);
  return (
    <Rows object contentStyle={s.purse} testID="coin-purse">
      <Text style={s.caption}>Монеты · нажми, чтобы положить в кошелёк</Text>
      <View style={s.row}>
        {denominations.map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`Монета с числом ${n}`}
            onPress={() => onAdd(n)}
            style={({ pressed }) => pressed && s.pressed}
          >
            <Coin value={n} size={72} />
          </Pressable>
        ))}
      </View>
      <Text style={s.caption}>Кошелёк · нужно набрать число {target}</Text>
      <View testID="coin-purse-inside" style={s.inside}>
        {coins.length === 0 ? (
          <Text style={s.empty}>Пусто</Text>
        ) : (
          coins.map((n, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`В кошельке монета с числом ${n}. Вернуть`}
              onPress={() => onTake(i)}
              style={({ pressed }) => pressed && s.pressed}
            >
              <Coin value={n} size={56} />
            </Pressable>
          ))
        )}
      </View>
      {/* The sum as it is written in the book: what was put, and how much
          it makes. */}
      <Text testID="coin-sum" accessibilityLiveRegion="polite" style={s.sum}>
        В кошельке: {coins.length > 1 ? `${coins.join(" + ")} = ${sum}` : sum}
      </Text>
      <View style={{ alignSelf: "flex-start" }}>
        <Button small secondary disabled={!coins.length} onPress={onReset}>
          Вернуть монеты
        </Button>
      </View>
    </Rows>
  );
}
const s = StyleSheet.create({
  purse: { gap: CELL / 2 },
  caption: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 15,
    lineHeight: CELL,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: CELL / 2 },
  pressed: { opacity: 0.7 },
  coin: {
    backgroundColor: "#eee9dd",
    borderWidth: 2,
    borderColor: "#8c8578",
    alignItems: "center",
    justifyContent: "center",
  },
  coinRim: {
    borderWidth: 1.5,
    borderColor: "#aaa293",
    alignItems: "center",
    justifyContent: "center",
  },
  coinValue: {
    fontFamily: f.heavy,
    color: "#263443",
    fontSize: 26,
    lineHeight: 28,
  },
  inside: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: CELL / 2,
    minHeight: CELL * 4,
    padding: CELL / 2,
    borderRadius: 6,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: c.lip,
    backgroundColor: c.wash,
  },
  empty: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 15,
    lineHeight: CELL,
  },
  sum: {
    fontFamily: f.bold,
    color: c.ink,
    fontSize: 22,
    lineHeight: CELL * 1.5,
  },
});
