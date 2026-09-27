import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop ensures that navigating between any screens/routes in the app
 * resets the scroll position to the top of the page, preventing the user
 * from landing at the bottom of the new screen.
 */
export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch {
        // Ignore if restricted in certain iframe or webview environments
      }
    }
  }, []);

  useEffect(() => {
    if (!hash || hash === '#top') {
      const resetScroll = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (document.documentElement) {
          document.documentElement.scrollTop = 0;
        }
        if (document.body) {
          document.body.scrollTop = 0;
        }
      };

      resetScroll();
      const rAF = requestAnimationFrame(resetScroll);
      const timer = window.setTimeout(resetScroll, 50);

      return () => {
        cancelAnimationFrame(rAF);
        window.clearTimeout(timer);
      };
    }
  }, [pathname, search, hash]);

  return null;
}

export default ScrollToTop;
