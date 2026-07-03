/**
 * Migration SQL to fix enrollment_status for existing batches
 * 
 * Run this in phpMyAdmin after PR merge to clean up existing data
 * 
 * This script:
 * 1. Sets enrollment_status to 'ENROLLED' for students in current/future batches
 * 2. Sets enrollment_status to NULL for students only in completed batches
 */

-- Step 1: Set ENROLLED for students in current/future batches
-- This updates students who are in active batches but have NULL or other enrollment_status
UPDATE vastudents AS s
INNER JOIN vastudent_to_batch AS sb ON s.id = sb.student_id
INNER JOIN vabatches AS b ON sb.batch_id = b.id
SET s.enrollment_status = 'ENROLLED'
WHERE (b.courseend IS NULL OR b.courseend >= CURDATE())
  AND (b.status IS NULL OR UPPER(b.status) <> 'COMPLETE')
  AND (s.enrollment_status IS NULL OR s.enrollment_status <> 'ENROLLED');

-- Step 2: Set NULL for students only in completed batches
-- This updates students who are marked as ENROLLED but only belong to completed batches
UPDATE vastudents AS s
SET s.enrollment_status = NULL
WHERE s.enrollment_status = 'ENROLLED'
  AND NOT EXISTS (
    SELECT 1
    FROM vastudent_to_batch AS sb2
    JOIN vabatches AS b2 ON b2.id = sb2.batch_id
    WHERE sb2.student_id = s.id
      AND (b2.courseend IS NULL OR b2.courseend >= CURDATE())
      AND (b2.status IS NULL OR UPPER(b2.status) <> 'COMPLETE')
  );

-- Verification queries (optional - run these to check results)
-- Check how many students are now ENROLLED
-- SELECT COUNT(*) as enrolled_count FROM vastudents WHERE enrollment_status = 'ENROLLED';

-- Check how many students are Unassigned (NULL)
-- SELECT COUNT(*) as unassigned_count FROM vastudents WHERE enrollment_status IS NULL;

-- Check students in active batches with wrong status
-- SELECT s.id, s.name, s.enrollment_status, b.id as batch_id, b.courseend, b.status
-- FROM vastudents s
-- INNER JOIN vastudent_to_batch sb ON s.id = sb.student_id
-- INNER JOIN vabatches b ON sb.batch_id = b.id
-- WHERE (b.courseend IS NULL OR b.courseend >= CURDATE())
--   AND (b.status IS NULL OR UPPER(b.status) <> 'COMPLETE')
--   AND s.enrollment_status <> 'ENROLLED';

