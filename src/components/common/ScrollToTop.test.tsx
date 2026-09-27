import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ScrollToTop } from './ScrollToTop';

describe('ScrollToTop', () => {
  beforeEach(() => {
    (global as unknown as { window: unknown }).window = {
      scrollTo: vi.fn(),
      location: { hash: '' },
      history: { scrollRestoration: 'auto' },
      requestAnimationFrame: vi.fn((cb) => {
        cb(0);
        return 1;
      }),
      cancelAnimationFrame: vi.fn(),
      setTimeout: vi.fn((cb) => {
        cb();
        return 1 as unknown as NodeJS.Timeout;
      }),
      clearTimeout: vi.fn(),
    };
    (global as unknown as { document: unknown }).document = {
      documentElement: { scrollTop: 100 },
      body: { scrollTop: 100 },
    };
  });

  afterEach(() => {
    delete (global as unknown as { window?: unknown }).window;
    delete (global as unknown as { document?: unknown }).document;
    vi.restoreAllMocks();
  });

  it('renders without throwing in a router environment', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/modulo/test-1']}>
        <ScrollToTop />
      </MemoryRouter>
    );

    expect(markup).toBe('');
  });
});
