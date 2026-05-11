const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8080;
const ROOT = __dirname;

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
};

function safeResolve(urlPath) {
    const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
    const requested = cleanPath === "/" ? "/index.html" : cleanPath;
    const fullPath = path.resolve(ROOT, `.${requested}`);
    if (!fullPath.startsWith(ROOT)) return null;
    return fullPath;
}

const server = http.createServer((req, res) => {
    const filePath = safeResolve(req.url || "/");
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
        res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`Text2SQL demo server running at http://localhost:${PORT}`);
});
