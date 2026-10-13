# 🚀 Hướng Dẫn Đưa Vietlott Analyzer Pro Lên Online

Hệ thống được thiết kế theo triết lý **Ponytail**: 100% Client-side Static Web + Tự động lưu trữ trên LocalStorage + Kết nối API đám mây. Bạn có thể triển khai lên **Vercel, Cloudflare Pages hoặc GitHub Pages** hoàn toàn **MIỄN PHÍ** trong chưa đầy 3 phút!

---

## ⚡ Cách 1: Đưa lên GitHub Pages (Dễ nhất & Ổn định nhất)

1. Mở PowerShell trong thư mục này và khởi tạo Git:
   ```powershell
   git init
   git add .
   git commit -m "feat: Glassmorphism UI Vietlott Analyzer Pro"
   ```
2. Tạo một Repository mới trên GitHub (ví dụ: `vietlott-analyzer`).
3. Đẩy code lên GitHub:
   ```powershell
   git remote add origin https://github.com/<tai_khoan_cua_ban>/vietlott-analyzer.git
   git branch -M main
   git push -u origin main
   ```
4. Trên trang GitHub của bạn: Vào **Settings** -> **Pages** -> Chọn **Deploy from a branch** -> Chọn nhánh **main** / **root** -> Bấm **Save**.
5. Sau 1 phút, bạn sẽ có link online: `https://<tai_khoan_cua_ban>.github.io/vietlott-analyzer/`

---

## ⚡ Cách 2: Đưa lên Cloudflare Pages (Tốc độ toàn cầu cực nhanh)

1. Đăng nhập [dash.cloudflare.com](https://dash.cloudflare.com).
2. Vào mục **Workers & Pages** -> Bấm **Create application** -> Chọn tab **Pages**.
3. **Cách trực tiếp không cần Git:**
   * Chọn **Upload assets**.
   * Đặt tên project (ví dụ: `vietlott-pro`).
   * Kéo thả trực tiếp file `index.html` lên.
   * Bấm **Deploy site** -> Bạn nhận ngay tên miền miễn phí trọn đời: `https://vietlott-pro.pages.dev`!

---

## ⚡ Cách 3: Đưa lên Vercel

1. Cài đặt Vercel CLI (nếu có): `npm i -g vercel` rồi gõ `vercel`.
2. Hoặc đăng nhập [vercel.com](https://vercel.com) -> Import Repository GitHub từ Cách 1 -> Bấm **Deploy**.
3. Vercel tự động cấp tên miền SSL: `https://vietlott-analyzer.vercel.app`.

---

## 🤖 Về Telegram Bot (@VietlottSuper_bot) khi online

* **Trang web `index.html`** chạy online (Vercel / Cloudflare) sẽ hoạt động độc lập trên mọi thiết bị (iPhone, Android, Laptop) mà không cần cài đặt gì.
* **Telegram Bot** cần một tiến trình Python chạy nền:
  * Bạn có thể chạy trên máy tính cá nhân khi cần.
  * Hoặc deploy script `automation_daemon.py` lên dịch vụ đám mây miễn phí như **Render.com** (Web Service miễn phí), **Railway.app**, hoặc **Koyeb** để bot chạy online 24/7.
