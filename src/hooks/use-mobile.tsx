import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    // Use matchMedia.matches instead of window.innerWidth to avoid forced reflow
    const onChange = () => {
      setIsMobile(mql.matches);
    };
    mql.addEventListener("change", onChange);
    // Defer initial read to avoid forced reflow during render
    requestAnimationFrame(() => {
      setIsMobile(mql.matches);
    });
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
