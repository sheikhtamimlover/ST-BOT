const axios = require('axios');
const baseApiUrl = async () => {
    const base = await axios.get("https://gitlab.com/Rakib-Adil-69/shizuoka-command-store/-/raw/main/apiUrls.json");
    return base.data.dalle;
};

module.exports = {
    config: {
        name: "dalle3",
        version: "1.1",
        author: "Rakib Adil",
        role: 0,
        description: "generate a image using dalle3 Ai",
        guide: "{pn}dalle3 <prompt>",
        category: "Ai",
        countDown: 10
    },
    onStart: async function ({ api, event, args}) {

        const prompt = encodeURIComponent(args.join(" "));
        if (!prompt) return api.sendMessage("please provide a prompt to generate image. \n Example: {pn}dalle3 A cat", event.threadID, event.messageID);
        
        api.setMessageReaction("🚀", event.messageID, (err) => {}, true);
        const loadMsg = await api.sendMessage("𝙋𝙡𝙚𝙖𝙨𝙚 𝙬𝙖𝙞𝙩 𝙖 𝙢𝙞𝙣𝙪𝙩𝙚..☺️", event.threadID, event.messageID);
        try {
            const baseUrl = await baseApiUrl();
            const response = await axios.post(`${baseUrl}/dalle`,{
                prompt: prompt,
                n: 1,
                model: "dall-e-3",
                size: "1024x1024"
            });

            const images = response.data?.images?.data?.data || [response.data.images || response.data.response];
            
            if (!images.length) return api.sendMessage("No Images found",event.threadID, event.messageID);

            const imageUrl = images[0].url;
            const ext = imageUrl.split(".").pop() || "png";
            
            api.setMessageReaction("✅", event.messageID, (err) => {}, true);
            
            api.unsendMessage(loadMsg.messageID);

            await api.sendMessage({ body: `Here is your genetated Image ${prompt} \n author: 𝙍𝙖𝙠𝙞𝙗 𝘼𝙙𝙞𝙡`, 
            attachment: await global.utils.getStreamFromURL(imageUrl, `image.${ext}`) 
        }, event.threadID, event.messageID);


        } catch(err) {
            console.log(err);
            api.setMessageReaction("❌", event.messageID, event.threadID, ()=>{}, true);
            api.sendMessage("An Error while generating image.", event.threadID, event.messageID);
        }
    }
 };