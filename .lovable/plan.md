

# Ứng dụng AI Thị giác Máy tính - Phân tích Chuyển động Cơ học

## Tổng quan
Ứng dụng web cho phép upload video thực nghiệm, sử dụng AI (Lovable AI với Gemini vision) để phân tích các loại chuyển động cơ học, tracking quỹ đạo và so sánh với lý thuyết vật lý.

## Trang chính - Dashboard
- Header với tên nghiên cứu, logo
- Navigation: Upload Video | Phân tích | Kết quả | Hướng dẫn

## Tính năng 1: Upload & Preview Video
- Khu vực kéo thả / chọn file video (mp4, webm)
- Preview video với thanh điều khiển
- Trích xuất frame tự động từ video (sử dụng Canvas API trên trình duyệt)
- Cho phép chọn vùng quan tâm (ROI) trên video

## Tính năng 2: Phân tích AI
- Gửi các frame trích xuất lên Lovable AI (Gemini vision) qua Edge Function
- AI phân tích và nhận diện:
  - Loại chuyển động (thẳng đều, biến đổi đều, tròn, dao động, projectile...)
  - Vị trí vật thể qua từng frame
  - Ước tính vận tốc, gia tốc
- Hiển thị tiến trình phân tích real-time

## Tính năng 3: Tracking Quỹ đạo
- Vẽ overlay quỹ đạo lên video gốc (Canvas)
- Đánh dấu vị trí vật theo thời gian
- Animation replay quỹ đạo
- Xuất hình ảnh quỹ đạo

## Tính năng 4: So sánh Lý thuyết vs Thực nghiệm
- Dựa trên loại chuyển động AI nhận diện, áp dụng công thức vật lý tương ứng
- Đồ thị so sánh: đường lý thuyết (công thức) vs dữ liệu thực nghiệm (AI)
- Tính sai số phần trăm
- Bảng thông số: vận tốc ban đầu, gia tốc, chu kỳ...

## Tính năng 5: Báo cáo kết quả
- Tổng hợp kết quả phân tích
- Đồ thị x-t, v-t (từ dữ liệu AI)
- Bảng số liệu chi tiết
- Kết luận AI về loại chuyển động

## Công nghệ
- Frontend: React + Tailwind + Recharts (đồ thị) + Canvas API (tracking overlay)
- Backend: Supabase Edge Function gọi Lovable AI (Gemini 2.5 Pro - hỗ trợ vision)
- Không cần database, xử lý hoàn toàn client-side + AI

## Thiết kế
- Giao diện khoa học, chuyên nghiệp
- Tone màu xanh dương đậm + trắng
- Font rõ ràng, dễ đọc
- Responsive

