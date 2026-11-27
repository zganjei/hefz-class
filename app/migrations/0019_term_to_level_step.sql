-- 0019: «ترم یا دوره» is removed from the UI. Before the dedicated سطح/گام fields (0018) people typed e.g. «سطح اول گام پنجم» into classes.term.
-- For classes whose level_name AND step_name are both empty, fill them from term when it parses cleanly with the 0018 vocabulary
-- (سطح اول; گام اول … گام پنجم; either part alone is fine). Never overwrites existing values; the term column is kept (additive, idempotent).
UPDATE classes SET
  level_name = CASE WHEN regexp_replace(term, '\s+', ' ', 'g') ~ '(^| )سطح اول( |$)' THEN 'سطح اول' END,
  step_name = (regexp_match(regexp_replace(term, '\s+', ' ', 'g'), '(?:^| )(گام (?:اول|دوم|سوم|چهارم|پنجم))(?: |$)'))[1]
WHERE COALESCE(level_name, '') = '' AND COALESCE(step_name, '') = ''
  AND term IS NOT NULL
  AND regexp_replace(term, '\s+', ' ', 'g') ~ '^(سطح اول)?( ?گام (اول|دوم|سوم|چهارم|پنجم))?$'
  AND btrim(term) <> '';
