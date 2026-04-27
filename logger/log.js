"use strict";

const moment = require("moment-timezone");
const { colors } = require("../func/colors.js");

const TZ = process.env.TZ || (global?.GoatBot?.config?.timeZone) || "Asia/Dhaka";
const TIME_FMT = "HH:mm:ss";

const PALETTE = {
        info:    { icon: "ℹ", color: "#38bdf8", label: "INFO   " },
        success: { icon: "✔", color: "#22c55e", label: "OK     " },
        warn:    { icon: "▲", color: "#f59e0b", label: "WARN   " },
        error:   { icon: "✖", color: "#ef4444", label: "ERROR  " },
        master:  { icon: "★", color: "#eb6734", label: "MASTER " },
        dev:     { icon: "❯", color: "#a78bfa", label: "DEV    " }
};

const SEP = colors.gray("│");

function timestamp() {
        return colors.gray(`[${moment().tz(TZ).format(TIME_FMT)}]`);
}

function tag(prefix, hex) {
        const upper = (prefix || "").toString().toUpperCase().padEnd(10, " ").slice(0, 14);
        return colors.bold(colors.hex(hex, upper));
}

function format(level, prefix, message) {
        const meta = PALETTE[level];
        const icon = colors.hex(meta.color, meta.icon);
        const label = colors.bold(colors.hex(meta.color, meta.label));
        return `${timestamp()} ${icon} ${label}${SEP} ${tag(prefix, meta.color)}${SEP} ${message}`;
}

function emit(level, prefix, message) {
        const line = format(level, prefix, message);
        console.log(line);
        if (typeof global.dashboardLogStream === "function") {
                global.dashboardLogStream(`[${level.toUpperCase()}] ${prefix}: ${message}`);
        }
}

function build(level, defaultPrefix) {
        return function (prefix, message, ...rest) {
                if (message === undefined) {
                        message = prefix;
                        prefix = defaultPrefix;
                }
                emit(level, prefix, message);
                for (let extra of rest) {
                        if (extra && typeof extra === "object" && !extra.stack) {
                                extra = JSON.stringify(extra, null, 2);
                        }
                        emit(level, prefix, extra);
                }
        };
}

const logError = build("error", "ERROR");

module.exports = {
        err: logError,
        error: logError,
        warn: build("warn", "WARN"),
        info: build("info", "INFO"),
        success: build("success", "SUCCESS"),
        master: build("master", "MASTER"),
        dev(...args) {
                try {
                        throw new Error();
                } catch (err) {
                        const at = err.stack.split("\n")[2] || "";
                        let position = at.slice(at.indexOf(process.cwd()) + process.cwd().length + 1);
                        if (position.endsWith(")")) position = position.slice(0, -1);
                        const meta = PALETTE.dev;
                        console.log(
                                `${timestamp()} ${colors.hex(meta.color, meta.icon)} ${colors.bold(colors.hex(meta.color, meta.label))}${SEP} ${colors.cyan(position)} ${colors.gray("→")}`,
                                ...args
                        );
                        if (typeof global.dashboardLogStream === "function") {
                                global.dashboardLogStream(`[DEV] ${position} → ${args.join(" ")}`);
                        }
                }
        }
};
