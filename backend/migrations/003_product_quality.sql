BEGIN;

ALTER TABLE repositories ADD COLUMN IF NOT EXISTS review_instructions TEXT NOT NULL DEFAULT '';
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS minimum_confidence NUMERIC(3,2) NOT NULL DEFAULT 0.65
  CHECK (minimum_confidence >= 0 AND minimum_confidence <= 1);
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS minimum_severity TEXT NOT NULL DEFAULT 'low'
  CHECK (minimum_severity IN ('critical', 'high', 'medium', 'low'));
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS post_to_github BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS github_comment_url TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS validation_metadata JSONB;

CREATE TABLE IF NOT EXISTS finding_feedback (
  id BIGSERIAL PRIMARY KEY,
  review_id BIGINT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  finding_key TEXT NOT NULL,
  disposition TEXT NOT NULL CHECK (disposition IN ('accepted', 'dismissed')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (review_id, user_id, finding_key)
);

CREATE INDEX IF NOT EXISTS finding_feedback_review_id_idx ON finding_feedback(review_id);
CREATE INDEX IF NOT EXISTS finding_feedback_user_id_idx ON finding_feedback(user_id);

COMMIT;
