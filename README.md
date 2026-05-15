# DataChat

> Hỏi đáp dữ liệu bằng ngôn ngữ tự nhiên — nạp CSV, ZIP hay SQLite, đặt câu hỏi tiếng Việt và nhận kết quả phân tích chính xác từ AI.

![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js)
![Text-to-SQL](https://img.shields.io/badge/Text--to--SQL-enabled-7dd4c0?style=flat-square)
![DeepSeek · Gemini](https://img.shields.io/badge/AI-DeepSeek%20%C2%B7%20Gemini-f0a05a?style=flat-square)
![Local](https://img.shields.io/badge/Chạy-Cục%20bộ-c084fc?style=flat-square)

---

## 00 · Yêu cầu hệ thống

| Thành phần | Yêu cầu |
|---|---|
| **Node.js** | Phiên bản 18 trở lên. Tải tại [nodejs.org](https://nodejs.org) |
| **Trình duyệt** | Chrome, Edge hoặc Firefox phiên bản mới nhất |
| **API Key** | Ít nhất một trong hai: **DeepSeek** hoặc **Gemini** |

---

## 01 · Cài đặt

**Bước 1 — Clone hoặc giải nén, rồi cài dependency**

```bash
cd demo
npm install
```

**Bước 2 — Tạo file `.env` cùng thư mục với `serve.js`**

```env
# Chọn ít nhất một
DEEPSEEK_API_KEY=sk-your-deepseek-key
GEMINI_API_KEY=your-gemini-key

# Tuỳ chọn
PORT=5500
CORS_ORIGIN=http://localhost:5500
DEEPSEEK_MODEL=deepseek-chat
GEMINI_MODEL=gemini-2.0-flash
```

> ⚠️ Không commit file `.env` lên Git. File đã được liệt kê trong `.gitignore`.

**Bước 3 — Khởi động máy chủ**

```bash
node serve.js
```

Mở trình duyệt tại `http://localhost:5500`

**Bước 4 — Chạy kiểm thử (tuỳ chọn)**

```bash
npm test
```

---

## 02 · Hướng dẫn sử dụng

### Nạp dữ liệu

Kéo thả file vào vùng Upload hoặc bấm để chọn. Ba định dạng được hỗ trợ:

| Định dạng | Mô tả |
|---|---|
| `.csv` | Một bảng — tên file xác định vai trò trong ứng dụng |
| `.zip` | Gói nhiều CSV, file `.db` / `.sqlite`, hoặc SQL mẫu |
| `.db` / `.sqlite` | Cơ sở dữ liệu SQLite, tối đa 3 bảng được ánh xạ tự động |

### Gợi ý đặt tên file / bảng

| Nhóm logic | Vai trò | Tên gợi ý |
|---|---|---|
| Sinh viên / khách hàng | `users` | `sinhvien`, `users`, `student`, `customers` |
| Thanh toán / điểm | `orders` | `thanhtoan`, `hocphi`, `orders`, `bang_diem` |
| Môn học / sản phẩm | `products` | `monhoc`, `products`, `course` |

### Chế độ Few-shot SQL

> ℹ️ Khuyến nghị bật. AI trả về JSON `{"sql", "explanation"}`, trình duyệt validate rồi chạy trực tiếp trên SQLite trong RAM bằng `sql.js` — hiển thị SQL, giải thích và bảng kết quả (tối đa 300 dòng).

### Ví dụ câu hỏi

- "Có bao nhiêu sinh viên?"
- "Trung bình điểm theo ngành?"
- "Top 5 môn có nhiều sinh viên đăng ký nhất?"

### Phím tắt

| Phím | Hành động |
|---|---|
| `Enter` | Gửi câu hỏi |
| `Shift + Enter` | Xuống dòng trong ô nhập |

### Tính năng khác

| Tính năng | Mô tả |
|---|---|
| `VI / EN` | Đổi ngôn ngữ giao diện |
| Lịch sử chat | Lưu trên `localStorage`, tối đa 30 cuộc; Xóa từng cuộc riêng lẻ |
| Schema | Bấm tên bảng → preview ~8 dòng trong khung chat |
| Xem toàn bộ | Modal duyệt toàn bộ dữ liệu đã nạp, có tìm kiếm |
| Thêm nguồn | Sidebar → Thêm nguồn dữ liệu → chọn file mới, lưu thành nguồn tách |

---

## 03 · Cấu trúc thư mục

```
demo/
├── index.html       # Giao diện chính
├── script.js        # Logic client — nạp file, chat, SQL pipeline
├── style.css        # Stylesheet
├── i18n.js          # Đa ngôn ngữ VI/EN
├── serve.js         # Máy chủ Node.js + proxy /api/chat
├── package.json
├── tests/           # Kiểm thử SQL pipeline
├── *.sqlite         # DB mẫu tuỳ chọn
└── README.md
```

---

## 04 · API máy chủ

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/` | Phục vụ file tĩnh (HTML, JS, CSS) |
| `POST` | `/api/chat` | Gửi câu hỏi + dataset tới DeepSeek/Gemini |
| `GET` | `/api/students` | Phân trang DB mẫu cố định |

### Request body — `/api/chat`

```json
{
  "provider": "DeepSeek",
  "mode": "sql",
  "messages": [{ "role": "user", "content": "Đếm số sinh viên" }],
  "dataset": { "meta": {}, "schema": {}, "aggregates": {} }
}
```

---

## 05 · Xử lý sự cố

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| **Thiếu API Key** | Chưa có `.env` hoặc key sai | Tạo `.env`, restart `node serve.js` |
| **Không gửi được chat** | Chưa nạp dữ liệu | Nạp ít nhất một CSV/ZIP/SQLite |
| **Failed to fetch** | Server chưa chạy hoặc sai cổng | Chạy `node serve.js`, mở đúng `localhost:5500` |
| **ZIP không hợp lệ** | Không nhận diện được CSV/SQLite/SQL bên trong | Đổi tên file theo bảng gợi ý ở mục 02 |
| **SQL lỗi schema** | AI dùng tên bảng/cột không tồn tại | Bật Few-shot SQL; kiểm tra tên cột trong sidebar Schema |
| **Merge quá lớn** | Vượt ~1M dòng mới | Chia nhỏ file hoặc thay workspace thay vì gộp |

---

## 06 · Giới hạn cần biết

- Dữ liệu chỉ sống trong bộ nhớ trình duyệt — tải lại trang sẽ mất. Lịch sử chat vẫn được giữ qua `localStorage`.
- Dataset rất lớn (> vài chục MB) có thể làm trình duyệt chậm.
- Dropdown **Claude** và **GPT-4o** trên UI chưa được triển khai ở backend — chỉ **DeepSeek** và **Gemini** hoạt động.
- Chế độ SQL chỉ cho phép truy vấn **đọc** (`SELECT` / `WITH`).
- Nút kẹp giấy (đính kèm file) hiện chỉ hiển thị trên UI, chưa gửi nội dung file lên AI.

---
