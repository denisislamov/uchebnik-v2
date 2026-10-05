import React, { createContext, useContext } from "react";
import { View } from "react-native";

const palette = [
  { fill: "#e53935", edge: "#bd2926", light: "#f47b76" },
  { fill: "#168bd2", edge: "#086cac", light: "#66b9e9" },
  { fill: "#27ae60", edge: "#168344", light: "#73ce97" },
] as const;

const MaterialContext = createContext<(typeof palette)[number]>(palette[0]);

/** A task keeps its colour through all steps, saved results and coaching. */
export function CountingMaterialProvider({
  taskId,
  children,
}: {
  taskId: string;
  children: React.ReactNode;
}) {
  let index = 0;
  for (const char of taskId)
    index = (index * 31 + char.charCodeAt(0)) % palette.length;
  return (
    <MaterialContext.Provider value={palette[index]}>
      {children}
    </MaterialContext.Provider>
  );
}

export const useCountingMaterial = () => useContext(MaterialContext);

/** Flat plastic counters; the surrounding control owns the larger hit area. */
export function CountingPiece({ token }: { token: "circle" | "stick" }) {
  const material = useCountingMaterial();
  const stick = token === "stick";
  return (
    <View
      pointerEvents="none"
      testID={`counting-piece-${token}`}
      style={{
        width: stick ? 7 : 30,
        height: stick ? 46 : 30,
        borderRadius: stick ? 2.5 : 15,
        backgroundColor: material.fill,
        borderWidth: 1,
        borderColor: material.edge,
        borderTopColor: material.light,
        borderLeftColor: material.light,
      }}
    />
  );
}
