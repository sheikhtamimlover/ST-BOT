"use strict";

const HEX_RE = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const RESET = "\x1b[0m";

const isHexColor = (color) => typeof color === "string" && HEX_RE.test(color);

const expandHex = (hex) => {
        if (hex.length === 4) {
                return "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        return hex;
};

const hexToRgb = (hex) => {
        const h = expandHex(hex);
        return [
                parseInt(h.slice(1, 3), 16),
                parseInt(h.slice(3, 5), 16),
                parseInt(h.slice(5, 7), 16)
        ];
};

const wrap = (open, close = 0) => (text) => `\x1b[${open}m${text}${`\x1b[${close}m`}`;

const SGR = {
        bold: [1, 22],
        dim: [2, 22],
        italic: [3, 23],
        underline: [4, 24],
        inverse: [7, 27],
        hidden: [8, 28],
        strikethrough: [9, 29],

        black: [30, 39],
        red: [31, 39],
        green: [32, 39],
        yellow: [33, 39],
        blue: [34, 39],
        magenta: [35, 39],
        cyan: [36, 39],
        white: [37, 39],
        gray: [90, 39],
        grey: [90, 39],
        default: [39, 39],
        reset: [0, 0],

        blackBright: [90, 39],
        redBright: [91, 39],
        greenBright: [92, 39],
        yellowBright: [93, 39],
        blueBright: [94, 39],
        magentaBright: [95, 39],
        cyanBright: [96, 39],
        whiteBright: [97, 39],

        bgBlack: [40, 49],
        bgRed: [41, 49],
        bgGreen: [42, 49],
        bgYellow: [43, 49],
        bgBlue: [44, 49],
        bgMagenta: [45, 49],
        bgCyan: [46, 49],
        bgWhite: [47, 49],
        bgGray: [100, 49],
        bgGrey: [100, 49],

        bgBlackBright: [100, 49],
        bgRedBright: [101, 49],
        bgGreenBright: [102, 49],
        bgYellowBright: [103, 49],
        bgBlueBright: [104, 49],
        bgMagentaBright: [105, 49],
        bgCyanBright: [106, 49],
        bgWhiteBright: [107, 49]
};

const buildHex = (color, text) => {
        const [r, g, b] = hexToRgb(color);
        return `\x1b[38;2;${r};${g};${b}m${text}${RESET}`;
};

const buildBgHex = (color, text) => {
        const [r, g, b] = hexToRgb(color);
        return `\x1b[48;2;${r};${g};${b}m${text}${RESET}`;
};

const colorFunctions = {};

for (const [name, [open, close]] of Object.entries(SGR)) {
        colorFunctions[name] = wrap(open, close);
}

colorFunctions.hex = function hex(color, text) {
        if (isHexColor(text)) [color, text] = [text, color];
        if (text != null) return buildHex(color, text);
        if (!isHexColor(color)) {
                // first arg is the text, return a function awaiting the color
                const cached = color;
                return (c) => buildHex(c, cached);
        }
        return (t) => buildHex(color, t);
};

colorFunctions.bgHex = function bgHex(color, text) {
        if (isHexColor(text)) [color, text] = [text, color];
        if (text != null) return buildBgHex(color, text);
        if (!isHexColor(color)) {
                const cached = color;
                return (c) => buildBgHex(c, cached);
        }
        return (t) => buildBgHex(color, t);
};

const colors = {};
colors.bold = {};

for (const key of Object.keys(colorFunctions)) {
        const fn = colorFunctions[key];
        colors[key] = fn;
        if (key === "bold") continue;
        // Allow `colors.red.bold("text")` and `colors.bold.red("text")`
        colors[key].bold = (text, color) => colorFunctions.bold(fn(text, color));
        colors.bold[key] = (text, color) => colorFunctions.bold(fn(text, color));
}

module.exports = {
        isHexColor,
        colors
};
