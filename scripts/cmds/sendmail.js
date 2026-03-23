const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs-extra");
const path = require("path");

const stapi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "sendmail",
    aliases: [],
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    role: 0,
    category: "utility",
    guide: {
      en:
        "!sendmail to from subject message\n" +
        "!sendmail to subject message\n" +
        "!sendmail to message"
    }
  },

  ST: async function ({ message, args, event }) {

    if (!args[0]) {
      return message.reply("❌ Usage: !sendmail to [from] [subject] message");
    }

    const to = args[0];

    let from, subject, msg;


    if (args.length >= 4) {
      from = args[1];
      subject = args[2];
      msg = args.slice(3).join(" ");
    } else if (args.length === 3) {
      from = `user${Date.now()}@gmail.com`;
      subject = args[1];
      msg = args.slice(2).join(" ");
    } else {
      from = `user${Date.now()}@gmail.com`;
      subject = "No Subject";
      msg = args.slice(1).join(" ");
    }

    let attachments = [];

    if (event.attachments?.length > 0) {
      for (const att of event.attachments) {
        try {
          const file = await axios.get(att.url, { responseType: "stream" });

          const form = new FormData();
          form.append("reqtype", "fileupload");
          form.append("fileToUpload", file.data, {
            filename: `file_${Date.now()}`
          });

          const upload = await axios.post(
            "https://catbox.moe/user/api.php",
            form,
            { headers: form.getHeaders() }
          );

          attachments.push(upload.data);

        } catch (e) {
          console.error("Upload failed:", e.message);
        }
      }
    }


    let finalMsg = msg;

    if (attachments.length > 0) {
      finalMsg += "\n\n📎 Attachments:\n" + attachments.join("\n");
    }


    try {
      const res = await axios.post(`${stapi.baseURL}/api/sendmail`, {
        to: to,
        from: from,
        subject: subject,
        message: finalMsg
      });

      return message.reply(
        `✅ Mail Sent!\n\n` +
        `📤 To: ${to}\n` +
        `📥 From: ${from}\n` +
        `📌 Subject: ${subject}\n\n` +
        `📎 Attachments: ${attachments.length}`
      );

    } catch (err) {
      // Extract the error message from the API response if it exists
      const apiError = err.response?.data?.message || err.response?.data?.error || err.message;
      
      console.error("API Error:", apiError);
      
      return message.reply(`❌ Failed to send mail.\nReason: ${apiError}`);
    }
  }
};