/**
 * Tạo README.md hiển thị giao diện trên GitHub (SVG + foreignObject).
 * GitHub gỡ <style> trong README.html nên chỉ thấy mã nguồn.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcPath = path.join(root, "README.html");
const outPath = path.join(root, "README.md");

const html = fs.readFileSync(srcPath, "utf8");

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (!styleMatch || !bodyMatch) {
    console.error("README.html: không tìm thấy <style> hoặc <body>");
    process.exit(1);
}

const style = styleMatch[1].trim();
let body = bodyMatch[1].trim();

const fontLink =
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&amp;family=Lora:ital,wght@0,400;0,500;1,400;1,500&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap"/>';

const inner = `${fontLink}<style>${style}</style>${body}`;
const height = 9600;

const readme = `<!-- AUTO-GENERATED từ README.html — chạy: npm run build:readme -->
<div align="center">

<svg xmlns="http://www.w3.org/2000/svg" width="860" height="${height}" viewBox="0 0 860 ${height}">
<foreignObject width="860" height="${height}">
<div xmlns="http://www.w3.org/1999/xhtml" lang="vi">
${inner}
</div>
</foreignObject>
</svg>

</div>
`;

fs.writeFileSync(outPath, readme, "utf8");
console.log("Wrote", outPath);
