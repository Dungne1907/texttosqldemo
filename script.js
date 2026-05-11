const questionInput = document.getElementById("questionInput");
const generateBtn = document.getElementById("generateBtn");
const runBtn = document.getElementById("runBtn");
const loadDataBtn = document.getElementById("loadDataBtn");
const loadZipBtn = document.getElementById("loadZipBtn");
const usersFile = document.getElementById("usersFile");
const ordersFile = document.getElementById("ordersFile");
const productsFile = document.getElementById("productsFile");
const zipFile = document.getElementById("zipFile");
const dataStatusText = document.getElementById("dataStatusText");
const sqlOutput = document.getElementById("sqlOutput");
const analysisOutput = document.getElementById("analysisOutput");
const resultOutput = document.getElementById("resultOutput");
const statusText = document.getElementById("statusText");

const appData = { users: [], orders: [], products: [] };

function setStatus(message, isError = false) {
    statusText.textContent = message;
    statusText.classList.toggle("error", isError);
}

function setDataStatus(message, isError = false) {
    dataStatusText.textContent = message;
    dataStatusText.classList.toggle("error", isError);
}

function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
}

function extractTopN(text) {
    const topMatch = text.match(/top\s+(\d+)/);
    return topMatch ? Number(topMatch[1]) : 5;
}

function extractYear(text) {
    const yearMatch = text.match(/(20\d{2})/);
    return yearMatch ? Number(yearMatch[1]) : null;
}

function detectStatus(text) {
    if (text.includes("da giao") || text.includes("hoan thanh")) return "delivered";
    if (text.includes("dang xu ly")) return "processing";
    if (text.includes("huy")) return "cancelled";
    return null;
}

function buildWhereClause(filters) {
    const clauses = [];
    if (filters.year) clauses.push(`EXTRACT(YEAR FROM o.created_at) = ${filters.year}`);
    if (filters.status) clauses.push(`o.status = '${filters.status}'`);
    return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
}

function parseDateYear(value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getFullYear();
}

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function renderAnalysis(analysis) {
    const lines = [
        `intent: ${analysis.intent}`,
        `confidence: ${analysis.confidence}`,
        `entities.topN: ${analysis.entities.topN}`,
        `entities.year: ${analysis.entities.year ?? "none"}`,
        `entities.status: ${analysis.entities.status ?? "none"}`,
    ];
    analysisOutput.textContent = lines.join("\n");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function renderResultTable(columns, rows) {
    if (!columns.length) {
        resultOutput.innerHTML = "<p>Khong co du lieu tra ve.</p>";
        return;
    }
    const head = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
    const body = rows
        .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column] ?? "")}</td>`).join("")}</tr>`)
        .join("");
    resultOutput.innerHTML = `<table class="result-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function textToSql(question) {
    const normalized = normalizeText(question);
    const topN = extractTopN(normalized);
    const year = extractYear(normalized);
    const status = detectStatus(normalized);
    const whereClause = buildWhereClause({ year, status });

    const analysis = { intent: "unknown", entities: { topN, year, status }, confidence: "low" };

    if (normalized.includes("moi nhat") && normalized.includes("don hang")) {
        analysis.intent = "latest_orders";
        analysis.confidence = "high";
        return { sql: "SELECT id, user_id, amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 10;", analysis };
    }
    if (normalized.includes("doanh thu") && normalized.includes("thanh pho")) {
        analysis.intent = "revenue_by_city";
        analysis.confidence = "high";
        return {
            sql: `SELECT u.city, SUM(o.amount) AS total_revenue FROM users u JOIN orders o ON u.id = o.user_id ${whereClause} GROUP BY u.city ORDER BY total_revenue DESC;`,
            analysis,
        };
    }
    if ((normalized.includes("top") || normalized.includes("cao nhat")) && normalized.includes("khach hang")) {
        analysis.intent = "top_customers";
        analysis.confidence = "high";
        return {
            sql: `SELECT u.id, u.name, SUM(o.amount) AS total_spent FROM users u JOIN orders o ON u.id = o.user_id ${whereClause} GROUP BY u.id, u.name ORDER BY total_spent DESC LIMIT ${topN};`,
            analysis,
        };
    }
    if (normalized.includes("san pham") && normalized.includes("danh muc")) {
        analysis.intent = "products_by_category";
        analysis.confidence = "high";
        return { sql: "SELECT category, COUNT(*) AS product_count, AVG(price) AS avg_price FROM products GROUP BY category ORDER BY product_count DESC;", analysis };
    }
    return {
        sql: "-- Khong tim thay mau phu hop.",
        analysis,
    };
}

function filterOrdersByEntities(orders, entities) {
    return orders.filter((order) => {
        if (entities.status && normalizeText(order.status) !== entities.status) return false;
        if (entities.year && parseDateYear(order.created_at) !== entities.year) return false;
        return true;
    });
}

function executeIntent(intent, entities) {
    if (intent === "latest_orders") {
        const rows = [...appData.orders]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10)
            .map((o) => ({ id: o.id, user_id: o.user_id, amount: toNumber(o.amount), status: o.status, created_at: o.created_at }));
        return { columns: ["id", "user_id", "amount", "status", "created_at"], rows };
    }

    if (intent === "revenue_by_city") {
        const usersById = new Map(appData.users.map((u) => [String(u.id), u]));
        const grouped = new Map();
        for (const order of filterOrdersByEntities(appData.orders, entities)) {
            const user = usersById.get(String(order.user_id));
            const city = user?.city || "Unknown";
            grouped.set(city, (grouped.get(city) || 0) + toNumber(order.amount));
        }
        const rows = [...grouped.entries()]
            .map(([city, total_revenue]) => ({ city, total_revenue: Number(total_revenue.toFixed(2)) }))
            .sort((a, b) => b.total_revenue - a.total_revenue);
        return { columns: ["city", "total_revenue"], rows };
    }

    if (intent === "top_customers") {
        const usersById = new Map(appData.users.map((u) => [String(u.id), u]));
        const grouped = new Map();
        for (const order of filterOrdersByEntities(appData.orders, entities)) {
            const key = String(order.user_id);
            grouped.set(key, (grouped.get(key) || 0) + toNumber(order.amount));
        }
        const rows = [...grouped.entries()]
            .map(([id, total_spent]) => ({ id, name: usersById.get(id)?.name || `User ${id}`, total_spent: Number(total_spent.toFixed(2)) }))
            .sort((a, b) => b.total_spent - a.total_spent)
            .slice(0, entities.topN || 5);
        return { columns: ["id", "name", "total_spent"], rows };
    }

    if (intent === "products_by_category") {
        const grouped = new Map();
        for (const product of appData.products) {
            const key = product.category || "Unknown";
            const prev = grouped.get(key) || { count: 0, total: 0 };
            prev.count += 1;
            prev.total += toNumber(product.price);
            grouped.set(key, prev);
        }
        const rows = [...grouped.entries()]
            .map(([category, v]) => ({
                category,
                product_count: v.count,
                avg_price: Number((v.total / Math.max(1, v.count)).toFixed(2)),
            }))
            .sort((a, b) => b.product_count - a.product_count);
        return { columns: ["category", "product_count", "avg_price"], rows };
    }

    return { columns: ["message"], rows: [{ message: "Khong thuc thi duoc query voi intent hien tai." }] };
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

async function readCsvFile(fileInput) {
    const file = fileInput.files?.[0];
    if (!file) return null;
    const text = await file.text();
    return parseCsvText(text);
}

async function loadDataFiles() {
    try {
        const [users, orders, products] = await Promise.all([readCsvFile(usersFile), readCsvFile(ordersFile), readCsvFile(productsFile)]);
        if (!users || !orders || !products) {
            setDataStatus("Vui long chon du 3 file users/orders/products.", true);
            return;
        }
        appData.users = users;
        appData.orders = orders;
        appData.products = products;
        setDataStatus(`Da nap: users=${users.length}, orders=${orders.length}, products=${products.length}`);
        setStatus("Da nap du lieu, san sang truy van.");
    } catch (error) {
        setDataStatus(`Nap file that bai: ${error.message}`, true);
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
    if (!customers.length || !payments.length || !products.length) {
        return null;
    }

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
    if (!customers.length || !payments.length || !films.length) {
        return null;
    }

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

async function loadDataFromZip() {
    try {
        const file = zipFile.files?.[0];
        if (!file) {
            setDataStatus("Vui long chon file zip.", true);
            return;
        }
        if (typeof window.JSZip === "undefined") {
            setDataStatus("Khong tai duoc JSZip. Kiem tra ket noi internet.", true);
            return;
        }

        const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
        const entries = Object.values(zip.files).filter((entry) => !entry.dir);
        const csvEntries = entries.filter((entry) => entry.name.toLowerCase().endsWith(".csv"));

        if (csvEntries.length >= 3) {
            const usersEntry = csvEntries.find((e) => e.name.toLowerCase().includes("users"));
            const ordersEntry = csvEntries.find((e) => e.name.toLowerCase().includes("orders"));
            const productsEntry = csvEntries.find((e) => e.name.toLowerCase().includes("products"));
            if (usersEntry && ordersEntry && productsEntry) {
                appData.users = parseCsvText(await usersEntry.async("string"));
                appData.orders = parseCsvText(await ordersEntry.async("string"));
                appData.products = parseCsvText(await productsEntry.async("string"));
                setDataStatus(`Da nap ZIP CSV: users=${appData.users.length}, orders=${appData.orders.length}, products=${appData.products.length}`);
                setStatus("Da nap du lieu tu ZIP.");
                return;
            }
        }

        const sqlEntries = entries.filter((entry) => entry.name.toLowerCase().endsWith(".sql"));
        for (const sqlEntry of sqlEntries) {
            const sqlText = await sqlEntry.async("string");
            const fromClassic = mapClassicModels(sqlText);
            if (fromClassic) {
                setDataStatus(`Da map tu ${fromClassic}.sql: users=${appData.users.length}, orders=${appData.orders.length}, products=${appData.products.length}`);
                setStatus("Da nap du lieu tu ZIP.");
                return;
            }
            const fromSakila = mapSakila(sqlText);
            if (fromSakila) {
                setDataStatus(`Da map tu ${fromSakila}.sql: users=${appData.users.length}, orders=${appData.orders.length}, products=${appData.products.length}`);
                setStatus("Da nap du lieu tu ZIP.");
                return;
            }
        }

        setDataStatus("Khong tim thay du lieu hop le trong ZIP. Can users/orders/products CSV hoac dump sakila/classicmodels SQL.", true);
    } catch (error) {
        setDataStatus(`Nap ZIP that bai: ${error.message}`, true);
    }
}

function generateSql() {
    const question = questionInput.value.trim();
    if (!question) {
        setStatus("Thieu cau hoi.", true);
        sqlOutput.textContent = "-- Vui long nhap cau hoi.";
        return null;
    }
    const generated = textToSql(question);
    renderAnalysis(generated.analysis);
    sqlOutput.textContent = generated.sql;
    setStatus("Da sinh SQL.");
    return generated;
}

function runQuery() {
    if (!appData.users.length || !appData.orders.length || !appData.products.length) {
        setStatus("Ban can nap du 3 file CSV truoc khi chay.", true);
        return;
    }
    const generated = generateSql();
    if (!generated) return;
    const result = executeIntent(generated.analysis.intent, generated.analysis.entities);
    renderResultTable(result.columns, result.rows);
    setStatus(`Query thanh cong. ${result.rows.length} dong.`);
}

loadDataBtn.addEventListener("click", () => {
    loadDataFiles();
});
generateBtn.addEventListener("click", () => {
    generateSql();
});
runBtn.addEventListener("click", () => {
    runQuery();
});
loadZipBtn.addEventListener("click", () => {
    loadDataFromZip();
});

document.querySelectorAll(".example-btn").forEach((button) => {
    button.addEventListener("click", () => {
        questionInput.value = button.textContent || "";
        generateSql();
    });
});

questionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        generateSql();
    }
});