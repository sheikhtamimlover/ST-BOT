/* ============================================================
   ST BOT v2.4.79 — Dashboard frontend
   ============================================================ */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const state = {
        currentTab: 'overview',
        currentPath: '',
        currentFile: null,
        editorDirty: false,
        autoScroll: true,
        consoleBuffer: [],
        consoleSeen: new Set(),
        scriptType: 'cmds',
        currentScript: null,
        scriptDirty: false,
        modalResolver: null,
        staiFiles: [],
        staiImages: [],
        staiSuggestItems: [],
        staiSuggestIndex: -1,
};

/* ---------- Tabs ---------- */
function switchTab(name) {
        state.currentTab = name;
        $$('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
        $$('.nav-link[data-tab]').forEach(l => l.classList.toggle('active', l.dataset.tab === name));
        $('#crumbHere').textContent = ({
                overview: 'Overview', files: 'Files', console: 'Console',
                stai: 'STAI', config: 'Config', cookies: 'Cookies', scripts: 'Scripts', fca: 'FCA'
        })[name] || 'Dashboard';
        // close mobile sidebar
        $('#sidebar')?.classList.remove('open');
        $('#scrim')?.classList.remove('show');
        // Lazy-load tab content
        if (name === 'files' && !state.currentPath) fxOpen('');
        if (name === 'config') loadConfig();
        if (name === 'cookies') loadCookies();
        if (name === 'scripts') loadScripts();
        if (name === 'fca') loadFca();
        if (name === 'stai') staiFocus();
}

document.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link[data-tab]');
        if (link) { e.preventDefault(); switchTab(link.dataset.tab); }
});

/* ---------- Toasts ---------- */
function toast(title, body = '', type = 'info', timeout = 4500) {
        const wrap = $('#toasts');
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        const ico = ({
                ok:    '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
                warn:  '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
                err:   '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
                info:  '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        })[type] || '';
        el.innerHTML = `${ico}<div class="body"><b>${escapeHtml(title)}</b>${body ? `<span>${escapeHtml(body)}</span>` : ''}</div>`;
        wrap.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(20px)'; el.style.transition = '.25s'; }, timeout - 250);
        setTimeout(() => el.remove(), timeout);
}

function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------- Modal ---------- */
function confirmModal(title, body, confirmLabel = 'Confirm') {
        return new Promise(resolve => {
                $('#modalTitle').textContent = title;
                $('#modalBody').textContent = body;
                $('#modalConfirm').textContent = confirmLabel;
                $('#modalBack').classList.add('show');
                state.modalResolver = resolve;
        });
}
function closeModal(ok) {
        $('#modalBack').classList.remove('show');
        const r = state.modalResolver; state.modalResolver = null;
        if (r) r(!!ok);
}

/* ---------- API helper ---------- */
async function api(path, opts = {}) {
        const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
        const init = { method: opts.method || 'GET', headers };
        if (opts.body !== undefined) init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
        const r = await fetch(path, init);
        const text = await r.text();
        let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
        if (!r.ok) throw new Error(json.message || json.error || `HTTP ${r.status}`);
        return json;
}

/* ---------- Overview ---------- */
async function refreshAll() { await Promise.all([refreshStats(), refreshSystem()]); toast('Refreshed', 'Stats updated', 'ok', 1800); }

async function refreshStats() {
        try {
                const s = await api('/stats');
                $('#totalThreads').textContent = s.totalThread ?? 0;
                $('#totalUsers').textContent   = s.totalUser   ?? 0;
                $('#botPrefix').textContent    = s.prefix      ?? '.';
                $('#uptimeText').textContent   = s.uptime      ?? '—';
                $('#uptimeBadge').textContent  = `up ${s.uptime ?? '0s'}`;
                $('#botRam').textContent       = `${s.memory.heapUsed} MB / ${s.memory.heapTotal} MB`;
                $('#livePill').classList.remove('bad');
                $('#livePill').firstChild.nextSibling.nodeValue = ' Online';
        } catch {
                $('#livePill').classList.add('bad');
                $('#livePill').firstChild.nextSibling.nodeValue = ' Offline';
        }
}

async function refreshSystem() {
        try {
                const s = await api('/system-info');
                $('#hostName').textContent  = s.platform + ' ' + s.arch;
                $('#cpuLabel').textContent  = s.cpu;
                $('#memLabel').textContent  = s.memUsage;
                $('#nodeVer').textContent   = s.nodeVersion;
                $('#projectSize').textContent = s.projectSize;
                const memPct = parseFloat(String(s.diskUsage || '').replace(/[^0-9.]/g, '')) || 0;
                $('#memBar').style.width = Math.min(memPct, 100) + '%';
                const cpuPct = Math.min(parseFloat(String(s.cpuLoad || '').replace(/[^0-9.]/g, '')) * 100 || 0, 100);
                $('#cpuBar').style.width = cpuPct + '%';
        } catch {}
}

/* ---------- Live console (SSE) ---------- */
let sseSource;
function consoleConnect() {
        if (sseSource) sseSource.close();
        consoleFetchHistory();
        sseSource = new EventSource('/api/console-stream');
        sseSource.onopen = () => { $('#streamStatus').textContent = 'connected'; };
        sseSource.onerror = () => {
                $('#streamStatus').textContent = 'reconnecting…';
                consoleFetchHistory();
                setTimeout(consoleConnect, 3000);
                try { sseSource.close(); } catch {}
        };
        sseSource.onmessage = (ev) => {
                try {
                        const data = JSON.parse(ev.data);
                        if (Array.isArray(data.history)) data.history.forEach(consoleAppend);
                        else consoleAppend(data);
                } catch {}
        };
}

async function consoleFetchHistory() {
        try {
                const data = await api('/api/console-history');
                if (Array.isArray(data.history)) data.history.forEach(consoleAppend);
        } catch {}
}

function consoleClassify(line) {
        const s = line || '';
        if (/✖|ERROR|Error:|EXCEPTION/i.test(s)) return 'error';
        if (/▲|WARN|Warning/i.test(s))             return 'warn';
        if (/✔|SUCCESS|OK\s*│/i.test(s))           return 'success';
        if (/★|MASTER/i.test(s))                   return 'master';
        if (/❯|DEV/i.test(s))                       return 'dev';
        if (/ℹ|INFO/i.test(s))                     return 'info';
        return '';
}

function consoleAppend(entry) {
        const text = (entry && entry.line) || '';
        if (!text) return;
        const key = entry.id || `${entry.ts || ''}:${text}`;
        if (state.consoleSeen.has(key)) return;
        state.consoleSeen.add(key);
        if (state.consoleSeen.size > 6000) {
                state.consoleSeen = new Set(Array.from(state.consoleSeen).slice(-5000));
        }
        // strip ANSI
        const clean = text.replace(/\x1b\[[0-9;]*m/g, '').replace(/\r/g, '');
        const cls = consoleClassify(clean);
        state.consoleBuffer.push({ text: clean, cls });
        if (state.consoleBuffer.length > 5000) state.consoleBuffer.splice(0, state.consoleBuffer.length - 5000);
        appendLineTo($('#bigConsole'), clean, cls);
        appendLineTo($('#miniConsole'), clean, cls, 200);
        $('#logCount').textContent = `${state.consoleBuffer.length} lines`;
}

function appendLineTo(container, text, cls, cap) {
        if (!container) return;
        const span = document.createElement('span');
        span.className = `line ${cls}`;
        span.textContent = text;
        container.appendChild(span);
        if (cap && container.children.length > cap) container.removeChild(container.firstChild);
        if (state.autoScroll) container.scrollTop = container.scrollHeight;
}

function consoleClear() { $('#bigConsole').innerHTML = ''; state.consoleBuffer = []; state.consoleSeen.clear(); $('#logCount').textContent = '0 lines'; }
function consoleToggleAuto() { state.autoScroll = !state.autoScroll; $('#consoleAutoBtn').textContent = `Auto-scroll: ${state.autoScroll ? 'ON' : 'OFF'}`; }
function consoleDownload() {
        const blob = new Blob([state.consoleBuffer.map(l => l.text).join('\n')], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `st-bot-console-${Date.now()}.log`;
        document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- File explorer ---------- */
const TEXT_EXT = new Set(['js','json','txt','md','eta','html','css','log','env','yaml','yml','ts','jsx','tsx','sh','bash','xml','svg','toml','ini','cfg','conf']);

function langOf(name) {
        const ext = (name.split('.').pop() || '').toLowerCase();
        return TEXT_EXT.has(ext) ? ext.toUpperCase() : 'TEXT';
}
function isTextFile(name) {
        const ext = (name.split('.').pop() || '').toLowerCase();
        return TEXT_EXT.has(ext) || !name.includes('.');
}

async function fxOpen(p) {
        state.currentPath = p || '';
        renderFxPath();
        $('#fxList').innerHTML = '<div class="skeleton" style="width:80%;margin:6px 0"></div>';
        try {
                const r = await api('/api/fs/list?path=' + encodeURIComponent(state.currentPath));
                renderFxList(r.items || []);
        } catch (e) {
                $('#fxList').innerHTML = `<div style="color:var(--err);padding:8px">${escapeHtml(e.message)}</div>`;
        }
}

function renderFxPath() {
        const segs = state.currentPath.split('/').filter(Boolean);
        const parts = [`<span class="seg" onclick="fxOpen('')">root</span>`];
        let acc = '';
        segs.forEach(s => { acc = acc ? acc + '/' + s : s; const ap = acc; parts.push('<span class="sep">/</span>'); parts.push(`<span class="seg" onclick="fxOpen('${escapeHtml(ap)}')">${escapeHtml(s)}</span>`); });
        $('#fxPath').innerHTML = parts.join('');
}

function renderFxList(items) {
        items.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
        const list = $('#fxList');
        list.innerHTML = '';
        if (state.currentPath) {
                const up = document.createElement('div');
                up.className = 'fx-item dir';
                up.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg> ..`;
                up.onclick = () => fxOpen(state.currentPath.split('/').slice(0, -1).join('/'));
                list.appendChild(up);
        }
        for (const it of items) {
                const row = document.createElement('div');
                row.className = `fx-item ${it.type}`;
                const child = state.currentPath ? `${state.currentPath}/${it.name}` : it.name;
                if (it.type === 'dir') {
                        row.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> <span>${escapeHtml(it.name)}</span>`;
                        row.onclick = () => fxOpen(child);
                } else {
                        row.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> <span>${escapeHtml(it.name)}</span><span class="size">${formatBytes(it.size)}</span>`;
                        row.onclick = () => fxLoadFile(child, row);
                }
                list.appendChild(row);
        }
}

function formatBytes(b) {
        if (!b && b !== 0) return '';
        if (b < 1024) return b + ' B';
        if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
        return (b / 1024 / 1024).toFixed(2) + ' MB';
}

async function fxLoadFile(p, row) {
        $$('#fxList .fx-item.active').forEach(x => x.classList.remove('active'));
        if (row) row.classList.add('active');
        if (!isTextFile(p)) {
                state.currentFile = null;
                $('#fxName').textContent = p + ' — (binary, not editable)';
                $('#fxLang').style.display = 'none';
                $('#fxEditor').value = ''; $('#fxEditor').disabled = true; $('#fxEditor').style.display = 'none';
                $('#fxEmpty').style.display = 'flex';
                $('#fxSaveBtn').disabled = true; $('#fxDeleteBtn').disabled = false;
                return;
        }
        try {
                const r = await api('/api/fs/read?path=' + encodeURIComponent(p));
                state.currentFile = p;
                state.editorDirty = false;
                $('#fxName').textContent = p;
                $('#fxLang').textContent = langOf(p);
                $('#fxLang').style.display = 'inline-block';
                const ed = $('#fxEditor');
                ed.style.display = ''; ed.disabled = false; ed.value = r.content || '';
                $('#fxEmpty').style.display = 'none';
                $('#fxSaveBtn').disabled = true; $('#fxDeleteBtn').disabled = false;
        } catch (e) { toast('Could not open file', e.message, 'err'); }
}

$(document).addEventListener?.('input', () => {});
document.addEventListener('input', (e) => {
        if (e.target && e.target.id === 'fxEditor') { state.editorDirty = true; $('#fxSaveBtn').disabled = false; }
        if (e.target && e.target.id === 'scriptEditor') { state.scriptDirty = true; $('#scriptsSaveBtn').disabled = false; }
});

async function fxSave() {
        if (!state.currentFile) return;
        try {
                await api('/api/fs/write', { method: 'POST', body: { path: state.currentFile, content: $('#fxEditor').value } });
                state.editorDirty = false; $('#fxSaveBtn').disabled = true;
                toast('Saved', state.currentFile, 'ok');
        } catch (e) { toast('Save failed', e.message, 'err'); }
}

async function fxDelete() {
        if (!state.currentFile) return;
        const ok = await confirmModal('Delete file?', `This will permanently delete ${state.currentFile}.`, 'Delete');
        if (!ok) return;
        try {
                await api('/api/fs/delete', { method: 'POST', body: { path: state.currentFile } });
                toast('Deleted', state.currentFile, 'ok');
                state.currentFile = null; state.editorDirty = false;
                $('#fxEditor').value = ''; $('#fxEditor').style.display = 'none'; $('#fxEditor').disabled = true;
                $('#fxEmpty').style.display = 'flex'; $('#fxName').textContent = 'No file selected'; $('#fxLang').style.display = 'none';
                $('#fxSaveBtn').disabled = true; $('#fxDeleteBtn').disabled = true;
                fxRefresh();
        } catch (e) { toast('Delete failed', e.message, 'err'); }
}

function fxRefresh() { fxOpen(state.currentPath); }

async function fxNewFile() {
        const name = prompt(`New file name (relative to ${state.currentPath || 'root'}/):`);
        if (!name) return;
        const fullPath = state.currentPath ? `${state.currentPath}/${name}` : name;
        try {
                await api('/api/fs/write', { method: 'POST', body: { path: fullPath, content: '' } });
                toast('Created', fullPath, 'ok');
                fxRefresh();
        } catch (e) { toast('Create failed', e.message, 'err'); }
}

/* ---------- Config ---------- */
async function loadConfig() {
        try { const r = await api('/api/file/config.json'); $('#configEditor').value = r.content; }
        catch (e) { toast('Load failed', e.message, 'err'); }
}
async function saveConfig() {
        try { await api('/api/file/config.json', { method: 'POST', body: { content: $('#configEditor').value } }); toast('Saved', 'config.json updated', 'ok'); }
        catch (e) { toast('Save failed', e.message, 'err'); }
}

/* ---------- Cookies ---------- */
async function loadCookies() {
        try { const r = await api('/api/file/account.txt'); $('#cookieEditor').value = r.content; }
        catch (e) { toast('Load failed', e.message, 'err'); }
}
async function saveCookies(restart) {
        try {
                await api('/update-cookie', { method: 'POST', body: { cookieData: $('#cookieEditor').value, restartBot: !!restart } });
                toast('Saved', restart ? 'Cookies updated, bot will restart' : 'Cookies updated', 'ok');
        } catch (e) { toast('Save failed', e.message, 'err'); }
}
async function clearCookies() {
        const ok = await confirmModal('Clear cookies & restart?', 'The bot will restart and try to log in again using config.json credentials.', 'Clear & Restart');
        if (!ok) return;
        try { await api('/api/clear-cookies-restart', { method: 'POST' }); toast('Cleared', 'Bot is restarting…', 'warn'); }
        catch (e) { toast('Failed', e.message, 'err'); }
}

/* ---------- Scripts ---------- */
async function loadScripts() {
        const t = $('#scriptType').value; state.scriptType = t;
        const list = $('#scriptList');
        list.innerHTML = '<div class="skeleton" style="width:90%;margin:6px"></div>';
        try {
                const r = await api(`/api/scripts/${t}`);
                list.innerHTML = '';
                for (const f of r.files || []) {
                        const row = document.createElement('div');
                        row.className = 'fx-item file';
                        row.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> <span>${escapeHtml(f)}</span>`;
                        row.onclick = () => loadScript(f, row);
                        list.appendChild(row);
                }
        } catch (e) { list.innerHTML = `<div style="color:var(--err);padding:8px">${escapeHtml(e.message)}</div>`; }
}

async function loadScript(name, row) {
        $$('#scriptList .fx-item.active').forEach(x => x.classList.remove('active'));
        if (row) row.classList.add('active');
        try {
                const r = await api(`/api/scripts/${state.scriptType}/${encodeURIComponent(name)}`);
                state.currentScript = name; state.scriptDirty = false;
                $('#scriptName').textContent = `scripts/${state.scriptType}/${name}`;
                const ed = $('#scriptEditor'); ed.disabled = false; ed.value = r.content || '';
                $('#scriptsSaveBtn').disabled = true;
        } catch (e) { toast('Load failed', e.message, 'err'); }
}

async function saveScript() {
        if (!state.currentScript) return;
        try {
                const r = await api(`/api/scripts/${state.scriptType}/${encodeURIComponent(state.currentScript)}`, { method: 'POST', body: { content: $('#scriptEditor').value } });
                state.scriptDirty = false; $('#scriptsSaveBtn').disabled = true;
                toast('Saved', r.message || 'Script updated', 'ok');
        } catch (e) { toast('Save failed', e.message, 'err'); }
}

/* ---------- STAI ---------- */
let staiSuggestTimer;

function staiFocus() {
        setTimeout(() => $('#staiPrompt')?.focus(), 60);
}

function staiSetStatus(text, mode = '') {
        const el = $('#staiStatus');
        if (!el) return;
        el.className = `stai-status ${mode}`.trim();
        el.innerHTML = `<span></span>${escapeHtml(text)}`;
}

function staiExt(path) {
        return (String(path || '').split('.').pop() || 'file').toLowerCase().slice(0, 5);
}

function staiFileIcon(path) {
        const ext = staiExt(path);
        const safe = ext.replace(/[^a-z0-9_-]/g, '');
        return `<span class="stai-file-ico ${safe}">${escapeHtml(ext.slice(0, 3) || 'file')}</span>`;
}

function staiAddMessage(role, body, attachments = []) {
        const wrap = $('#staiMessages');
        if (!wrap) return null;
        const row = document.createElement('div');
        row.className = `stai-message ${role}`;
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.textContent = role === 'user' ? 'ME' : 'ST';
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.textContent = body || '';
        if (attachments.length) {
                const files = document.createElement('div');
                files.className = 'stai-attachments';
                for (const att of attachments) {
                        const a = document.createElement('a');
                        a.className = 'stai-attachment';
                        a.href = att.url || '#';
                        a.target = '_blank';
                        a.rel = 'noopener';
                        a.innerHTML = `${staiFileIcon(att.name || att.path)}<span>${escapeHtml(att.name || att.path || 'attachment')}</span>`;
                        files.appendChild(a);
                }
                bubble.appendChild(files);
        }
        row.appendChild(avatar);
        row.appendChild(bubble);
        wrap.appendChild(row);
        wrap.scrollTop = wrap.scrollHeight;
        return row;
}

function staiRenderSelected() {
        const wrap = $('#staiSelectedFiles');
        if (!wrap) return;
        wrap.innerHTML = '';
        for (const file of state.staiFiles) {
                const chip = document.createElement('div');
                chip.className = 'stai-chip';
                chip.innerHTML = `${staiFileIcon(file)}<span>${escapeHtml(file)}</span><button type="button" aria-label="Remove">&times;</button>`;
                chip.querySelector('button').onclick = () => {
                        state.staiFiles = state.staiFiles.filter(item => item !== file);
                        staiRenderSelected();
                };
                wrap.appendChild(chip);
        }
}

function staiRenderImages() {
        const wrap = $('#staiImagePreview');
        if (!wrap) return;
        wrap.innerHTML = '';
        for (const item of state.staiImages) {
                const chip = document.createElement('div');
                chip.className = 'stai-image-chip';
                chip.innerHTML = `<img src="${item.preview}" alt=""><span>${escapeHtml(item.file.name)}</span><button type="button" aria-label="Remove">&times;</button>`;
                chip.querySelector('button').onclick = () => {
                        URL.revokeObjectURL(item.preview);
                        state.staiImages = state.staiImages.filter(img => img !== item);
                        staiRenderImages();
                };
                wrap.appendChild(chip);
        }
}

function staiAutoGrow() {
        const el = $('#staiPrompt');
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 170) + 'px';
}

function staiMentionRange() {
        const el = $('#staiPrompt');
        if (!el) return null;
        const pos = el.selectionStart || 0;
        const before = el.value.slice(0, pos);
        const match = before.match(/(^|\s)@([^\s@]*)$/);
        if (!match) return null;
        const query = match[2] || '';
        return { start: pos - query.length - 1, end: pos, query };
}

async function staiLoadSuggestions(query) {
        try {
                const r = await api('/api/stai/files?q=' + encodeURIComponent(query || '') + '&limit=40');
                state.staiSuggestItems = r.files || [];
                state.staiSuggestIndex = 0;
                staiRenderSuggestions();
        } catch {
                staiHideSuggestions();
        }
}

function staiRenderSuggestions() {
        const box = $('#staiSuggest');
        if (!box) return;
        box.innerHTML = '';
        if (!state.staiSuggestItems.length) {
                staiHideSuggestions();
                return;
        }
        state.staiSuggestItems.forEach((item, index) => {
                const row = document.createElement('div');
                row.className = `stai-suggest-item ${index === state.staiSuggestIndex ? 'active' : ''}`;
                row.innerHTML = `${staiFileIcon(item.path)}<span class="stai-file-path">${escapeHtml(item.path)}</span>`;
                row.onmousedown = (e) => {
                        e.preventDefault();
                        staiPickSuggestion(index);
                };
                box.appendChild(row);
        });
        box.classList.add('show');
}

function staiHideSuggestions() {
        const box = $('#staiSuggest');
        if (box) box.classList.remove('show');
        state.staiSuggestItems = [];
        state.staiSuggestIndex = -1;
}

function staiPickSuggestion(index = state.staiSuggestIndex) {
        const item = state.staiSuggestItems[index];
        if (!item) return;
        if (!state.staiFiles.includes(item.path)) {
                state.staiFiles.push(item.path);
                staiRenderSelected();
        }
        const el = $('#staiPrompt');
        const range = staiMentionRange();
        if (el && range) {
                const before = el.value.slice(0, range.start);
                const after = el.value.slice(range.end);
                el.value = `${before}@${item.path} ${after}`;
                const next = before.length + item.path.length + 2;
                el.focus();
                el.setSelectionRange(next, next);
                staiAutoGrow();
        }
        staiHideSuggestions();
}

async function staiSend(promptOverride) {
        const input = $('#staiPrompt');
        const prompt = String(promptOverride ?? input?.value ?? '').trim();
        if (!prompt && !state.staiImages.length) return;

        const filesForSend = [...state.staiFiles];
        const imagesForSend = [...state.staiImages];
        const userMeta = [
                ...filesForSend.map(file => `@${file}`),
                ...imagesForSend.map(item => `[image:${item.file.name}]`)
        ].join(' ');
        staiAddMessage('user', userMeta ? `${prompt || 'Image upload'}\n${userMeta}` : prompt);

        if (!promptOverride && input) {
                input.value = '';
                staiAutoGrow();
        }
        state.staiFiles = [];
        state.staiImages = [];
        staiRenderSelected();
        staiRenderImages();
        staiHideSuggestions();

        const form = new FormData();
        form.append('prompt', prompt || 'Analyze uploaded image');
        form.append('files', JSON.stringify(filesForSend));
        imagesForSend.forEach(item => form.append('images', item.file, item.file.name));

        staiSetStatus('Thinking', 'busy');
        $('#staiSendBtn').disabled = true;
        try {
                const response = await fetch('/api/stai/chat', { method: 'POST', body: form });
                const text = await response.text();
                let json;
                try { json = JSON.parse(text); } catch { json = { message: text }; }
                if (!response.ok || json.success === false) throw new Error(json.message || `HTTP ${response.status}`);
                staiAddMessage('assistant', json.text || 'No response.', json.attachments || []);
                staiSetStatus('Ready');
        } catch (error) {
                staiAddMessage('assistant', error.message || String(error));
                staiSetStatus('Error', 'err');
                toast('STAI failed', error.message || String(error), 'err');
        } finally {
                imagesForSend.forEach(item => URL.revokeObjectURL(item.preview));
                $('#staiSendBtn').disabled = false;
        }
}

function staiClear() {
        state.staiFiles = [];
        state.staiImages.forEach(item => URL.revokeObjectURL(item.preview));
        state.staiImages = [];
        staiRenderSelected();
        staiRenderImages();
        $('#staiMessages').innerHTML = '<div class="stai-message assistant"><div class="avatar">ST</div><div class="bubble">STAI memory cleared for this dashboard chat.</div></div>';
        staiSetStatus('Ready');
        const form = new FormData();
        form.append('prompt', '-clear');
        form.append('files', '[]');
        fetch('/api/stai/chat', { method: 'POST', body: form }).catch(() => {});
}

$('#staiForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        staiSend();
});

$('#staiPrompt')?.addEventListener('input', () => {
        staiAutoGrow();
        clearTimeout(staiSuggestTimer);
        const mention = staiMentionRange();
        if (!mention) return staiHideSuggestions();
        staiSuggestTimer = setTimeout(() => staiLoadSuggestions(mention.query), 120);
});

$('#staiPrompt')?.addEventListener('keydown', (e) => {
        const suggestOpen = $('#staiSuggest')?.classList.contains('show');
        if (suggestOpen && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
                if (e.key === 'Escape') {
                        e.preventDefault();
                        staiHideSuggestions();
                        return;
                }
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        const dir = e.key === 'ArrowDown' ? 1 : -1;
                        const len = state.staiSuggestItems.length;
                        state.staiSuggestIndex = (state.staiSuggestIndex + dir + len) % len;
                        staiRenderSuggestions();
                        return;
                }
                e.preventDefault();
                staiPickSuggestion();
                return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                staiSend();
        }
});

$('#staiUploadBtn')?.addEventListener('click', () => $('#staiImageInput')?.click());
$('#staiImageInput')?.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []).filter(file => file.type.startsWith('image/')).slice(0, 4);
        for (const file of files) {
                state.staiImages.push({ file, preview: URL.createObjectURL(file) });
        }
        e.target.value = '';
        staiRenderImages();
});
$('#staiClearBtn')?.addEventListener('click', staiClear);

/* ---------- Restart / Logout ---------- */
async function restartBot() {
        const ok = await confirmModal('Restart bot?', 'The bot process will exit and restart. Active sessions stay.', 'Restart');
        if (!ok) return;
        try { await api('/api/restart', { method: 'POST' }); toast('Restarting', 'Bot is restarting…', 'warn'); }
        catch (e) { toast('Failed', e.message, 'err'); }
}
async function logout() {
        try { await fetch('/logout', { method: 'POST' }); location.href = '/login'; } catch {}
}

$('#restartBtn')?.addEventListener('click', (e) => { e.preventDefault(); restartBot(); });
$('#logoutBtn')?.addEventListener('click',  (e) => { e.preventDefault(); logout(); });

/* ---------- Mobile sidebar ---------- */
$('#navToggle')?.addEventListener('click', () => {
        $('#sidebar').classList.toggle('open');
        $('#scrim').classList.toggle('show');
});
$('#scrim')?.addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); });

/* ---------- Boot ---------- */
window.addEventListener('beforeunload', (e) => {
        if (state.editorDirty || state.scriptDirty) { e.preventDefault(); e.returnValue = ''; }
});

(async function boot() {
        consoleConnect();
        refreshStats(); refreshSystem();
        setInterval(refreshStats, 5000);
        setInterval(refreshSystem, 10000);
})();
