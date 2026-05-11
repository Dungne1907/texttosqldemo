// Language and UI elements
const langBtnVi = document.getElementById("langBtnVi");
const langBtnEn = document.getElementById("langBtnEn");
const apiSelect = document.getElementById("apiSelect");

// Main UI elements
const uploadArea = document.getElementById("uploadArea");
const uploadFile = document.getElementById("uploadFile");
const uploadBtn = document.getElementById("uploadBtn");
const dbStatus = document.getElementById("dbStatus");
const chatArea = document.getElementById("chatArea");
const inputTextarea = document.getElementById("inputTextarea");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");

// Sidebar elements
const dataBtn = document.getElementById("dataBtn");
const historyBtn = document.getElementById("historyBtn");
const schemaBtn = document.getElementById("schemaBtn");
const addSourceBtn = document.getElementById("addSourceBtn");
const addSourceFile = document.getElementById("addSourceFile");
const historyList = document.getElementById("historyList");
const historyEmpty = document.getElementById("historyEmpty");
const schemaSidebarEmpty = document.getElementById("schemaSidebarEmpty");
const schemaTables = document.getElementById("schemaTables");
const schemaUsersBtn = document.getElementById("schemaUsersBtn");
const schemaOrdersBtn = document.getElementById("schemaOrdersBtn");
const schemaProductsBtn = document.getElementById("schemaProductsBtn");
const schemaUsersCount = document.getElementById("schemaUsersCount");
const schemaOrdersCount = document.getElementById("schemaOrdersCount");
const schemaProductsCount = document.getElementById("schemaProductsCount");

// Quick chips
const chips = document.querySelectorAll(".chip");

// API and data
const API_URL = "http://localhost:5500/api/chat";
const appData = { users: [], orders: [], products: [] };
const chatHistory = [];
const PREVIEW_ROWS = 80;
const MAX_HISTORY_MESSAGES = 14;
const MAX_SIDEBAR_HISTORY_ITEMS = 12;
const sidebarHistoryItems = [];

function applyLocale() {
    const lang = getLang();
    document.documentElement.lang = lang === "en" ? "en" : "vi";
    document.title = t("titlePage");

    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (!key) return;
        el.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
        const key = el.getAttribute("data-i18n-title");
        if (!key) return;
        el.title = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (!key) return;
        el.placeholder = t(key);
    });

    inputTextarea.placeholder = t("placeholderInput");
    apiSelect.setAttribute("aria-label", t("providerAria"));
    if (historyEmpty) historyEmpty.textContent = t("historyEmpty");

    refreshLangButtons();
}

function refreshLangButtons() {
    const lang = getLang();
    langBtnVi.classList.toggle("active", lang === "vi");
    langBtnEn.classList.toggle("active", lang === "en");
}

function initApp() {
    const openFilePicker = () => {
        uploadFile?.click();
    };
    const goToUploadSection = () => {
        uploadArea?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    // Language buttons
    langBtnVi.addEventListener("click", () => {
        setLang("vi");
        applyLocale();
    });
    langBtnEn.addEventListener("click", () => {
        setLang("en");
        applyLocale();
    });

    // Upload functionality
    if (uploadArea) {
        uploadArea.addEventListener("click", (e) => {
            const target = e.target;
            if (target instanceof HTMLElement && (target.closest("#uploadBtn") || target.closest("#uploadFile"))) {
                return;
            }
            openFilePicker();
        });
    }
    if (uploadBtn) {
        uploadBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            openFilePicker();
        });
    }
    if (uploadFile) {
        uploadFile.addEventListener("change", () => handleFileUploadFromInput(uploadFile, "replace"));
    }
    if (addSourceFile) {
        addSourceFile.addEventListener("change", () => handleFileUploadFromInput(addSourceFile, "addSource"));
    }
    if (addSourceBtn) {
        addSourceBtn.addEventListener("click", (e) => {
            e.preventDefault();
            goToUploadSection();
            if (addSourceFile) {
                addSourceFile.value = "";
                addSourceFile.click();
            } else {
                openFilePicker();
            }
        });
    }

    // Input functionality
    if (inputTextarea) {
        inputTextarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChat();
            }
        });
    }

    // Send and clear buttons
    if (sendBtn) sendBtn.addEventListener("click", sendChat);
    if (clearBtn) clearBtn.addEventListener("click", clearChat);

    // Sidebar buttons
    if (dataBtn) dataBtn.addEventListener("click", () => toggleSidebarSection("data"));
    if (historyBtn) historyBtn.addEventListener("click", () => toggleSidebarSection("history"));
    if (schemaBtn) schemaBtn.addEventListener("click", () => toggleSidebarSection("schema"));
    if (schemaUsersBtn) schemaUsersBtn.addEventListener("click", () => handleSchemaTableClick("users", "SinhVien"));
    if (schemaOrdersBtn) schemaOrdersBtn.addEventListener("click", () => handleSchemaTableClick("orders", "ThanhToan"));
    if (schemaProductsBtn) schemaProductsBtn.addEventListener("click", () => handleSchemaTableClick("products", "MonHoc"));

    // Quick chips
    chips.forEach(chip => {
        chip.addEventListener("click", () => {
            inputTextarea.value = chip.textContent || "";
            sendChat();
        });
    });

    // Initialize locale
    applyLocale();
    updateDbStatus();

    // Show welcome message
    if (!hasWelcomeShown()) {
        appendSystemBubble(t("welcomeSystem"));
        setWelcomeShown();
    }
}

function toggleSidebarSection(section) {
    // Remove active class from all buttons
    document.querySelectorAll(".sidebar-btn").forEach(btn => btn.classList.remove("active"));

    // Add active class to clicked button
    const btn = document.getElementById(`${section}Btn`);
    if (btn) btn.classList.add("active");

    // Here you could implement showing different sidebar content
    // For now, just update the active state
}

function updateSidebarHistoryUi() {
    if (!historyList || !historyEmpty) return;
    historyList.innerHTML = "";
    for (const title of sidebarHistoryItems) {
        const btn = document.createElement("button");
        btn.className = "sidebar-btn";
        btn.type = "button";
        btn.innerHTML = `
            <i class="ti ti-message" aria-hidden="true"></i>
            <span>${escapeHtml(title)}</span>
        `;
        historyList.appendChild(btn);
    }
    historyEmpty.style.display = sidebarHistoryItems.length ? "none" : "block";
}

function addSidebarHistoryItem(text) {
    const title = String(text || "").trim();
    if (!title) return;
    sidebarHistoryItems.unshift(title);
    if (sidebarHistoryItems.length > MAX_SIDEBAR_HISTORY_ITEMS) {
        sidebarHistoryItems.length = MAX_SIDEBAR_HISTORY_ITEMS;
    }
    updateSidebarHistoryUi();
}


function hasData() {
    return appData.users.length > 0 || appData.orders.length > 0 || appData.products.length > 0;
}

/** Danh sách nguồn (đổi nguồn bằng cách bấm tên file). «Thêm nguồn» gộp vào nguồn đang live. */
let dataSources = [];
let activeSourceId = null;

function persistActiveSource() {
    if (!activeSourceId) return;
    const s = dataSources.find((x) => x.id === activeSourceId);
    if (s) {
        s.data.users = appData.users;
        s.data.orders = appData.orders;
        s.data.products = appData.products;
    }
}

function syncAppDataFromSourceEntry(entry) {
    if (!entry) {
        appData.users = [];
        appData.orders = [];
        appData.products = [];
        return;
    }
    appData.users = entry.data.users;
    appData.orders = entry.data.orders;
    appData.products = entry.data.products;
}

function activateDataSource(id) {
    persistActiveSource();
    activeSourceId = id;
    const entry = dataSources.find((x) => x.id === id);
    syncAppDataFromSourceEntry(entry || null);
    updateDbStatus();
    if (entry) {
        showStatus(tf("sourceSwitched", { name: entry.label }));
    }
}

function replaceWorkspaceWithBundle(bundle, label) {
    const id = crypto.randomUUID();
    const data = {
        users: bundle.users || [],
        orders: bundle.orders || [],
        products: bundle.products || [],
    };
    dataSources = [{ id, label: label || "dataset", data }];
    activeSourceId = id;
    appData.users = data.users;
    appData.orders = data.orders;
    appData.products = data.products;
}

/** Hợp tất cả tên cột của hai tập dòng, mỗi dòng có đủ cột (thiếu → ""), tránh “mất” giá trị khi hai file khác schema. */
function collectRowKeys(rows) {
    const keys = new Set();
    for (const r of rows) {
        if (r && typeof r === "object") {
            for (const k of Object.keys(r)) keys.add(k);
        }
    }
    return keys;
}

function normalizeRowToKeyList(row, keyList) {
    const base = row && typeof row === "object" ? row : {};
    const o = {};
    for (const k of keyList) {
        const v = base[k];
        o[k] = v == null ? "" : typeof v === "bigint" ? String(v) : String(v);
    }
    return o;
}

function mergeTableRowsUnionColumns(existing, incoming) {
    const a = Array.isArray(existing) ? existing : [];
    const b = Array.isArray(incoming) ? incoming : [];
    if (!b.length) return a.slice();
    const keyList = [...new Set([...collectRowKeys(a), ...collectRowKeys(b)])];
    if (!a.length) return b.map((r) => normalizeRowToKeyList(r, keyList));
    return [...a.map((r) => normalizeRowToKeyList(r, keyList)), ...b.map((r) => normalizeRowToKeyList(r, keyList))];
}

/** Gộp file mới vào nguồn đang chọn (cùng SinhVien / ThanhToan / MonHoc). Nếu chưa có dữ liệu thì tương đương nạp mới. */
function mergeBundleIntoActiveSource(bundle, fileLabel) {
    const u = bundle.users || [];
    const o = bundle.orders || [];
    const p = bundle.products || [];
    if (!hasData() || !activeSourceId || !dataSources.length) {
        replaceWorkspaceWithBundle(bundle, fileLabel);
        return;
    }
    appData.users = mergeTableRowsUnionColumns(appData.users, u);
    appData.orders = mergeTableRowsUnionColumns(appData.orders, o);
    appData.products = mergeTableRowsUnionColumns(appData.products, p);
    persistActiveSource();
    const entry = dataSources.find((x) => x.id === activeSourceId);
    if (entry && fileLabel) {
        const tail = fileLabel.length > 14 ? `${fileLabel.slice(0, 11)}…` : fileLabel;
        if (!entry.label.includes(tail.slice(0, 8))) {
            const next = `${entry.label} + ${tail}`;
            entry.label = next.length > 48 ? `${next.slice(0, 45)}…` : next;
        }
    }
}

function renderDataSourcesList() {
    const el = document.getElementById("dataSourcesList");
    if (!el) return;
    el.innerHTML = "";
    for (const s of dataSources) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `sidebar-btn${s.id === activeSourceId ? " active" : ""}`;
        const short = s.label.length > 22 ? `${s.label.slice(0, 19)}…` : s.label;
        btn.innerHTML = `
            <i class="ti ti-database" aria-hidden="true"></i>
            <span>${escapeHtml(short)}</span>
            ${s.id === activeSourceId ? '<span class="schema-badge">live</span>' : ""}
        `;
        btn.addEventListener("click", () => activateDataSource(s.id));
        el.appendChild(btn);
    }
}

function updateSchemaSidebarVisibility() {
    if (schemaSidebarEmpty) {
        schemaSidebarEmpty.textContent = t("schemaSidebarEmpty");
        schemaSidebarEmpty.style.display = hasData() ? "none" : "block";
    }
    if (schemaTables) {
        schemaTables.style.display = hasData() ? "flex" : "none";
    }
}

function updateSchemaCounts() {
    if (schemaUsersCount) schemaUsersCount.textContent = `${appData.users.length} rows`;
    if (schemaOrdersCount) schemaOrdersCount.textContent = `${appData.orders.length} rows`;
    if (schemaProductsCount) schemaProductsCount.textContent = `${appData.products.length} rows`;
}

function handleSchemaTableClick(role, tableLabel) {
    const rows = Array.isArray(appData[role]) ? appData[role] : [];
    if (!rows.length) {
        showStatus(tf("schemaNoData", { table: tableLabel }), true);
        return;
    }
    const cols = Object.keys(rows[0] || {});
    const previewRows = rows.slice(0, 8);
    const headerHtml = cols.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
    const bodyHtml = previewRows
        .map((r) => {
            const tds = cols.map((c) => `<td>${escapeHtml(r[c] ?? "")}</td>`).join("");
            return `<tr>${tds}</tr>`;
        })
        .join("");
    const tableHtml = `
        <p><strong>${escapeHtml(tableLabel)}</strong> · ${rows.length} rows</p>
        <div class="result-table-wrap">
            <table class="result-table">
                <thead><tr>${headerHtml}</tr></thead>
                <tbody>${bodyHtml}</tbody>
            </table>
        </div>
    `;
    appendAssistantBubble(tableHtml);
    showStatus(tf("schemaPreview", { table: tableLabel, rows: rows.length, cols: cols.slice(0, 6).join(", ") || "(no columns)" }));
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

async function readSqliteBundleFromBuffer(arrayBuffer) {
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
        const users = sqliteSelectAllObjects(db, map.usersTable);
        const orders = sqliteSelectAllObjects(db, map.ordersTable);
        const products = sqliteSelectAllObjects(db, map.productsTable);
        db.close();
        return { bundle: { users, orders, products }, map };
    } catch (e) {
        try {
            db.close();
        } catch (_) {
            /* ignore */
        }
        throw e;
    }
}

function setDataStatus(message, isError = false) {
    const statusEl = document.getElementById("dbStatusMessage");
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.classList.toggle("error", isError);
    }
    if (dbStatus) {
        dbStatus.style.display = message ? "flex" : "none";
    }
}

function updateDbStatus() {
    updateSchemaCounts();
    updateSchemaSidebarVisibility();
    renderDataSourcesList();
    if (!hasData()) {
        if (dbStatus) dbStatus.style.display = "none";
        return;
    }

    if (dbStatus) {
        dbStatus.style.display = "flex";
        dbStatus.style.alignItems = "center";
    }
    const tags = dbStatus.querySelector(".db-tags");
    if (tags) {
        tags.innerHTML = `
            <span class="db-tag">Users: ${appData.users.length}</span>
            <span class="db-tag">Orders: ${appData.orders.length}</span>
            <span class="db-tag">Products: ${appData.products.length}</span>
        `;
    }
    const messageEl = document.getElementById("dbStatusMessage");
    const loadedCount = [appData.users.length, appData.orders.length, appData.products.length].filter((v) => v > 0).length;
    if (messageEl) {
        messageEl.textContent = tf("dataLoadedCount", { count: loadedCount });
    }
    if (tags) {
        tags.innerHTML = `
            <span class="db-tag">${t("dbTagUsers")}: ${appData.users.length}</span>
            <span class="db-tag">${t("dbTagOrders")}: ${appData.orders.length}</span>
            <span class="db-tag">${t("dbTagProducts")}: ${appData.products.length}</span>
        `;
    }
}

function scrollChat() {
    chatArea.scrollTop = chatArea.scrollHeight;
}

function appendUserBubble(text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "msg user";
    msgDiv.innerHTML = `
        <div class="msg-avatar">U</div>
        <div class="msg-bubble">${escapeHtml(text)}</div>
    `;
    chatArea.appendChild(msgDiv);
    scrollChat();
}

function appendAssistantBubble(html) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "msg bot";
    msgDiv.innerHTML = `
        <div class="msg-avatar"><i class="ti ti-robot"></i></div>
        <div class="msg-bubble">${html}</div>
    `;
    chatArea.appendChild(msgDiv);
    scrollChat();
}

function appendErrorBubble(message) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "msg bot";
    msgDiv.innerHTML = `
        <div class="msg-avatar"><i class="ti ti-alert-triangle"></i></div>
        <div class="msg-bubble" style="background: #fee2e2; color: #dc2626; border-color: #fecaca;">${escapeHtml(message)}</div>
    `;
    chatArea.appendChild(msgDiv);
    scrollChat();
}

function appendSystemBubble(text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "msg bot";
    msgDiv.innerHTML = `
        <div class="msg-avatar"><i class="ti ti-info-circle"></i></div>
        <div class="msg-bubble" style="background: var(--surface); border: 1px solid var(--border); font-style: italic;">${escapeHtml(text)}</div>
    `;
    chatArea.appendChild(msgDiv);
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
    const text = inputTextarea.value.trim();
    if (!text) {
        showStatus(t("statusEmptyQuestion"), true);
        return;
    }
    if (!hasData()) {
        showStatus(t("statusNoData"), true);
        return;
    }

    appendUserBubble(text);
    inputTextarea.value = "";
    chatHistory.push({ role: "user", content: text });
    trimHistory();
    addSidebarHistoryItem(text);

    sendBtn.disabled = true;
    showStatus(t("statusCallingApi"));

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                provider: apiSelect.value,
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
        showStatus(t("statusDone"));
    } catch (err) {
        const msg = err.message || String(err);
        appendErrorBubble(msg);
        showStatus(msg, true);
    } finally {
        sendBtn.disabled = false;
        scrollChat();
    }
}

function clearChat() {
    chatHistory.length = 0;
    chatArea.innerHTML = "";
    showStatus("");
    appendSystemBubble(t("clearChatSystem"));
    sidebarHistoryItems.length = 0;
    updateSidebarHistoryUi();
}

function showStatus(message, isError = false) {
    // For now, we'll show status in the input hint label
    const hintLabel = document.querySelector(".input-hint span");
    if (hintLabel) {
        hintLabel.textContent = message || "Enter để gửi · Shift+Enter xuống dòng";
        hintLabel.style.color = isError ? "#dc2626" : "var(--text3)";
    }
}

async function handleFileUploadWithFile(file, mode) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".zip") && !lower.endsWith(".csv")) {
        showStatus(t("invalidExtension"), true);
        return;
    }

    showStatus(t("statusLoadingData"));
    try {
        if (lower.endsWith(".zip")) {
            const r = await extractZipBundle(file);
            if (!r.ok) return;
            if (mode === "replace") {
                replaceWorkspaceWithBundle(r.bundle, file.name);
                if (r.replaceBubble) appendSystemBubble(r.replaceBubble);
            } else {
                const emptyBefore = !hasData();
                mergeBundleIntoActiveSource(r.bundle, file.name);
                if (emptyBefore && r.replaceBubble) {
                    appendSystemBubble(r.replaceBubble);
                } else if (!emptyBefore) {
                    appendSystemBubble(
                        tf("sourceMergedInto", {
                            name: file.name,
                            nu: appData.users.length,
                            no: appData.orders.length,
                            np: appData.products.length,
                        })
                    );
                }
            }
        } else {
            const r = await csvFileToBundle(file);
            if (!r.ok) {
                if (r.reason === "hint") showStatus(t("csvFilenameHint"), true);
                return;
            }
            if (mode === "replace") {
                replaceWorkspaceWithBundle(r.bundle, file.name);
                if (r.replaceBubble) appendSystemBubble(r.replaceBubble);
            } else {
                const emptyBefore = !hasData();
                mergeBundleIntoActiveSource(r.bundle, file.name);
                if (emptyBefore) {
                    if (r.replaceBubble) appendSystemBubble(r.replaceBubble);
                    showStatus(r.statusText);
                } else {
                    appendSystemBubble(
                        tf("sourceMergedInto", {
                            name: file.name,
                            nu: appData.users.length,
                            no: appData.orders.length,
                            np: appData.products.length,
                        })
                    );
                }
            }
            if (mode === "replace") {
                showStatus(r.statusText);
            }
        }
        updateDbStatus();
        if (hasData()) {
            showStatus(t("statusReadyChat"));
        }
    } catch (error) {
        showStatus(tf("readError", { msg: error.message }), true);
    }
}

async function handleFileUploadFromInput(input, mode) {
    const file = input?.files?.[0];
    if (!file) return;
    await handleFileUploadWithFile(file, mode);
    if (input) input.value = "";
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

async function csvFileToBundle(file) {
    const role = inferCsvRole(file.name);
    if (!role) {
        return { ok: false, reason: "hint" };
    }
    const text = await file.text();
    const rows = parseCsvText(text);
    const bundle = { users: [], orders: [], products: [] };
    bundle[role] = rows;
    const miss = [];
    if (!bundle.users.length) miss.push("users");
    if (!bundle.orders.length) miss.push("orders");
    if (!bundle.products.length) miss.push("products");
    const statusText =
        miss.length === 0
            ? tf("csvFull", {
                  role,
                  nu: bundle.users.length,
                  no: bundle.orders.length,
                  np: bundle.products.length,
              })
            : tf("csvPartial", { role, rows: rows.length, miss: miss.join(", ") });
    return { ok: true, bundle, statusText, replaceBubble: miss.length === 0 ? statusText : null };
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

function buildClassicModelsData(sqlText) {
    const customers = parseInsertRows(sqlText, "customers");
    const payments = parseInsertRows(sqlText, "payments");
    const products = parseInsertRows(sqlText, "products");
    if (!customers.length || !payments.length || !products.length) return null;

    return {
        users: customers.map((c) => ({
            id: c.customerNumber,
            name: c.customerName,
            city: c.city,
            created_at: new Date().toISOString(),
        })),
        orders: payments.map((p, idx) => ({
            id: idx + 1,
            user_id: p.customerNumber,
            amount: p.amount,
            status: "delivered",
            created_at: p.paymentDate,
        })),
        products: products.map((p) => ({
            id: p.productCode,
            name: p.productName,
            category: p.productLine || "General",
            price: p.buyPrice || 0,
        })),
    };
}

function buildSakilaData(sqlText) {
    const customers = parseInsertRows(sqlText, "customer");
    const payments = parseInsertRows(sqlText, "payment");
    const films = parseInsertRows(sqlText, "film");
    if (!customers.length || !payments.length || !films.length) return null;

    return {
        users: customers.map((c) => ({
            id: c.customer_id,
            name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || `Customer ${c.customer_id}`,
            city: "Unknown",
            created_at: c.create_date || new Date().toISOString(),
        })),
        orders: payments.map((p) => ({
            id: p.payment_id,
            user_id: p.customer_id,
            amount: p.amount,
            status: "delivered",
            created_at: p.payment_date,
        })),
        products: films.map((f) => ({
            id: f.film_id,
            name: f.title,
            category: f.rating || "General",
            price: f.replacement_cost || 0,
        })),
    };
}

async function extractZipBundle(file) {
    try {
        if (typeof window.JSZip === "undefined") {
            setDataStatus(t("zipJsZipFail"), true);
            return { ok: false };
        }

        const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
        const entries = Object.values(zip.files).filter((entry) => !entry.dir);
        const csvEntries = entries.filter((entry) => entry.name.toLowerCase().endsWith(".csv"));

        if (csvEntries.length >= 3) {
            const triple = resolveZipCsvTriple(csvEntries);
            if (triple) {
                const users = parseCsvText(await triple.users.async("string"));
                const orders = parseCsvText(await triple.orders.async("string"));
                const products = parseCsvText(await triple.products.async("string"));
                const bundle = { users, orders, products };
                const replaceBubble = tf("zipLoadedCsv", {
                    nu: bundle.users.length,
                    no: bundle.orders.length,
                    np: bundle.products.length,
                });
                return { ok: true, bundle, replaceBubble };
            }
        }

        const dbEntries = entries.filter((entry) => entry.name.toLowerCase().endsWith(".db"));
        for (const dbEntry of dbEntries) {
            try {
                const buf = await dbEntry.async("arraybuffer");
                const sqlite = await readSqliteBundleFromBuffer(buf);
                if (sqlite?.bundle) {
                    const b = sqlite.bundle;
                    const replaceBubble = tf("zipLoadedSqlite", {
                        tu: sqlite.map.usersTable,
                        to: sqlite.map.ordersTable,
                        tp: sqlite.map.productsTable,
                        nu: b.users.length,
                        no: b.orders.length,
                        np: b.products.length,
                    });
                    return { ok: true, bundle: b, replaceBubble };
                }
            } catch (_) {
                /* thử file .db khác hoặc định dạng khác */
            }
        }

        const sqlEntries = entries.filter((entry) => entry.name.toLowerCase().endsWith(".sql"));
        for (const sqlEntry of sqlEntries) {
            const sqlText = await sqlEntry.async("string");
            const classic = buildClassicModelsData(sqlText);
            if (classic) {
                const replaceBubble = tf("zipMappedClassic", {
                    nu: classic.users.length,
                    no: classic.orders.length,
                    np: classic.products.length,
                });
                return { ok: true, bundle: classic, replaceBubble };
            }
            const sk = buildSakilaData(sqlText);
            if (sk) {
                const replaceBubble = tf("zipMappedSakila", {
                    nu: sk.users.length,
                    no: sk.orders.length,
                    np: sk.products.length,
                });
                return { ok: true, bundle: sk, replaceBubble };
            }
        }

        setDataStatus(t("zipInvalid"), true);
        return { ok: false };
    } catch (error) {
        setDataStatus(tf("zipError", { msg: error.message }), true);
        return { ok: false };
    }
}

async function loadData() {
    const file = uploadFile.files?.[0];
    if (!file) {
        showStatus(t("pickFileFirst"), true);
        return;
    }
    await handleFileUploadWithFile(file, "replace");
    if (uploadFile) uploadFile.value = "";
}

// Utility functions
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

// Initialize the app
initApp();
updateSidebarHistoryUi();
updateDbStatus();
