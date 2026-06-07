const fs = require("fs-extra");

module.exports = {
        config: {
                name: "setlang",
                version: "1.5",
                author: "NTKhang",
                countDown: 5,
                role: 0,
                description: {
                        vi: "Cài đặt ngôn ngữ của bot cho nhóm chat hiện tại hoặc tất cả các nhóm chat",
                        en: "Set default language of bot for current chat or all chats"
                },
                category: "owner",
                guide: {
                        vi: "   {pn} <language code ISO 639-1"
                                + "\n   Ví dụ:"
                                + "\n    {pn} en"
                                + "\n    {pn} vi",
                        en: "\n   {pn} <language code ISO 639-1"
                                + "\n   Example:"
                                + "\n    {pn} en"
                                + "\n    {pn} vi"
                }
        },

        langs: {
                vi: {
                        setLangForAll: "Đã cài đặt ngôn ngữ mặc định cho bot là: %1",
                        setLangForCurrent: "Đã cài đặt ngôn ngữ mặc định cho nhóm chat này là: %1",
                        noPermission: "Chỉ admin bot mới có thể sử dụng lệnh này",
                        langNotFound: "Không tìm thấy ngôn ngữ: %1"
                },
                en: {
                        setLangForAll: "Set default language of bot to: %1",
                        setLangForCurrent: "Set default language for current chat: %1",
                        noPermission: "Only bot admin can use this command",
                        langNotFound: "Can't find language: %1"
                }
        },

        onStart: async function ({ message }) {
                return message.reply("❌ The language system has been removed. Bot language is now fixed to English.");
        }
};