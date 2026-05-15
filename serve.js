const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const Database = require("better-sqlite3");

const PORT = Number(process.env.PORT) || 5500;
const ROOT = __dirname;
const MAX_BODY_MB = Number(process.env.MAX_CHAT_BODY_MB);
const MAX_BODY =
    Number.isFinite(MAX_BODY_MB) && MAX_BODY_MB > 0 ? MAX_BODY_MB * 1024 * 1024 : 16 * 1024 * 1024;
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
- Trường "meta" chứa tổng số dòng (totalUsers, totalOrders, totalProducts). Các mảng users/orders/products là TOÀN BỘ dòng đã nạp. Nếu có trường "aggregates", đó là thống kê số (sum, avg, min, max, count) trên toàn bộ từng bảng — có thể dùng để đối chiếu hoặc tóm tắt nhanh.
- Ba khối users/orders/products là ánh xạ logic từ tên file/bảng gốc: bảng điểm / GPA / kết quả học tập thường nằm trong orders, không nhất thiết trong users. Khi tìm tên sinh viên, mã SV hoặc điểm, hãy xét tất cả mảng không rỗng và mọi cột có thể chứa họ tên (ho_ten, ten, name, hoTen, …).
- Nếu bảng nào trong JSON là mảng rỗng, hãy nói rõ là không có dữ liệu cho nhóm đó.
- Có thể dùng markdown: tiêu đề ##, danh sách, bảng gồm cột, hoặc khối code nếu cần.
- Không bịa số: chỉ dựa trên dữ liệu được cung cấp.

=== DỮ LIỆU (JSON) ===
`;

const SYSTEM_PREFIX_SQL_DYNAMIC_SCHEMA = `Ban la tro ly sinh truy van SQLite tren du lieu nguoi dung da tai len.
Ban CHI duoc tra ve MOT object JSON hop le, khong markdown, khong van ban ngoai JSON. Dinh dang:
{"sql":"...mot cau SELECT duy nhat...","explanation":"Giai thich ngan bang tieng Viet"}

QUY TAC BAT BUOC:
- Chi sinh SQLite SQL.
- Chi dung bang va cot xuat hien trong schema.tables cua JSON ben duoi.
- KHONG dung bang mau hoac bang mac dinh nhu users, orders, products, students, bang_diem neu nhung ten do khong co trong schema.tables.
- Neu chi co mot bang trong schema.tables, uu tien bang do.
- Neu co nhieu bang, chon bang dua tren do khop giua cau hoi va ten bang/ten cot trong schema.tables.
- Neu khong tim thay bang hoac cot phu hop, khong bia ten bang/cot. Tra ve {"sql":"SELECT 1 WHERE 0","explanation":"Khong tim thay bang hoac cot phu hop trong du lieu da tai len."}.
- Mot cau lenh duy nhat: SELECT hoac WITH ... SELECT; khong INSERT/UPDATE/DELETE/DDL/PRAGMA/ATTACH.
- Dung dung chinh ta ten bang va ten cot nhu schema.tables[].name va schema.tables[].columns. Nen quote identifier bang dau "..." khi ten co dau cach, dau tieng Viet, hoac ky tu dac biet.
- Voi cot so dang TEXT, co the dung CAST(REPLACE("ten_cot", ',', '.') AS REAL) khi SUM/AVG/MIN/MAX/sap xep so.
- Khong CAST cot phan loai thanh so neu gia tri mau la chu nhu "Xuat sac", "Tot", "Kha".
- Neu can sap xep muc do cot phan loai co thu tu nhu diem ren luyen, dung CASE WHEN, vi du: Xuat sac > Tot > Kha > Trung binh > Yeu.
- Chuoi "sql" trong JSON phai la chuoi JSON hop le: xuong dong trong SQL phai dung \\n.

DU LIEU CO SAN:
- schema.availableTables neu co la danh sach ro rang dang:
  Available tables:
  - table_name(columns: col_a, col_b)
- schema.sample.rows chi la mau nho de nhan dien kieu du lieu. Khong suy dien gia tri tong/theo ca database tu mau.
- Cau SQL se duoc he thong validate bang/cot theo schema that va chay tren toan bo SQLite cuc bo.

VI DU HOP LE VOI SCHEMA DONG:
- Neu schema chi co bang bang_diem(columns: Nganh hoc, TBCHK), cau hoi hoi trung binh TBCHK theo nganh thi dung FROM "bang_diem", khong dung FROM orders.
- Neu schema chi co bang students(columns: name, score), cau hoi dem sinh vien thi dung FROM "students".

=== DU LIEU GOI Y (JSON: meta, aggregates, schema) ===
`;

function callDeepSeek({ apiKey, systemText, messages, maxTokens = 4096 }) {
    const apiMessages = [{ role: "system", content: systemText }, ...messages];
    const mt = Number(maxTokens);
    const max_tok = Number.isFinite(mt) && mt > 256 ? Math.min(mt, 32768) : 4096;
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
            max_tokens: max_tok,
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

function callGemini({ apiKey, systemText, messages, maxOutputTokens = 4096 }) {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
    }));
    const mot = Number(maxOutputTokens);
    const cap = Number.isFinite(mot) && mot > 256 ? Math.min(mot, 32768) : 4096;
    const body = {
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: cap,
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
        const sqlMode = String(payload.mode || "").toLowerCase() === "sql";
        const systemText = sqlMode ? `${SYSTEM_PREFIX_SQL_DYNAMIC_SCHEMA}\n${datasetStr}` : SYSTEM_PREFIX + datasetStr;

        const sqlMaxDeep = Number(process.env.DEEPSEEK_MAX_TOKENS_SQL);
        const sqlMaxGem = Number(process.env.GEMINI_MAX_TOKENS_SQL);
        const deepTok = Number.isFinite(sqlMaxDeep) && sqlMaxDeep > 256 ? sqlMaxDeep : 8192;
        const gemTok = Number.isFinite(sqlMaxGem) && sqlMaxGem > 256 ? sqlMaxGem : 8192;

        let reply;
        if (provider === "gemini") {
            const key = process.env.GEMINI_API_KEY;
            if (!key) {
                res.writeHead(503);
                res.end(JSON.stringify({ error: "Thieu GEMINI_API_KEY trong file .env (may chu)." }));
                return;
            }
            reply = await callGemini({
                apiKey: key,
                systemText,
                messages,
                maxOutputTokens: sqlMode ? gemTok : 4096,
            });
        } else {
            const key = process.env.DEEPSEEK_API_KEY;
            if (!key) {
                res.writeHead(503);
                res.end(JSON.stringify({ error: "Thieu DEEPSEEK_API_KEY trong file .env (may chu)." }));
                return;
            }
            reply = await callDeepSeek({
                apiKey: key,
                systemText,
                messages,
                maxTokens: sqlMode ? deepTok : 4096,
            });
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
