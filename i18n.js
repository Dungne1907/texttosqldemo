/** @type {Record<string, Record<string, string>>} */
const I18N_STRINGS = {
    vi: {
        gateLangTitle: "Chọn ngôn ngữ",
        gateLangSubtitle: "Chọn Tiếng Việt hoặc English để tiếp tục.",
        langVi: "Tiếng Việt",
        langEn: "English",
        gateGuideTitle: "Hướng dẫn sử dụng",
        gateGuideIntro:
            "Ứng dụng cho phép bạn hỏi AI về dữ liệu đã nạp (tối đa ba nhóm: users, orders, products — có thể chỉ dùng một hoặc hai nhóm).",
        gateGuideStep1: "Chạy máy chủ: đặt khóa API trong file .env cạnh serve.js (DEEPSEEK_API_KEY hoặc GEMINI_API_KEY), rồi chạy node serve.js.",
        gateGuideStep2:
            "Nạp dữ liệu: một file .zip (CSV, SQLite .db, SQL mẫu) hoặc từng file .csv — không nhất thiết đủ ba nhóm; tên file nên gợi ý users, orders hoặc products.",
        gateGuideStep3: "Chọn nhà cung cấp API (DeepSeek hoặc Gemini), nhập câu hỏi tiếng Việt; phần xem trước gửi lên mô hình tối đa 80 dòng mỗi bảng.",
        gateGuideStep4: "Enter gửi tin nhắn, Shift+Enter xuống dòng. Có thể dùng các ví dụ câu hỏi bên dưới khung chat.",
        gateGuideOk: "OK — Vào ứng dụng",
        titlePage: "Data Chat — Gemini / DeepSeek",
        appTitle: "Data Chat",
        apiLabel: "API:",
        sidebarDataSection: "Dữ liệu",
        sidebarHistorySection: "Lịch sử",
        sidebarSchemaSection: "Schema",
        sidebarLiveDatabase: "CSDL_SinhVien_HK1",
        sidebarAddSource: "Thêm nguồn dữ liệu",
        sidebarRevenue: "Tổng doanh thu HK1",
        sidebarByDept: "Thống kê theo khoa",
        historyEmpty: "Chưa có lịch sử chat",
        schemaSidebarEmpty: "Chưa nạp dữ liệu — chưa có bảng.",
        sourceAddedAsNew: "Đã thêm nguồn «{name}» (riêng biệt, schema mới). Users={nu}, Orders={no}, Products={np}.",
        sourceAddedSeparate: "Đã thêm nguồn «{name}» (tách biệt). Users={nu}, Orders={no}, Products={np}.",
        sourceMergedInto: "Đã gộp «{name}» vào dữ liệu hiện tại. Tổng: Users={nu}, Orders={no}, Products={np}.",
        sourceSwitched: "Đang dùng nguồn: {name}",
        uploadTitle: "Nạp dữ liệu (CSV / ZIP / SQLite)",
        uploadPrimary: "Kéo thả file vào đây hoặc nhấn để chọn",
        uploadSecondary: "ZIP · CSV · SQLite .db · SQL — tên gợi ý: users / orders / products",
        chipsLabel: "Câu hỏi gợi ý",
        providerAria: "Nhà cung cấp",
        hintBoxHtml:
            "Chỉ cần có ít nhất một bảng có dữ liệu. Nạp ZIP hoặc CSV (tên gợi ý users / orders / products). Tạo <code>.env</code> cạnh <code>serve.js</code> với <code>DEEPSEEK_API_KEY</code> hoặc <code>GEMINI_API_KEY</code> (xem <code>.env.example</code>). Chạy: <code>node serve.js</code>.",
        panelToggleOpen: "▼ Nạp dữ liệu (CSV / ZIP)",
        panelToggleShut: "▶ Nạp dữ liệu (CSV / ZIP)",
        dataPanelTitle: "Dữ liệu của bạn",
        dataPanelSubtitle:
            "Một file mỗi lần: ZIP (CSV, SQLite .db, SQL mẫu) hoặc CSV — có thể chỉ nạp một phần bảng; tên file gợi ý users / orders / products.",
        fileLabel: "CSV hoặc ZIP",
        loadDataBtn: "Nạp dữ liệu",
        examplesAria: "Ví dụ",
        examplesLabel: "Ví dụ câu hỏi",
        chip1: "Tổng doanh thu (orders.amount) là bao nhiêu?",
        chip2: "Top 5 khách hàng chi tiêu nhiều nhất",
        chip3: "Doanh thu theo thành phố (users.city)",
        questionAria: "Câu hỏi",
        placeholderInput: "Hỏi về số liệu trên dữ liệu đã nạp… (Enter gửi, Shift+Enter xuống dòng)",
        sendBtn: "Gửi",
        clearChatBtn: "Xóa hội thoại",
        dataLoadedCount: "Đã nạp dữ liệu · {count} bảng",
        dbTagUsers: "Users",
        dbTagOrders: "Orders",
        dbTagProducts: "Products",
        schemaNoData: "Bảng {table} chưa có dữ liệu.",
        schemaPreview: "Schema {table}: {rows} dòng · cột mẫu: {cols}",
        attachFileTitle: "Đính kèm file",
        sendBtnTitle: "Gửi",
        langSwitchAria: "Ngôn ngữ giao diện",
        statusEmptyQuestion: "Nhập câu hỏi trước khi gửi.",
        statusNoData: "Hãy nạp ít nhất một phần dữ liệu (CSV hoặc ZIP) và bấm « Nạp dữ liệu » trước.",
        statusLoadingData: "Đang đọc và nạp file…",
        statusCallingApi: "Đang gọi API…",
        statusDone: "Xong.",
        statusEmptyReply: "Phản hồi rỗng từ API.",
        statusReadyChat: "Sẵn sàng chat.",
        clearChatSystem: "Đã xóa hội thoại. Dữ liệu đã nạp vẫn giữ nguyên.",
        csvFilenameHint: "Tên file CSV cần gợi ý bảng: ví dụ users.csv, orders.csv, products.csv.",
        welcomeSystem:
            "Chào bạn! Nạp dữ liệu, chọn Gemini hoặc DeepSeek, rồi hỏi về số liệu (mô hình nhận mẫu tối đa 80 dòng mỗi bảng).",
        pickFileFirst: "Chọn một file .csv hoặc .zip trước.",
        invalidExtension: "Chỉ chấp nhận file .csv hoặc .zip.",
        zipJsZipFail: "Không tải được JSZip (mạng?).",
        zipInvalid: "ZIP không hợp lệ: cần 3 CSV (users/orders/products) hoặc dump sakila/classicmodels.",
        csvPartial: "Đã nạp {role} ({rows} dòng). Còn thiếu: {miss}.",
        csvFull: "Đã nạp CSV {role}: users={nu}, orders={no}, products={np}",
        zipLoadedCsv: "Đã nạp ZIP (CSV): users={nu}, orders={no}, products={np}",
        zipLoadedSqlite:
            "Đã nạp SQLite trong ZIP (bảng: {tu} → users, {to} → orders, {tp} → products): users={nu}, orders={no}, products={np}",
        zipMappedClassic: "Đã map classicmodels.sql → users={nu}, orders={no}, products={np}",
        zipMappedSakila: "Đã map sakila.sql → users={nu}, orders={no}, products={np}",
        readError: "Lỗi đọc file: {msg}",
        zipError: "Lỗi ZIP: {msg}",
        httpError: "Lỗi HTTP {status}",
    },
    en: {
        gateLangTitle: "Choose language",
        gateLangSubtitle: "Select Tiếng Việt or English to continue.",
        langVi: "Tiếng Việt",
        langEn: "English",
        gateGuideTitle: "User guide",
        gateGuideIntro:
            "This app lets you ask the AI about your loaded data (up to three groups: users, orders, products — you may use only one or two).",
        gateGuideStep1:
            "Run the server: put your API key in .env next to serve.js (DEEPSEEK_API_KEY or GEMINI_API_KEY), then run node serve.js.",
        gateGuideStep2:
            "Load data: one .zip (CSV, SQLite .db, sample SQL) or separate .csv files — you do not need all three groups; filenames should suggest users, orders, or products.",
        gateGuideStep3:
            "Pick an API provider (DeepSeek or Gemini), type your question in Vietnamese; the model receives at most 80 preview rows per table.",
        gateGuideStep4: "Enter sends the message, Shift+Enter adds a new line. You can use the example questions below the chat.",
        gateGuideOk: "OK — Enter app",
        titlePage: "Data Chat — Gemini / DeepSeek",
        appTitle: "Data Chat",
        apiLabel: "API:",
        sidebarDataSection: "Data",
        sidebarHistorySection: "History",
        sidebarSchemaSection: "Schema",
        sidebarLiveDatabase: "CSDL_SinhVien_HK1",
        sidebarAddSource: "Add data source",
        sidebarRevenue: "Total revenue HK1",
        sidebarByDept: "Department revenue",
        historyEmpty: "No chat history yet",
        schemaSidebarEmpty: "No data loaded — no tables yet.",
        sourceAddedAsNew: "Added source «{name}» (separate, new schema). Users={nu}, Orders={no}, Products={np}.",
        sourceAddedSeparate: "Added source «{name}» (separate). Users={nu}, Orders={no}, Products={np}.",
        sourceMergedInto: "Merged «{name}» into current data. Totals: Users={nu}, Orders={no}, Products={np}.",
        sourceSwitched: "Active source: {name}",
        uploadTitle: "Load data (CSV / ZIP / SQLite)",
        uploadPrimary: "Drag & drop a file here or click to select",
        uploadSecondary: "ZIP · CSV · SQLite .db · SQL — suggested names: users / orders / products",
        chipsLabel: "Suggested questions",
        providerAria: "Provider",
        hintBoxHtml:
            "You only need at least one non-empty table. Load ZIP or CSV (names should suggest users / orders / products). Create <code>.env</code> next to <code>serve.js</code> with <code>DEEPSEEK_API_KEY</code> or <code>GEMINI_API_KEY</code> (see <code>.env.example</code>). Run: <code>node serve.js</code>.",
        panelToggleOpen: "▼ Load data (CSV / ZIP)",
        panelToggleShut: "▶ Load data (CSV / ZIP)",
        dataPanelTitle: "Your data",
        dataPanelSubtitle:
            "One file at a time: ZIP (CSV, SQLite .db, sample SQL) or CSV — you can load only some tables; filenames should suggest users / orders / products.",
        fileLabel: "CSV or ZIP",
        loadDataBtn: "Load data",
        examplesAria: "Examples",
        examplesLabel: "Example questions",
        chip1: "What is total revenue (orders.amount)?",
        chip2: "Top 5 customers by spend",
        chip3: "Revenue by city (users.city)",
        questionAria: "Question",
        placeholderInput: "Ask about your loaded data… (Enter to send, Shift+Enter for new line)",
        sendBtn: "Send",
        clearChatBtn: "Clear chat",
        dataLoadedCount: "Loaded data · {count} tables",
        dbTagUsers: "Users",
        dbTagOrders: "Orders",
        dbTagProducts: "Products",
        schemaNoData: "Table {table} has no data yet.",
        schemaPreview: "Schema {table}: {rows} rows · sample columns: {cols}",
        attachFileTitle: "Attach file",
        sendBtnTitle: "Send",
        langSwitchAria: "Interface language",
        statusEmptyQuestion: "Enter a question before sending.",
        statusNoData: "Load at least some data (CSV or ZIP) and click « Load data » first.",
        statusLoadingData: "Reading and loading file…",
        statusCallingApi: "Calling API…",
        statusDone: "Done.",
        statusEmptyReply: "Empty reply from API.",
        statusReadyChat: "Ready to chat.",
        clearChatSystem: "Chat cleared. Loaded data is unchanged.",
        csvFilenameHint: "CSV filename must suggest the table, e.g. users.csv, orders.csv, products.csv.",
        welcomeSystem:
            "Welcome! Load data, choose Gemini or DeepSeek, then ask about the metrics (the model receives up to 80 sample rows per table).",
        pickFileFirst: "Choose a .csv or .zip file first.",
        invalidExtension: "Only .csv or .zip files are accepted.",
        zipJsZipFail: "Could not load JSZip (network?).",
        zipInvalid: "Invalid ZIP: need 3 CSVs (users/orders/products) or sakila/classicmodels SQL dump.",
        csvPartial: "Loaded {role} ({rows} rows). Still missing: {miss}.",
        csvFull: "Loaded CSV {role}: users={nu}, orders={no}, products={np}",
        zipLoadedCsv: "Loaded ZIP (CSV): users={nu}, orders={no}, products={np}",
        zipLoadedSqlite:
            "Loaded SQLite from ZIP (tables: {tu} → users, {to} → orders, {tp} → products): users={nu}, orders={no}, products={np}",
        zipMappedClassic: "Mapped classicmodels.sql → users={nu}, orders={no}, products={np}",
        zipMappedSakila: "Mapped sakila.sql → users={nu}, orders={no}, products={np}",
        readError: "Error reading file: {msg}",
        zipError: "ZIP error: {msg}",
        httpError: "HTTP error {status}",
    },
};

const LANG_STORAGE_KEY = "dataChatLang";
const GATE_STORAGE_KEY = "dataChatGatePassed";
const WELCOME_STORAGE_KEY = "dataChatWelcomeShown";

function normalizeLang(code) {
    const c = String(code || "").toLowerCase();
    return c === "en" ? "en" : "vi";
}

function getStoredLang() {
    try {
        return normalizeLang(localStorage.getItem(LANG_STORAGE_KEY));
    } catch {
        return "vi";
    }
}

function setStoredLang(lang) {
    try {
        localStorage.setItem(LANG_STORAGE_KEY, normalizeLang(lang));
    } catch {
        /* ignore */
    }
}

/** Current UI language */
let currentLang = getStoredLang();

function setLang(lang) {
    currentLang = normalizeLang(lang);
    setStoredLang(currentLang);
    return currentLang;
}

function getLang() {
    return currentLang;
}

function t(key) {
    const pack = I18N_STRINGS[currentLang] || I18N_STRINGS.vi;
    return pack[key] ?? I18N_STRINGS.vi[key] ?? key;
}

function tf(key, vars) {
    let s = t(key);
    if (vars && typeof vars === "object") {
        for (const [k, v] of Object.entries(vars)) {
            s = s.replaceAll(`{${k}}`, String(v));
        }
    }
    return s;
}

function hasGatePassed() {
    try {
        return sessionStorage.getItem(GATE_STORAGE_KEY) === "1";
    } catch {
        return false;
    }
}

function setGatePassed() {
    try {
        sessionStorage.setItem(GATE_STORAGE_KEY, "1");
    } catch {
        /* ignore */
    }
}

function hasWelcomeShown() {
    try {
        return sessionStorage.getItem(WELCOME_STORAGE_KEY) === "1";
    } catch {
        return false;
    }
}

function setWelcomeShown() {
    try {
        sessionStorage.setItem(WELCOME_STORAGE_KEY, "1");
    } catch {
        /* ignore */
    }
}
