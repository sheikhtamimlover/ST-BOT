const express = require("express");
const app = express();
const fileUpload = require("express-fileupload");
const rateLimit = require("express-rate-limit");
const fs = require("fs-extra");
const path = require("path");
const { Eta } = require("eta");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const http = require("http");
const { execSync } = require('child_process');
const server = http.createServer(app);

// ————————————————— LIVE CONSOLE STREAM ————————————————— //
// Tee process.stdout/stderr so every console line is broadcast to
// connected dashboard clients via Server-Sent Events.
const __sseClients = new Set();
const __consoleHistory = [];
const __HISTORY_MAX = 500;
const __ANSI_RE = /\x1b\[[0-9;]*m/g;
global.__dashboardLogSeq = global.__dashboardLogSeq || 0;

function __broadcastLogLine(raw) {
        const text = String(raw).replace(/\r/g, "");
        if (!text || text === "\n") return;
        const clean = text.replace(__ANSI_RE, "");
        const lines = clean.split("\n").filter(Boolean);
        for (const line of lines) {
                const entry = { id: ++global.__dashboardLogSeq, line, ts: Date.now() };
                __consoleHistory.push(entry);
                if (__consoleHistory.length > __HISTORY_MAX) __consoleHistory.shift();
                const payload = `data: ${JSON.stringify(entry)}\n\n`;
                for (const res of __sseClients) {
                        try { res.write(payload); } catch {}
                }
        }
}

global.__dashboardBroadcastLogLine = __broadcastLogLine;
global.dashboardLogStream = (line) => {
        if (typeof global.__dashboardBroadcastLogLine === "function")
                global.__dashboardBroadcastLogLine(line + "\n");
};

if (!global.__dashboardStdoutPatched) {
        global.__dashboardStdoutPatched = true;
        const _wrapWrite = (stream) => {
                const orig = stream.write.bind(stream);
                stream.write = function (chunk, enc, cb) {
                        try {
                                if (typeof global.__dashboardBroadcastLogLine === "function")
                                        global.__dashboardBroadcastLogLine(chunk);
                        } catch {}
                        return orig(chunk, enc, cb);
                };
        };
        _wrapWrite(process.stdout);
        _wrapWrite(process.stderr);
}

// ————————————————— FS EXPLORER HELPERS ————————————————— //
const __FX_BLOCKED = new Set(["node_modules", ".git", ".cache", ".upm", ".replit_cache"]);
const __STAI_UPLOAD_DIR = path.join(process.cwd(), "dashboard", "uploads", "stai");
function __resolveSafe(rel) {
        const base = process.cwd();
        const cleaned = String(rel || "").replace(/\\/g, "/").replace(/^\/+/, "");
        const abs = path.resolve(base, cleaned);
        if (abs !== base && !abs.startsWith(base + path.sep)) {
                const e = new Error("Path is outside the project directory.");
                e.code = "EBADPATH";
                throw e;
        }
        const segs = cleaned.split("/").filter(Boolean);
        if (segs.some(s => __FX_BLOCKED.has(s))) {
                const e = new Error("This path is protected and cannot be accessed.");
                e.code = "EBLOCKED";
                throw e;
        }
        return abs;
}

function __relativeSafe(abs) {
        const rel = path.relative(process.cwd(), abs);
        if (rel.startsWith("..") || path.isAbsolute(rel))
                throw new Error("Path is outside the project directory.");
        return rel.replace(/\\/g, "/");
}

async function __listProjectFilesForStai(query = "", limit = 60) {
        const q = String(query || "").replace(/^@/, "").toLowerCase();
        const files = [];
        const walk = async (dir) => {
                if (files.length >= 2000) return;
                const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
                for (const entry of entries) {
                        if (files.length >= 2000) return;
                        if (__FX_BLOCKED.has(entry.name)) continue;
                        const abs = path.join(dir, entry.name);
                        const rel = __relativeSafe(abs);
                        if ([...__FX_BLOCKED].some(blocked => rel === blocked || rel.startsWith(`${blocked}/`))) continue;
                        if (entry.isDirectory()) await walk(abs);
                        else files.push(rel);
                }
        };
        await walk(process.cwd());
        const scored = files
                .filter(file => {
                        if (!q) return true;
                        const low = file.toLowerCase();
                        return low.includes(q) || path.basename(low).includes(q);
                })
                .sort((a, b) => {
                        const ab = path.basename(a).toLowerCase();
                        const bb = path.basename(b).toLowerCase();
                        if (q && ab === q) return -1;
                        if (q && bb === q) return 1;
                        if (q && ab.startsWith(q) !== bb.startsWith(q)) return ab.startsWith(q) ? -1 : 1;
                        return a.localeCompare(b);
                })
                .slice(0, Math.min(Number(limit) || 60, 120));
        return scored.map(file => ({
                path: file,
                name: path.basename(file),
                ext: path.extname(file).replace(".", "").toLowerCase() || "file"
        }));
}

function __splitPromptArgs(input) {
        const args = [];
        const re = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`|(\S+)/g;
        let match;
        while ((match = re.exec(String(input || "")))) {
                args.push(match[1] || match[2] || match[3] || match[4]);
        }
        return args;
}

function __captureDashboardReply(captures) {
        return async function capture(form) {
                const entry = {
                        body: "",
                        attachments: []
                };
                if (typeof form === "string") {
                        entry.body = form;
                } else if (form && typeof form === "object") {
                        entry.body = form.body || form.text || "";
                        const attachments = Array.isArray(form.attachment) ? form.attachment : (form.attachment ? [form.attachment] : []);
                        entry.attachments = attachments.map(att => {
                                const filePath = att?.path || att?.fd || "";
                                const rel = filePath ? __relativeSafe(path.resolve(filePath)) : "";
                                return {
                                        path: rel,
                                        name: rel ? path.basename(rel) : "attachment",
                                        url: rel ? `/api/stai/download?path=${encodeURIComponent(rel)}` : ""
                                };
                        }).filter(item => item.path);
                }
                captures.push(entry);
                return { messageID: `dashboard-stai-${Date.now()}-${captures.length}` };
        };
}

function readJsonSafe(filePath, defaults = {}) {
        try {
                if (!fs.existsSync(filePath)) {
                        return defaults;
                }
                const raw = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(raw);
        } catch (error) {
                console.error(`Failed to read JSON from ${filePath}:`, error);
                return defaults;
        }
}

module.exports = async (api) => {
        if (!api)
                await require("./connectDB.js")();

        const { utils } = global;
        const { config } = global.GoatBot;

        const etaInstance = new Eta({
                views: `${__dirname}/views`,
                useWith: true,
                cache: false
        });

        app.set("views", `${__dirname}/views`);
        app.engine("eta", (filePath, options, callback) => {
                try {
                        const name = path.relative(etaInstance.config.views, filePath);
                        const html = etaInstance.render(name, options);
                        callback(null, html);
                } catch (err) {
                        callback(err);
                }
        });
        app.set("view engine", "eta");

        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(cookieParser());

        // Add express-session for password protection
        const session = require('express-session');
        app.use(session({
                secret: 'dashboard-session-secret',
                resave: false,
                saveUninitialized: true,
                cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
        }));

        // public folder 
        app.use("/css", express.static(`${__dirname}/css`));
        app.use("/js", express.static(`${__dirname}/js`));
        app.use("/images", express.static(`${__dirname}/images`));
        app.use("/uploads", express.static(path.join(__dirname, "uploads")));

        app.use(fileUpload());

        app.use(function (req, res, next) {
                res.locals.__dirname = __dirname;
                next();
        });

        // ————————————————— MIDDLEWARE ————————————————— //
        const createLimiter = (ms, max) => rateLimit({
                windowMs: ms,
                max,
                handler: (req, res) => {
                        res.status(429).send({
                                status: "error",
                                message: "Too many requests"
                        });
                }
        });


        const passwordAuth = require("./middleware/passwordAuth")(config);

        // Apply password protection middleware with better API endpoint handling
        app.use((req, res, next) => {
                // Skip password protection for API endpoints and static assets
                const skipAuth = req.path.startsWith('/api/') || 
                                                                                req.path.startsWith('/stats') || 
                                                                                req.path.startsWith('/system-info') ||
                                                                                req.path.startsWith('/uptime') ||
                                                                                req.path.startsWith('/css/') ||
                                                                                req.path.startsWith('/js/') ||
                                                                                req.path.startsWith('/images/');

                if (skipAuth) {
                        return next();
                }

                return passwordAuth(req, res, next);
        });

        // Add dashboard route
        app.get("/dashboard", async (req, res) => {
                try {
                        const totalThread = global.db?.threadsData ? (await global.db.threadsData.getAll()).filter(t => t.threadID.toString().length > 15).length : 0;
                        const totalUser = global.db?.usersData ? (await global.db.usersData.getAll()).length : 0;

                        res.render("dashboard", {
                                totalThreads: totalThread,
                                totalUsers: totalUser,
                                config: config
                        });
                } catch (error) {
                        console.error("Dashboard error:", error);
                        res.render("dashboard", {
                                totalThreads: 0,
                                totalUsers: 0,
                                config: config
                        });
                }
        });

        app.get("/api/stai/files", async (req, res) => {
                try {
                        const files = await __listProjectFilesForStai(req.query.q || "", req.query.limit || 60);
                        res.json({ success: true, files });
                } catch (error) {
                        console.error("STAI file search error:", error);
                        res.status(500).json({ success: false, message: error.message });
                }
        });

        app.get("/api/stai/download", async (req, res) => {
                try {
                        const rel = req.query.path || "";
                        const abs = __resolveSafe(rel);
                        const stat = await fs.stat(abs);
                        if (!stat.isFile()) return res.status(400).json({ success: false, message: "Path is not a file" });
                        res.download(abs);
                } catch (error) {
                        res.status(error.code === "EBADPATH" || error.code === "EBLOCKED" ? 403 : 404).json({
                                success: false,
                                message: error.message
                        });
                }
        });

        app.post("/api/stai/chat", async (req, res) => {
                const uploadedPaths = [];
                try {
                        const { STAgent, formatStaiError } = require("../bot/stagent.js");
                        const prompt = String(req.body?.prompt || "").trim();
                        if (!prompt) {
                                return res.status(400).json({ success: false, message: "Prompt is required" });
                        }

                        let selectedFiles = [];
                        try {
                                selectedFiles = JSON.parse(req.body?.files || "[]");
                        } catch (_) {
                                selectedFiles = [];
                        }
                        selectedFiles = Array.isArray(selectedFiles)
                                ? selectedFiles.map(file => String(file || "").replace(/^@/, "").replace(/\\/g, "/")).filter(Boolean).slice(0, 20)
                                : [];

                        const uploads = [];
                        const rawUploads = req.files?.images || req.files?.image || req.files?.attachments;
                        const uploadList = rawUploads ? (Array.isArray(rawUploads) ? rawUploads : [rawUploads]) : [];
                        if (uploadList.length) {
                                await fs.ensureDir(__STAI_UPLOAD_DIR);
                                for (const file of uploadList.slice(0, 4)) {
                                        const ext = path.extname(file.name || "") || (String(file.mimetype || "").includes("png") ? ".png" : ".jpg");
                                        const safeName = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
                                        const abs = path.join(__STAI_UPLOAD_DIR, safeName);
                                        await file.mv(abs);
                                        uploadedPaths.push(abs);
                                        uploads.push({
                                                type: "photo",
                                                mimeType: file.mimetype || "image/jpeg",
                                                filename: file.name || safeName,
                                                localPath: __relativeSafe(abs),
                                                url: `/uploads/stai/${safeName}`
                                        });
                                }
                        }

                        const selectedRefs = selectedFiles
                                .filter(file => !prompt.includes(`@${file}`))
                                .map(file => `@${file}`)
                                .join(" ");
                        const fullPrompt = selectedRefs
                                ? `${prompt}\n\nSelected project files: ${selectedRefs}`
                                : prompt;

                        const captures = [];
                        const capture = __captureDashboardReply(captures);
                        const ctx = global.GoatBot?.dashboardContext || {};
                        const activeApi = ctx.api || api || global.GoatBot?.fcaApi || {
                                getCurrentUserID: () => global.GoatBot?.botID || "dashboard",
                                getUserInfo: async () => ({}),
                                getThreadInfo: async (threadID) => ({ threadID, source: "dashboard" }),
                                sendMessage: async () => ({}),
                                unsendMessage: async () => ({}),
                                setMessageReaction: async () => ({})
                        };

                        const params = {
                                api: activeApi,
                                message: {
                                        reply: capture,
                                        send: capture,
                                        unsend: async () => {},
                                        reaction: async () => {}
                                },
                                event: {
                                        type: "message",
                                        senderID: `dashboard:${req.sessionID || req.ip || "web"}`,
                                        threadID: "dashboard:web",
                                        messageID: `dashboard-${Date.now()}`,
                                        body: fullPrompt,
                                        attachments: uploads,
                                        isGroup: false
                                },
                                args: __splitPromptArgs(fullPrompt),
                                prefix: global.GoatBot?.config?.prefix || "!",
                                commandName: "stai",
                                threadModel: ctx.threadModel || null,
                                userModel: ctx.userModel || null,
                                dashBoardModel: ctx.dashBoardModel || null,
                                globalModel: ctx.globalModel || null,
                                threadsData: ctx.threadsData || global.db?.threadsData || null,
                                usersData: ctx.usersData || global.db?.usersData || null,
                                dashBoardData: ctx.dashBoardData || global.db?.dashBoardData || null,
                                globalData: ctx.globalData || global.db?.globalData || null,
                                staiHistoryData: ctx.staiHistoryData || global.staiHistoryData || null,
                                getLang: key => key
                        };

                        const agent = new STAgent(params);
                        await agent.handle(params);

                        const text = captures.map(item => item.body).filter(Boolean).join("\n\n").trim() || "No response.";
                        const attachments = captures.flatMap(item => item.attachments || []);
                        res.json({
                                success: true,
                                text,
                                attachments,
                                selectedFiles,
                                uploads: uploads.map(item => ({ name: item.filename, url: item.url, type: item.mimeType }))
                        });
                } catch (error) {
                        const formatter = require("../bot/stagent.js").formatStaiError;
                        const message = formatter ? formatter(error) : error.message;
                        console.error("STAI dashboard error:", message);
                        res.status(500).json({ success: false, message });
                }
        });

        // File management API endpoints
        app.get('/api/file/:filename', async (req, res) => {
                try {
                        const filename = req.params.filename;
                        const allowedFiles = ['config.json', 'account.txt'];

                        if (!allowedFiles.includes(filename)) {
                                return res.status(400).json({
                                        success: false,
                                        message: 'File not allowed'
                                });
                        }

                        const filePath = process.cwd() + '/' + filename;
                        const content = await fs.readFile(filePath, 'utf8');

                        res.json({
                                success: true,
                                content: content
                        });
                } catch (error) {
                        console.error('File read error:', error);
                        res.status(500).json({
                                success: false,
                                message: 'Error reading file: ' + error.message
                        });
                }
        });

        // Get all JS files in scripts directories
        app.get('/api/scripts/:type', async (req, res) => {
                try {
                        const type = req.params.type; // 'cmds' or 'events'

                        if (!['cmds', 'events'].includes(type)) {
                                return res.status(400).json({
                                        success: false,
                                        message: 'Invalid script type. Must be "cmds" or "events"'
                                });
                        }

                        const scriptsPath = `${process.cwd()}/scripts/${type}`;
                        const files = await fs.readdir(scriptsPath);
                        const jsFiles = files.filter(file => file.endsWith('.js') && !file.endsWith('.eg.js'));

                        res.json({
                                success: true,
                                files: jsFiles
                        });
                } catch (error) {
                        console.error('Scripts list error:', error);
                        res.status(500).json({
                                success: false,
                                message: 'Error listing scripts: ' + error.message
                        });
                }
        });

        // Get specific JS file content
        app.get('/api/scripts/:type/:filename', async (req, res) => {
                try {
                        const { type, filename } = req.params;

                        if (!['cmds', 'events'].includes(type)) {
                                return res.status(400).json({
                                        success: false,
                                        message: 'Invalid script type'
                                });
                        }

                        if (!filename.endsWith('.js')) {
                                return res.status(400).json({
                                        success: false,
                                        message: 'File must be a .js file'
                                });
                        }

                        const filePath = `${process.cwd()}/scripts/${type}/${filename}`;

                        // Check if file exists
                        if (!await fs.pathExists(filePath)) {
                                return res.status(404).json({
                                        success: false,
                                        message: 'File not found'
                                });
                        }

                        const content = await fs.readFile(filePath, 'utf8');

                        res.json({
                                success: true,
                                content: content,
                                filename: filename,
                                type: type
                        });
                } catch (error) {
                        console.error('Script read error:', error);
                        res.status(500).json({
                                success: false,
                                message: 'Error reading script: ' + error.message
                        });
                }
        });

        app.post('/api/file/:filename', async (req, res) => {
                try {
                        const filename = req.params.filename;
                        const { content } = req.body;
                        const allowedFiles = ['config.json', 'account.txt'];

                        if (!allowedFiles.includes(filename)) {
                                return res.status(400).json({
                                        success: false,
                                        message: 'File not allowed'
                                });
                        }

                        // Validate JSON for config.json
                        if (filename === 'config.json') {
                                try {
                                        JSON.parse(content);
                                } catch (error) {
                                        return res.status(400).json({
                                                success: false,
                                                message: 'Invalid JSON format'
                                        });
                                }
                        }

                        // Enhanced validation for account.txt (cookies)
                        if (filename === 'account.txt') {
                                try {
                                        const parsed = JSON.parse(content);
                                        if (!Array.isArray(parsed)) {
                                                return res.status(400).json({
                                                        success: false,
                                                        message: 'Account.txt must be a JSON array of cookies'
                                                });
                                        }

                                        // Validate cookie structure
                                        for (const cookie of parsed) {
                                                if (typeof cookie !== 'object' || !cookie.key || !cookie.value) {
                                                        return res.status(400).json({
                                                                success: false,
                                                                message: 'Invalid cookie format. Each cookie must have "key" and "value" properties'
                                                        });
                                                }
                                        }

                                        // Check for essential cookies
                                        const essentialKeys = ['c_user', 'xs'];
                                        const hasEssential = essentialKeys.some(key => 
                                                parsed.some(cookie => cookie.key === key)
                                        );

                                        if (!hasEssential) {
                                                return res.status(400).json({
                                                        success: false,
                                                        message: 'Warning: Missing essential cookies (c_user, xs). Bot may not work properly.'
                                                });
                                        }

                                } catch (error) {
                                        return res.status(400).json({
                                                success: false,
                                                message: 'Invalid JSON format in cookies'
                                        });
                                }
                        }

                        const filePath = process.cwd() + '/' + filename;
                        await fs.writeFile(filePath, content, 'utf8');

                        // GitHub sync for config.json only (not account.txt for security)
                        let githubSynced = false;
                        if (filename === 'config.json') {
                                try {
                                        const githubSync = global.utils?.getGitHubSync();
                                        if (githubSync && githubSync.enabled && githubSync.autoCommit) {
                                                const syncResult = await githubSync.syncFile("update", filePath, content);
                                                githubSynced = syncResult.success;
                                        }
                                } catch (syncError) {
                                        console.log('GitHub sync warning:', syncError.message);
                                }
                        }

                        res.json({
                                success: true,
                                message: `File saved successfully${githubSynced ? ' (synced to GitHub)' : ''}`,
                                githubSynced: githubSynced
                        });
                } catch (error) {
                        console.error('File write error:', error);
                        res.status(500).json({
                                success: false,
                                message: 'Error saving file: ' + error.message
                        });
                }
        });

        // Save/Update JS script files with auto-reload
        app.post('/api/scripts/:type/:filename', async (req, res) => {
                try {
                        const { type, filename } = req.params;
                        const { content } = req.body;

                        if (!['cmds', 'events'].includes(type)) {
                                return res.status(400).json({
                                        success: false,
                                        message: 'Invalid script type'
                                });
                        }

                        if (!filename.endsWith('.js')) {
                                return res.status(400).json({
                                        success: false,
                                        message: 'File must be a .js file'
                                });
                        }

                        // Basic JS syntax validation
                        try {
                                // Try to parse as JS (basic syntax check)
                                new Function(content);
                        } catch (error) {
                                return res.status(400).json({
                                        success: false,
                                        message: 'JavaScript syntax error: ' + error.message
                                });
                        }

                        const filePath = `${process.cwd()}/scripts/${type}/${filename}`;
                        const isNewFile = !await fs.pathExists(filePath);

                        // Save the file
                        await fs.writeFile(filePath, content, 'utf8');

                        // Auto-reload the command/event using the existing cmd system
                        let reloadResult = { success: false, message: '' };
                        if (global.utils && global.utils.loadScripts) {
                                try {
                                        const { loadScripts } = global.utils;
                                        const { configCommands } = global.GoatBot;
                                        const commandName = filename.replace('.js', '');

                                        // Use the same loading system as cmd.js
                                        const infoLoad = loadScripts(
                                                type, 
                                                commandName, 
                                                global.utils.log, 
                                                configCommands, 
                                                api || null, 
                                                null, // threadModel 
                                                null, // userModel
                                                null, // dashBoardModel
                                                null, // globalModel
                                                global.db?.threadsData || null,
                                                global.db?.usersData || null,
                                                null, // dashBoardData
                                                null, // globalData
                                                () => {} // getLang placeholder
                                        );

                                        reloadResult.success = infoLoad.status === "success";
                                        reloadResult.message = infoLoad.error?.message || '';
                                } catch (reloadError) {
                                        console.error('Auto-reload error:', reloadError);
                                        reloadResult.message = reloadError.message;
                                }
                        }

                        // GitHub sync
                        let githubSynced = false;
                        try {
                                const githubSync = global.utils?.getGitHubSync();
                                if (githubSync && githubSync.enabled && githubSync.autoCommit) {
                                        const syncResult = await githubSync.syncFile(isNewFile ? "upload" : "update", filePath, content);
                                        githubSynced = syncResult.success;
                                }
                        } catch (syncError) {
                                console.log('GitHub sync warning:', syncError.message);
                        }

                        // Build response message
                        let message = `${isNewFile ? 'Created' : 'Updated'} ${filename}`;
                        if (reloadResult.success) {
                                message += ' and loaded successfully';
                        } else if (reloadResult.message) {
                                message += ` but failed to load: ${reloadResult.message}`;
                        }
                        if (githubSynced) {
                                message += ' (synced to GitHub)';
                        }

                        res.json({
                                success: true,
                                message: message,
                                reloaded: reloadResult.success,
                                isNewFile: isNewFile,
                                githubSynced: githubSynced,
                                loadError: reloadResult.message || undefined
                        });

                } catch (error) {
                        console.error('Script save error:', error);
                        res.status(500).json({
                                success: false,
                                message: 'Error saving script: ' + error.message
                        });
                }
        });

        // Create new JS file
        app.post('/api/scripts/:type', async (req, res) => {
                try {
                        const { type } = req.params;
                        const { filename, content } = req.body;

                        if (!['cmds', 'events'].includes(type)) {
                                return res.status(400).json({
                                        success: false,
                                        message: 'Invalid script type'
                                });
                        }

                        if (!filename || !filename.endsWith('.js')) {
                                return res.status(400).json({
                                        success: false,
                                        message: 'Valid filename with .js extension required'
                                });
                        }

                        const filePath = `${process.cwd()}/scripts/${type}/${filename}`;

                        // Check if file already exists
                        if (await fs.pathExists(filePath)) {
                                return res.status(400).json({
                                        success: false,
                                        message: 'File already exists. Use update endpoint instead.'
                                });
                        }

                        // Use template if no content provided
                        const defaultContent = content || (type === 'cmds' ? getCommandTemplate(filename) : getEventTemplate(filename));

                        await fs.writeFile(filePath, defaultContent, 'utf8');

                        res.json({
                                success: true,
                                message: `Created new ${type} file: ${filename}`,
                                filename: filename,
                                type: type
                        });

                } catch (error) {
                        console.error('Script create error:', error);
                        res.status(500).json({
                                success: false,
                                message: 'Error creating script: ' + error.message
                        });
                }
        });

        // Delete JS file
        app.delete('/api/scripts/:type/:filename', async (req, res) => {
                try {
                        const { type, filename } = req.params;

                        if (!['cmds', 'events'].includes(type)) {
                                return res.status(400).json({
                                        success: false,
                                        message: 'Invalid script type'
                                });
                        }

                        const filePath = `${process.cwd()}/scripts/${type}/${filename}`;

                        if (!await fs.pathExists(filePath)) {
                                return res.status(404).json({
                                        success: false,
                                        message: 'File not found'
                                });
                        }

                        // Unload command first if possible
                        if (global.utils && global.utils.unloadScripts) {
                                try {
                                        const commandName = filename.replace('.js', '');
                                        global.utils.unloadScripts(type, commandName, global.GoatBot.configCommands, () => {});
                                } catch (unloadError) {
                                        console.log('Unload error (continuing with delete):', unloadError.message);
                                }
                        }

                        // GitHub sync before deletion
                        let githubSynced = false;
                        try {
                                const githubSync = global.utils?.getGitHubSync();
                                if (githubSync && githubSync.enabled && githubSync.autoCommit) {
                                        const syncResult = await githubSync.syncFile("delete", filePath);
                                        githubSynced = syncResult.success;
                                }
                        } catch (syncError) {
                                console.log('GitHub sync warning:', syncError.message);
                        }

                        await fs.remove(filePath);

                        res.json({
                                success: true,
                                message: `Deleted ${filename} successfully${githubSynced ? ' (synced to GitHub)' : ''}`,
                                githubSynced: githubSynced
                        });

                } catch (error) {
                        console.error('Script delete error:', error);
                        res.status(500).json({
                                success: false,
                                message: 'Error deleting script: ' + error.message
                        });
                }
        });

        // Add restart endpoint - follows the same pattern as scripts/cmds/restart.js
        app.post('/api/restart', (req, res) => {
                try {
                        res.json({ 
                                status: 'success', 
                                message: '🔄 | Restarting BEB_Bot😗...' 
                        });

                        // Restart after sending response - using same exit code as restart.js
                        setTimeout(() => {
                                console.log('🔄 Dashboard restart initiated');
                                process.exit(2); // Exit code 2 for restart like restart.js
                        }, 1000);
                } catch (error) {
                        res.status(500).json({ 
                                status: 'error', 
                                message: 'Restart failed: ' + error.message 
                        });
                }
        });

        // Clear cookies and restart endpoint
        app.post('/api/clear-cookies-restart', async (req, res) => {
                try {
                        const accountPath = process.cwd() + '/account.txt';

                        // Clear account.txt by writing empty string (not [])
                        await fs.writeFile(accountPath, '', 'utf8');

                        res.json({ 
                                status: 'success', 
                                message: '🗑️ Cookies cleared. Bot will restart and login using config.json credentials.' 
                        });

                        // Restart after sending response
                        setTimeout(() => {
                                console.log('🗑️ Cookies cleared, restarting bot...');
                                process.exit(2); // Exit code 2 for restart
                        }, 1000);
                } catch (error) {
                        console.error('Clear cookies error:', error);
                        res.status(500).json({ 
                                status: 'error', 
                                message: 'Failed to clear cookies: ' + error.message 
                        });
                }
        });

        // setup route - redirect to dashboard
        app.get(["/", "/home"], async (req, res) => {
                return res.redirect('/dashboard');
        });

        // Legacy main dashboard route
        app.get("/main-dashboard", async (req, res) => {
                try {
                        // Get current cookie data
                        let currentCookie;
                        try {
                                currentCookie = fs.readFileSync("account.txt", "utf8");
                        } catch (error) {
                                currentCookie = "[]";
                        }

                        // Get basic stats safely
                        let totalThread = 0;
                        let totalUser = 0;

                        try {
                                if (global.db && global.db.threadsData) {
                                        const threads = await global.db.threadsData.getAll();
                                        totalThread = threads.filter(t => t.threadID && t.threadID.toString().length > 15).length;
                                }
                        } catch (err) {
                                console.log("Error getting thread count:", err.message);
                        }

                        try {
                                if (global.db && global.db.usersData) {
                                        const users = await global.db.usersData.getAll();
                                        totalUser = users.length;
                                }
                        } catch (err) {
                                console.log("Error getting user count:", err.message);
                        }

                        const prefix = config.prefix || ".";
                        const uptime = utils ? utils.convertTime(process.uptime() * 1000) : "Unknown";

                        res.render("main-dashboard", {
                                currentCookie,
                                totalThread,
                                totalUser,
                                prefix,
                                uptime,
                                uptimeSecond: process.uptime(),
                                config: config
                        });
                } catch (error) {
                        console.error("Dashboard error:", error);
                        res.render("main-dashboard", {
                                currentCookie: "[]",
                                totalThread: 0,
                                totalUser: 0,
                                prefix: config.prefix || ".",
                                uptime: "0s",
                                uptimeSecond: 0,
                                config: config
                        });
                }
        });

        // Cookie update endpoint
        app.post("/update-cookie", async (req, res) => {
                try {
                        const { cookieData, restartBot } = req.body;

                        if (!cookieData) {
                                return res.status(400).json({
                                        status: "error",
                                        message: "Cookie data is required"
                                });
                        }

                        // Validate JSON format
                        let cookies;
                        try {
                                cookies = JSON.parse(cookieData);
                        } catch (error) {
                                return res.status(400).json({
                                        status: "error",
                                        message: "Invalid JSON format"
                                });
                        }

                        // Validate cookie structure
                        if (!Array.isArray(cookies)) {
                                return res.status(400).json({
                                        status: "error",
                                        message: "Cookie data must be an array"
                                });
                        }

                        // Check for required cookies
                        const requiredKeys = ['c_user', 'xs', 'datr'];
                        const hasRequired = requiredKeys.some(key => 
                                cookies.some(cookie => cookie.key === key)
                        );

                        if (!hasRequired) {
                                return res.status(400).json({
                                        status: "error",
                                        message: "Missing required cookies (c_user, xs, or datr)"
                                });
                        }

                        // Format cookies properly
                        const formattedCookies = cookies.map(cookie => ({
                                key: cookie.key,
                                value: cookie.value,
                                domain: cookie.domain || "facebook.com",
                                path: cookie.path || "/",
                                hostOnly: typeof cookie.hostOnly === 'boolean' ? cookie.hostOnly : false,
                                creation: cookie.creation || new Date().toISOString(),
                                lastAccessed: cookie.lastAccessed || new Date().toISOString(),
                                ...(cookie.expires && { expires: cookie.expires }),
                                ...(cookie.maxAge && { maxAge: cookie.maxAge }),
                                ...(cookie.secure && { secure: cookie.secure }),
                                ...(cookie.httpOnly && { httpOnly: cookie.httpOnly })
                        }));

                        // Save to account.txt
                        const accountPath = process.cwd() + '/account.txt';
                        await fs.writeFile(accountPath, JSON.stringify(formattedCookies, null, 4));

                        let message = "Cookies updated successfully!";

                        // Restart bot if requested
                        if (restartBot === 'true' || restartBot === true) {
                                message += " Bot will restart in 2 seconds.";
                                setTimeout(() => {
                                        process.exit(2); // Exit code 2 for restart
                                }, 2000);
                        }

                        res.json({
                                status: "success",
                                message: message
                        });

                } catch (error) {
                        console.error("Cookie update error:", error);
                        res.status(500).json({
                                status: "error",
                                message: "Internal server error: " + error.message
                        });
                }
        });

        // Enhanced stats endpoint with real-time data
        app.get("/stats", async (req, res) => {
                try {
                        let fcaVersion;
                        try {
                                fcaVersion = require("fb-chat-api/package.json").version;
                        } catch (e) {
                                fcaVersion = "unknown";
                        }

                        const totalThread = global.db?.threadsData ? (await global.db.threadsData.getAll()).filter(t => t.threadID.toString().length > 15).length : 0;
                        const totalUser = global.db?.usersData ? (await global.db.usersData.getAll()).length : 0;
                        const prefix = config.prefix;
                        const uptimeMs = process.uptime() * 1000;
                        const uptime = utils?.convertTime ? utils.convertTime(uptimeMs) : `${Math.floor(uptimeMs / 1000)}s`;

                        // Real-time system metrics
                        const memUsage = process.memoryUsage();
                        const cpuUsage = process.cpuUsage();

                        res.setHeader('Cache-Control', 'no-cache');
                        res.json({
                                fcaVersion,
                                totalThread,
                                totalUser,
                                prefix,
                                uptime,
                                uptimeSecond: Math.floor(process.uptime()),
                                timestamp: new Date().getTime(),
                                memory: {
                                        rss: Math.round(memUsage.rss / 1024 / 1024),
                                        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                                        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                                        external: Math.round(memUsage.external / 1024 / 1024)
                                },
                                cpu: {
                                        user: cpuUsage.user,
                                        system: cpuUsage.system
                                },
                                status: 'online'
                        });
                } catch (error) {
                        console.error("Stats endpoint error:", error);
                        res.status(500).json({
                                error: "Failed to retrieve stats",
                                timestamp: new Date().getTime()
                        });
                }
        });

        // System info endpoint  
        app.get("/system-info", async (req, res) => {
                // Set proper content type
                res.setHeader('Content-Type', 'application/json');
                const os = require("os");
                const fs = require("fs-extra");
                const path = require("path");

                try {
                        // Get system information
                        const osInfo = `${os.type()} ${os.release()}`;
                        const platform = os.platform();
                        const arch = os.arch();
                        const cpus = os.cpus();
                        const cpu = `${cpus[0].model} (${cpus.length} cores)`;
                        const cpuLoad = `${(os.loadavg()[0] || 0).toFixed(2)}%`;

                        // Memory information
                        const totalMem = os.totalmem();
                        const freeMem = os.freemem();
                        const usedMem = totalMem - freeMem;
                        const memUsage = `${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB / ${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`;

                        // Process memory
                        const memInfo = process.memoryUsage();
                        const ramUsage = `${(memInfo.rss / 1024 / 1024).toFixed(2)} MB / ${(memInfo.heapTotal / 1024 / 1024).toFixed(2)} MB`;

                        // Project size calculation
                        let projectSize = "Calculating...";
                        try {
                                const projectPath = process.cwd();
                                const stats = await fs.stat(projectPath);

                                // Simple size calculation for main directories
                                let totalSize = 0;
                                const checkSize = async (dirPath) => {
                                        try {
                                                const items = await fs.readdir(dirPath);
                                                for (const item of items) {
                                                        if (item.startsWith('.') || item === 'node_modules') continue;
                                                        const itemPath = path.join(dirPath, item);
                                                        const itemStat = await fs.stat(itemPath);
                                                        if (itemStat.isDirectory()) {
                                                                await checkSize(itemPath);
                                                        } else {
                                                                totalSize += itemStat.size;
                                                        }
                                                }
                                        } catch (e) {
                                                // Skip inaccessible directories
                                        }
                                };

                                await checkSize(projectPath);
                                projectSize = totalSize > 1024 * 1024 * 1024 
                                        ? `${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`
                                        : `${(totalSize / 1024 / 1024).toFixed(2)} MB`;
                        } catch (e) {
                                projectSize = "N/A";
                        }

                        // Disk usage
                        let diskUsage = "N/A";
                        try {
                                const stats = await fs.stat(process.cwd());
                                diskUsage = `${((usedMem / totalMem) * 100).toFixed(1)}% used`;
                        } catch (e) {
                                diskUsage = "N/A";
                        }

                        // Node.js version
                        const nodeVersion = process.version;

                        // Performance metrics
                        const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
                        const cpuUsage = (os.loadavg()[0] || 0).toFixed(2);
                        const performanceScore = Math.max(0, 100 - (memPercent * 0.4 + cpuUsage * 0.6)).toFixed(0);

                        // Simulated latencies
                        const apiLatency = `${Math.floor(Math.random() * 35) + 15}ms`;
                        const botLatency = `${Math.floor(Math.random() * 200) + 100}ms`;

                        // Temperature (simulated since real temp might not be available)
                        const temperature = "N/A";

                        res.json({
                                osInfo,
                                platform,
                                arch,
                                cpu,
                                cpuLoad,
                                ramUsage,
                                memUsage,
                                projectSize,
                                diskUsage,
                                nodeVersion,
                                performanceScore: `${performanceScore}%`,
                                apiLatency,
                                botLatency,
                                temperature
                        });

                } catch (error) {
                        console.error("System info error:", error);
                        res.status(500).json({
                                error: "Failed to retrieve system information"
                        });
                }
        });

        // ————————————————— LIVE CONSOLE (SSE) ————————————————— //
        app.get("/api/console-history", (req, res) => {
                res.setHeader("Cache-Control", "no-cache");
                res.json({ history: __consoleHistory.slice(-300) });
        });

        app.get("/api/console-stream", (req, res) => {
                res.setHeader("Content-Type", "text/event-stream");
                res.setHeader("Cache-Control", "no-cache, no-transform");
                res.setHeader("Connection", "keep-alive");
                res.setHeader("X-Accel-Buffering", "no");
                res.flushHeaders?.();
                // Push history first so newly-connected clients see the most recent lines
                try {
                        res.write(`data: ${JSON.stringify({ history: __consoleHistory.slice(-200) })}\n\n`);
                } catch {}
                __sseClients.add(res);
                const ka = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 25000);
                req.on("close", () => { clearInterval(ka); __sseClients.delete(res); });
        });

        // ————————————————— FILE EXPLORER API ————————————————— //
        app.get("/api/fs/list", async (req, res) => {
                try {
                        const rel = req.query.path || "";
                        const abs = __resolveSafe(rel);
                        const stat = await fs.stat(abs);
                        if (!stat.isDirectory()) return res.status(400).json({ error: "Not a directory" });
                        const names = await fs.readdir(abs);
                        const items = [];
                        for (const name of names) {
                                if (__FX_BLOCKED.has(name)) continue;
                                try {
                                        const s = await fs.stat(path.join(abs, name));
                                        items.push({
                                                name,
                                                type: s.isDirectory() ? "dir" : "file",
                                                size: s.size,
                                                mtime: s.mtimeMs
                                        });
                                } catch {}
                        }
                        res.json({ path: rel.replace(/^\/+/, ""), items });
                } catch (err) {
                        res.status(err.code === "EBADPATH" || err.code === "EBLOCKED" ? 403 : 500).json({ error: err.message });
                }
        });

        app.get("/api/fs/read", async (req, res) => {
                try {
                        const rel = req.query.path || "";
                        const abs = __resolveSafe(rel);
                        const stat = await fs.stat(abs);
                        if (stat.isDirectory()) return res.status(400).json({ error: "Path is a directory" });
                        if (stat.size > 5 * 1024 * 1024) return res.status(413).json({ error: "File too large to view (>5MB)" });
                        const content = await fs.readFile(abs, "utf8");
                        res.json({ path: rel, content, size: stat.size });
                } catch (err) {
                        res.status(err.code === "EBADPATH" || err.code === "EBLOCKED" ? 403 : 500).json({ error: err.message });
                }
        });

        app.post("/api/fs/write", async (req, res) => {
                try {
                        const { path: rel, content } = req.body || {};
                        if (!rel) return res.status(400).json({ error: "path is required" });
                        const abs = __resolveSafe(rel);
                        await fs.ensureDir(path.dirname(abs));
                        await fs.writeFile(abs, content == null ? "" : String(content), "utf8");
                        res.json({ success: true, path: rel });
                } catch (err) {
                        res.status(err.code === "EBADPATH" || err.code === "EBLOCKED" ? 403 : 500).json({ error: err.message });
                }
        });

        app.post("/api/fs/delete", async (req, res) => {
                try {
                        const { path: rel } = req.body || {};
                        if (!rel) return res.status(400).json({ error: "path is required" });
                        const abs = __resolveSafe(rel);
                        if (abs === process.cwd()) return res.status(400).json({ error: "Refusing to delete project root" });
                        await fs.remove(abs);
                        res.json({ success: true, path: rel });
                } catch (err) {
                        res.status(err.code === "EBADPATH" || err.code === "EBLOCKED" ? 403 : 500).json({ error: err.message });
                }
        });

        app.get("/uptime", global.responseUptimeCurrent);

        app.use((req, res) => {
         res.status(404).render("404");
        });

        // catch global error   
        app.use((err, req, res, next) => {
                res.status(500).send("Internal Server Error");
        });

        const PORT = config.dashBoard.port || config.serverUptime.port || 3001;

        // Enhanced URL detection for multiple platforms
        let dashBoardUrl;

        if (process.env.REPL_OWNER && process.env.REPL_SLUG) {
                // Replit platform
                dashBoardUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
        } else if (process.env.PROJECT_DOMAIN && process.env.API_SERVER_EXTERNAL === "https://api.glitch.com") {
                // Glitch platform
                dashBoardUrl = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
        } else if (process.env.CODESPACE_NAME) {
                // GitHub Codespaces
                dashBoardUrl = `https://${process.env.CODESPACE_NAME}-${PORT}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
        } else if (process.env.RAILWAY_STATIC_URL) {
                // Railway platform
                dashBoardUrl = process.env.RAILWAY_STATIC_URL;
        } else if (process.env.RENDER_EXTERNAL_URL) {
                // Render platform
                dashBoardUrl = process.env.RENDER_EXTERNAL_URL;
        } else if (process.env.HEROKU_APP_NAME) {
                // Heroku platform
                dashBoardUrl = `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`;
        } else if (process.env.VERCEL_URL) {
                // Vercel platform
                dashBoardUrl = `https://${process.env.VERCEL_URL}`;
        } else {
                // Local development or unknown platform
                dashBoardUrl = `http://localhost:${PORT}`;
        }

        await server.listen(PORT, '0.0.0.0');
        utils.log.info("DASHBOARD", `Dashboard is running: ${dashBoardUrl}`);
        utils.log.info("DASHBOARD", `Server listening on 0.0.0.0:${PORT}`);

        if (config.serverUptime.socket.enable == true)
                require("../bot/login/socketIO.js")(server);
};

// Template functions for new files
function getCommandTemplate(filename) {
        const commandName = filename.replace('.js', '');
        return `module.exports = {
        config: {
                name: "${commandName}",
                version: "1.0.0",
                author: "Dashboard Creator",
                countDown: 5,
                role: 0,
                description: "A new command created via dashboard",
                category: "general",
                guide: {
                        en: "   {pn}: Use this command"
                }
        },

        langs: {
                en: {
                        example: "This is an example text"
                }
        },

        onStart: async function({ message, args, event, usersData, threadsData, getLang }) {
                const { senderID, threadID } = event;

                try {
                        // Your command logic here
                        await message.reply("Hello! This is a new command created via dashboard.");
                } catch (error) {
                        console.error("Error in ${commandName}:", error);
                        await message.reply("An error occurred while executing this command.");
                }
        }
};`;
}

function getEventTemplate(filename) {
        const eventName = filename.replace('.js', '');
        return `module.exports = {
        config: {
                name: "${eventName}",
                version: "1.0.0",
                author: "Dashboard Creator",
                description: "A new event created via dashboard"
        },

        langs: {
                en: {
                        example: "This is an example text"
                }
        },

        onStart: async function({ api, event, threadsData, usersData, getLang }) {
                const { threadID, senderID } = event;

                try {
                        // Your event logic here
                        console.log("Event ${eventName} triggered");

                        // Return a handler function if needed
                        return async function() {
                                // Handler logic here
                        };
                } catch (error) {
                        console.error("Error in ${eventName}:", error);
                }
        }
};`;
}

function convertSize(byte) {
        return byte > 1024 ? byte > 1024 * 1024 ? (byte / 1024 / 1024).toFixed(2) + " MB" : (byte / 1024).toFixed(2) + " KB" : byte + " Byte";
}
