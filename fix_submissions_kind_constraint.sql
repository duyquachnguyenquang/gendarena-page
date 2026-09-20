-- ══════════════════════════════════════════════════════════════════════════════
-- GEND ARENA - FIX CHECK CONSTRAINT FOR SUBMISSIONS: submission_kind
-- ══════════════════════════════════════════════════════════════════════════════
-- Vấn đề: Khi thí sinh nộp kết hợp 1 File + 1 Link (hoặc ngược lại), hệ thống
-- lưu `submission_kind = 'both'`. Bảng `submissions` hiện tại có check constraint
-- `submissions_submission_kind_check` chỉ cho phép ('file', 'link'), dẫn tới lỗi:
-- "new row for relation "submissions" violates check constraint "submissions_submission_kind_check""
--
-- Hướng dẫn áp dụng:
-- Copy toàn bộ nội dung file này và chạy trong Supabase SQL Editor (Dashboard > SQL Editor > Run).
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Xóa ràng buộc CHECK cũ trên bảng submissions
ALTER TABLE public.submissions 
  DROP CONSTRAINT IF EXISTS submissions_submission_kind_check;

-- 2. Tạo lại ràng buộc CHECK mới hỗ trợ đầy đủ các kiểu nộp bài:
--    - 'file' : Cả 2 deliverables đều nộp bằng file tải lên
--    - 'link' : Cả 2 deliverables đều nộp bằng link trực tuyến
--    - 'both' : Kết hợp 1 bên file, 1 bên link
--    - 'multi': Hỗ trợ mở rộng nộp nhiều thành phần
ALTER TABLE public.submissions 
  ADD CONSTRAINT submissions_submission_kind_check 
  CHECK (submission_kind IN ('file', 'link', 'both', 'multi'));

-- 3. Đồng bộ tương tự cho bảng submission_history (nếu có constraint)
ALTER TABLE public.submission_history 
  DROP CONSTRAINT IF EXISTS submission_history_submission_kind_check;

ALTER TABLE public.submission_history 
  ADD CONSTRAINT submission_history_submission_kind_check 
  CHECK (submission_kind IN ('file', 'link', 'both', 'multi'));

-- 4. Xác nhận kết quả
SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname IN ('submissions', 'submission_history')
  AND conname LIKE '%submission_kind%';
