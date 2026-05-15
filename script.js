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
const attachBtn = document.getElementById("attachBtn");
const attachFileInput = document.getElementById("attachFileInput");
const attachedFilesContainer = document.getElementById("attachedFilesContainer");

// Sidebar elements
const dataBtn = document.getElementById("dataBtn");
const historyBtn = document.getElementById("historyBtn");
const schemaBtn = document.getElementById("schemaBtn");
const addSourceBtn = document.getElementById("addSourceBtn");
const addSourceFile = document.getElementById("addSourceFile");
const historyList = document.getElementById("historyList");
const historyEmpty = document.getElementById("historyEmpty");
const newChatBtn = document.getElementById("newChatBtn");
const schemaSidebarEmpty = document.getElementById("schemaSidebarEmpty");
const schemaTables = document.getElementById("schemaTables");
const schemaUsersBtn = document.getElementById("schemaUsersBtn");
const schemaOrdersBtn = document.getElementById("schemaOrdersBtn");
const schemaProductsBtn = document.getElementById("schemaProductsBtn");
const schemaUsersCount = document.getElementById("schemaUsersCount");
const schemaOrdersCount = document.getElementById("schemaOrdersCount");
const schemaProductsCount = document.getElementById("schemaProductsCount");

// API and data
const API_URL = "http://localhost:5500/api/chat";
const appData = { users: [], orders: [], products: [] };
const chatHistory = [];
const attachedFiles = []; // Lưu các file đã attach
const MAX_HISTORY_MESSAGES = 14;
const MAX_CHAT_CONVERSATIONS = 30;
const CHAT_HISTORY_STORAGE_KEY = "dataChatConversationsV1";
let chatConversations = [];
let activeConversationId = null;
let isRenderingConversation = false;

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
    applySchemaLabelsToUi();
    updateSidebarHistoryUi();
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
    if (newChatBtn) newChatBtn.addEventListener("click", () => createChatConversation({ activate: true }));

    // Attach file button
    if (attachBtn) {
        attachBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (attachFileInput) {
                attachFileInput.click();
            }
        });
    }
    if (attachFileInput) {
        attachFileInput.addEventListener("change", () => {
            const files = attachFileInput.files;
            for (let i = 0; i < files.length; i++) {
                attachFileToChat(files[i]);
            }
            attachFileInput.value = "";
        });
    }

    // Sidebar buttons
    if (dataBtn) dataBtn.addEventListener("click", () => toggleSidebarSection("data"));
    if (historyBtn) historyBtn.addEventListener("click", () => toggleSidebarSection("history"));
    if (schemaBtn) schemaBtn.addEventListener("click", () => toggleSidebarSection("schema"));
    if (schemaUsersBtn) schemaUsersBtn.addEventListener("click", () => handleSchemaTableClick("users", getSchemaLabelForRole("users")));
    if (schemaOrdersBtn) schemaOrdersBtn.addEventListener("click", () => handleSchemaTableClick("orders", getSchemaLabelForRole("orders")));
    if (schemaProductsBtn) schemaProductsBtn.addEventListener("click", () => handleSchemaTableClick("products", getSchemaLabelForRole("products")));

    // DB Viewer button
    const openDbViewerBtn = document.getElementById("openDbViewerBtn");
    if (openDbViewerBtn) openDbViewerBtn.addEventListener("click", () => openDbModal("users"));

    // Init DB modal
    initDbModal();
    loadChatConversations();

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
    document.querySelectorAll(".sidebar-btn").forEach(btn => btn.classList.remove("active"));
    const btn = document.getElementById(`${section}Btn`);
    if (btn) btn.classList.add("active");
}

function updateSidebarHistoryUi() {
    if (!historyList || !historyEmpty) return;
    historyList.innerHTML = "";
    const ordered = chatConversations.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    for (const conversation of ordered) {
        const row = document.createElement("div");
        row.className = `history-row${conversation.id === activeConversationId ? " active" : ""}`;

        const btn = document.createElement("button");
        btn.className = "sidebar-btn history-chat-btn";
        btn.type = "button";
        btn.title = t("historyOpenHint");
        btn.innerHTML = `
            <i class="ti ti-message" aria-hidden="true"></i>
            <span>${escapeHtml(conversation.title || t("untitledChat"))}</span>
        `;
        btn.addEventListener("click", () => {
            switchChatConversation(conversation.id);
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "history-delete-btn";
        deleteBtn.type = "button";
        deleteBtn.title = t("deleteChatTitle");
        deleteBtn.innerHTML = '<i class="ti ti-trash" aria-hidden="true"></i>';
        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteChatConversation(conversation.id);
        });

        row.appendChild(btn);
        row.appendChild(deleteBtn);
        historyList.appendChild(row);
    }
    historyEmpty.style.display = chatConversations.length ? "none" : "block";
}

function makeConversationId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getActiveConversation() {
    return chatConversations.find((conversation) => conversation.id === activeConversationId) || null;
}

function buildChatTitle(text) {
    const title = String(text || "").trim();
    if (!title) return t("untitledChat");
    return title.length > 54 ? `${title.slice(0, 51)}...` : title;
}

function saveChatConversations() {
    try {
        const payload = {
            activeConversationId,
            conversations: chatConversations.slice(0, MAX_CHAT_CONVERSATIONS),
        };
        localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(payload));
    } catch {
        /* ignore localStorage quota/private mode */
    }
}

function loadChatConversations() {
    try {
        const payload = JSON.parse(localStorage.getItem(CHAT_HISTORY_STORAGE_KEY) || "null");
        const list = Array.isArray(payload?.conversations) ? payload.conversations : [];
        chatConversations = list
            .filter((conversation) => conversation && typeof conversation.id === "string")
            .map((conversation) => ({
                id: conversation.id,
                title: conversation.title || t("untitledChat"),
                createdAt: Number(conversation.createdAt) || Date.now(),
                updatedAt: Number(conversation.updatedAt) || Date.now(),
                messages: Array.isArray(conversation.messages) ? conversation.messages : [],
                apiMessages: Array.isArray(conversation.apiMessages) ? conversation.apiMessages : [],
            }))
            .slice(0, MAX_CHAT_CONVERSATIONS);
        activeConversationId = payload?.activeConversationId || chatConversations[0]?.id || null;
    } catch {
        chatConversations = [];
        activeConversationId = null;
    }
    if (!getActiveConversation()) {
        createChatConversation({ activate: true, persist: false });
    } else {
        renderActiveConversation();
    }
    updateSidebarHistoryUi();
    saveChatConversations();
}

function createChatConversation({ activate = true, persist = true, title = "" } = {}) {
    const now = Date.now();
    const conversation = {
        id: makeConversationId(),
        title: title || t("untitledChat"),
        createdAt: now,
        updatedAt: now,
        messages: [],
        apiMessages: [],
    };
    chatConversations.unshift(conversation);
    if (chatConversations.length > MAX_CHAT_CONVERSATIONS) {
        chatConversations.length = MAX_CHAT_CONVERSATIONS;
    }
    if (activate) {
        activeConversationId = conversation.id;
        renderActiveConversation();
        inputTextarea?.focus();
    }
    updateSidebarHistoryUi();
    if (persist) saveChatConversations();
    return conversation;
}

function switchChatConversation(id) {
    if (id === activeConversationId) return;
    activeConversationId = id;
    renderActiveConversation();
    updateSidebarHistoryUi();
    saveChatConversations();
}

function deleteChatConversation(id) {
    const idx = chatConversations.findIndex((conversation) => conversation.id === id);
    if (idx < 0) return;
    chatConversations.splice(idx, 1);
    if (activeConversationId === id) {
        activeConversationId = chatConversations[0]?.id || null;
        if (!activeConversationId) {
            createChatConversation({ activate: true, persist: false });
        } else {
            renderActiveConversation();
        }
    }
    updateSidebarHistoryUi();
    saveChatConversations();
}

function touchActiveConversation(titleText = "") {
    let conversation = getActiveConversation();
    if (!conversation) conversation = createChatConversation({ activate: true, persist: false });
    const defaultTitles = new Set([t("untitledChat"), I18N_STRINGS.vi.untitledChat, I18N_STRINGS.en.untitledChat]);
    if (titleText && (!conversation.title || defaultTitles.has(conversation.title))) {
        conversation.title = buildChatTitle(titleText);
    }
    conversation.updatedAt = Date.now();
    chatConversations = [conversation, ...chatConversations.filter((item) => item.id !== conversation.id)];
    updateSidebarHistoryUi();
    saveChatConversations();
    return conversation;
}

function syncChatHistoryFromConversation(conversation) {
    chatHistory.length = 0;
    const apiMessages = Array.isArray(conversation?.apiMessages) ? conversation.apiMessages : [];
    chatHistory.push(...apiMessages.slice(-MAX_HISTORY_MESSAGES));
}

function addConversationMessage(message) {
    if (isRenderingConversation) return;
    const conversation = touchActiveConversation();
    conversation.messages.push({
        ...message,
        createdAt: Date.now(),
    });
    saveChatConversations();
}

function addConversationApiMessage(message) {
    const conversation = touchActiveConversation();
    conversation.apiMessages.push(message);
    if (conversation.apiMessages.length > MAX_HISTORY_MESSAGES) {
        conversation.apiMessages = conversation.apiMessages.slice(-MAX_HISTORY_MESSAGES);
    }
    syncChatHistoryFromConversation(conversation);
    saveChatConversations();
}

function renderMessageRecord(message) {
    if (!message || typeof message !== "object") return;
    if (message.type === "user") appendUserBubble(message.text || "");
    else if (message.type === "assistant") appendAssistantBubble(message.html || "");
    else if (message.type === "error") appendErrorBubble(message.text || "");
    else if (message.type === "system") appendSystemBubble(message.text || "");
    else if (message.type === "sql") {
        appendSqlPipelineBubble(message.sql || "", message.explanation || "", message.columns || [], message.rows || [], message.execErr || "");
    }
}

function renderActiveConversation() {
    const conversation = getActiveConversation();
    chatArea.innerHTML = "";
    syncChatHistoryFromConversation(conversation);
    isRenderingConversation = true;
    try {
        for (const message of conversation?.messages || []) {
            renderMessageRecord(message);
        }
    } finally {
        isRenderingConversation = false;
    }
    scrollChat();
}


function hasData() {
    return appData.users.length > 0 || appData.orders.length > 0 || appData.products.length > 0;
}

/** Danh sách nguồn (đổi nguồn bằng cách bấm tên file). «Thêm nguồn» gộp vào nguồn đang live. */
let dataSources = [];
let activeSourceId = null;

/** Tên bảng / file gốc hiển thị trong Schema (theo role users/orders/products). */
function coerceTableLabels(raw) {
    const out = { users: null, orders: null, products: null };
    if (!raw || typeof raw !== "object") return out;
    for (const k of ["users", "orders", "products"]) {
        const v = raw[k];
        if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
}

function labelsFromSqliteMap(map) {
    if (!map) return coerceTableLabels(null);
    return coerceTableLabels({
        users: map.usersTable || null,
        orders: map.ordersTable || null,
        products: map.productsTable || null,
    });
}

function csvStemFromFilename(filename) {
    const base = zipEntryBasename(filename);
    return base.replace(/\.csv$/i, "") || base;
}

function getActiveSourceEntry() {
    return dataSources.find((x) => x.id === activeSourceId) || null;
}

function getSchemaLabelForRole(role) {
    const entry = getActiveSourceEntry();
    const custom = entry?.tableLabels?.[role];
    if (typeof custom === "string" && custom.trim()) return custom.trim();
    if (role === "users") return t("dbTableUsers");
    if (role === "orders") return t("dbTableOrders");
    return t("dbTableProducts");
}

function applySchemaLabelsToUi() {
    const mapIds = { users: "schemaUsersLabel", orders: "schemaOrdersLabel", products: "schemaProductsLabel" };
    for (const role of ["users", "orders", "products"]) {
        const el = document.getElementById(mapIds[role]);
        if (el) el.textContent = getSchemaLabelForRole(role);
    }
    document.querySelectorAll(".db-tab-btn").forEach((btn) => {
        const role = btn.dataset.role;
        if (!role) return;
        const lab = btn.querySelector(".db-tab-label");
        if (lab) lab.textContent = getSchemaLabelForRole(role);
    });
}

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
    bumpSqlDataMutation();
    updateDbStatus();
    if (entry) {
        showStatus(tf("sourceSwitched", { name: entry.label }));
    }
}

function replaceWorkspaceWithBundle(bundle, label, tableLabels) {
    const id = crypto.randomUUID();
    const data = {
        users: bundle.users || [],
        orders: bundle.orders || [],
        products: bundle.products || [],
    };
    const tl = coerceTableLabels(tableLabels);
    dataSources = [{ id, label: label || "dataset", data, tableLabels: tl }];
    activeSourceId = id;
    appData.users = data.users;
    appData.orders = data.orders;
    appData.products = data.products;
    bumpSqlDataMutation();
}

/** Thêm dữ liệu mới như một nguồn riêng biệt (không gộp). */
function addBundleAsNewSource(bundle, label, tableLabels) {
    const id = crypto.randomUUID();
    const data = {
        users: bundle.users || [],
        orders: bundle.orders || [],
        products: bundle.products || [],
    };
    const tl = coerceTableLabels(tableLabels);
    // Lưu source hiện tại trước khi chuyển
    persistActiveSource();
    // Thêm source mới vào danh sách
    dataSources.push({ id, label: label || "dataset", data, tableLabels: tl });
    // Tự động kích hoạt source mới để người dùng thấy dữ liệu
    activeSourceId = id;
    appData.users = data.users;
    appData.orders = data.orders;
    appData.products = data.products;
    bumpSqlDataMutation();
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

const SQL_TABLE_ROLES = ["users", "orders", "products"];
const SQL_SCHEMA_ERROR_MESSAGE = "Khong tim thay bang hoac cot phu hop trong du lieu da tai len.";

const pipelineState = {
    tables: [],
};

function quoteSqlIdentifier(name) {
    return `"${String(name).replace(/"/g, '""')}"`;
}

function normalizeSqlNameForMatch(name) {
    return String(name || "").trim().toLowerCase();
}

function fallbackSqlTableName(index) {
    return `table_${index + 1}`;
}

function uniqueSqlTableName(baseName, usedNames, index) {
    let base = String(baseName || "").trim();
    if (!base) base = fallbackSqlTableName(index);
    let candidate = base;
    let suffix = 2;
    while (usedNames.has(normalizeSqlNameForMatch(candidate))) {
        candidate = `${base}_${suffix}`;
        suffix++;
    }
    usedNames.add(normalizeSqlNameForMatch(candidate));
    return candidate;
}

function getSqlPipelineTables() {
    const usedNames = new Set();
    const tables = [];
    let visibleIndex = 0;
    for (const role of SQL_TABLE_ROLES) {
        const rows = appData[role];
        if (!Array.isArray(rows) || !rows.length) continue;
        const columns = [...collectRowKeys(rows)];
        if (!columns.length) continue;
        const label = getSchemaLabelForRole(role);
        const name = uniqueSqlTableName(label, usedNames, visibleIndex);
        tables.push({ name, role, columns, rowCount: rows.length });
        visibleIndex++;
    }
    pipelineState.tables = tables;
    return tables;
}

/** Gộp file mới vào nguồn đang chọn. Nếu chưa có dữ liệu thì tương đương nạp mới. */
function mergeBundleIntoActiveSource(bundle, fileLabel, tableLabels) {
    const u = bundle.users || [];
    const o = bundle.orders || [];
    const p = bundle.products || [];
    
    // Validate merge size to prevent memory issues (1M records limit)
    const MERGE_LIMIT = 1000000;
    const totalNew = u.length + o.length + p.length;
    if (totalNew > MERGE_LIMIT) {
        showStatus("Lỗi: File quá lớn để merge (tối đa 1M records). Vui lòng chia nhỏ file hoặc thay thế dữ liệu.", true);
        return;
    }
    
    if (!hasData() || !activeSourceId || !dataSources.length) {
        replaceWorkspaceWithBundle(bundle, fileLabel, tableLabels);
        return;
    }
    appData.users = mergeTableRowsUnionColumns(appData.users, u);
    appData.orders = mergeTableRowsUnionColumns(appData.orders, o);
    appData.products = mergeTableRowsUnionColumns(appData.products, p);
    const entry = dataSources.find((x) => x.id === activeSourceId);
    if (entry) {
        if (!entry.tableLabels) entry.tableLabels = { users: null, orders: null, products: null };
        const inc = coerceTableLabels(tableLabels);
        for (const role of ["users", "orders", "products"]) {
            const incomingRows = bundle[role];
            if (Array.isArray(incomingRows) && incomingRows.length && inc[role]) {
                entry.tableLabels[role] = inc[role];
            }
        }
        if (fileLabel) {
            const tail = fileLabel.length > 14 ? `${fileLabel.slice(0, 11)}…` : fileLabel;
            if (!entry.label.includes(tail.slice(0, 8))) {
                const next = `${entry.label} + ${tail}`;
                entry.label = next.length > 48 ? `${next.slice(0, 45)}…` : next;
            }
        }
    }
    persistActiveSource();
    bumpSqlDataMutation();
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
    if (schemaUsersBtn) {
        schemaUsersBtn.style.display = appData.users.length ? "flex" : "none";
    }
    if (schemaOrdersBtn) {
        schemaOrdersBtn.style.display = appData.orders.length ? "flex" : "none";
    }
    if (schemaProductsBtn) {
        schemaProductsBtn.style.display = appData.products.length ? "flex" : "none";
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
                "bang_diem",
                "bangdiem",
                "diem_so",
                "diemso",
                "ket_qua",
                "ketqua",
                "gpa",
                "grades",
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
 * Chọn 1-3 CSV trong ZIP: khớp tên trước; thiếu thì gán file chưa khớp (theo ABC);
 * Hỗ trợ 1 file, 2 files hoặc 3 files CSV.
 */
function resolveZipCsvPartial(csvEntries) {
    const list = csvEntries.slice();
    if (list.length < 1) return null;

    const roles = { users: null, orders: null, products: null };
    const taken = new Set();

    // Bước 1: Khớp tên từ khóa
    for (const role of ["users", "orders", "products"]) {
        const hit = list.find((e) => !taken.has(e.name) && inferTableRoleFromFilename(e.name) === role);
        if (hit) {
            roles[role] = hit;
            taken.add(hit.name);
        }
    }

    // Bước 2: Gán file chưa khớp (theo ABC)
    const rest = list
        .filter((e) => !taken.has(e.name))
        .sort((a, b) => zipEntryBasename(a.name).localeCompare(zipEntryBasename(b.name), undefined, { sensitivity: "base" }));

    for (const role of ["users", "orders", "products"]) {
        if (!roles[role] && rest.length) {
            roles[role] = rest.shift();
        }
    }

    // Bước 3: Nếu tìm thấy ít nhất 1 file, trả về (hỗ trợ 1-3 files)
    if (roles.users || roles.orders || roles.products) {
        return roles;
    }

    // Fallback: nếu có >= 3 files mà không khớp, gán theo thứ tự sort
    if (list.length >= 3) {
        const sorted = list
            .slice()
            .sort((a, b) => zipEntryBasename(a.name).localeCompare(zipEntryBasename(b.name), undefined, { sensitivity: "base" }));
        return { users: sorted[0], orders: sorted[1], products: sorted[2] };
    }

    // Nếu chỉ có 1-2 files, trả về những files có
    if (list.length === 1) {
        return { users: list[0], orders: null, products: null };
    }
    if (list.length === 2) {
        return { users: list[0], orders: list[1], products: null };
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
 * Ánh xạ 1-3 bảng SQLite → users / orders / products (SinhVien, ThanhToan/HocPhi, MonHoc, …).
 * Hỗ trợ database có 1, 2, 3 hoặc nhiều bảng.
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
        take((s) => s.includes("payment") || s.includes("donhang") || s.includes("don_hang")) ||
        take((s) => s.includes("bang_diem") || s.includes("bangdiem") || s.includes("ket_qua") || s.includes("ketqua"));
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

    // Nếu tìm thấy ít nhất 1 bảng, trả về (hỗ trợ 1-3 bảng)
    if (usersT || ordersT || productsT) {
        return { usersTable: usersT, ordersTable: ordersT, productsTable: productsT };
    }

    // Fallback: nếu có >= 3 bảng mà không khớp, gán theo thứ tự sort
    if (tableNames.length === 3) {
        const s = [...tableNames].sort((a, b) => lower(a).localeCompare(lower(b)));
        return { usersTable: s[0], ordersTable: s[1], productsTable: s[2] };
    }

    // Nếu chỉ có 1-2 bảng, trả về những bảng có
    if (tableNames.length === 1) {
        return { usersTable: tableNames[0], ordersTable: null, productsTable: null };
    }
    if (tableNames.length === 2) {
        const s = [...tableNames].sort((a, b) => lower(a).localeCompare(lower(b)));
        return { usersTable: s[0], ordersTable: s[1], productsTable: null };
    }

    return null;
}

async function readSqliteBundleFromBuffer(arrayBuffer) {
    const SQL = await loadSqlJsModule();
    const db = new SQL.Database(new Uint8Array(arrayBuffer));
    try {
        const names = sqliteTableNames(db);
        if (names.length < 1) {
            db.close();
            return null;
        }
        
        // Thử match với 3 bảng (hoặc ít hơn)
        const map = selectThreeSqliteTableNames(names);
        if (!map) {
            db.close();
            return null;
        }
        
        const users = map.usersTable ? sqliteSelectAllObjects(db, map.usersTable) : [];
        const orders = map.ordersTable ? sqliteSelectAllObjects(db, map.ordersTable) : [];
        const products = map.productsTable ? sqliteSelectAllObjects(db, map.productsTable) : [];
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
        applySchemaLabelsToUi();
        return;
    }

    if (dbStatus) {
        dbStatus.style.display = "flex";
        dbStatus.style.alignItems = "center";
    }
    const tags = dbStatus.querySelector(".db-tags");
    const messageEl = document.getElementById("dbStatusMessage");
    const loadedCount = [appData.users.length, appData.orders.length, appData.products.length].filter((v) => v > 0).length;
    if (messageEl) {
        messageEl.textContent = tf("dataLoadedCount", { count: loadedCount });
    }
    if (tags) {
        const parts = [];
        if (appData.users.length) {
            parts.push(`<span class="db-tag">${t("dbTagUsers")}: ${appData.users.length}</span>`);
        }
        if (appData.orders.length) {
            parts.push(`<span class="db-tag">${t("dbTagOrders")}: ${appData.orders.length}</span>`);
        }
        if (appData.products.length) {
            parts.push(`<span class="db-tag">${t("dbTagProducts")}: ${appData.products.length}</span>`);
        }
        tags.innerHTML = parts.join("");
    }
    applySchemaLabelsToUi();
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
    addConversationMessage({ type: "user", text });
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
    addConversationMessage({ type: "assistant", html });
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
    addConversationMessage({ type: "error", text: message });
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
    addConversationMessage({ type: "system", text });
    scrollChat();
}

function computeAggregates(rows) {
    if (!rows.length) return {};
    const result = {};
    for (const col of Object.keys(rows[0])) {
        const vals = rows.map(r => parseFloat(r[col])).filter(v => !isNaN(v) && isFinite(v));
        if (vals.length > 0 && vals.length >= rows.length * 0.4) {
            const sum = vals.reduce((a, b) => a + b, 0);
            result[col] = {
                sum: Math.round(sum * 100) / 100,
                avg: Math.round((sum / vals.length) * 100) / 100,
                min: Math.min(...vals),
                max: Math.max(...vals),
                count: vals.length,
            };
        }
    }
    return result;
}

function buildDatasetForApi() {
    return {
        meta: {
            totalUsers: appData.users.length,
            totalOrders: appData.orders.length,
            totalProducts: appData.products.length,
        },
        aggregates: {
            users: computeAggregates(appData.users),
            orders: computeAggregates(appData.orders),
            products: computeAggregates(appData.products),
        },
        users: appData.users,
        orders: appData.orders,
        products: appData.products,
    };
}

const SQL_FEW_SHOT_SAMPLE_ROWS = 10;

function rowsFromSqlJsExecResult(res) {
    if (!res || !res[0]) return [];
    const { columns, values } = res[0];
    return (values || []).map((row) => {
        const o = {};
        columns.forEach((c, i) => {
            const v = row[i];
            o[c] = v == null ? "" : typeof v === "bigint" ? String(v) : String(v);
        });
        return o;
    });
}

/** Gửi API khi mode=sql: schema + ~10 dòng mẫu ngẫu nhiên + aggregates — không gửi toàn bộ bảng. */
async function buildSqlFewShotDatasetForApi() {
    const db = await ensureSqlExecDatabase();
    const tables = getSqlPipelineTables();
    let sampleTable = "";
    let sampleRows = [];
    if (tables.length) {
        let best = tables[0];
        for (const t of tables) {
            if (t.rowCount > best.rowCount) best = t;
        }
        sampleTable = best.name;
        const safe = String(sampleTable).replace(/"/g, '""');
        const lim = Math.max(1, Math.min(20, SQL_FEW_SHOT_SAMPLE_ROWS));
        const r = db.exec(`SELECT * FROM "${safe}" ORDER BY RANDOM() LIMIT ${lim}`);
        sampleRows = rowsFromSqlJsExecResult(r);
    }
    const availableTables = tables.map((table) => `- ${table.name}(columns: ${table.columns.join(", ")})`).join("\n");
    return {
        meta: {
            totalUsers: appData.users.length,
            totalOrders: appData.orders.length,
            totalProducts: appData.products.length,
        },
        aggregates: {
            users: computeAggregates(appData.users),
            orders: computeAggregates(appData.orders),
            products: computeAggregates(appData.products),
        },
        schema: {
            tables,
            sample: { table: sampleTable, rows: sampleRows },
            availableTables,
        },
        note: "Available tables above are the only valid SQLite tables. Use only listed table and column names. If no listed table/column matches the user request, return SELECT 1 WHERE 0 with an explanation instead of inventing names.",
    };
}

const MAX_SQL_RESULT_DISPLAY_ROWS = 300;

let sqlDataRevision = 0;
let sqlExecDbCache = null;
let sqlExecDbCacheRevision = -1;

function bumpSqlDataMutation() {
    sqlDataRevision++;
    if (sqlExecDbCache) {
        try {
            sqlExecDbCache.close();
        } catch {
            /* ignore */
        }
        sqlExecDbCache = null;
    }
    sqlExecDbCacheRevision = -1;
}

async function ensureSqlExecDatabase() {
    if (sqlExecDbCache && sqlExecDbCacheRevision === sqlDataRevision) {
        return sqlExecDbCache;
    }
    const SQL = await loadSqlJsModule();
    if (sqlExecDbCache) {
        try {
            sqlExecDbCache.close();
        } catch {
            /* ignore */
        }
        sqlExecDbCache = null;
    }
    const db = new SQL.Database();
    const tables = getSqlPipelineTables();
    for (const table of tables) {
        const rows = appData[table.role];
        if (!Array.isArray(rows) || !rows.length) continue;
        const cols = table.columns;
        if (!cols.length) continue;
        const defs = cols.map((c) => `${quoteSqlIdentifier(c)} TEXT`).join(", ");
        db.run(`CREATE TABLE ${quoteSqlIdentifier(table.name)} (${defs})`);
        const placeholders = cols.map(() => "?").join(", ");
        const stmt = db.prepare(`INSERT INTO ${quoteSqlIdentifier(table.name)} VALUES (${placeholders})`);
        for (const r of rows) {
            const vals = cols.map((c) => {
                const v = r[c];
                if (v == null) return "";
                return typeof v === "bigint" ? String(v) : String(v);
            });
            stmt.run(vals);
        }
        stmt.free();
    }
    sqlExecDbCache = db;
    sqlExecDbCacheRevision = sqlDataRevision;
    return db;
}

function assertSqlSelectOnly(sql) {
    const trimmed = String(sql || "").trim().replace(/;+\s*$/g, "").trim();
    if (!trimmed) throw new Error(t("sqlUnsafeSql"));
    const lower = trimmed.toLowerCase();
    if (!lower.startsWith("select") && !lower.startsWith("with")) throw new Error(t("sqlUnsafeSql"));
    if (/;\s*\S/.test(trimmed)) throw new Error(t("sqlUnsafeSql"));
    if (/\b(insert|update|delete|drop|alter|pragma|attach|detach|create|truncate)\b/i.test(trimmed)) {
        throw new Error(t("sqlUnsafeSql"));
    }
    return trimmed;
}

function stripSqlStringsAndComments(sql) {
    return String(sql || "")
        .replace(/--[^\r\n]*/g, " ")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/'([^']|'')*'/g, "''")
        .replace(/"([^"]|"")*"/g, (m) => m);
}

function extractCteNames(sql) {
    const names = new Set();
    const s = stripSqlStringsAndComments(sql).trim();
    if (!/^with\b/i.test(s)) return names;
    const re = /(?:with|,)\s*(?:"([^"]+)"|([A-Za-z_][\w$]*))\s*(?:\([^)]*\)\s*)?as\s*\(/gi;
    let m;
    while ((m = re.exec(s)) !== null) {
        names.add(normalizeSqlNameForMatch(m[1] || m[2]));
    }
    return names;
}

function extractSqlTableReferences(sql) {
    const refs = [];
    const s = stripSqlStringsAndComments(sql);
    const re = /\b(?:from|join)\s+(?:"([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([A-Za-z_][\w$]*))(?!\s*\()/gi;
    let m;
    while ((m = re.exec(s)) !== null) {
        const name = m[1] || m[2] || m[3] || m[4];
        if (name) refs.push(name);
    }
    return refs;
}

function explainSqlSchemaError(err) {
    const msg = err?.message || String(err || "");
    const noTable = /no such table:\s*([^\r\n]+)/i.exec(msg);
    if (noTable) return `${SQL_SCHEMA_ERROR_MESSAGE} Bang khong ton tai: ${noTable[1].trim()}.`;
    const noColumn = /no such column:\s*([^\r\n]+)/i.exec(msg);
    if (noColumn) return `${SQL_SCHEMA_ERROR_MESSAGE} Cot khong ton tai: ${noColumn[1].trim()}.`;
    return msg || SQL_SCHEMA_ERROR_MESSAGE;
}

function validateSqlAgainstPipelineSchema(db, sql) {
    const safe = assertSqlSelectOnly(sql);
    const tables = getSqlPipelineTables();
    const allowedTables = new Set(tables.map((table) => normalizeSqlNameForMatch(table.name)));
    const cteNames = extractCteNames(safe);
    const refs = extractSqlTableReferences(safe);
    for (const ref of refs) {
        const key = normalizeSqlNameForMatch(ref);
        if (!allowedTables.has(key) && !cteNames.has(key)) {
            throw new Error(`${SQL_SCHEMA_ERROR_MESSAGE} Bang khong ton tai: ${ref}.`);
        }
    }
    try {
        db.exec(`EXPLAIN QUERY PLAN ${safe}`);
    } catch (e) {
        throw new Error(explainSqlSchemaError(e));
    }
    return safe;
}

function extractSqlJsonFromReply(text) {
    let raw = String(text || "").trim().replace(/^\uFEFF/, "");
    raw = raw.replace(/^```(?:json)?\s*\r?\n?/im, "").replace(/\r?\n?```\s*$/im, "").trim();

    function extractQuotedJsonField(src, fieldName) {
        const esc = String(fieldName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`"${esc}"\\s*:\\s*"`, "i");
        const m = re.exec(src);
        if (!m) return null;
        let i = m.index + m[0].length;
        let out = "";
        let escape = false;
        for (; i < src.length; i++) {
            const ch = src[i];
            if (escape) {
                if (ch === "n") out += "\n";
                else if (ch === "t") out += "\t";
                else if (ch === "r") out += "\r";
                else if (ch === '"') out += '"';
                else if (ch === "\\") out += "\\";
                else if (ch === "/") out += "/";
                else if (ch === "b") out += "\b";
                else if (ch === "f") out += "\f";
                else out += ch;
                escape = false;
                continue;
            }
            if (ch === "\\") {
                escape = true;
                continue;
            }
            if (ch === '"') return out;
            out += ch;
        }
        return null;
    }

    function tryLenientSqlObject(s) {
        if (!s || typeof s !== "string") return null;
        const sql = extractQuotedJsonField(s, "sql");
        if (sql == null || String(sql).trim() === "") return null;
        let explanation = extractQuotedJsonField(s, "explanation");
        if (explanation == null) explanation = "";
        return { sql, explanation };
    }

    function tryParse(s) {
        try {
            const j = JSON.parse(s);
            if (j && typeof j.sql === "string") return j;
        } catch {
            return null;
        }
        return null;
    }

    function extractBalancedObject(s, start) {
        if (s[start] !== "{") return null;
        let depth = 0;
        let inString = false;
        let escape = false;
        for (let i = start; i < s.length; i++) {
            const ch = s[i];
            if (escape) {
                escape = false;
                continue;
            }
            if (inString) {
                if (ch === "\\") {
                    escape = true;
                    continue;
                }
                if (ch === '"') inString = false;
                continue;
            }
            if (ch === '"') {
                inString = true;
                continue;
            }
            if (ch === "{") depth += 1;
            else if (ch === "}") {
                depth -= 1;
                if (depth === 0) return s.slice(start, i + 1);
            }
        }
        return null;
    }

    function tryBalancedScan(s) {
        let from = 0;
        while (from < s.length) {
            const start = s.indexOf("{", from);
            if (start === -1) return null;
            const slice = extractBalancedObject(s, start);
            if (slice) {
                try {
                    const j = JSON.parse(slice);
                    if (j && typeof j.sql === "string") return j;
                } catch {
                    /* continue */
                }
            }
            from = start + 1;
        }
        return null;
    }

    let hit = tryParse(raw);
    if (hit) return hit;

    const reFence = /```(?:json)?\s*([\s\S]*?)```/gi;
    let m;
    while ((m = reFence.exec(raw)) !== null) {
        const inner = String(m[1] || "").trim();
        hit = tryParse(inner) || tryBalancedScan(inner) || tryLenientSqlObject(inner);
        if (hit) return hit;
    }

    hit = tryBalancedScan(raw);
    if (hit) return hit;

    hit = tryLenientSqlObject(raw);
    return hit || null;
}

function runClientSqlSelect(db, sql) {
    const safe = validateSqlAgainstPipelineSchema(db, sql);
    const res = db.exec(safe);
    if (!res || !res.length) {
        return { columns: [], rows: [] };
    }
    const { columns, values } = res[0];
    return { columns: columns || [], rows: values || [] };
}

function appendSqlPipelineBubble(sql, explanation, columns, rowValues, execErr) {
    const parts = [];
    parts.push(`<h3 class="sql-pipeline-title">${escapeHtml(t("sqlHeading"))}</h3>`);
    parts.push(`<pre class="sql-pipeline-pre"><code>${escapeHtml(sql)}</code></pre>`);
    if (explanation) {
        parts.push(`<p class="sql-pipeline-explain">${escapeHtml(explanation)}</p>`);
    }
    if (execErr) {
        parts.push(`<p class="sql-pipeline-error">${escapeHtml(tf("sqlExecError", { msg: execErr }))}</p>`);
    } else if (columns.length) {
        parts.push(`<h3 class="sql-pipeline-title">${escapeHtml(t("sqlResultHeading"))}</h3>`);
        parts.push('<div class="result-table-wrap"><table class="result-table"><thead><tr>');
        for (const c of columns) parts.push(`<th>${escapeHtml(c)}</th>`);
        parts.push("</tr></thead><tbody>");
        const cap = Math.min(rowValues.length, MAX_SQL_RESULT_DISPLAY_ROWS);
        for (let i = 0; i < cap; i++) {
            const row = rowValues[i];
            parts.push("<tr>");
            for (let j = 0; j < columns.length; j++) {
                const cell = row[j] == null ? "" : String(row[j]);
                parts.push(`<td>${escapeHtml(cell)}</td>`);
            }
            parts.push("</tr>");
        }
        parts.push("</tbody></table></div>");
        if (rowValues.length > cap) {
            parts.push(`<p class="sql-pipeline-note">${escapeHtml(tf("sqlTruncatedRows", { shown: cap, total: rowValues.length }))}</p>`);
        }
    } else if (!execErr) {
        parts.push(`<p class="sql-pipeline-note">${escapeHtml(t("sqlEmptyResult"))}</p>`);
    }
    const msgDiv = document.createElement("div");
    msgDiv.className = "msg bot";
    msgDiv.innerHTML = `
        <div class="msg-avatar sql-pipeline-avatar">SQL</div>
        <div class="msg-bubble sql-pipeline-bubble">${parts.join("")}</div>
    `;
    chatArea.appendChild(msgDiv);
    addConversationMessage({ type: "sql", sql, explanation, columns, rows: rowValues.slice(0, MAX_SQL_RESULT_DISPLAY_ROWS), execErr });
    scrollChat();
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
    touchActiveConversation(text);
    inputTextarea.value = "";
    addConversationApiMessage({ role: "user", content: text });

    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="ti ti-loader-2 spin"></i>';
    showStatus(t("statusCallingApi"));

    const sqlPipelineOn = document.getElementById("sqlPipelineToggle")?.checked !== false;

    try {
        const datasetPayload = sqlPipelineOn ? await buildSqlFewShotDatasetForApi() : buildDatasetForApi();
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                provider: apiSelect.value,
                messages: chatHistory.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: m.role, content: m.content })),
                dataset: datasetPayload,
                ...(sqlPipelineOn ? { mode: "sql" } : {}),
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
        if (sqlPipelineOn) {
            const parsed = extractSqlJsonFromReply(reply);
            if (!parsed) {
                throw new Error(t("sqlParseError"));
            }
            const db = await ensureSqlExecDatabase();
            let columns = [];
            let rowValues = [];
            let execErr = "";
            try {
                const r = runClientSqlSelect(db, parsed.sql);
                columns = r.columns;
                rowValues = r.rows;
            } catch (e) {
                execErr = e.message || String(e);
            }
            const explain = typeof parsed.explanation === "string" ? parsed.explanation : "";
            appendSqlPipelineBubble(parsed.sql, explain, columns, rowValues, execErr);
            const histParts = [`SQL:\n${parsed.sql}`];
            if (explain) histParts.push(explain);
            if (execErr) histParts.push(`Lỗi:\n${execErr}`);
            else histParts.push(`Kết quả: ${rowValues.length} dòng, ${columns.length} cột.`);
            addConversationApiMessage({ role: "assistant", content: histParts.join("\n\n").slice(0, 12000) });
        } else {
            appendAssistantBubble(renderAssistantHtml(reply));
            addConversationApiMessage({ role: "assistant", content: reply });
        }
        showStatus(t("statusDone"));
    } catch (err) {
        const msg = err.message || String(err);
        appendErrorBubble(msg);
        showStatus(msg, true);
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="ti ti-arrow-up"></i>';
        scrollChat();
    }
}

function clearChat() {
    chatHistory.length = 0;
    chatArea.innerHTML = "";
    showStatus("");
    const conversation = getActiveConversation() || createChatConversation({ activate: true, persist: false });
    conversation.messages = [];
    conversation.apiMessages = [];
    conversation.title = t("untitledChat");
    conversation.updatedAt = Date.now();
    appendSystemBubble(t("clearChatSystem"));
    updateSidebarHistoryUi();
    saveChatConversations();
}

function getFileIcon(fileName) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".pdf")) return "ti ti-file-pdf";
    if (lower.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return "ti ti-photo";
    if (lower.match(/\.(doc|docx)$/i)) return "ti ti-file-word";
    if (lower.endsWith(".txt")) return "ti ti-file-text";
    return "ti ti-file";
}

function attachFileToChat(file) {
    if (!file) return;
    
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        showStatus(tf("fileTooLarge", { size: "10MB" }), true);
        return;
    }
    
    attachedFiles.push({ file, name: file.name, size: file.size });
    renderAttachedFiles();
    showStatus(tf("fileAttached", { name: file.name }));
}

function renderAttachedFiles() {
    if (!attachedFilesContainer) return;
    
    if (attachedFiles.length === 0) {
        attachedFilesContainer.style.display = "none";
        attachedFilesContainer.innerHTML = "";
        return;
    }
    
    attachedFilesContainer.style.display = "flex";
    attachedFilesContainer.innerHTML = "";
    
    attachedFiles.forEach((item, idx) => {
        const div = document.createElement("div");
        div.className = "attached-file-item";
        
        const icon = getFileIcon(item.name);
        const sizeKB = Math.round(item.size / 1024);
        
        div.innerHTML = `
            <i class="attached-file-icon ${icon}" aria-hidden="true"></i>
            <span class="attached-file-name" title="${item.name}">${item.name}</span>
            <span style="font-size:11px;color:var(--text3);">${sizeKB}KB</span>
            <button class="attached-file-remove" type="button" data-idx="${idx}">
                <i class="ti ti-x" aria-hidden="true"></i>
            </button>
        `;
        
        attachedFilesContainer.appendChild(div);
    });
    
    // Add remove handlers
    attachedFilesContainer.querySelectorAll(".attached-file-remove").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            attachedFiles.splice(idx, 1);
            renderAttachedFiles();
        });
    });
}

function showStatus(message, isError = false) {
    const hintLabel = document.querySelector(".input-hint span");
    if (hintLabel) {
        if (message) {
            hintLabel.textContent = message;
            hintLabel.style.color = isError ? "#dc2626" : "var(--text3)";
        } else {
            const key = hintLabel.getAttribute("data-i18n");
            hintLabel.textContent = key ? t(key) : "";
            hintLabel.style.color = "var(--text3)";
        }
    }
}

async function handleFileUploadWithFile(file, mode) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".zip") && !lower.endsWith(".csv") && !lower.endsWith(".db") && !lower.endsWith(".sqlite")) {
        showStatus(t("invalidExtension"), true);
        return;
    }

    // Handle .db / .sqlite (SQLite) files loaded directly
    if (lower.endsWith(".db") || lower.endsWith(".sqlite")) {
        showStatus(t("statusLoadingData"));
        try {
            const buf = await file.arrayBuffer();
            const sqlite = await readSqliteBundleFromBuffer(buf);
            if (!sqlite?.bundle) {
                showStatus(t("zipInvalid"), true);
                return;
            }
            const b = sqlite.bundle;
            const bubble = tf("zipLoadedSqlite", {
                tu: sqlite.map.usersTable, to: sqlite.map.ordersTable, tp: sqlite.map.productsTable,
                nu: b.users.length, no: b.orders.length, np: b.products.length,
            });
            if (mode === "replace") {
                replaceWorkspaceWithBundle(b, file.name, labelsFromSqliteMap(sqlite.map));
            } else if (mode === "addSource") {
                addBundleAsNewSource(b, file.name, labelsFromSqliteMap(sqlite.map));
            } else {
                mergeBundleIntoActiveSource(b, file.name, labelsFromSqliteMap(sqlite.map));
            }
            appendSystemBubble(bubble);
            updateDbStatus();
            showStatus(t("statusReadyChat"));
        } catch (err) {
            showStatus(tf("readError", { msg: err.message }), true);
        }
        return;
    }

    showStatus(t("statusLoadingData"));
    try {
        if (lower.endsWith(".zip")) {
            const r = await extractZipBundle(file);
            if (!r.ok) return;
            if (mode === "replace") {
                replaceWorkspaceWithBundle(r.bundle, file.name, r.tableLabels);
                if (r.replaceBubble) appendSystemBubble(r.replaceBubble);
            } else if (mode === "addSource") {
                addBundleAsNewSource(r.bundle, file.name, r.tableLabels);
                appendSystemBubble(
                    tf("sourceAddedAsNew", {
                        name: file.name,
                        nu: appData.users.length,
                        no: appData.orders.length,
                        np: appData.products.length,
                    })
                );
            } else {
                const emptyBefore = !hasData();
                mergeBundleIntoActiveSource(r.bundle, file.name, r.tableLabels);
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
            const csvLabels = (() => {
                const out = { users: null, orders: null, products: null };
                if (r.role) out[r.role] = csvStemFromFilename(file.name);
                return out;
            })();
            if (mode === "replace") {
                replaceWorkspaceWithBundle(r.bundle, file.name, csvLabels);
                if (r.replaceBubble) appendSystemBubble(r.replaceBubble);
            } else if (mode === "addSource") {
                addBundleAsNewSource(r.bundle, file.name, csvLabels);
                appendSystemBubble(
                    tf("sourceAddedAsNew", {
                        name: file.name,
                        nu: appData.users.length,
                        no: appData.orders.length,
                        np: appData.products.length,
                    })
                );
                showStatus(r.statusText);
            } else {
                const emptyBefore = !hasData();
                mergeBundleIntoActiveSource(r.bundle, file.name, csvLabels);
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
        const errorMsg = error.code ? `${error.code}: ${error.message}` : error.message;
        showStatus(tf("readError", { msg: errorMsg }), true);
        console.error("Upload error:", error);
    }
}

async function handleFileUploadFromInput(input, mode) {
    const file = input?.files?.[0];
    if (!file) return;
    await handleFileUploadWithFile(file, mode);
    if (input) input.value = "";
}

// RFC 4180 compliant CSV row parser
function parseCsvRow(line) {
    const cells = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"'; // escaped double-quote
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === "," && !inQuotes) {
            cells.push(current);
            current = "";
        } else {
            current += ch;
        }
    }
    cells.push(current);
    return cells;
}

function parseCsvText(text) {
    const lines = text.split(/\r?\n/);
    const result = [];
    let headers = null;
    for (const line of lines) {
        if (!line.trim()) continue;
        const row = parseCsvRow(line);
        if (!headers) {
            // Normalize headers: trim + lowercase for consistent column matching
            headers = row.map(h => h.trim().toLowerCase());
        } else {
            const obj = {};
            headers.forEach((h, idx) => { obj[h] = (row[idx] ?? "").trim(); });
            result.push(obj);
        }
    }
    return result;
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
    return { ok: true, bundle, statusText, replaceBubble: miss.length === 0 ? statusText : null, role };
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

        if (csvEntries.length >= 1) {
            const partial = resolveZipCsvPartial(csvEntries);
            if (partial) {
                const users = partial.users ? parseCsvText(await partial.users.async("string")) : [];
                const orders = partial.orders ? parseCsvText(await partial.orders.async("string")) : [];
                const products = partial.products ? parseCsvText(await partial.products.async("string")) : [];
                const bundle = { users, orders, products };
                const replaceBubble = tf("zipLoadedCsv", {
                    nu: bundle.users.length,
                    no: bundle.orders.length,
                    np: bundle.products.length,
                });
                const tableLabels = coerceTableLabels({
                    users: partial.users ? zipEntryBasename(partial.users.name).replace(/\.csv$/i, "") : null,
                    orders: partial.orders ? zipEntryBasename(partial.orders.name).replace(/\.csv$/i, "") : null,
                    products: partial.products ? zipEntryBasename(partial.products.name).replace(/\.csv$/i, "") : null,
                });
                return { ok: true, bundle, replaceBubble, tableLabels };
            }
        }

        const dbEntries = entries.filter((entry) => {
            const lowerName = entry.name.toLowerCase();
            return lowerName.endsWith(".db") || lowerName.endsWith(".sqlite");
        });
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
                    return { ok: true, bundle: b, replaceBubble, tableLabels: labelsFromSqliteMap(sqlite.map) };
                }
            } catch (_) {
                /* thử file .db hoặc .sqlite khác hoặc định dạng khác */
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
                return {
                    ok: true,
                    bundle: classic,
                    replaceBubble,
                    tableLabels: coerceTableLabels({ users: "customers", orders: "payments", products: "products" }),
                };
            }
            const sk = buildSakilaData(sqlText);
            if (sk) {
                const replaceBubble = tf("zipMappedSakila", {
                    nu: sk.users.length,
                    no: sk.orders.length,
                    np: sk.products.length,
                });
                return {
                    ok: true,
                    bundle: sk,
                    replaceBubble,
                    tableLabels: coerceTableLabels({ users: "customer", orders: "payment", products: "film" }),
                };
            }
        }

        setDataStatus(t("zipInvalid"), true);
        return { ok: false };
    } catch (error) {
        const errorMsg = error.code ? `${error.code}: ${error.message}` : error.message;
        setDataStatus(tf("zipError", { msg: errorMsg }), true);
        console.error("ZIP extraction error:", error);
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
            marked.use({ breaks: true });
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

// ─────────────────────────────────────────────
//  DB VIEWER MODAL
// ─────────────────────────────────────────────
const DB_PAGE_SIZE = 50;
let dbModal_role = "users";
let dbModal_page = 1;
let dbModal_totalPages = 1;
let dbModal_totalRows = 0;
let dbModal_serverRows = [];
let dbModal_remoteEnabled = false;
let dbModal_filter = "";
let dbModal_filtered = [];

function getAvailableDbRoles() {
    return ["users", "orders", "products"].filter((role) => Array.isArray(appData[role]) && appData[role].length > 0);
}

function refreshDbModalTabs() {
    const available = getAvailableDbRoles();
    const tabWrapper = document.querySelector(".db-modal-tabs");
    if (tabWrapper) {
        tabWrapper.style.display = available.length > 1 ? "flex" : "none";
    }
    document.querySelectorAll(".db-tab-btn").forEach((btn) => {
        const role = btn.dataset.role;
        if (available.includes(role)) {
            btn.style.display = "inline-flex";
        } else {
            btn.style.display = "none";
        }
    });
}

async function openDbModal(initialRole = "users") {
    const modal = document.getElementById("dbModal");
    if (!modal) return;
    if (!hasData()) {
        showStatus(t("statusNoData"), true);
        return;
    }

    const available = getAvailableDbRoles();
    if (!available.length) {
        showStatus(t("statusNoData"), true);
        return;
    }

    refreshDbModalTabs();
    if (!available.includes(initialRole)) {
        initialRole = available[0];
    }

    dbModal_role = initialRole;
    dbModal_filter = "";
    dbModal_page = 1;

    const searchInput = document.getElementById("dbSearchInput");
    if (searchInput) {
        searchInput.value = "";
        searchInput.placeholder = t("dbSearchPlaceholder");
    }

    document.querySelectorAll(".db-tab-btn").forEach(btn =>
        btn.classList.toggle("active", btn.dataset.role === dbModal_role)
    );

    renderDbModal();

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    searchInput?.focus();
}

async function loadDbPage(role, page = 1) {
    try {
        const resp = await fetch(`/api/students?table=${encodeURIComponent(role)}&page=${page}&pageSize=${DB_PAGE_SIZE}`);
        const data = await resp.json();
        if (!resp.ok) {
            throw new Error(data.error || "Không lấy được dữ liệu");
        }
        dbModal_serverRows = Array.isArray(data.rows) ? data.rows : [];
        dbModal_totalRows = Number(data.total) || 0;
        dbModal_totalPages = Number(data.totalPages) || 1;
        dbModal_page = Number(data.page) || page;
        dbModal_role = role;
        renderDbModal();
    } catch (error) {
        showStatus(`Lỗi tải trang dữ liệu: ${error.message}`, true);
        console.error("loadDbPage error:", error);
    }
}

function closeDbModal() {
    const modal = document.getElementById("dbModal");
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
}

function renderDbModal() {
    const rows = dbModal_remoteEnabled ? dbModal_serverRows : (Array.isArray(appData[dbModal_role]) ? appData[dbModal_role] : []);

    // Apply search filter across all columns
    const q = dbModal_filter.toLowerCase().trim();
    dbModal_filtered = q
        ? rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)))
        : rows.slice();

    const totalRows = dbModal_filtered.length;
    const totalPages = dbModal_remoteEnabled ? Math.max(1, dbModal_totalPages) : 1;
    if (dbModal_page >= totalPages) dbModal_page = Math.max(0, totalPages - 1);

    const pageRows = dbModal_remoteEnabled ? dbModal_filtered : dbModal_filtered;

    // Row info badge
    const rowInfo = document.getElementById("dbRowInfo");
    if (rowInfo) {
        if (q) {
            rowInfo.textContent = tf("dbRowsFiltered", { filtered: totalRows, total: rows.length });
        } else if (dbModal_remoteEnabled) {
            rowInfo.textContent = tf("dbRows", { count: dbModal_totalRows });
        } else {
            rowInfo.textContent = tf("dbRows", { count: rows.length });
        }
    }

    // Page info
    const pageInfo = document.getElementById("dbPageInfo");
    if (pageInfo) {
        pageInfo.textContent = tf("dbPage", { page: dbModal_page + 1, total: totalPages });
        pageInfo.style.display = dbModal_remoteEnabled ? "inline" : "none";
    }

    // Pagination buttons
    const prevBtn = document.getElementById("dbPrevBtn");
    const nextBtn = document.getElementById("dbNextBtn");
    if (prevBtn) {
        prevBtn.disabled = dbModal_remoteEnabled ? dbModal_page <= 1 : true;
        prevBtn.style.display = dbModal_remoteEnabled ? "inline-flex" : "none";
    }
    if (nextBtn) {
        nextBtn.disabled = dbModal_remoteEnabled ? dbModal_page >= totalPages : true;
        nextBtn.style.display = dbModal_remoteEnabled ? "inline-flex" : "none";
    }

    // Render table
    const wrap = document.getElementById("dbTableWrap");
    if (!wrap) return;

    if (!pageRows.length) {
        const msg = q ? t("dbNoResults") : t("dbNoData");
        const icon = q ? "ti-zoom-cancel" : "ti-database-off";
        wrap.innerHTML = `
            <div class="db-empty-state">
                <i class="ti ${icon}"></i>
                <p>${escapeHtml(msg)}</p>
            </div>`;
        return;
    }

    const cols = Object.keys(pageRows[0]);
    const headerHtml = cols.map(c => `<th>${escapeHtml(c)}</th>`).join("");

    const bodyHtml = pageRows.map(r => {
        const tds = cols.map(c => {
            const v = String(r[c] ?? "");
            const isNum = v !== "" && !isNaN(Number(v)) && v.trim() !== "";
            const display = v.length > 40 ? v.slice(0, 38) + "…" : v;
            return `<td class="${isNum ? "td-num" : ""}" title="${escapeHtml(v)}">${escapeHtml(display)}</td>`;
        }).join("");
        return `<tr>${tds}</tr>`;
    }).join("");

    const availableTables = getAvailableDbRoles();
    const currentTableLabel = availableTables.length > 1 ? getSchemaLabelForRole(dbModal_role) : "";
    const titleHtml = currentTableLabel ? `<div class="db-table-title">${escapeHtml(currentTableLabel)}</div>` : "";

    wrap.innerHTML = `
        ${titleHtml}
        <table class="db-full-table">
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${bodyHtml}</tbody>
        </table>`;
}

function initDbModal() {
    const modal = document.getElementById("dbModal");
    if (!modal) return;

    // Close on overlay backdrop click
    modal.addEventListener("click", e => { if (e.target === modal) closeDbModal(); });

    // Close button
    document.getElementById("dbModalClose")?.addEventListener("click", closeDbModal);

    // ESC key to close
    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && modal.style.display !== "none") closeDbModal();
    });

    // Tab switching
    document.querySelectorAll(".db-tab-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            dbModal_role = btn.dataset.role;
            dbModal_page = 1;
            dbModal_filter = "";
            const searchInput = document.getElementById("dbSearchInput");
            if (searchInput) searchInput.value = "";
            document.querySelectorAll(".db-tab-btn").forEach(b =>
                b.classList.toggle("active", b === btn)
            );
            if (dbModal_remoteEnabled) {
                await loadDbPage(dbModal_role, dbModal_page);
            } else {
                renderDbModal();
            }
        });
    });

    // Live search
    document.getElementById("dbSearchInput")?.addEventListener("input", e => {
        dbModal_filter = e.target.value;
        dbModal_page = 0;
        renderDbModal();
    });

    // Pagination
    document.getElementById("dbPrevBtn")?.addEventListener("click", async () => {
        if (dbModal_page > 1) {
            dbModal_page--;
            if (dbModal_remoteEnabled) {
                await loadDbPage(dbModal_role, dbModal_page);
            } else {
                renderDbModal();
            }
        }
    });
    document.getElementById("dbNextBtn")?.addEventListener("click", async () => {
        if (dbModal_page < dbModal_totalPages) {
            dbModal_page++;
            if (dbModal_remoteEnabled) {
                await loadDbPage(dbModal_role, dbModal_page);
            } else {
                renderDbModal();
            }
        }
    });
}

