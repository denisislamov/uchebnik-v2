import { assets as originalAssets } from "./assets";
import { revisedAssets } from "./revisedAssets";
import { originalIllustrations } from "./illustrationMode";
import { selectBookArt } from "./selectBookArt";
import { vectorAssets, type VectorAsset } from "./vectorAssets";

type RasterAsset = (typeof originalAssets)[string];
export type BookArt = RasterAsset | VectorAsset;

const ids = new Set([
  ...Object.keys(originalAssets),
  ...Object.keys(revisedAssets),
  ...Object.keys(vectorAssets),
]);
export const assets: Record<string, BookArt> = {};
for (const id of ids) {
  const art = selectBookArt(
    originalAssets[id],
    revisedAssets[id],
    vectorAssets[id],
    originalIllustrations,
  );
  if (art) assets[id] = art;
}
