import React, {
  createContext,
  useContext,
  useLayoutEffect,
  type ReactNode,
} from "react";
/**
 * On a low laptop window the sample stands in a column beside the work and
 * leaves paper under it, while the work is short of rows. What the work only
 * says — the name of the line, the hint, a note — goes under the sample then.
 */
const AsideContext = createContext<((node: ReactNode) => void) | null>(null);
export const AsideProvider = AsideContext.Provider;
/**
 * Hands `node` to the sample's column when there is one and returns true;
 * the caller then leaves it out of its own layout. `key` names what the node
 * says: it is handed over again only when that changes.
 */
export function useAside(node: ReactNode, key: string) {
  const put = useContext(AsideContext);
  useLayoutEffect(() => {
    put?.(node);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [put, key]);
  useLayoutEffect(() => (put ? () => put(null) : undefined), [put]);
  return put !== null;
}
/** Whether the work stands beside a sample that takes what it only says. */
export function useHasAside() {
  return useContext(AsideContext) !== null;
}
