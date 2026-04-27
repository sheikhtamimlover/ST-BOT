"use strict";

const { colors } = require("../func/colors.js");

const ACCENTS = {
        primary:   "#7dd3fc",
        secondary: "#c4b5fd",
        success:   "#86efac",
        warn:      "#fcd34d",
        danger:    "#fca5a5",
        muted:     "#64748b"
};

const stripAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, "");
const visualLen = (s) => Array.from(stripAnsi(s)).length;

function pad(text, width, align = "left") {
        const len = visualLen(text);
        if (len >= width) return text;
        const space = " ".repeat(width - len);
        if (align === "right")  return space + text;
        if (align === "center") {
                const left = Math.floor((width - len) / 2);
                const right = width - len - left;
                return " ".repeat(left) + text + " ".repeat(right);
        }
        return text + space;
}

/* ------------------------------------------------------------------
   section(title, opts)
   Prints a clean rounded boxed title + optional subtitle.
   ╭─◆ TITLE ────────────────────────────────────────────────╮
   │  subtitle text                                          │
   ╰─────────────────────────────────────────────────────────╯
------------------------------------------------------------------ */
function section(title, opts = {}) {
        const accent   = opts.accent   || ACCENTS.primary;
        const subtitle = opts.subtitle || "";
        const width    = Math.min(Math.max(opts.width || 64, 40), 96);
        const symbol   = opts.symbol   || "◆";

        const innerW = width - 2;
        const top    = colors.hex(accent, "╭" + "─" + symbol + " " + colors.bold(title) + " " + "─".repeat(Math.max(innerW - 4 - visualLen(title), 0)) + "╮");
        const bottom = colors.hex(accent, "╰" + "─".repeat(innerW) + "╯");

        const lines = [top];
        if (subtitle) {
                const padded = pad(" " + colors.hex(ACCENTS.muted, subtitle), innerW);
                lines.push(colors.hex(accent, "│") + padded + colors.hex(accent, "│"));
        }
        lines.push(bottom);
        for (const ln of lines) console.log(ln);
}

/* ------------------------------------------------------------------
   banner({ title, subtitle, lines, accent })
   Prints a tall framed banner — used for the boot splash.
------------------------------------------------------------------ */
function banner(opts = {}) {
        const accent = opts.accent || ACCENTS.secondary;
        const width  = Math.min(Math.max(opts.width || 64, 40), 96);
        const innerW = width - 2;

        const titleText    = opts.title    || "ST BOT";
        const subtitleText = opts.subtitle || "";
        const lines        = opts.lines    || [];

        const top = colors.hex(accent, "╭" + "─".repeat(innerW) + "╮");
        const bot = colors.hex(accent, "╰" + "─".repeat(innerW) + "╯");
        const sep = colors.hex(accent, "├" + "─".repeat(innerW) + "┤");
        const wrap = (content) => colors.hex(accent, "│") + " " + content + " ".repeat(Math.max(innerW - visualLen(content) - 2, 0)) + " " + colors.hex(accent, "│");

        console.log(top);
        console.log(wrap(colors.bold(colors.hex(accent, titleText))));
        if (subtitleText) console.log(wrap(colors.hex(ACCENTS.muted, subtitleText)));
        if (lines.length) {
                console.log(sep);
                for (const ln of lines) console.log(wrap(ln));
        }
        console.log(bot);
}

/* ------------------------------------------------------------------
   rule(accent) — prints a thin horizontal rule.
------------------------------------------------------------------ */
function rule(accent = ACCENTS.muted, width = 64) {
        console.log(colors.hex(accent, "─".repeat(width)));
}

module.exports = { section, banner, rule, ACCENTS };
