const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const serve = fs.readFileSync(path.join(root, "serve.js"), "utf8");

function extractBetween(source, startMarker, endMarker) {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start);
    assert.ok(start >= 0, `Missing start marker: ${startMarker}`);
    assert.ok(end > start, `Missing end marker: ${endMarker}`);
    return source.slice(start, end);
}

const schemaHelpers = extractBetween(script, "const SQL_TABLE_ROLES", "function mergeBundleIntoActiveSource");
const sqlValidators = extractBetween(script, "function assertSqlSelectOnly", "function extractSqlJsonFromReply");

function createContext(tableLabels, appData) {
    const context = {
        appData,
        pipelineState: { tables: [] },
        t: (key) => key,
        getSchemaLabelForRole: (role) => tableLabels[role] || "",
        collectRowKeys(rows) {
            const keys = new Set();
            for (const row of rows) {
                for (const key of Object.keys(row || {})) keys.add(key);
            }
            return keys;
        },
    };
    vm.createContext(context);
    vm.runInContext(`${schemaHelpers}\n${sqlValidators}`, context);
    return context;
}

function fakeDbForKnownSchema(context) {
    return {
        exec(sql) {
            const tables = context.getSqlPipelineTables();
            const allowedTables = new Set(tables.map((table) => table.name.toLowerCase()));
            const allowedColumns = new Set(tables.flatMap((table) => table.columns.map((col) => col.toLowerCase())));
            for (const ref of context.extractSqlTableReferences(sql.replace(/^EXPLAIN QUERY PLAN\s+/i, ""))) {
                if (!allowedTables.has(String(ref).toLowerCase())) {
                    throw new Error(`no such table: ${ref}`);
                }
            }
            for (const quoted of sql.matchAll(/"([^"]+)"/g)) {
                const name = quoted[1].toLowerCase();
                if (!allowedTables.has(name) && !allowedColumns.has(name)) {
                    throw new Error(`no such column: ${quoted[1]}`);
                }
            }
            return [];
        },
    };
}

function assertJsonEqual(actual, expected) {
    assert.strictEqual(JSON.stringify(actual), JSON.stringify(expected));
}

{
    const ctx = createContext(
        { users: "bang_diem" },
        { users: [{ "Ngành học": "CNTT", TBCHK: "8,5" }], orders: [], products: [] },
    );
    assertJsonEqual(ctx.getSqlPipelineTables().map((table) => table.name), ["bang_diem"]);
    assert.doesNotThrow(() => ctx.validateSqlAgainstPipelineSchema(fakeDbForKnownSchema(ctx), 'SELECT AVG(CAST(REPLACE("TBCHK", \',\', \'.\') AS REAL)) FROM "bang_diem"'));
    assert.throws(() => ctx.validateSqlAgainstPipelineSchema(fakeDbForKnownSchema(ctx), "SELECT COUNT(*) FROM orders"), /Bang khong ton tai: orders/);
}

{
    const ctx = createContext(
        { users: "students" },
        { users: [{ name: "An", score: "9" }], orders: [], products: [] },
    );
    assertJsonEqual(ctx.getSqlPipelineTables().map((table) => table.name), ["students"]);
    assert.doesNotThrow(() => ctx.validateSqlAgainstPipelineSchema(fakeDbForKnownSchema(ctx), 'SELECT COUNT(*) FROM "students"'));
}

{
    const ctx = createContext(
        { users: "students", orders: "bang_diem" },
        {
            users: [{ student_id: "S1", name: "An" }],
            orders: [{ student_id: "S1", TBCHK: "8.5", "Ngành học": "CNTT" }],
            products: [],
        },
    );
    assertJsonEqual(ctx.getSqlPipelineTables().map((table) => table.name), ["students", "bang_diem"]);
    assert.doesNotThrow(() => ctx.validateSqlAgainstPipelineSchema(fakeDbForKnownSchema(ctx), 'SELECT "Ngành học", AVG(CAST("TBCHK" AS REAL)) FROM "bang_diem" GROUP BY "Ngành học"'));
    assert.throws(() => ctx.validateSqlAgainstPipelineSchema(fakeDbForKnownSchema(ctx), 'SELECT "missing_col" FROM "bang_diem"'), /Cot khong ton tai: missing_col/);
}

assert.match(serve, /SYSTEM_PREFIX_SQL_DYNAMIC_SCHEMA/);
assert.match(serve, /REPLACE\("ten_cot", ',', '\.'\) AS REAL/);
assert.match(serve, /khong dung FROM orders/);

console.log("sql-pipeline-validation tests passed");
