# EduTimetable Pro - Hệ Thống Xếp Thời Khóa Biểu Tự Động & Phân Công Chuyên Môn

Ứng dụng desktop/web hiệu năng cao chuyên biệt cho việc xếp thời khóa biểu trường học (Tiểu học, THCS, THPT) với khả năng xử lý mượt mà hơn 100+ giáo viên, 50+ lớp học và hàng ngàn tiết giảng dạy.

---

## ✨ Tính Năng Nổi Bật

1. **Kiến Trúc Chuẩn Hóa Dữ Liệu (Normalized State $O(1)$)**:
   - Sử dụng Hash Maps (`Record<string, T>`) và **Zustand** quản lý state nguyên tử (Atomic State), chống giật lag khi cập nhật từng ô phân công.
   - Ảo hóa danh sách DOM với **@tanstack/react-virtual** cho thanh bên Giáo viên & Lưới nhập liệu, duy trì 60 FPS mượt mà.

2. **Module Nhập Liệu Tốc Độ Cao (Zero Mouse Clicks)**:
   - Điều hướng bàn phím chuẩn Excel: `Tab`, `Shift+Tab`, `Enter` tại cột cuối tự động tạo dòng mới và focus ngay vào cột Lớp.
   - Nhấn `Ctrl + Enter` (hoặc `Cmd + Enter`) để lưu và tự động nhảy sang giáo viên tiếp theo.
   - Gợi ý thông minh (Smart Autocomplete) theo thời gian thực cho Lớp và Môn học.
   - Nhớ môn học mặc định (Sticky Default) cho dòng tiếp theo.
   - Hỗ trợ dán trực tiếp từ Excel (Clipboard Paste: `Ctrl + V`).

3. **Cảnh Báo & Ràng Buộc Trực Quan**:
   - Cảnh báo vượt định mức giáo viên (> 19 tiết/tuần theo chuẩn Việt Nam) với huy hiệu và biểu ngữ nhấp nháy đỏ.
   - Tự động phát hiện và cảnh báo lớp học / môn học không hợp lệ.

4. **Thuật Toán Xếp Lịch Web Worker Đa Luồng (AI Constraint Solver)**:
   - Thuật toán Backtracking + MRV / Degree Heuristics tìm kiếm vị trí tối ưu không trùng tiết.
   - Đảm bảo phân bổ đều các môn (tránh 4 tiết Toán vào Thứ 2), gộp tiết đôi cho Văn/Thực hành, xếp đúng tiết Chào cờ & Sinh hoạt lớp.
   - Chạy trên **Web Worker** chạy ngầm, theo dõi tiến độ % và không gây đơ giao diện.

5. **Xuất Bản Chuẩn Thời Khóa Biểu Việt Nam**:
   - Bảng TKB Thứ 2 – Thứ 7, Tiết 1–5 (Sáng) & Tiết 6–10 (Chiều).
   - Xem theo Lớp, theo Giáo viên, hoặc Ma trận tổng thể toàn trường.
   - Xuất file Excel (.xlsx) chuẩn hóa và hỗ trợ in ấn (Print Layout).

---

## 🛠 Hướng Dẫn Cài Đặt & Chạy Cục Bộ

```bash
# Cài đặt thư viện
npm install

# Khởi chạy máy chủ phát triển
npm run dev
```

---

## 📦 Đóng Gói Thành File Cài Đặt Windows (.exe)

Ứng dụng hỗ trợ đóng gói qua Electron & electron-builder:

```bash
# Build mã nguồn và đóng gói file .exe (Setup + Portable)
npm run electron:build
```
File `.exe` sẽ được tạo trong thư mục `release/`.

---

## 🚀 Triển Khai Lên Vercel

```bash
# Deploy trực tiếp bằng Vercel CLI
npx vercel --prod
```
