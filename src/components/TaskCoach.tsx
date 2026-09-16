import type React from "react";
import type { View } from "react-native";
import type { Block } from "../content/types";
import { taskTeaching } from "../lib/taskTeaching";
import { countingTutorials } from "../content/countingTutorials";
import { useGestureCoach, type CoachTarget } from "./GestureCoach";

export function useTaskCoach(
  block: Block,
  refs: {
    instruction: React.RefObject<View | null>;
    images: React.RefObject<View | null>;
    answer: React.RefObject<View | null>;
  },
) {
  const plan = taskTeaching(block);
  let targets: CoachTarget[] = plan.steps.map((s) => {
    const pictureFocus = block.kind === "picture" && s.focus !== "instruction";
    const imageFocus = s.focus === "images" || pictureFocus;
    return {
      ref:
        s.focus === "instruction"
          ? refs.instruction
          : imageFocus && block.images.length
            ? refs.images
            : refs.answer,
      text: s.text,
      example: s.example,
      ...(imageFocus &&
      block.images.length === 1 &&
      !/abacus_\d+$/.test(block.images[0]) &&
      block.images[0] !== "p011_balls_row_3_groups"
        ? {
            ref: undefined,
            anchor: `image:${block.images[0]}`,
            surface: { kind: "image" as const, imageId: block.images[0] },
          }
        : {}),
    };
  });
  if (block.kind === "picture" && block.quantityMeaning) {
    targets = [
      {
        ref: refs.instruction,
        text: "Рисунки разные. Посмотрим, что у них общего. Коснись каждого рисунка, как показывает палец.",
      },
      ...block.targets.map((t) => ({
        anchor: `meaning:${block.id}:${t.id}`,
        surface: block.images[t.image].includes("abacus_")
          ? undefined
          : { kind: "image" as const, imageId: block.images[t.image] },
        text: `${t.label}. ${t.label.startsWith("Цифра") ? "Так записывают это число." : `Это тоже ${block.quantityMeaning!.number}.`}`,
        motion: { kind: "tap" as const, points: [{ x: 0.5, y: 0.45 }] },
      })),
      { ref: refs.instruction, text: block.quantityMeaning.conclusion },
    ];
  }
  const scene = countingTutorials[block.id];
  if (scene) {
    const noun = /дет|дети|ребён/.test(block.prompt.toLowerCase())
      ? "детей"
      : /дерев/.test(block.prompt.toLowerCase())
        ? "деревья"
        : "лодочки";
    targets = [
      {
        anchor: `image:${scene.imageId}`,
        surface: { kind: "image", imageId: scene.imageId },
        text: `Посчитаем ${noun} по одному. Палец показывает, кого уже посчитали. Не пропускай предметы и не считай один дважды.`,
        motion: {
          kind: "count",
          points: scene.objects.map((o) => ({
            x: o.x + o.w * 0.5,
            y: o.y + o.h * 0.85,
          })),
          regions: scene.objects.map((o) => ({
            x: o.x,
            y: o.y,
            width: o.w,
            height: o.h,
          })),
          labels: scene.objects.map((o) => o.label),
        },
      },
      block.kind === "number"
        ? {
            anchor: `answer:${block.expected}`,
            surface: { kind: "answer", value: block.expected },
            text: `Всего ${scene.objects.length}. Найди это число среди ответов и нажми на него. Посмотри, как.`,
            motion: { kind: "tap", points: [{ x: 0.5, y: 0.5 }] },
          }
        : {
            ref: refs.instruction,
            text: `Мы насчитали ${scene.objects.length}. Положи по одному предмету за каждый посчитанный: на поле должно быть столько же.`,
          },
    ];
  }
  if (block.kind === "draw" || block.kind === "shape")
    targets = targets.filter((s) => s.ref === refs.instruction).slice(0, 1);
  if (!targets.length)
    targets = [{ ref: refs.instruction, text: block.prompt }];
  return useGestureCoach(`task:${plan.family}`, targets, {
    primary: true,
    includeGestures: true,
  });
}
