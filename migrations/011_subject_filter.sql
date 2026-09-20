-- 011: subject filter for multi-subject olympiads (M.J.O.F)
-- Students and olympiads get optional subject column so physics student does not see math olympiad.

ALTER TABLE students ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE olympiads ADD COLUMN IF NOT EXISTS subject TEXT;

CREATE INDEX IF NOT EXISTS idx_students_subject ON students (subject);
CREATE INDEX IF NOT EXISTS idx_olympiads_subject ON olympiads (subject);
