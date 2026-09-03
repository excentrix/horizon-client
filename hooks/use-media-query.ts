import * as React from "react";

/**
 * SSR-safe media-query hook. Returns `false` until mounted, then tracks the
 * query. Use for layout branches that can't be expressed with CSS alone
 * (e.g. mounting a resizable panel group only on wide viewports).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
