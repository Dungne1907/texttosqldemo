const gateLang = document.getElementById("gateLang");
const gateGuide = document.getElementById("gateGuide");
const mainApp = document.getElementById("mainApp");
const pickLangVi = document.getElementById("pickLangVi");
const pickLangEn = document.getElementById("pickLangEn");
const guideOkBtn = document.getElementById("guideOkBtn");
const langSwitchVi = document.getElementById("langSwitchVi");
const langSwitchEn = document.getElementById("langSwitchEn");

const questionInput = document.getElementById("questionInput");
const sendBtn = document.getElementById("sendBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const chatMessages = document.getElementById("chatMessages");
const providerSelect = document.getElementById("providerSelect");
const loadDataBtn = document.getElementById("loadDataBtn");
const dataFile = document.getElementById("dataFile");
const dataStatusText = document.getElementById("dataStatusText");
const statusText = document.getElementById("statusText");
const panelToggle = document.getElementById("panelToggle");
const dataPanel = document.getElementById("dataPanel");
const API_URL = "http://localhost:5500/api/chat";

function applyLocale() {
    const lang = getLang();
    document.documentElement.lang = lang === "en" ? "en" : "vi";
    document.title = t("titlePage");

    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (!key) return;
        el.textContent = t(key);
    });

    const hintEl = document.getElementById("hintBox");
    if (hintEl) hintEl.innerHTML = t("hintBoxHtml");

    questionInput.placeholder = t("placeholderInput");
    providerSelect.setAttribute("aria-label", t("providerAria"));
    const exSec = document.getElementById("examplesSection");
    if (exSec) exSec.setAttribute("aria-label", t("examplesAria"));
    const ls = document.getElementById("langSwitchGroup");
    if (ls) ls.setAttribute("aria-label", t("langSwitchAria"));

    refreshLangSwitch();
    updatePanelToggleLabel();
}

function refreshLangSwitch() {
    const lang = getLang();
    langSwitchVi.classList.toggle("is-active", lang === "vi");
    langSwitchVi.setAttribute("aria-pressed", lang === "vi" ? "true" : "false");
    langSwitchEn.classList.toggle("is-active", lang === "en");
    langSwitchEn.setAttribute("aria-pressed", lang === "en" ? "true" : "false");
}

function updatePanelToggleLabel() {
    const open = !dataPanel.classList.contains("hidden");
    panelToggle.textContent = open ? t("panelToggleOpen") : t("panelToggleShut");
}

function initGateAndLocale() {
    pickLangVi.addEventListener("click", () => {
        setLang("vi");
        applyLocale();
        gateLang.classList.add("hidden");
        gateGuide.classList.remove("hidden");
    });
    pickLangEn.addEventListener("click", () => {
        setLang("en");
        applyLocale();
        gateLang.classList.add("hidden");
        gateGuide.classList.remove("hidden");
    });
    guideOkBtn.addEventListener("click", () => {
        setGatePassed();
        gateGuide.classList.add("hidden");
        mainApp.classList.remove("hidden");
        applyLocale();
        if (!hasWelcomeShown()) {
            appendSystemBubble(t("welcomeSystem"));
            setWelcomeShown();
        }
    });
    langSwitchVi.addEventListener("click", () => {
        setLang("vi");
        applyLocale();
    });
    langSwitchEn.addEventListener("click", () => {
        setLang("en");
        applyLocale();
    });

    // Always start from language selection on page load
    applyLocale();
}

const appData = { users: [], orders: [], products: [] };
const chatHistory = [];
const PREVIEW_ROWS = 80;
const MAX_HISTORY_MESSAGES = 14;

function hasData() {
    return appData.users.length > 0 || appData.orders.length > 0 || appData.products.length > 0;
}

function missingTableLabels() {
    const miss = [];
    if (!appData.users.length) miss.push("users");
    if (!appData.orders.length) miss.push("orders");
    if (!appData.products.length) miss.push("products");
    return miss;
}

/** Tên file trong ZIP có thể chứa đường dẫn (Windows/Linux) */
function zipEntryBasename(path) {
    const n = String(path || "").replace(/\\/g, "/");
    const i = n.lastIndexOf("/");
    return (i >= 0 ? n.slice(i + 1) : n).toLowerCase();
}

/**
 * users | orders | products | null
 * Hỗ trợ tên tiếng Anh mẫu + tên kiểu CSDL sinh viên / học phí / môn học.
 */
function inferTableRoleFromFilename(filename) {
    const stem = zipEntryBasename(filename).replace(/\.csv$/i, "");
    const hints = [
        ["users", ["users", "user_", "_users", "sinhvien", "sinh_vien", "student", "khach", "customer", "nguoi_dung"]],
        [
            "orders",
            [
                "orders",
                "order_",
                "_orders",
                "hoc_phi",
                "hocphi",
                "thanhtoan",
                "thanh_toan",
                "payment",
                "chi_tieu",
                "giaodich",
                "don_hang",
                "donhang",
                "hoadon",
                "hoa_don",
            ],
        ],
        ["products", ["products", "product_", "_products", "mon_hoc", "monhoc", "hoc_phan", "mat_hang", "course", "item", "hang"]],
    ];
    for (const [role, keys] of hints) {
        for (const k of keys) {
            if (stem.includes(k)) return role;
        }
    }
    return null;
}

function inferCsvRole(filename) {
    return inferTableRoleFromFilename(filename);
}

/**
 * Chọn 3 CSV trong ZIP: khớp tên trước; thiếu thì gán file chưa khớp (theo ABC);
 * ZIP chỉ có đúng 3 CSV mà không khớp tên → gán lần lượt theo tên file sort.
 */
function resolveZipCsvTriple(csvEntries) {
    const list = csvEntries.slice();
    if (list.length < 3) return null;

    const roles = { users: null, orders: null, products: null };
    const taken = new Set();

    for (const role of ["users", "orders", "products"]) {
        const hit = list.find((e) => !taken.has(e.name) && inferTableRoleFromFilename(e.name) === role);
        if (hit) {
            roles[role] = hit;
            taken.add(hit.name);
        }
    }

    const rest = list
        .filter((e) => !taken.has(e.name))
        .sort((a, b) => zipEntryBasename(a.name).localeCompare(zipEntryBasename(b.name), undefined, { sensitivity: "base" }));

    for (const role of ["users", "orders", "products"]) {
        if (!roles[role] && rest.length) {
            roles[role] = rest.shift();
        }
    }

    if (roles.users && roles.orders && roles.products) {
        return roles;
    }

    if (list.length === 3) {
        const sorted = list
            .slice()
            .sort((a, b) => zipEntryBasename(a.name).localeCompare(zipEntryBasename(b.name), undefined, { sensitivity: "base" }));
        return { users: sorted[0], orders: sorted[1], products: sorted[2] };
    }

    return null;
}

let sqlJsPromise = null;

function loadSqlJsModule() {
    if (typeof initSqlJs !== "function") {
        return Promise.reject(new Error("sql.js"));
    }
    if (!sqlJsPromise) {
        sqlJsPromise = initSqlJs({
            locateFile: (file) => `https://sql.js.org/dist/${file}`,
        });
    }
    return sqlJsPromise;
}

function sqliteTableNames(db) {
    const r = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    if (!r || !r[0] || !r[0].values) return [];
    return r[0].values.map((row) => row[0]);
}

function sqliteSelectAllObjects(db, tableName) {
    const safe = String(tableName).replace(/"/g, '""');
    const r = db.exec(`SELECT * FROM "${safe}"`);
    if (!r || !r[0]) return [];
    const { columns, values } = r[0];
    return values.map((row) => {
        const o = {};
        columns.forEach((c, i) => {
            const v = row[i];
            o[c] = v == null ? "" : typeof v === "bigint" ? String(v) : String(v);
        });
        return o;
    });
}

/**
 * Ánh xạ bảng SQLite → users / orders / products (SinhVien, ThanhToan/HocPhi, MonHoc, …).
 */
function selectThreeSqliteTableNames(tableNames) {
    const lower = (t) => String(t).toLowerCase();
    const used = new Set();

    const take = (predicate) => {
        const hit = tableNames.find((t) => !used.has(t) && predicate(lower(t)));
        if (hit) used.add(hit);
        return hit || null;
    };

    let usersT =
        take((s) => s.includes("sinhvien") || s.includes("student") || s.includes("users")) ||
        take((s) => s.includes("khach") || s.includes("customer"));
    let ordersT =
        take((s) => s.includes("thanhtoan") || s.includes("thanh_toan")) ||
        take((s) => s.includes("hocphi") || s.includes("hoc_phi")) ||
        take((s) => s.includes("payment") || s.includes("donhang") || s.includes("don_hang"));
    let productsT =
        take((s) => s.includes("monhoc") || s.includes("mon_hoc")) ||
        take((s) => s.includes("nganhhoc") || s.includes("product") || s.includes("course"));

    const rest = tableNames.filter((t) => !used.has(t)).sort((a, b) => lower(a).localeCompare(lower(b)));

    if (!usersT && rest.length) {
        usersT = rest.shift();
        used.add(usersT);
    }
    if (!ordersT && rest.length) {
        ordersT = rest.shift();
        used.add(ordersT);
    }
    if (!productsT && rest.length) {
        productsT = rest.shift();
        used.add(productsT);
    }

    if (usersT && ordersT && productsT) {
        return { usersTable: usersT, ordersTable: ordersT, productsTable: productsT };
    }

    if (tableNames.length === 3) {
        const s = [...tableNames].sort((a, b) => lower(a).localeCompare(lower(b)));
        return { usersTable: s[0], ordersTable: s[1], productsTable: s[2] };
    }

    return null;
}

async function tryLoadSqliteFromZipBuffer(arrayBuffer) {
    const SQL = await loadSqlJsModule();
    const db = new SQL.Database(new Uint8Array(arrayBuffer));
    try {
        const names = sqliteTableNames(db);
        if (names.length < 3) {
            db.close();
            return null;
        }
        const map = selectThreeSqliteTableNames(names);
        if (!map) {
            db.close();
            return null;
        }
        appData.users = sqliteSelectAllObjects(db, map.usersTable);
        appData.orders = sqliteSelectAllObjects(db, map.ordersTable);
        appData.products = sqliteSelectAllObjects(db, map.productsTable);
        db.close();
        return map;
    } catch (e) {
        try {
            db.close();
        } catch (_) {
            /* ignore */
        }
        throw e;
    }
}

function setStatus(message, isError = false) {
    statusText.textContent = message;
    statusText.classList.toggle("error", isError);
}

function setDataStatus(message, isError = false) {
    dataStatusText.textContent = message;
    dataStatusText.classList.toggle("error", isError);
}

function scrollChat() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function renderAssistantHtml(text) {
    const raw = String(text || "");
    if (typeof marked !== "undefined") {
        try {
            marked.setOptions({ mangle: false, headerIds: false, breaks: true });
            return marked.parse(raw);
        } catch {
            /* fall through */
        }
    }
    return `<p>${escapeHtml(raw).replace(/\n/g, "<br>")}</p>`;
}

function appendUserBubble(text) {
    const wrap = document.createElement("div");
    wrap.className = "msg msg-user";
    wrap.innerHTML = `<div class="msg-body">${escapeHtml(text)}</div>`;
    chatMessages.appendChild(wrap);
    scrollChat();
}

function appendAssistantBubble(html) {
    const wrap = document.createElement("div");
    wrap.className = "msg msg-assistant";
    wrap.innerHTML = `<div class="msg-body">${html}</div>`;
    chatMessages.appendChild(wrap);
    scrollChat();
}

function appendErrorBubble(message) {
    const wrap = document.createElement("div");
    wrap.className = "msg msg-assistant msg-error";
    wrap.innerHTML = `<div class="msg-body">${escapeHtml(message)}</div>`;
    chatMessages.appendChild(wrap);
    scrollChat();
}

function appendSystemBubble(text) {
    const wrap = document.createElement("div");
    wrap.className = "msg msg-system";
    wrap.innerHTML = `<div class="msg-body">${escapeHtml(text)}</div>`;
    chatMessages.appendChild(wrap);
    scrollChat();
}

function buildDatasetForApi() {
    return {
        meta: {
            totalUsers: appData.users.length,
            totalOrders: appData.orders.length,
            totalProducts: appData.products.length,
            previewRows: PREVIEW_ROWS,
        },
        users: appData.users.slice(0, PREVIEW_ROWS),
        orders: appData.orders.slice(0, PREVIEW_ROWS),
        products: appData.products.slice(0, PREVIEW_ROWS),
    };
}

function trimHistory() {
    while (chatHistory.length > MAX_HISTORY_MESSAGES) {
        chatHistory.shift();
    }
}

async function sendChat() {
    const text = questionInput.value.trim();
    if (!text) {
        setStatus(t("statusEmptyQuestion"), true);
        return;
    }
    if (!hasData()) {
        setStatus(t("statusNoData"), true);
        return;
    }

    appendUserBubble(text);
    questionInput.value = "";
    chatHistory.push({ role: "user", content: text });
    trimHistory();

    sendBtn.disabled = true;
    setStatus(t("statusCallingApi"));

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                provider: providerSelect.value,
                messages: chatHistory.map((m) => ({ role: m.role, content: m.content })),
                dataset: buildDatasetForApi(),
            }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || tf("httpError", { status: res.status }));
        }
        const reply = data.reply;
        if (typeof reply !== "string" || !reply.trim()) {
            throw new Error(t("statusEmptyReply"));
        }
        appendAssistantBubble(renderAssistantHtml(reply));
        chatHistory.push({ role: "assistant", content: reply });
        trimHistory();
        setStatus(t("statusDone"));
    } catch (err) {
        const msg = err.message || String(err);
        appendErrorBubble(msg);
        setStatus(msg, true);
    } finally {
        sendBtn.disabled = false;
        scrollChat();
    }
}

function clearChat() {
    chatHistory.length = 0;
    chatMessages.innerHTML = "";
    setStatus("");
    appendSystemBubble(t("clearChatSystem"));
}

function parseCsvText(text) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
        const cells = line.split(",");
        const row = {};
        headers.forEach((header, idx) => {
            row[header] = (cells[idx] ?? "").trim();
        });
        return row;
    });
}

async function loadSingleCsvFile(file) {
    const role = inferCsvRole(file.name);
    if (!role) {
        setDataStatus(t("csvFilenameHint"), true);
        return;
    }
    const text = await file.text();
    const rows = parseCsvText(text);
    appData[role] = rows;
    const miss = missingTableLabels();
    const s =
        miss.length === 0
            ? tf("csvFull", {
                  role,
                  nu: appData.users.length,
                  no: appData.orders.length,
                  np: appData.products.length,
              })
            : tf("csvPartial", { role, rows: rows.length, miss: miss.join(", ") });
    setDataStatus(s);
    if (miss.length === 0) {
        appendSystemBubble(s);
    }
    if (rows.length > 0) {
        setStatus(t("statusReadyChat"));
    }
}

function stripQuotes(value) {
    const trimmed = value.trim();
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
        return trimmed.slice(1, -1).replaceAll("\\'", "'");
    }
    return trimmed;
}

function splitSqlTuple(tupleBody) {
    const values = [];
    let current = "";
    let inString = false;
    for (let i = 0; i < tupleBody.length; i += 1) {
        const ch = tupleBody[i];
        if (ch === "'" && tupleBody[i - 1] !== "\\") {
            inString = !inString;
            current += ch;
            continue;
        }
        if (ch === "," && !inString) {
            values.push(current.trim());
            current = "";
            continue;
        }
        current += ch;
    }
    if (current.length) values.push(current.trim());
    return values;
}

function splitSqlValues(valuesBlock) {
    const tuples = [];
    let depth = 0;
    let inString = false;
    let current = "";
    for (let i = 0; i < valuesBlock.length; i += 1) {
        const ch = valuesBlock[i];
        if (ch === "'" && valuesBlock[i - 1] !== "\\") {
            inString = !inString;
        }
        if (ch === "(" && !inString) {
            depth += 1;
            if (depth === 1) {
                current = "";
                continue;
            }
        }
        if (ch === ")" && !inString) {
            depth -= 1;
            if (depth === 0) {
                tuples.push(current);
                continue;
            }
        }
        if (depth >= 1) {
            current += ch;
        }
    }
    return tuples;
}

function parseInsertRows(sqlText, tableName) {
    const rows = [];
    const pattern = new RegExp(
        `INSERT\\s+INTO\\s+\`?${tableName}\`?\\s*\\(([^)]*)\\)\\s*VALUES\\s*([\\s\\S]*?);`,
        "gi"
    );
    let match = pattern.exec(sqlText);
    while (match) {
        const columns = match[1].split(",").map((c) => c.replaceAll("`", "").trim());
        const tuples = splitSqlValues(match[2]);
        tuples.forEach((tuple) => {
            const values = splitSqlTuple(tuple);
            const row = {};
            columns.forEach((col, idx) => {
                const raw = values[idx] ?? "";
                row[col] = raw.toUpperCase() === "NULL" ? "" : stripQuotes(raw);
            });
            rows.push(row);
        });
        match = pattern.exec(sqlText);
    }
    return rows;
}

function mapClassicModels(sqlText) {
    const customers = parseInsertRows(sqlText, "customers");
    const payments = parseInsertRows(sqlText, "payments");
    const products = parseInsertRows(sqlText, "products");
    if (!customers.length || !payments.length || !products.length) return null;

    appData.users = customers.map((c) => ({
        id: c.customerNumber,
        name: c.customerName,
        city: c.city,
        created_at: new Date().toISOString(),
    }));
    appData.orders = payments.map((p, idx) => ({
        id: idx + 1,
        user_id: p.customerNumber,
        amount: p.amount,
        status: "delivered",
        created_at: p.paymentDate,
    }));
    appData.products = products.map((p) => ({
        id: p.productCode,
        name: p.productName,
        category: p.productLine || "General",
        price: p.buyPrice || 0,
    }));
    return "classicmodels";
}

function mapSakila(sqlText) {
    const customers = parseInsertRows(sqlText, "customer");
    const payments = parseInsertRows(sqlText, "payment");
    const films = parseInsertRows(sqlText, "film");
    if (!customers.length || !payments.length || !films.length) return null;

    appData.users = customers.map((c) => ({
        id: c.customer_id,
        name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || `Customer ${c.customer_id}`,
        city: "Unknown",
        created_at: c.create_date || new Date().toISOString(),
    }));
    appData.orders = payments.map((p) => ({
        id: p.payment_id,
        user_id: p.customer_id,
        amount: p.amount,
        status: "delivered",
        created_at: p.payment_date,
    }));
    appData.products = films.map((f) => ({
        id: f.film_id,
        name: f.title,
        category: f.rating || "General",
        price: f.replacement_cost || 0,
    }));
    return "sakila";
}

async function loadDataFromZipFile(file) {
    try {
        if (typeof window.JSZip === "undefined") {
            setDataStatus(t("zipJsZipFail"), true);
            return;
        }

        const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
        const entries = Object.values(zip.files).filter((entry) => !entry.dir);
        const csvEntries = entries.filter((entry) => entry.name.toLowerCase().endsWith(".csv"));

        if (csvEntries.length >= 3) {
            const triple = resolveZipCsvTriple(csvEntries);
            if (triple) {
                appData.users = parseCsvText(await triple.users.async("string"));
                appData.orders = parseCsvText(await triple.orders.async("string"));
                appData.products = parseCsvText(await triple.products.async("string"));
                const s = tf("zipLoadedCsv", {
                    nu: appData.users.length,
                    no: appData.orders.length,
                    np: appData.products.length,
                });
                setDataStatus(s);
                appendSystemBubble(s);
                setStatus(t("statusReadyChat"));
                return;
            }
        }

        const dbEntries = entries.filter((entry) => entry.name.toLowerCase().endsWith(".db"));
        for (const dbEntry of dbEntries) {
            try {
                const buf = await dbEntry.async("arraybuffer");
                const map = await tryLoadSqliteFromZipBuffer(buf);
                if (map && hasData()) {
                    const s = tf("zipLoadedSqlite", {
                        tu: map.usersTable,
                        to: map.ordersTable,
                        tp: map.productsTable,
                        nu: appData.users.length,
                        no: appData.orders.length,
                        np: appData.products.length,
                    });
                    setDataStatus(s);
                    appendSystemBubble(s);
                    setStatus(t("statusReadyChat"));
                    return;
                }
            } catch (_) {
                /* thử file .db khác hoặc định dạng khác */
            }
        }

        const sqlEntries = entries.filter((entry) => entry.name.toLowerCase().endsWith(".sql"));
        for (const sqlEntry of sqlEntries) {
            const sqlText = await sqlEntry.async("string");
            const c = mapClassicModels(sqlText);
            if (c) {
                const s = tf("zipMappedClassic", {
                    nu: appData.users.length,
                    no: appData.orders.length,
                    np: appData.products.length,
                });
                setDataStatus(s);
                appendSystemBubble(s);
                setStatus(t("statusReadyChat"));
                return;
            }
            const sk = mapSakila(sqlText);
            if (sk) {
                const msg = tf("zipMappedSakila", {
                    nu: appData.users.length,
                    no: appData.orders.length,
                    np: appData.products.length,
                });
                setDataStatus(msg);
                appendSystemBubble(msg);
                setStatus(t("statusReadyChat"));
                return;
            }
        }

        setDataStatus(t("zipInvalid"), true);
    } catch (error) {
        setDataStatus(tf("zipError", { msg: error.message }), true);
    }
}

async function loadData() {
    const file = dataFile.files?.[0];
    if (!file) {
        setDataStatus(t("pickFileFirst"), true);
        return;
    }
    setDataStatus(t("statusLoadingData"));
    const lower = file.name.toLowerCase();
    try {
        if (lower.endsWith(".zip")) {
            await loadDataFromZipFile(file);
            return;
        }
        if (lower.endsWith(".csv")) {
            await loadSingleCsvFile(file);
            return;
        }
        setDataStatus(t("invalidExtension"), true);
    } catch (error) {
        setDataStatus(tf("readError", { msg: error.message }), true);
    }
}

sendBtn.addEventListener("click", sendChat);
clearChatBtn.addEventListener("click", clearChat);
loadDataBtn.addEventListener("click", loadData);
dataFile.addEventListener("change", () => {
    void loadData();
});

questionInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChat();
    }
});

document.querySelectorAll(".example-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
        questionInput.value = btn.textContent || "";
        sendChat();
    });
});

panelToggle.addEventListener("click", () => {
    const open = dataPanel.classList.toggle("hidden");
    panelToggle.setAttribute("aria-expanded", String(!open));
    updatePanelToggleLabel();
});

initGateAndLocale();
