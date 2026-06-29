import { useState } from 'preact/hooks';

export default function CategoryCard({ categories }) {
  const [sortMode, setSortMode] = useState('count');

  const sorted = [...categories].sort((a, b) =>
    sortMode === 'count'
      ? b.count - a.count || a.name.localeCompare(b.name)
      : a.name.localeCompare(b.name)
  );

  return (
    <div
      class="widget"
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-lg)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-md)',
        }}
      >
        <h3
          style={{
            fontSize: '0.68rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}
        >
          分類
        </h3>
        <button
          onClick={() => setSortMode(m => (m === 'count' ? 'name' : 'count'))}
          style={{
            fontSize: '0.65rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-text-secondary)',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.15rem 0.45rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {sortMode === 'count' ? '依名稱' : '依熱門度'}
        </button>
      </div>
      <ul
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-xs)',
          maxHeight: '20rem',
          overflowY: 'auto',
          listStyle: 'none',
          margin: 0,
          padding: 0,
          paddingRight: '10px',
        }}
      >
        {sorted.map(cat => (
          <li key={cat.name}>
            <a
              href={`/tags/${encodeURIComponent(cat.name)}`}
              class="cat-link"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                padding: 'var(--space-sm) 0',
                textDecoration: 'none',
              }}
            >
              {cat.name}
              <span
                style={{
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text-secondary)',
                  background: 'var(--color-bg)',
                  padding: '0.1rem 0.45rem',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {cat.count}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
