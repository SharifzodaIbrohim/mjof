-- 011: subject filter for students and olympiads (M.J.O.F multi-subject)
ALTER TABLE olympiads ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS subject TEXT;
CREATE INDEX IF NOT EXISTS idx_olympiads_subject ON olympiads (subject);
CREATE INDEX IF NOT EXISTS idx_students_subject ON students (subject);
