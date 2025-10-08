const fs = require("fs-extra");
const { createCanvas, loadImage } = require("canvas");

module.exports = {
    config:{
        name: "marry",
        aliases: ["biye", "hanga"],
        version: "1.0.11",
        author: "Rakib Adil",
        role: 0,
        countdown: 5,
        description: "marry a person with mention or replying her/his message",
        guide: "{p}marry @mention or reply to her/his message",
        category: "funny",
        premium: false,
        usePrefix: true
    },
    onStart: async function({event, api, message, usersData}){
        const eAuth = "52616b6962204164696c";
        const dAuth = Buffer.from(eAuth, "hex"). toString("utf8");
        const author = module.exports.config;

        if(author.author !== dAuth) return message.reply("Author name is changed, please rename it to default: Rakib Adil");

        let one = event.senderID;
        let two;
        const mention = Object.keys(event.mentions);
        if(mention.length > 0){
            two = mention[0];
        }else if(event.type === "message_reply"){
            two = event.messageReply.senderID;
        }else{
           return message.reply("Please @mention or reply someone to marry 🐸👫");
        };
            try {
                const ppUrl1 = await usersData.getAvatarUrl(one);
                const ppUrl2 = await usersData.getAvatarUrl(two);
                const canvas = createCanvas(900, 850);
                const ctx = canvas.getContext("2d");
                const bgImg = await loadImage("https://files.catbox.moe/pxougj.jpg");
                ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

                const pp1 = await loadImage(ppUrl1);
                const pp2 = await loadImage(ppUrl2);

                ctx.save();
                ctx.beginPath();
                ctx.arc(635, 255, 85, 0, Math.PI * 2);
                ctx.lineWidth = 5;
                ctx.strokeStyle = "rgb(255, 105, 180)";
                ctx.stroke();
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(pp1, 550, 170, 170, 170);
                ctx.restore();

                ctx.save();
                ctx.beginPath();
                ctx.arc(235, 255, 85, 0, Math.PI * 2);
                ctx.lineWidth = 5;
                ctx.strokeStyle = "rgb(0, 191, 255)";
                ctx.stroke();
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(pp2, 150, 170, 170, 170);
                ctx.restore();
                
                const path = __dirname + "/cache/marry.png";
                const buffer = canvas.toBuffer("image/png");
                fs.writeFileSync(path, buffer);
                
                const userName1 = await usersData.getName(one);
                const userName2 = await usersData.getName(two);
                
                api.sendMessage({
                    
                    body:`${userName1} married to ${userName2}, congratulations to both of you😊💐`,
                    
                    attachment: fs.createReadStream(path)}, event.threadID, () => fs.unlinkSync(path), event.messageID);
            } catch (e) {
                console.log(e);
                message.reply("An error occurred while processing the image. Please try again later.");
                return;
         };
    }
};