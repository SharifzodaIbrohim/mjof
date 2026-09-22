-- M.J.O.F content/news store (persistent on Neon)
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'news',
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT 'M.J.O.F',
  featured BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT true,
  lang TEXT NOT NULL DEFAULT 'tg',
  url TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_items_published
  ON content_items (published, featured DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_items_type
  ON content_items (type);
