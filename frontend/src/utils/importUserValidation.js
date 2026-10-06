import Papa from "papaparse";
import * as XLSX from "xlsx";




const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const NAME_MAX_LENGTH = 50;


const normalizeHeader = (header) => {
    const normalized = String(header).toLowerCase().trim();
    if (["fullname", "full_name", "full name"].includes(normalized)) {
        return "name";
    }
    if (["userid", "user id", "user_id", "username", "user_name"].includes(normalized)) {
        return "user_id";
    }
    return normalized;
};



const normalizeRowKeys = (row) => {
    const normalized = {};
    Object.keys(row).forEach((key) => {
        normalized[normalizeHeader(key)] = row[key];
    });
    return normalized;
};


// ── Required columns (case-insensitive, "FullName"/"Full Name"/"full_name" all accepted) ──
const REQUIRED_HEADERS = [
    { key: "user_id", label: "UserId" },
    { key: "name", label: "FullName" },
    { key: "email", label: "Email" },
    { key: "password", label: "Password" },
];


export const validateHeaders = (headers) => {
    const normalizedHeaders = (headers || []).map(normalizeHeader);
    const missing = REQUIRED_HEADERS.filter((req) => !normalizedHeaders.includes(req.key));
    return {
        valid: missing.length === 0,
        missing: missing.map((m) => m.label),
    };
};


// ── Parsing: now returns { headers, rows } so we can validate headers first ──
const parseCSV = (file) =>
    new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                resolve({
                    headers: results.meta.fields || [],
                    rows: results.data.map(normalizeRowKeys),
                });
            },
            error: reject,
        });
    });


const parseXLSX = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: "array" });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const headerRow = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" })[0] || [];
                const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
                resolve({
                    headers: headerRow.map((h) => String(h)),
                    rows: rows.map(normalizeRowKeys),
                });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });


export const parseImportFile = (file) => {
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
    return isExcel ? parseXLSX(file) : parseCSV(file);
};




const validateRows = (rows, { existingUserIdSet = new Set(), existingEmailSet = new Set() } = {}) => {
    const errors = [];
    const validRows = [];
    const seenUserIdSet = new Set();
    const seenEmailSet = new Set();
    let validCount = 0;

    rows.forEach((user, i) => {
        const row = i + 2;
        const user_id = (user.user_id || "").trim();
        const email = (user.email || "").trim().toLowerCase();

        if (!user.name || !email || !user_id || !user.password) {
            errors.push({ row, user_id: user_id || null, email: email || null, error: "Missing required fields", type: "validation" });
            return;
        }

        const name = String(user.name).trim();
        if (name.length > NAME_MAX_LENGTH) {
            errors.push({ row, user_id, email, error: `Full Name must be at most ${NAME_MAX_LENGTH} characters`, type: "validation" });
            return;
        }

        if (existingUserIdSet.has(user_id) || seenUserIdSet.has(user_id)) {
            errors.push({ row, user_id, email, error: "User ID already exists", type: "validation" });
            return;
        }

        if (existingEmailSet.has(email) || seenEmailSet.has(email)) {
            errors.push({ row, user_id, email, error: "Email already exists", type: "validation" });
            return;
        }

        if (!emailRegex.test(email)) {
            errors.push({ row, user_id, email, error: "Invalid email address", type: "validation" });
            return;
        }

        if (!passwordRegex.test(user.password)) {
            errors.push({
                row,
                user_id,
                email,
                error: "Password must be at least 8 characters and contain 1 uppercase, 1 lowercase, 1 number, and 1 special character",
                type: "validation",
            });
            return;
        }

        seenUserIdSet.add(user_id);
        seenEmailSet.add(email);
        validRows.push({ user_id, name, email, password: user.password });
        validCount++;
    });

    return { errors, validRows, validCount, totalCount: rows.length };
};

export const runFileValidation = (parsed, opts) => {
    const { headers, rows } = parsed;
    const { existingUserIdSet, existingEmailSet } = opts;

    // ── 1) Header check ─────────────────────────────────────────────
    const headerCheck = validateHeaders(headers);
    if (!headerCheck.valid) {
        return {
            headerError: `Header mismatch detected. The import file is missing or contains incorrect column names. Expected headers: UserId, FullName, Email, Password.`,
        };
    }

    if (!rows.length) {
        return {
            headerError: null,
            errors: [{ row: 1, user_id: null, email: null, error: "File is empty" }],
            validCount: 0,
            totalCount: 0,
        };
    }

    // ── 2) Row data validation ───────────────────────────────────────
    const rowResult = validateRows(rows, { existingUserIdSet, existingEmailSet });

    return {
        headerError: null,
        ...rowResult,
    };
};