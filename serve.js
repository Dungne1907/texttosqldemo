const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const Database = require("better-sqlite3");

const PORT = Number(process.env.PORT) || 5500;
const ROOT = __dirname;
const MAX_BODY = 4 * 1024 * 1024;
const STUDENT_DB_FILE = path.join(ROOT, "CNTT_ChuDoi_CoSoDuLieu_2025.sqlite");
const STUDENT_TABLES = {
    users: "SinhVien",
    orders: "ThanhToan",
    products: "MonHoc",
};

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
};

/** Gán biến từ một dòng .env nếu process chưa có hoặc đang rỗng. */
function applyDotEnvLine(key, val) {
    if (!key) return;
    if (process.env[key] !== undefined && String(process.env[key]).trim() !== "") return;
    process.env[key] = val;
}

/** Đọc một file .env (UTF-8, bỏ BOM). */
function applyDotEnvFromFile(envPath) {
    if (!fs.existsSync(envPath)) return;
    let text = fs.readFileSync(envPath, "utf8");
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        applyDotEnvLine(key, val);
    }
}

/** File chứa biến môi trường (bỏ .env.example). */
function isLoadableEnvFilename(name) {
    if (!name.endsWith(".env")) return false;
    if (name === ".env.example" || name.endsWith(".env.example")) return false;
    return true;
}

/** Thu thập mọi file *.env trong cây thư mục (tối đa maxDepth cấp con). */
function collectEnvFilesRecursive(dir, out, depth, maxDepth) {
    if (depth > maxDepth || !fs.existsSync(dir)) return;
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === "node_modules" || ent.name === ".git") continue;
            collectEnvFilesRecursive(full, out, depth + 1, maxDepth);
        } else if (ent.isFile() && isLoadableEnvFilename(ent.name)) {
            out.push(full);
        }
    }
}

/** Các file .env được thử theo thứ tự; file sau chỉ bổ sung khi biến vẫn trống. */
function collectDotEnvPaths() {
    const list = [
        path.join(ROOT, ".env"),
        path.join(ROOT, ".env.local"),
        path.join(ROOT, "texttosqldemo", ".env"),
    ];
    const vscodeRoot = path.join(ROOT, "texttosqldemo", ".vscode");
    const nested = [];
    collectEnvFilesRecursive(vscodeRoot, nested, 0, 6);
    nested.sort((a, b) => {
        const ba = path.basename(a);
        const bb = path.basename(b);
        if (ba === ".env" && bb !== ".env") return -1;
        if (bb === ".env" && ba !== ".env") return 1;
        return a.localeCompare(b, "en");
    });
    list.push(...nested);
    return list;
}

function loadDotEnv() {
    try {
        const seen = new Set();
        for (const envPath of collectDotEnvPaths()) {
            const norm = path.normalize(envPath);
            if (seen.has(norm)) continue;
            seen.add(norm);
            applyDotEnvFromFile(norm);
        }
    } catch {
        /* ignore */
    }
}

loadDotEnv();

function queryDbPage(tableKey, page, pageSize) {
    const tableName = STUDENT_TABLES[tableKey];
    if (!tableName) throw new Error("Invalid table");
    if (!fs.existsSync(STUDENT_DB_FILE)) throw new Error("Student database not found");

    const db = new Database(STUDENT_DB_FILE, { readonly: true });
    try {
        const countRow = db.prepare(`SELECT COUNT(*) AS count FROM "${tableName}"`).get();
        const total = Number(countRow?.count || 0);
        const offset = (page - 1) * pageSize;
        const rows = db
            .prepare(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`)
            .all(pageSize, offset);
        return { rows, total };
    } finally {
        db.close();
    }
}

function safeResolve(urlPath) {
    const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
    const requested = cleanPath === "/" ? "/index.html" : cleanPath;
    const filePath = path.normalize(path.join(ROOT, requested));
    if (!filePath.startsWith(ROOT)) return null;
    return filePath;
}

function readRequestBody(req, maxBytes) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on("data", (chunk) => {
            size += chunk.length;
            if (size > maxBytes) {
                reject(new Error("Payload too large"));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        req.on("error", reject);
    });
}

function httpsJson(urlString, { method = "GET", headers = {}, body = null } = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlString);
        const opts = {
            hostname: u.hostname,
            port: u.port || 443,
            path: `${u.pathname}${u.search}`,
            method,
            headers: { ...headers },
        };
        const req = https.request(opts, (res) => {
            let data = "";
            res.on("data", (c) => {
                data += c;
            });
            res.on("end", () => {
                let json = null;
                try {
                    json = data ? JSON.parse(data) : null;
                } catch {
                    json = null;
                }
                resolve({ status: res.statusCode || 0, json, raw: data });
            });
        });
        req.on("error", reject);
        if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
        req.end();
    });
}

const SYSTEM_PREFIX = `Bạn là nhà phân tích dữ liệu. Dữ liệu gồm tối đa 3 nhóm logic trong JSON: users, orders, products. Một số nhóm có thể rỗng nếu người dùng chỉ nạp một phần bảng.
- Trả lời bằng tiếng Việt, nếu có số liệu hãy nêu rõ con số (tổng, trung bình, đếm, v.v.).
- Trường "meta" chứa tổng số dòng thực (totalUsers, totalOrders, totalProducts). Trường "aggregates" chứa thống kê tính sẵn trên TOÀN BỘ dữ liệu (sum, avg, min, max, count) — hãy ưu tiên dùng aggregates.* để tính toán chính xác thay vì dùng dữ liệu preview có thể bị cắt ngắn.
- Nếu bảng nào trong JSON là mảng rỗng, hãy nói rõ là không có dữ liệu cho nhóm đó.
- Có thể dùng markdown: tiêu đề ##, danh sách, bảng gồm cột, hoặc khối code nếu cần.
- Không bịa số: chỉ dựa trên dữ liệu được cung cấp.

=== DỮ LIỆU (JSON) ===
`;

function callDeepSeek({ apiKey, systemText, messages }) {
    const apiMessages = [{ role: "system", content: systemText }, ...messages];
    return httpsJson("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: {
            model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
            messages: apiMessages,
            temperature: 0.2,
            max_tokens: 4096,
        },
    }).then(({ status, json, raw }) => {
        if (status < 200 || status >= 300) {
            const errMsg = json?.error?.message || raw || `HTTP ${status}`;
            throw new Error(errMsg);
        }
        const text = json?.choices?.[0]?.message?.content;
        if (!text) throw new Error("DeepSeek: empty response");
        return text;
    });
}

function callGemini({ apiKey, systemText, messages }) {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
    }));
    const body = {
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
        },
    };
    return httpsJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
    }).then(({ status, json, raw }) => {
        if (status < 200 || status >= 300) {
            const errMsg = json?.error?.message || raw || `HTTP ${status}`;
            throw new Error(errMsg);
        }
        const parts = json?.candidates?.[0]?.content?.parts;
        const text = parts?.map((p) => p.text || "").join("") || "";
        if (!text) throw new Error("Gemini: empty response");
        return text;
    });
}

async function handleChat(req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5500";
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    try {
        const raw = await readRequestBody(req, MAX_BODY);
        const payload = JSON.parse(raw);
        const provider = String(payload.provider || "deepseek").toLowerCase();
        const messages = Array.isArray(payload.messages) ? payload.messages : [];
        const dataset = payload.dataset && typeof payload.dataset === "object" ? payload.dataset : {};

        if (!messages.length || !messages.every((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: "messages must be non-empty array of {role, content}" }));
            return;
        }

        const datasetStr = JSON.stringify(dataset);
        const systemText = SYSTEM_PREFIX + datasetStr;

        let reply;
        if (provider === "gemini") {
            const key = process.env.GEMINI_API_KEY;
            if (!key) {
                res.writeHead(503);
                res.end(JSON.stringify({ error: "Thieu GEMINI_API_KEY trong file .env (may chu)." }));
                return;
            }
            reply = await callGemini({ apiKey: key, systemText, messages });
        } else {
            const key = process.env.DEEPSEEK_API_KEY;
            if (!key) {
                res.writeHead(503);
                res.end(JSON.stringify({ error: "Thieu DEEPSEEK_API_KEY trong file .env (may chu)." }));
                return;
            }
            reply = await callDeepSeek({ apiKey: key, systemText, messages });
        }

        res.writeHead(200);
        res.end(JSON.stringify({ reply }));
    } catch (e) {
        const msg = e.message || String(e);
        res.writeHead(500);
        res.end(JSON.stringify({ error: msg }));
    }
}

const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);

    if (req.method === "POST" && urlPath === "/api/chat") {
        handleChat(req, res);
        return;
    }

    if (req.method === "OPTIONS" && urlPath === "/api/chat") {
        const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5500";
        res.writeHead(204, {
            "Access-Control-Allow-Origin": allowedOrigin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        });
        res.end();
        return;
    }

    if (req.method === "GET" && urlPath === "/api/students") {
        const requestUrl = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
        const params = requestUrl.searchParams;
        const table = String(params.get("table") || "users");
        const page = Math.max(1, Number(params.get("page") || 1));
        const pageSize = Math.max(1, Math.min(200, Number(params.get("pageSize") || 50)));

        try {
            const data = queryDbPage(table, page, pageSize);
            const totalPages = Math.max(1, Math.ceil(data.total / pageSize));
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(
                JSON.stringify({
                    table,
                    page,
                    pageSize,
                    total: data.total,
                    totalPages,
                    rows: data.rows,
                })
            );
        } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ error: error.message || "Server error" }));
        }
        return;
    }

    const filePath = safeResolve(urlPath);
    if (!filePath) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Not found");
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`Server: http://localhost:${PORT}`);
    console.log("API: POST /api/chat (canh bao: dat GEMINI_API_KEY hoac DEEPSEEK_API_KEY trong file .env)");
});
