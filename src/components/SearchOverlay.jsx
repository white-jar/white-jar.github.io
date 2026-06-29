import { useState, useEffect, useRef, useCallback } from 'preact/hooks';

export default function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [pagefind, setPagefind] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef(null);
  const overlayRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open && !pagefind) {
      import(location.origin + '/pagefind/pagefind.js').then(mod => {
        setPagefind(mod);
      });
    }
  }, [open, pagefind]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    if (!pagefind || !query.trim()) {
      setResults([]);
      setSelectedIndex(-1);
      setHasSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      setHasSearched(true);
      const search = await pagefind.search(query);
      const data = await Promise.all(
        search.results.slice(0, 10).map(r => r.data())
      );
      setResults(data);
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, pagefind]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
    setHasSearched(false);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => {
        const next = i + 1;
        if (next >= results.length) return 0;
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => {
        const prev = i - 1;
        if (prev < 0) return results.length - 1;
        return prev;
      });
    } else if (e.key === 'Enter' && results.length > 0) {
      const idx = selectedIndex >= 0 ? selectedIndex : 0;
      window.location.href = results[idx].url;
      close();
    }
  };

  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[selectedIndex];
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <>
      <button
        class="nav-search"
        onClick={() => setOpen(true)}
        aria-label="開啟搜尋"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <span>搜尋文章...</span>
      </button>

      {open && (
        <div
          class="search-overlay"
          ref={overlayRef}
          onClick={(e) => { if (e.target === overlayRef.current) close(); }}
        >
          <div class="search-modal">
            <input
              ref={inputRef}
              type="text"
              class="search-input"
              placeholder="輸入關鍵字搜尋文章..."
              value={query}
              onInput={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <div class="search-results" ref={listRef}>
              {loading && <div class="search-status">搜尋中...</div>}
              {!loading && hasSearched && query.trim() && results.length === 0 && (
                <div class="search-status">無符合結果</div>
              )}
              {!hasSearched && !query.trim() && (
                <div class="search-status">輸入關鍵字開始搜尋</div>
              )}
              {results.map((result, i) => (
                <a
                  key={result.id || result.url}
                  href={result.url}
                  class={`search-result ${i === selectedIndex ? 'selected' : ''}`}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={close}
                >
                  <div class="search-result-title">{result.title}</div>
                  <div class="search-result-excerpt" dangerouslySetInnerHTML={{ __html: result.excerpt }} />
                  {result.meta?.date && (
                    <div class="search-result-date">{result.meta.date}</div>
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .nav-search {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: 0.375rem 0.75rem;
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          cursor: pointer;
          font-family: inherit;
          transition: border-color 0.2s;
        }
        .nav-search:hover {
          border-color: var(--color-accent-muted);
        }
        .nav-search svg {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
          opacity: 0.4;
        }
        .search-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 15vh;
          animation: overlayFadeIn 0.15s ease-out;
        }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .search-modal {
          width: min(640px, 90vw);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          overflow: hidden;
          animation: modalSlideIn 0.2s ease-out;
        }
        @keyframes modalSlideIn {
          from { transform: translateY(-12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .search-input {
          width: 100%;
          padding: var(--space-lg);
          font-size: 1.1rem;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text);
          outline: none;
          box-sizing: border-box;
        }
        .search-input::placeholder {
          color: var(--color-text-secondary);
          opacity: 0.6;
        }
        .search-results {
          max-height: 60vh;
          overflow-y: auto;
        }
        .search-status {
          padding: var(--space-lg);
          text-align: center;
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }
        .search-result {
          display: block;
          padding: var(--space-md) var(--space-lg);
          text-decoration: none;
          color: var(--color-text);
          border-bottom: 1px solid var(--color-border);
          transition: background 0.1s;
        }
        .search-result:last-child {
          border-bottom: none;
        }
        .search-result:hover,
        .search-result.selected {
          background: var(--color-bg);
        }
        .search-result-title {
          font-weight: 600;
          font-size: 0.95rem;
          margin-bottom: 0.2rem;
        }
        .search-result-excerpt {
          font-size: 0.82rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }
        .search-result-excerpt mark {
          background: var(--color-accent-soft);
          color: var(--color-accent);
          border-radius: 2px;
          padding: 0 2px;
        }
        .search-result-date {
          font-size: 0.72rem;
          color: var(--color-text-secondary);
          margin-top: 0.2rem;
          opacity: 0.7;
          font-family: var(--font-mono);
        }
        @media (max-width: 768px) {
          .search-overlay {
            padding-top: 10vh;
            align-items: stretch;
          }
          .search-modal {
            width: 100%;
            border-radius: 0;
            margin: 0 var(--space-sm);
            align-self: flex-start;
          }
          .search-input {
            padding: var(--space-md);
            font-size: 1rem;
          }
          .search-result {
            padding: var(--space-sm) var(--space-md);
          }
        }
      `}</style>
    </>
  );
}
