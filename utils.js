const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");
const https = require("https");
const agent = new https.Agent({
        rejectUnauthorized: false
});
const moment = require("moment-timezone");
const mimeDB = require("mime-db");
const _ = require("lodash");
const { config } = global.GoatBot;
const ora = require("ora");
const log = require("./logger/log.js");
const { isHexColor, colors } = require("./func/colors.js");
const Prism = require("./func/prism.js");

let driveApi = null;
const word = [
        'A', 'Á', 'À', 'Ả', 'Ã', 'Ạ', 'a', 'á', 'à', 'ả', 'ã', 'ạ',
        'Ă', 'Ắ', 'Ằ', 'Ẳ', 'Ẵ', 'Ặ', 'ă', 'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ',
        'Â', 'Ấ', 'Ầ', 'Ẩ', 'Ẫ', 'Ậ', 'â', 'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ',
        'B', 'b',
        'C', 'c',
        'D', 'Đ', 'd', 'đ',
        'E', 'É', 'È', 'Ẻ', 'Ẽ', 'Ẹ', 'e', 'é', 'è', 'ẻ', 'ẽ', 'ẹ',
        'Ê', 'Ế', 'Ề', 'Ể', 'Ễ', 'Ệ', 'ê', 'ế', 'ề', 'ể', 'ễ', 'ệ',
        'F', 'f',
        'G', 'g',
        'H', 'h',
        'I', 'Í', 'Ì', 'Ỉ', 'Ĩ', 'Ị', 'i', 'í', 'ì', 'ỉ', 'ĩ', 'ị',
        'J', 'j',
        'K', 'k',
        'L', 'l',
        'M', 'm',
        'N', 'n',
        'O', 'Ó', 'Ò', 'Ỏ', 'Õ', 'Ọ', 'o', 'ó', 'ò', 'ỏ', 'õ', 'ọ',
        'Ô', 'Ố', 'Ồ', 'Ổ', 'Ỗ', 'Ộ', 'ô', 'ố', 'ồ', 'ổ', 'ỗ', 'ộ',
        'Ơ', 'Ớ', 'Ờ', 'Ở', 'Ỡ', 'Ợ', 'ơ', 'ớ', 'ờ', 'ở', 'ỡ', 'ợ',
        'P', 'p',
        'Q', 'q',
        'R', 'r',
        'S', 's',
        'T', 't',
        'U', 'Ú', 'Ù', 'Ủ', 'Ũ', 'Ụ', 'u', 'ú', 'ù', 'ủ', 'ũ', 'ụ',
        'Ư', 'Ứ', 'Ừ', 'Ử', 'Ữ', 'Ự', 'ư', 'ứ', 'ừ', 'ử', 'ữ', 'ự',
        'V', 'v',
        'W', 'w',
        'X', 'x',
        'Y', 'Ý', 'Ỳ', 'Ỷ', 'Ỹ', 'Ỵ', 'y', 'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ',
        'Z', 'z',
        ' '
];

const regCheckURL = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

class CustomError extends Error {
        constructor(obj) {
                if (typeof obj === 'string')
                        obj = { message: obj };
                if (typeof obj !== 'object' || obj === null)
                        throw new TypeError('Object required');
                obj.message ? super(obj.message) : super();
                Object.assign(this, obj);
        }
}

function lengthWhiteSpacesEndLine(text) {
        let length = 0;
        for (let i = text.length - 1; i >= 0; i--) {
                if (text[i] == ' ')
                        length++;
                else
                        break;
        }
        return length;
}

function lengthWhiteSpacesStartLine(text) {
        let length = 0;
        for (let i = 0; i < text.length; i++) {
                if (text[i] == ' ')
                        length++;
                else
                        break;
        }
        return length;
}

function setErrorUptime() {
        global.statusAccountBot = 'block spam';
        global.responseUptimeCurrent = global.responseUptimeError;
}
const defaultStderrClearLine = process.stderr.clearLine;


function convertTime(miliSeconds, replaceSeconds = "s", replaceMinutes = "m", replaceHours = "h", replaceDays = "d", replaceMonths = "M", replaceYears = "y", notShowZero = false) {
        if (typeof replaceSeconds == 'boolean') {
                notShowZero = replaceSeconds;
                replaceSeconds = "s";
        }
        const second = Math.floor(miliSeconds / 1000 % 60);
        const minute = Math.floor(miliSeconds / 1000 / 60 % 60);
        const hour = Math.floor(miliSeconds / 1000 / 60 / 60 % 24);
        const day = Math.floor(miliSeconds / 1000 / 60 / 60 / 24 % 30);
        const month = Math.floor(miliSeconds / 1000 / 60 / 60 / 24 / 30 % 12);
        const year = Math.floor(miliSeconds / 1000 / 60 / 60 / 24 / 30 / 12);
        let formattedDate = '';

        const dateParts = [
                { value: year, replace: replaceYears },
                { value: month, replace: replaceMonths },
                { value: day, replace: replaceDays },
                { value: hour, replace: replaceHours },
                { value: minute, replace: replaceMinutes },
                { value: second, replace: replaceSeconds }
        ];

        for (let i = 0; i < dateParts.length; i++) {
                const datePart = dateParts[i];
                if (datePart.value)
                        formattedDate += datePart.value + datePart.replace;
                else if (formattedDate != '')
                        formattedDate += '00' + datePart.replace;
                else if (i == dateParts.length - 1)
                        formattedDate += '0' + datePart.replace;
        }

        if (formattedDate == '')
                formattedDate = '0' + replaceSeconds;

        if (notShowZero)
                formattedDate = formattedDate.replace(/00\w+/g, '');

        return formattedDate;
}

function createOraDots(text) {
        const spin = new ora({
                text: text,
                spinner: {
                        interval: 80,
                        frames: [
                                '⠋', '⠙', '⠹',
                                '⠸', '⠼', '⠴',
                                '⠦', '⠧', '⠇',
                                '⠏'
                        ]
                }
        });
        spin._start = () => {
                utils.enableStderrClearLine(false);
                spin.start();
        };
        spin._stop = () => {
                utils.enableStderrClearLine(true);
                spin.stop();
        };
        return spin;
}

class TaskQueue {
        constructor(callback) {
                this.queue = [];
                this.running = null;
                this.callback = callback;
        }
        push(task) {
                this.queue.push(task);
                if (this.queue.length == 1)
                        this.next();
        }
        next() {
                if (this.queue.length > 0) {
                        const task = this.queue[0];
                        this.running = task;
                        this.callback(task, async (err, result) => {
                                this.running = null;
                                this.queue.shift();
                                this.next();
                        });
                }
        }
        length() {
                return this.queue.length;
        }
}

function enableStderrClearLine(isEnable = true) {
        process.stderr.clearLine = isEnable ? defaultStderrClearLine : () => { };
}

function formatNumber(number) {
        const regionCode = global.GoatBot.config.language;
        if (isNaN(number))
                throw new Error('The first argument (number) must be a number');

        number = Number(number);
        return number.toLocaleString(regionCode || "en-US");
}

function getExtFromAttachmentType(type) {
        switch (type) {
                case "photo":
                        return 'png';
                case "animated_image":
                        return "gif";
                case "video":
                        return "mp4";
                case "audio":
                        return "mp3";
                default:
                        return "txt";
        }
}

function getExtFromMimeType(mimeType = "") {
        return mimeDB[mimeType] ? (mimeDB[mimeType].extensions || [])[0] || "unknow" : "unknow";
}

function getExtFromUrl(url = "") {
        if (!url || typeof url !== "string")
                throw new Error('The first argument (url) must be a string');
        const reg = /(?<=https:\/\/cdn.fbsbx.com\/v\/.*?\/|https:\/\/video.xx.fbcdn.net\/v\/.*?\/|https:\/\/scontent.xx.fbcdn.net\/v\/.*?\/).*?(\/|\?)/g;
        const fileName = url.match(reg)[0].slice(0, -1);
        return fileName.slice(fileName.lastIndexOf(".") + 1);
}

function getPrefix(threadID) {
        if (!threadID || isNaN(threadID))
                throw new Error('The first argument (threadID) must be a number');
        threadID = String(threadID);
        let prefix = global.GoatBot.config.prefix;
        const threadData = global.db.allThreadData.find(t => t.threadID == threadID);
        if (threadData)
                prefix = threadData.data.prefix || prefix;
        return prefix;
}

function getTime(timestamps, format) {
        // check if just have timestamps -> format = timestamps
        if (!format && typeof timestamps == 'string') {
                format = timestamps;
                timestamps = undefined;
        }
        return moment(timestamps).tz(config.timeZone).format(format);
}

/**
 * @param {any} value
 * @returns {("Null" | "Undefined" | "Boolean" | "Number" | "String" | "Symbol" | "Object" | "Function" | "AsyncFunction" | "Array" | "Date" | "RegExp" | "Error" | "Map" | "Set" | "WeakMap" | "WeakSet" | "Int8Array" | "Uint8Array" | "Uint8ClampedArray" | "Int16Array" | "Uint16Array" | "Int32Array" | "Uint32Array" | "Float32Array" | "Float64Array" | "BigInt" | "BigInt64Array" | "BigUint64Array")}
 */
function getType(value) {
        return Object.prototype.toString.call(value).slice(8, -1);
}

function isNumber(value) {
        return !isNaN(parseFloat(value));
}

function jsonStringifyColor(obj, filter, indent, level) {
        // source: https://www.npmjs.com/package/node-json-color-stringify
        indent = indent || 0;
        level = level || 0;
        let output = '';

        if (typeof obj === 'string')
                output += colors.green(`"${obj}"`);
        else if (typeof obj === 'number' || typeof obj === 'boolean' || obj === null)
                output += colors.yellow(obj);
        else if (obj === undefined)
                output += colors.gray('undefined');
        else if (obj !== undefined && typeof obj !== 'function')
                if (!Array.isArray(obj)) {
                        if (Object.keys(obj).length === 0)
                                output += '{}';
                        else {
                                output += colors.gray('{\n');
                                Object.keys(obj).forEach(key => {
                                        let value = obj[key];

                                        if (filter) {
                                                if (typeof filter === 'function')
                                                        value = filter(key, value);
                                                else if (typeof filter === 'object' && filter.length !== undefined)
                                                        if (filter.indexOf(key) < 0)
                                                                return;
                                        }

                                        // if (value === undefined)
                                        //      return;
                                        if (!isNaN(key[0]) || key.match(/[^a-zA-Z0-9_]/))
                                                key = colors.green(JSON.stringify(key));

                                        output += ' '.repeat(indent + level * indent) + `${key}:${indent ? ' ' : ''}`;
                                        output += utils.jsonStringifyColor(value, filter, indent, level + 1) + ',\n';
                                });

                                output = output.replace(/,\n$/, '\n');
                                output += ' '.repeat(level * indent) + colors.gray('}');
                        }
                }
                else {
                        if (obj.length === 0)
                                output += '[]';
                        else {
                                output += colors.gray('[\n');
                                obj.forEach(subObj => {
                                        output += ' '.repeat(indent + level * indent) + utils.jsonStringifyColor(subObj, filter, indent, level + 1) + ',\n';
                                });

                                output = output.replace(/,\n$/, '\n');
                                output += ' '.repeat(level * indent) + colors.gray(']');
                        }
                }
        else if (typeof obj === 'function')
                output += colors.green(obj.toString());

        output = output.replace(/,$/gm, colors.gray(','));
        if (indent === 0)
                return output.replace(/\n/g, '');

        return output;
}


function message(api, event) {
        async function sendMessageError(err) {
                if (typeof err === "object" && !err.stack)
                        err = utils.removeHomeDir(JSON.stringify(err, null, 2));
                else
                        err = utils.removeHomeDir(`${err.name || err.error}: ${err.message}`);
                return await api.sendMessage(utils.getText("utils", "errorOccurred", err), event.threadID, event.messageID);
        }
        return {
                send: async (form, callback) => {
                        try {
                                global.statusAccountBot = 'good';
                                return await api.sendMessage(form, event.threadID, callback);
                        }
                        catch (err) {
                                if (JSON.stringify(err).includes('spam')) {
                                        setErrorUptime();
                                        throw err;
                                }
                        }
                },
                reply: async (form, callback) => {
                        try {
                                global.statusAccountBot = 'good';
                                return await api.sendMessage(form, event.threadID, callback, event.messageID);
                        }
                        catch (err) {
                                if (JSON.stringify(err).includes('spam')) {
                                        setErrorUptime();
                                        throw err;
                                }
                        }
                },
                unsend: async (messageID, callback) => await api.unsendMessage(messageID, callback),
                reaction: async (emoji, messageID, callback) => {
                        try {
                                global.statusAccountBot = 'good';
                                return await api.setMessageReaction(emoji, messageID, callback, true);
                        }
                        catch (err) {
                                if (JSON.stringify(err).includes('spam')) {
                                        setErrorUptime();
                                        throw err;
                                }
                        }
                },
                err: async (err) => await sendMessageError(err),
                error: async (err) => await sendMessageError(err),
                pr: async (processingMessage = "⏳ Processing...", processingEmoji = "⏳", successEmoji = "✅", errorEmoji = "❌") => {
                        let processingMsgID = null;
                        const userMessageID = event.messageID;
                        try {
                                global.statusAccountBot = 'good';

                                // React to user's message with processing emoji
                                await api.setMessageReaction(processingEmoji, userMessageID, null, true);

                                // Send processing message
                                const sentMsg = await api.sendMessage(processingMessage, event.threadID, event.messageID);
                                processingMsgID = sentMsg.messageID;

                                return {
                                        messageID: processingMsgID,
                                        edit: async (newMessage) => {
                                                if (processingMsgID) {
                                                        try {
                                                                await api.editMessage(newMessage, processingMsgID);
                                                        } catch (e) {
                                                                // If edit fails, send new message
                                                                await api.sendMessage(newMessage, event.threadID, event.messageID);
                                                        }
                                                }
                                        },
                                        success: async (finalMessage) => {
                                                // Change reaction on user's message to success emoji
                                                await api.setMessageReaction(successEmoji, userMessageID, null, true);

                                                // Unsend the processing message
                                                if (processingMsgID) {
                                                        await api.unsendMessage(processingMsgID);
                                                }

                                                // Send final message if provided
                                                if (finalMessage) {
                                                        return await api.sendMessage(finalMessage, event.threadID, event.messageID);
                                                }
                                        },
                                        error: async (errorMessage) => {
                                                // Change reaction on user's message to error emoji
                                                await api.setMessageReaction(errorEmoji, userMessageID, null, true);

                                                // Unsend the processing message
                                                if (processingMsgID) {
                                                        await api.unsendMessage(processingMsgID);
                                                }

                                                // Send error message if provided
                                                if (errorMessage) {
                                                        return await api.sendMessage(errorMessage, event.threadID, event.messageID);
                                                }
                                        }
                                };
                        }
                        catch (err) {
                                if (JSON.stringify(err).includes('spam')) {
                                        setErrorUptime();
                                        throw err;
                                }
                                throw err;
                        }
                }
        };
}

function randomString(max, onlyOnce = false, possible) {
        if (!max || isNaN(max))
                max = 10;
        let text = "";
        possible = possible || "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < max; i++) {
                let random = Math.floor(Math.random() * possible.length);
                if (onlyOnce) {
                        while (text.includes(possible[random]))
                                random = Math.floor(Math.random() * possible.length);
                }
                text += possible[random];
        }
        return text;
}

function randomNumber(min, max) {
        if (!max) {
                max = min;
                min = 0;
        }
        if (min == null || min == undefined || isNaN(min))
                throw new Error('The first argument (min) must be a number');
        if (max == null || max == undefined || isNaN(max))
                throw new Error('The second argument (max) must be a number');
        return Math.floor(Math.random() * (max - min + 1)) + min;
}

function removeHomeDir(fullPath) {
        if (!fullPath || typeof fullPath !== "string")
                throw new Error('The first argument (fullPath) must be a string');
        while (fullPath.includes(process.cwd()))
                fullPath = fullPath.replace(process.cwd(), "");
        return fullPath;
}

function splitPage(arr, limit) {
        const allPage = _.chunk(arr, limit);
        return {
                totalPage: allPage.length,
                allPage
        };
}

async function translateAPI(text, lang) {
        try {
                const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`);
                return res.data[0][0][0];
        }
        catch (err) {
                throw new CustomError(err.response ? err.response.data : err);
        }
}

async function downloadFile(url = "", path = "") {
        if (!url || typeof url !== "string")
                throw new Error(`The first argument (url) must be a string`);
        if (!path || typeof path !== "string")
                throw new Error(`The second argument (path) must be a string`);
        let getFile;
        try {
                getFile = await axios.get(url, {
                        responseType: "arraybuffer"
                });
        }
        catch (err) {
                throw new CustomError(err.response ? err.response.data : err);
        }
        fs.writeFileSync(path, Buffer.from(getFile.data));
        return path;
}

async function findUid(link) {
        try {
                const response = await axios.post(
                        'https://seomagnifier.com/fbid',
                        new URLSearchParams({
                                'facebook': '1',
                                'sitelink': link
                        }),
                        {
                                headers: {
                                        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                                        'Cookie': 'PHPSESSID=0d8feddd151431cf35ccb0522b056dc6'
                                }
                        }
                );
                const id = response.data;
                // try another method if this one fails
                if (isNaN(id)) {
                        const html = await axios.get(link);
                        const $ = cheerio.load(html.data);
                        const el = $('meta[property="al:android:url"]').attr('content');
                        if (!el) {
                                throw new Error('UID not found');
                        }
                        const number = el.split('/').pop();
                        return number;
                }
                return id;
        } catch (error) {
                throw new Error('An unexpected error occurred. Please try again.');
        }
}

async function getStreamsFromAttachment(attachments) {
        const streams = [];
        for (const attachment of attachments) {
                const url = attachment.url;
                const ext = utils.getExtFromUrl(url);
                const fileName = `${utils.randomString(10)}.${ext}`;
                streams.push({
                        pending: axios({
                                url,
                                method: "GET",
                                responseType: "stream"
                        }),
                        fileName
                });
        }
        for (let i = 0; i < streams.length; i++) {
                const stream = await streams[i].pending;
                stream.data.path = streams[i].fileName;
                streams[i] = stream.data;
        }
        return streams;
}

async function getStreamFromURL(url = "", pathName = "", options = {}) {
        if (!options && typeof pathName === "object") {
                options = pathName;
                pathName = "";
        }
        try {
                if (!url || typeof url !== "string")
                        throw new Error(`The first argument (url) must be a string`);
                const response = await axios({
                        url,
                        method: "GET",
                        responseType: "stream",
                        ...options
                });
                if (!pathName)
                        pathName = utils.randomString(10) + (response.headers["content-type"] ? '.' + utils.getExtFromMimeType(response.headers["content-type"]) : ".noext");
                response.data.path = pathName;
                return response.data;
        }
        catch (err) {
                throw err;
        }
}

async function translate(text, lang) {
        if (typeof text !== "string")
                throw new Error(`The first argument (text) must be a string`);
        if (!lang)
                lang = 'en';
        if (typeof lang !== "string")
                throw new Error(`The second argument (lang) must be a string`);
        const wordTranslate = [''];
        const wordNoTranslate = [''];
        const wordTransAfter = [];
        let lastPosition = 'wordTranslate';

        if (word.indexOf(text.charAt(0)) == -1)
                wordTranslate.push('');
        else
                wordNoTranslate.splice(0, 1);

        for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (word.indexOf(char) !== -1) { // is word
                        const lengWordNoTranslate = wordNoTranslate.length - 1;
                        if (wordNoTranslate[lengWordNoTranslate] && wordNoTranslate[lengWordNoTranslate].includes('{') && !wordNoTranslate[lengWordNoTranslate].includes('}')) {
                                wordNoTranslate[lengWordNoTranslate] += char;
                                continue;
                        }
                        const lengWordTranslate = wordTranslate.length - 1;
                        if (lastPosition == 'wordTranslate') {
                                wordTranslate[lengWordTranslate] += char;
                        }
                        else {
                                wordTranslate.push(char);
                                lastPosition = 'wordTranslate';
                        }
                }
                else { // is no word
                        const lengWordNoTranslate = wordNoTranslate.length - 1;
                        const twoWordLast = wordNoTranslate[lengWordNoTranslate]?.slice(-2) || '';
                        if (lastPosition == 'wordNoTranslate') {
                                if (twoWordLast == '}}') {
                                        wordTranslate.push("");
                                        wordNoTranslate.push(char);
                                }
                                else
                                        wordNoTranslate[lengWordNoTranslate] += char;
                        }
                        else {
                                wordNoTranslate.push(char);
                                lastPosition = 'wordNoTranslate';
                        }
                }
        }

        for (let i = 0; i < wordTranslate.length; i++) {
                const text = wordTranslate[i];
                if (!text.match(/[^\s]+/))
                        wordTransAfter.push(text);
                else
                        wordTransAfter.push(utils.translateAPI(text, lang));
        }

        let output = '';

        for (let i = 0; i < wordTransAfter.length; i++) {
                let wordTrans = (await wordTransAfter[i]);
                if (wordTrans.trim().length === 0) {
                        output += wordTrans;
                        if (wordNoTranslate[i] != undefined)
                                output += wordNoTranslate[i];
                        continue;
                }

                wordTrans = wordTrans.trim();
                const numberStartSpace = lengthWhiteSpacesStartLine(wordTranslate[i]);
                const numberEndSpace = lengthWhiteSpacesEndLine(wordTranslate[i]);

                wordTrans = ' '.repeat(numberStartSpace) + wordTrans.trim() + ' '.repeat(numberEndSpace);

                output += wordTrans;
                if (wordNoTranslate[i] != undefined)
                        output += wordNoTranslate[i];
        }
        return output;
}

async function shortenURL(url) {
        try {
                const result = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
                return result.data;
        }
        catch (err) {
                let error;
                if (err.response) {
                        error = new Error();
                        Object.assign(error, err.response.data);
                }
                else
                        error = new Error(err.message);
        }
}

async function uploadImgbb(file /* stream or image url */) {
        let type = "file";
        try {
                if (!file)
                        throw new Error('The first argument (file) must be a stream or a image url');
                if (regCheckURL.test(file) == true)
                        type = "url";
                if (
                        (type != "url" && (!(typeof file._read === 'function' && typeof file._readableState === 'object')))
                        || (type == "url" && !regCheckURL.test(file))
                )
                        throw new Error('The first argument (file) must be a stream or an image URL');

                const res_ = await axios({
                        method: 'GET',
                        url: 'https://imgbb.com'
                });

                const auth_token = res_.data.match(/auth_token="([^"]+)"/)[1];
                const timestamp = Date.now();

                const res = await axios({
                        method: 'POST',
                        url: 'https://imgbb.com/json',
                        headers: {
                                "content-type": "multipart/form-data"
                        },
                        data: {
                                source: file,
                                type: type,
                                action: 'upload',
                                timestamp: timestamp,
                                auth_token: auth_token
                        }
                });

                return res.data;
                // {
                //      "status_code": 200,
                //      "success": {
                //              "message": "image uploaded",
                //              "code": 200
                //      },
                //      "image": {
                //              "name": "Banner-Project-Goat-Bot",
                //              "extension": "png",
                //              "width": 2560,
                //              "height": 1440,
                //              "size": 194460,
                //              "time": 1688352855,
                //              "expiration": 0,
                //              "likes": 0,
                //              "description": null,
                //              "original_filename": "Banner Project Goat Bot.png",
                //              "is_animated": 0,
                //              "is_360": 0,
                //              "nsfw": 0,
                //              "id_encoded": "D1yzzdr",
                //              "size_formatted": "194.5 KB",
                //              "filename": "Banner-Project-Goat-Bot.png",
                //              "url": "https://i.ibb.co/wdXBBtc/Banner-Project-Goat-Bot.png",  // => this is url image
                //              "url_viewer": "https://ibb.co/D1yzzdr",
                //              "url_viewer_preview": "https://ibb.co/D1yzzdr",
                //              "url_viewer_thumb": "https://ibb.co/D1yzzdr",
                //              "image": {
                //                      "filename": "Banner-Project-Goat-Bot.png",
                //                      "name": "Banner-Project-Goat-Bot",
                //                      "mime": "image/png",
                //                      "extension": "png",
                //                      "url": "https://i.ibb.co/wdXBBtc/Banner-Project-Goat-Bot.png",
                //                      "size": 194460
                //              },
                //              "thumb": {
                //                      "filename": "Banner-Project-Goat-Bot.png",
                //                      "name": "Banner-Project-Goat-Bot",
                //                      "mime": "image/png",
                //                      "extension": "png",
                //                      "url": "https://i.ibb.co/D1yzzdr/Banner-Project-Goat-Bot.png"
                //              },
                //              "medium": {
                //                      "filename": "Banner-Project-Goat-Bot.png",
                //                      "name": "Banner-Project-Goat-Bot",
                //                      "mime": "image/png",
                //                      "extension": "png",
                //                      "url": "https://i.ibb.co/tHtQQRL/Banner-Project-Goat-Bot.png"
                //              },
                //              "display_url": "https://i.ibb.co/tHtQQRL/Banner-Project-Goat-Bot.png",
                //              "display_width": 2560,
                //              "display_height": 1440,
                //              "delete_url": "https://ibb.co/D1yzzdr/<TOKEN>",
                //              "views_label": "lượt xem",
                //              "likes_label": "thích",
                //              "how_long_ago": "mới đây",
                //              "date_fixed_peer": "2023-07-03 02:54:15",
                //              "title": "Banner-Project-Goat-Bot",
                //              "title_truncated": "Banner-Project-Goat-Bot",
                //              "title_truncated_html": "Banner-Project-Goat-Bot",
                //              "is_use_loader": false
                //      },
                //      "request": {
                //              "type": "file",
                //              "action": "upload",
                //              "timestamp": "1688352853967",
                //              "auth_token": "a2606b39536a05a81bef15558bb0d61f7253dccb"
                //      },
                //      "status_txt": "OK"
                // }
        }
        catch (err) {
                throw new CustomError(err.response ? err.response.data : err);
        }
}


// Replaced with new implementation below
// let githubSync = null;

const fs_ = require("fs-extra");
const axios_ = require("axios");
const path_ = require("path");
const { execSync } = require("child_process");

let githubSyncInstance = null;

async function initGitHubSync(config) {
        if (!config.githubIntegration?.enable) {
                return null;
        }

        try {
                const GitHubSync = require("./bot/login/githubSync.js");
                delete require.cache[require.resolve("./bot/login/githubSync.js")];

                githubSyncInstance = new GitHubSync(config.githubIntegration);
                await githubSyncInstance.initialize();

                return githubSyncInstance;
        } catch (error) {
                console.error("Failed to initialize GitHub sync:", error.message);
                return null;
        }
}

function getGitHubSync() {
        return githubSyncInstance;
}


const utils = {
        CustomError,
        TaskQueue,

        colors,
        convertTime,
        createOraDots,
        defaultStderrClearLine,
        enableStderrClearLine,
        formatNumber,
        getExtFromAttachmentType,
        getExtFromMimeType,
        getExtFromUrl,
        getPrefix,
        getText: (function() {
          const _s = {
            Goat: { newVersionDetected: "You are using version %1, the latest version is %2. Please update to use the bot better by typing into the console/cmd command: %3", autoRestart1: "Bot will auto restart in %1", autoRestart2: "Bot will auto restart by cron job: %1", googleApiTokenExpired: "Google API refresh token has expired or been revoked, please get a new token at https://developers.google.com/oauthplayground/" },
            login: { currentlyLogged: "Login in progress", notFoundDirAccount: "Cannot find file %1", loginToken: "Login with access token", loginCookieString: "Login with cookie string", loginCookieNetscape: "Login with cookie netscape", loginCookieArray: "Login with cookie array", loginPassword: "Login with email & password...", accountError: "Please enter the full permission token...", cannotFindAccount: "Cannot find facebook account, choose one of the following options", chooseAccount: "Login with email and password", chooseToken: "Login with token full permission", chooseCookieString: "Login with cookie string", chooseCookieArray: "Login with cookie array", loginWith: "You choose to %1", inputEmail: "> Please enter your email (id) or phone number facebook account:", inputPassword: "> Please enter your password:", input2FA: "> Please enter the 2FA code (leave blank if you don't have 2FA enabled):", inputToken: "> Please enter your token full permission (start wit EAAAA):", inputCookieString: "> Please enter your cookie string:", inputCookieArray: "> Please enter your cookie array:", refreshCookie: "Refreshing cookie...", refreshCookieError: "An error occurred when refreshing the cookie", refreshCookieSuccess: "Refreshed cookie successfully, restart the bot to use the new cookie", refreshCookieWarning: "You have enabled the auto refresh cookie mode, but you have not configured email and password in the file config.json", tokenError: "Token is invalid or expired. Please enter the full permission token in the form of %1 into the file %2", cookieError: "Cookie is invalid or expired.", loginPasswordError: "Error occurred when logging in with email & password in config.json", loginSuccess: "Successful login", loginError: "An error occurred while signing in", openDashboardSuccess: "Successfully opened bot management page", openDashboardError: "An error occurred when opening the bot management page", changeGbanData: "DATA HAS BEEN CHANGED, IT IS CURRENTLY IMPOSSIBLE TO LAUNCH A BOT", errorNoti: "An error occurred when retrieving the message", refreshFbstateSuccess: "Refreshed %1 file", refreshFbstateError: "An error occurred when refreshing the %1 file", youAreBanned: "You have been banned from the Goat-Bot project", runBot: "Launch bot successfully, start receiving messages from users", notLoggedIn: "An error occurred, please check your Facebook account again", callBackError: "An error occurred when callback listenMqtt", userBanned: "You've been banned from using a bot!!", checkGbanError: "An error occurred while checking GBAN, try update source to latest version", gbanMessage: "You have been banned from the Goat-Bot project on %1 for the reason: %2\n» Time: %3", gbanMessageToDate: "You have been banned from the Goat-Bot project on %1 for the reason: %2\n» Time: %3\n» To date: %4", gbanAdminMessage: "User %1 has been banned from the Goat-Bot project on %2 for the reason: %3", openServerUptimeSuccess: "🚀 Opened uptime server: %1", openServerUptimeError: "An error has occurred, cannot open server uptime", restartListenMessage: "ListenMQTT restart enabled every %1", stopRestartListenMessage: "ListenMQTT restart disabled", restartListenMessageError: "An error occurred when restarting ListenMQTT", restartListenMessage2: "Successfully restarted ListenMQTT", refreshCookieAfter: "Refreshing cookie after %1", listenMqttClose: "ListenMQTT closed", listenMqttCloseByUser: "ListenMQTT closed by user", retryCheckLiveCookie: "Retrying to check cookie... %1", startBotSuccess: "Bot has been started successfully, start receiving messages from users" },
            version: { tooOldVersion: "You are using a too old version of Goat-Bot, please update to the latest version by typing the command: %1 into the cmd/console/terminal/shell" },
            custom: { refreshedFb_dtsg: "Refreshed fb_dtsg and jazoest successfully", refreshedFb_dtsgError: "An error occurred when refreshing fb_dtsg and jazoest" },
            loadData: { loadThreadDataSuccess: "Loaded %1 group's data successfully!", loadUserDataSuccess: "Loaded %1 user's data successfully!", refreshingThreadData: "Updating the information of the groups...", refreshThreadDataSuccess: "Updated information of %1 group!", refreshThreadDataError: "Something went wrong when updating the groups information!" },
            loadScripts: { loadScriptsError: "The %1 files have an error during loading:", loadScriptsNotMatchOrigin: "The %1 files do not match the original files on the github project:", NOT_FOUND: "NOT FOUND IN THE ORIGINAL SOURCE CODE:", NOT_MATCH: "DOES NOT MATCH THE ORIGINAL SOURCE CODE:" },
            socketIO: { connected: "Connected to socket.io server", error: "An error occurred when connecting to the socket.io server" },
            handlerCheckData: { cantCreateThread: "Groups with id '%1' cannot be written to the database!", cantCreateUser: "Users with id '%1' cannot be written to the database!" },
            handlerEvents: { userBanned: "You have been banned from using the bot\n» Reason: %1\n» Time: %2\n» User ID: %3", threadBanned: "This group has been banned from using the bot\n» Reason: %1\n» Time: %2\n» Thread ID: %3", onlyAdminBox: "This group is currently enabled only group administrators can use the bot", onlyAdminBot: "❌ | Currently only bot's admin can use bot", commandNotFound: "Command \"%1\" does not exist, type %2help to see all available commands", commandNotFound2: "The command you are using does not exist, type %1help to see all available commands", commandSyntaxError: "The command you are using is wrong syntax, please type %1help %2 to see the details of how to use this command", onlyAdmin: "❌ | Only group administrators can use the command \"%1\"", onlyAdminToUseOnReply: "❌ | Only group administrators can use the reply function of the command \"%1\"", onlyAdminToUseOnReaction: "❌ | Only group administrators can use the reaction function of the command \"%1\"", onlyAdminBot2: "❌ | Only bot's admin can use the command \"%1\"", onlyAdminBot2ToUseOnReply: "❌ | Only bot's admin can use the reply function of the command \"%1\"", onlyAdminBot2ToUseOnReaction: "❌ | Only bot's admin can use the reaction function of the command \"%1\"", waitingForCommand: "⏱ You are in the waiting time to use this command, please come back after %1s", errorOccurred: "❌ [ %1 ]\nAn error occurred at command \"%2\"\n\n%3", errorOccurred2: "❌ [ %1 ]\nAn error occurred at command onChat in command \"%2\"\n\n%3", errorOccurred3: "❌ [ %1 ]\nAn error occurred when executing onReply at command \"%2\"\n\n%3", errorOccurred4: "❌ [ %1 ]\nAn error occurred when executing onReaction at command \"%2\"\n\n%3", errorOccurred5: "❌ [ %1 ]\nAn error occurred when executing onEvent at command \"%2\"\n\n%3", errorOccurred6: "❌ [ %1 ]\nAn error occurred when executing onEvent at command \"%2\"\n\n%3", errorOccurred7: "❌ [ %1 ]\nAn error occurred when executing onAnyEvent at command \"%2\"\n\n%3", cannotFindCommandName: "❌ Cannot find command name to execute this reply!", cannotFindCommand: "❌ Cannot find command \"%1\" to execute this reply!" },
            autoUptime: { autoUptimeTurnedOn: "AutoUptime mode turned on" },
            indexController: { connectingMongoDB: "Connecting a MONGODB database", connectMongoDBSuccess: "Successfully connected mongodb database!", connectMongoDBError: "An error occurred when connecting the Mongodb database:", connectingMySQL: "Connecting a SQLITE database", connectMySQLSuccess: "Successfully connected SQLITE database!", connectMySQLError: "An error occurred while connecting to a SQLITE database:" },
            updater: { updateTooFast: "Please wait at least 5 minutes after the latest commit to update without error, %1 minutes %2 seconds left", latestVersion: "You are using the latest version", cantFindVersion: "You are using an undefined version (%1), please check your package.json file again", newVersions: "There are %1 new versions to update, starting to update...", updateSuccess: "Update successfully%1", configChanged: "The %1 has been changed, please check your config.json file again", installingPackages: "Installing dependencies for bot...", installSuccess: "Installed dependencies successfully, restart the bot to use the new version", backupSuccess: "Successfully backed up changed files, see in the %1 folder", restartToApply: ". Restart the bot to apply the new version", skipFile: "There is a new version of the %1 file, but you have skipped this file during the update process with the comment %2 in this file" },
            verifyfbid: { sendCode: "Your verification code is:\n%1\nThe verification code is valid for %2 minutes" },
            utils: { errorOccurred: "❌ An error occurred:\n\n%1" },
            command: { restartedBot: "Bot has been restarted" },
            app: { googleApiRefreshTokenExpired: "Google API refresh token has expired or been revoked, please get a new token at https://developers.google.com/oauthplayground/", tooManyRequests: "Too many requests in the last minute. Please try again later.", notPermissionChangeFbstate: "You do not have permission to change fbstate!", notFoundFbstate: "Please enter fbstate!", changedFbstateSuccess: "Successfully changed fbstate!", serverError: "Server an error, please try again later!" }
          };
          return function getText(head, key, ...args) {
            if (typeof head === "object") head = head.head;
            const section = _s[head] || {};
            let text = Object.prototype.hasOwnProperty.call(section, key) ? section[key] : `Can't find text: "${head}.${key}"`;
            for (let i = 0; i < args.length; i++)
              text = text.replace(new RegExp(`%${i + 1}`, "g"), args[i]);
            return text;
          };
        })(),
        getTime,
        getType,
        isHexColor,
        isNumber,
        jsonStringifyColor,
        loading: require("./logger/loading.js"),
        log,
        logColor: require("./logger/logColor.js"),
        banner: require("./logger/banner.js"),
        message,
        randomString,
        randomNumber,
        removeHomeDir,
        splitPage,
        translateAPI,
        // async functions
        downloadFile,
        findUid,
        getStreamsFromAttachment,
        getStreamFromURL,
        getStreamFromUrl: getStreamFromURL,
        Prism,
        translate,
        shortenURL,
        uploadImgbb,

        initGitHubSync: initGitHubSync,

        getGitHubSync: getGitHubSync,

        isAdmin: function(senderID) {
                if (!senderID) return false;
                const visibleAdminBot = (global.GoatBot && (global.GoatBot.originalAdminBot || global.GoatBot.config?.adminBot)) || [];
                const ownerUIDs = (global.GoatBot && global.GoatBot.ownerUIDs) || [];
                const id = senderID.toString();
                return visibleAdminBot.includes(id) || visibleAdminBot.includes(senderID) ||
                       ownerUIDs.includes(id) || ownerUIDs.includes(senderID);
        },
};

module.exports = utils;