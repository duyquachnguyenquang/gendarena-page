<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Quy Tắc Làm Việc Của Agent (User Instructions)
1. **Thực hiện yêu cầu ngay lập tức**: Khi người dùng yêu cầu thì bắt tay vào làm liền, xong không cần test screenshot / browser testing, người dùng sẽ tự test.
2. **Tự động chạy build**: Sau khi hoàn thành các thay đổi, tự động chạy `npm run build` để đảm bảo code không lỗi build. Người dùng chỉ cần chạy `npm start`.
3. **Tiết kiệm token**: Chỉ đọc các file thực sự cần thiết, tránh đọc thừa hoặc lan man để tối ưu chi phí và token.
