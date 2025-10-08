const axios = require('axios');
const baseApiUrl = async () => {
    const base = await axios.get("https://gitlab.com/Rakib-Adil-69/shizuoka-command-store/-/raw/main/apiUrls.json");
    return base.data.aniart;
};

module.exports = {
  config: {
    name: "aniart",
    aliases: ["anigen", "animeart"],
    author: "Rakib Adil",
    version: "1.0.0",
    countDown: 10,
    description: "Generate anime art image from a prompt",
    guide: "{pn} <prompt>",
    category: "Ai"
  },

  onStart: async function ({ api, args, event, message}) {
    const prompt = encodeURIComponent(args.join(" "));
    if (!prompt) return api.sendMessage(
      `Please provide a prompt to generate anime art image or use: \n {pn}aniart <prompt> or \n {pn}aniart cyberpunk anime girl`, event.threadID, event.messageID);

		api.setMessageReaction("⏳", event.messageID, (err) => {}, true);

		const loadMsg = await message.reply("⏳𝙬𝙖𝙞𝙩 𝙗𝙗𝙮, 𝙮𝙤𝙪𝙧 𝙞𝙢𝙖𝙜𝙚 𝙞𝙨 𝙘𝙧𝙚𝙖𝙩𝙞𝙣𝙜. \n Author: 𝙍𝙖𝙠𝙞𝙗 𝘼𝙙𝙞𝙡") ;

    try{
      
      const requestId = `rakib-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      
      const baseUrl = await baseApiUrl();
      const response = await axios.post(`${baseUrl}/rakib`, {
       inputText: prompt,
       requestId: requestId 
      });
      
      
      const imageUrl = response.data.resultUrl || response.data.response;
      const adil = imageUrl.split('.').pop();

      api.setMessageReaction("✅", event.messageID, (err) => {}, true);
		api.unsendMessage(loadMsg.messageID)
     await api.sendMessage({
       body : `𝙃𝙚𝙧𝙚 𝙞𝙨 𝙮𝙤𝙪𝙧 𝙖𝙣𝙞𝙢𝙚 𝙖𝙧𝙩 𝙞𝙢𝙖𝙜𝙚: ${prompt} `, 
       attachment: await global.utils.getStreamFromURL(imageUrl, `image.${adil}`)
     }, event.threadID, event.messageID);
     
    }catch (err) {
      console.log(err);
      api.setMessageReaction("❌", event.messageID, (err) => {}, true);
      api.sendMessage('An error occurred while generating your anime art, please try again later..🙂', 
                      event.threadID,
                      event.messageID);
    }
  }
};