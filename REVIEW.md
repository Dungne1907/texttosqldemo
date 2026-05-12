# CODE REVIEW: DataChat Application

**Ngày Review:** May 13, 2026  
**Phiên bản:** 1.0  
**Trạng thái:** ✅ Hoạt động được

---

## 📋 TÓM TẮT KIẾN TRÚC

### Stack Công Nghệ
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend:** Node.js (Express-like HTTP server)
- **Database:** SQLite (via sql.js)
- **AI APIs:** DeepSeek, Gemini, Claude, GPT-4o (chỉ frontend selection, backend dùng DeepSeek/Gemini)
- **Localization:** i18n hỗ trợ Tiếng Việt + English
- **Libraries:** JSZip (xử lý file ZIP), sql.js (đọc SQLite), marked (markdown rendering)

---

## 🏗️ CẤU TRÚC THÀNH PHẦN

### 1. **Backend (serve.js)**
```
serve.js
├── loadDotEnv()              → Đọc file .env
├── safeResolve()             → Xác thực đường dẫn file
├── readRequestBody()         → Đọc request body
├── httpsJson()               → Gọi HTTPS API
├── callDeepSeek()            → Gọi API DeepSeek
├── callGemini()              → Gọi API Gemini
├── handleChat()              → Xử lý POST /api/chat
└── server.listen()           → Server HTTP trên port 5500
```

**Chức năng chính:**
- Phục vụ file tĩnh (HTML, CSS, JS, images)
- Xử lý yêu cầu `/api/chat` - gọi AI với system prompt
- Hỗ trợ CORS cho requests từ client
- Load API keys từ `.env`

### 2. **Frontend (script.js - ~1500 lines)**

#### **A. Data Management**
- `dataSources[]` - Danh sách các nguồn dữ liệu
- `activeSourceId` - ID nguồn dữ liệu hiện tại
- `appData` - Object với 3 bảng: `users`, `orders`, `products`

#### **B. Module CSV Parsing**
```javascript
parseCsvRow()              → Parse dòng CSV (RFC 4180 compliant)
parseCsvText()             → Chuyển toàn bộ text CSV → mảng objects
csvFileToBundle()          → Từ file .csv → {users, orders, products}
```

#### **C. Module SQLite**
```javascript
loadSqlJsModule()          → Tải sql.js từ CDN
sqliteTableNames()         → Lấy danh sách bảng từ DB
sqliteSelectAllObjects()   → SELECT * từ bảng → mảng objects
readSqliteBundleFromBuffer() → Đọc .sqlite buffer → bundle
selectThreeSqliteTableNames() → Map 1-3 bảng → users/orders/products
```

#### **D. Module ZIP Processing**
```javascript
extractZipBundle()         → Trích CSV / .sqlite từ ZIP
resolveZipCsvPartial()     → Chọn 1-3 CSV (NEW - hỗ trợ partial)
resolveZipCsvTriple()      → (Deprecated) Chọn 3 CSV bắt buộc
inferTableRoleFromFilename() → Đoán role từ tên file
```

#### **E. Module Chat**
```javascript
sendChat()                 → Gửi câu hỏi → API
handleChat()               → Xử lý response từ AI
appendUserBubble()         → Thêm bubble tin nhắn user
appendAssistantBubble()    → Thêm bubble phản hồi AI
computeAggregates()        → Tính toán sum/avg/min/max trên cột số
```

#### **F. Module UI/UX**
```javascript
applyLocale()              → Áp dụng ngôn ngữ (i18n)
updateDbStatus()           → Cập nhật status indicator
renderDataSourcesList()    → Render danh sách nguồn dữ liệu
updateSchemaCounts()       → Hiển thị số dòng mỗi bảng
handleSchemaTableClick()   → Xem preview bảng
```

#### **G. Module Database Viewer Modal**
```javascript
openDbModal()              → Mở modal xem toàn bộ dữ liệu
renderDbTable()            → Render bảng với pagination (50 dòng/trang)
initDbModal()              → Setup modal controls
```

### 3. **Frontend (index.html)**

**Layout:**
```
┌─────────────────────────────────┐
│  TOPBAR (Logo, Lang, API Select)│
├──────────┬──────────────────────┤
│          │                      │
│ SIDEBAR  │      MAIN            │
│ (Data,   │  • Upload Section    │
│ History, │  • Chat Area         │
│ Schema)  │  • Input Bar         │
│          │                      │
└──────────┴──────────────────────┘
```

**Sections:**
- **Upload Area:** Kéo thả / chọn file CSV/ZIP/SQLite
- **Chat Area:** Hiển thị lịch sử chat (user/bot messages)
- **Input Bar:** Nhập câu hỏi, Shift+Enter xuống dòng
- **Sidebar:** Data sources, History, Schema viewer
- **Modal DB Viewer:** Xem toàn bộ bảng với pagination

### 4. **Frontend (style.css)**
- Sử dụng CSS variables (--color-*, --border, etc.)
- Responsive design (mobile + desktop)
- Dark/Light theme support
- Animation & transition smooth

### 5. **Localization (i18n.js)**
- 80+ translation strings
- Support: `vi` (Vietnamese), `en` (English)
- Functions: `t(key)`, `tf(key, params)`, `getLang()`, `setLang()`

---

## 🔄 LUỒNG DỮ LIỆU

### Scenario 1: Upload & Load Data
```
1. User kéo thả file hoặc chọn qua input
   ↓
2. handleFileUploadWithFile(file, mode)
   • mode = "replace" | "addSource" | "merge"
   ↓
3. Phân loại file:
   a) .csv → csvFileToBundle()
   b) .zip → extractZipBundle() → kiểm tra CSV / SQLite / SQL
   c) .sqlite / .db → readSqliteBundleFromBuffer()
   ↓
4. Nếu thành công:
   • replaceWorkspaceWithBundle() → thay toàn bộ dữ liệu
   • addBundleAsNewSource() → thêm vào danh sách sources
   • mergeBundleIntoActiveSource() → gộp vào dữ liệu hiện tại
   ↓
5. Cập nhật UI:
   • updateDbStatus()
   • renderDataSourcesList()
   • updateSchemaCounts()
```

### Scenario 2: Chat with AI
```
1. User nhập câu hỏi + bấm Enter/Send
   ↓
2. sendChat():
   • Lấy message từ input
   • Lấy provider (DeepSeek / Gemini)
   • Tạo dataset JSON (preview 80 dòng/bảng, aggregates)
   ↓
3. POST /api/chat:
   {
     provider: "deepseek|gemini",
     messages: [{role: "user", content: "..."}],
     dataset: {users, orders, products, meta, aggregates}
   }
   ↓
4. Backend (serve.js):
   • Kiểm tra API key từ process.env
   • Tạo system prompt từ SYSTEM_PREFIX + JSON dataset
   • Gọi API (callDeepSeek / callGemini)
   ↓
5. Response:
   • Parse JSON reply từ AI
   • appendAssistantBubble(html) → hiển thị
   • addSidebarHistoryItem() → lưu vào history
```

### Scenario 3: View Table Schema
```
1. User click nút bảng (SinhVien / ThanhToan / MonHoc) trong sidebar
   ↓
2. handleSchemaTableClick(role, tableLabel):
   • Lấy mảng rows từ appData[role]
   • Lấy 8 dòng đầu để preview
   • Render HTML table
   ↓
3. Hiển thị modal với:
   • Tên bảng + số dòng tổng
   • Header (column names)
   • Body (preview rows)
```

---

## ✅ ĐIỂM MẠNH

### 1. **Tính Năng & Khả Năng**
- ✅ Hỗ trợ 1-3 CSV files (không bắt buộc đầy đủ 3)
- ✅ Hỗ trợ SQLite database trực tiếp (.db, .sqlite)
- ✅ Hỗ trợ ZIP file (chứa CSV / SQLite)
- ✅ Quản lý nhiều nguồn dữ liệu (switch between sources)
- ✅ Merge / append dữ liệu từ nhiều file
- ✅ Tính toán aggregates (sum, avg, min, max) trên toàn bộ dữ liệu
- ✅ Preview 80 dòng + aggregates gửi lên AI
- ✅ Modal viewer xem toàn bộ bảng với pagination (50 dòng/page)
- ✅ CSV parser RFC 4180 compliant (xử lý quoted values)

### 2. **Bảo Mật & Stability**
- ✅ Escape HTML để tránh XSS (`escapeHtml()`)
- ✅ Validate file extension
- ✅ Safe path resolution (`safeResolve()`)
- ✅ Error handling chi tiết (try-catch, user feedback)
- ✅ CORS headers được cấu hình
- ✅ Payload size limit (4MB)

### 3. **UX/UI**
- ✅ Giao diện clean, modern
- ✅ Localization Tiếng Việt + English
- ✅ Responsive design
- ✅ Quick chips với ví dụ câu hỏi
- ✅ Status indicator + message feedback
- ✅ Sidebar history tracking
- ✅ DB modal viewer với search/filter

### 4. **Code Quality**
- ✅ Code modular, well-organized (functions grouped by feature)
- ✅ Clear naming conventions
- ✅ Comments cho logic phức tạp
- ✅ No global state pollution (dataSources, appData managed)
- ✅ Async/await pattern consistent

### 5. **Performance**
- ✅ Client-side file parsing (CSV, ZIP, SQLite)
- ✅ Preview data limiting (80 rows per table)
- ✅ Pagination trong DB viewer (50 rows per page)
- ✅ No duplicate renders

---

## ⚠️ ĐIỂM CẦN CẢI THIỆN

### 1. **Logic & Edge Cases**
| Issue | Severity | Description |
|-------|----------|-------------|
| **Missing validation** | Medium | Không validate số lượng records khi merge (có thể OOM nếu merge 100k+ records) |
| **CSV header case-sensitive** | Low | Header names không normalize (VD: "Name" vs "name" → cột khác nhau) |
| **SQL injection risk** | Low | sqliteSelectAllObjects dùng backticks nhưng vẫn nên dùng parameterized query |
| **Blank table names** | Low | Không filter out empty/whitespace table names từ SQLite |

### 2. **Error Handling**
| Issue | Severity |
|-------|----------|
| Generic "ZIP không hợp lệ" message | Medium | Người dùng không biết lỗi chính xác là gì |
| No retry logic cho API calls | Low | Nếu API timeout, không retry |
| Silent failures trong JSZip | Low | Lỗi extract ZIP không log chi tiết |

### 3. **Missing Features**
| Feature | Priority |
|---------|----------|
| Column filtering / rearrange | Low |
| Export chat history | Low |
| Persist appData (localStorage) | Medium |
| Dark mode toggle | Low |
| Rate limiting on API calls | Medium |
| Support cho numeric data type inference | Low |

### 4. **Performance Issues**
| Issue | Impact |
|-------|--------|
| Entire dataset in memory | Medium | Nếu dataset > 100MB, browser sẽ lag |
| No lazy loading | Low | Toàn bộ bảng load cùng lúc |
| re-render UI on every data change | Low | Có thể optimize với virtual scrolling |

### 5. **Code Cleanliness**
| Issue | Type |
|-------|------|
| `resolveZipCsvTriple()` là deprecated nhưng vẫn tồn tại | Code smell |
| `SYSTEM_PREFIX` là hardcoded string (>300 chars) | Code smell |
| Missing JSDoc comments cho public functions | Documentation |
| No unit tests | Testing |

### 6. **UI/UX Issues**
| Issue | User Impact |
|-------|------------|
| API dropdown (Claude, GPT-4o) không hoạt động backend | Confusing |
| Không rõ lỗi khi upload file (quá lớn, sai format) | Frustration |
| History sidebar không sortable/filterable | Usability |
| Attach file button → không rõ có gửi file lên AI không | Unclear behavior |

---

## 🔧 ĐỀ XUẤT SỬA

### Priority: HIGH
```javascript
// 1. Validate merge size
function mergeBundleIntoActiveSource(bundle, fileLabel) {
    const MERGE_LIMIT = 1000000; // 1M records
    const totalNew = (bundle.users?.length || 0) + 
                     (bundle.orders?.length || 0) + 
                     (bundle.products?.length || 0);
    if (totalNew > MERGE_LIMIT) {
        showStatus("File quá lớn để merge", true);
        return;
    }
    // ... rest of code
}

// 2. Normalize CSV headers
function normalizeHeaders(headers) {
    return headers.map(h => h.trim().toLowerCase());
}

// 3. Better error messages
try {
    const r = await extractZipBundle(file);
} catch (error) {
    showStatus(`ZIP Error: ${error.message} (Chi tiết: ${error.code})`, true);
}
```

### Priority: MEDIUM
```javascript
// 1. Add localStorage persistence
function persistAppData() {
    localStorage.setItem('dataSources', JSON.stringify(dataSources));
}

function loadAppData() {
    const saved = localStorage.getItem('dataSources');
    if (saved) dataSources = JSON.parse(saved);
}

// 2. Implement API retry logic
async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fetch(url, options);
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
}

// 3. Rate limiting
const API_CALL_LIMIT = 10; // per minute
let apiCallCount = 0;
setInterval(() => apiCallCount = 0, 60000);
```

### Priority: LOW (Nice to have)
- Thêm JSDoc comments
- Implement unit tests (Jest)
- Add virtual scrolling cho DB viewer
- Support column type inference (number, date, text)
- Export chat to JSON/PDF
- Dark mode toggle

---

## 📊 METRICS

| Metric | Value | Status |
|--------|-------|--------|
| Total Lines (script.js) | ~1500 | ✅ Manageable |
| Total Functions | ~60+ | ✅ Well-organized |
| External Dependencies | 5 | ✅ Minimal |
| Test Coverage | 0% | ⚠️ None |
| Browser Support | Modern browsers | ✅ Good |
| Mobile Responsive | Yes | ✅ Good |
| Accessibility | Partial (ARIA labels) | ⚠️ Could improve |

---

## 🎯 KẾT LUẬN

**Trạng thái:** ✅ **PRODUCTION READY (với cảnh báo)**

### Kết luận chung:
- ✅ Ứng dụng hoạt động tốt, logic rõ ràng
- ✅ Hỗ trợ đầy đủ các format file (CSV/ZIP/SQLite)
- ✅ UI/UX tinh tế, multi-language support tốt
- ⚠️ Cần thêm validation, error handling, tests
- ⚠️ Cần xem xét scale (memory usage với dataset lớn)

### Priority sửa:
1. ✅ Merge size validation
2. ✅ Better error messages
3. ✅ localStorage persistence
4. ✅ API retry logic

### Tuần sau nên làm:
- [ ] Add unit tests
- [ ] Implement rate limiting
- [ ] Improve accessibility (WCAG 2.1 AA)
- [ ] Performance profiling

---

**Review hoàn thành:** 2025-05-13 | **Reviewer:** GitHub Copilot
