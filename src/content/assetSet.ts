import { assets as originalAssets } from "./assets";
import { revisedAssets } from "./revisedAssets";
import { originalIllustrations } from "./illustrationMode";

export const assets =
  originalIllustrations
    ? originalAssets
    : { ...originalAssets, ...revisedAssets };
