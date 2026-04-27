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
        master:  { icon: "★", color: "#eb6734", label: "MASTER " }
};

const SEP = colors.gray("│");

function timestamp() {
        return colors.gray(`[${moment().tz(TZ).format(TIME_FMT)}]`);
}

function tag(prefix, hex) {
        const upper = (prefix || "").toString().toUpperCase().padEnd(10, " ").slice(0, 14);
        return colors.bold(colors.hex(hex, upper));
}

function write(level, prefix, message) {
        const meta = PALETTE[level];
        const icon = colors.hex(meta.color, meta.icon);
        const label = colors.bold(colors.hex(meta.color, meta.label));
        const line = `${timestamp()} ${icon} ${label}${SEP} ${tag(prefix, meta.color)}${SEP} ${message}`;
        process.stderr.write(`\r\x1b[K${line}`);
}

function build(level, defaultPrefix) {
        return function (prefix, message) {
                if (message === undefined) {
                        message = prefix;
                        prefix = defaultPrefix;
                }
                write(level, prefix, message);
        };
}

const logError = build("error", "ERROR");

module.exports = {
        err: logError,
        error: logError,
        warn: build("warn", "WARN"),
        info: build("info", "INFO"),
        succes: build("success", "SUCCESS"),
        success: build("success", "SUCCESS"),
        master: build("master", "MASTER")
};
