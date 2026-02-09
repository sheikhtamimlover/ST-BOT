
const { recognizeSong } = require('st-shazam');
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ffmpeg = require('fluent-ffmpeg');

module.exports = {
  config: {
    name: "shazam",
    aliases: [],
    version: "2.4.77",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Identify songs from audio/video" },
    longDescription: { en: "Reply to an audio or video message with !shazam to identify the song" },
    category: "music",
    guide: { en: "Reply to an audio/video with: !shazam or !shazam info for detailed information" }
  },

  onStart: async function ({ message, args, event, usersData }) {
    const userName = await usersData.getName(event.senderID);

    if (!event.messageReply) {
      return message.reply("⚠️ Please reply to an audio or video message with !shazam");
    }

    const attachments = event.messageReply.attachments;
    if (!attachments || attachments.length === 0) {
      return message.reply("⚠️ The message you replied to doesn't contain any audio or video.");
    }

    const mediaAttachment = attachments.find(att => 
      att.type === 'audio' || att.type === 'video'
    );

    if (!mediaAttachment) {
      return message.reply("⚠️ Please reply to a message containing audio or video.");
    }

    const showDetailedInfo = args[0] && args[0].toLowerCase() === 'info';
    const processingMsg = await message.reply(`🎵 ${userName}, identifying song... Please wait.`);

    try {
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      const timestamp = Date.now();
      let audioPath;
      
    
      const response = await axios.get(mediaAttachment.url, {
        responseType: "arraybuffer"
      });

      if (mediaAttachment.type === 'video') {
  
        const videoPath = path.join(cacheDir, `video_${timestamp}.mp4`);
        fs.writeFileSync(videoPath, Buffer.from(response.data));
        
        
        audioPath = path.join(cacheDir, `audio_${timestamp}.mp3`);
        
        try {
          await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
              .noVideo()
              .audioCodec('libmp3lame')
              .audioFrequency(44100)
              .audioChannels(2)
              .audioBitrate('192k')
              .format('mp3')
              .save(audioPath)
              .on('end', () => {
   
                if (!fs.existsSync(audioPath)) {
                  reject(new Error("Audio file was not created after conversion"));
                } else {
                  resolve();
                }
              })
              .on('error', (err) => {
                reject(new Error("Failed to extract audio from video: " + err.message));
              });
          });
        } catch (err) {
         
          if (fs.existsSync(videoPath)) {
            try { fs.unlinkSync(videoPath); } catch(e) {}
          }
          if (fs.existsSync(audioPath)) {
            try { fs.unlinkSync(audioPath); } catch(e) {}
          }
          throw err;
        }
        
        
        try {
          if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
          }
        } catch(e) {
          console.error("Error deleting video file:", e.message);
        }
        
      } else {

        audioPath = path.join(cacheDir, `audio_${timestamp}.mp3`);
        fs.writeFileSync(audioPath, Buffer.from(response.data));
      }


      const result = await recognizeSong(audioPath);


      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

      await message.unsend(processingMsg.messageID);

      if (result.results && result.results.matches && result.results.matches.length > 0) {
        const matchId = result.results.matches[0].id;
        const songData = result.resources['shazam-songs'][matchId];
        const attributes = songData.attributes;
    
        const previewUrl = result.resources?.["shazam-songs"]?.[matchId]?.attributes?.streaming?.preview;

        if (showDetailedInfo) {
          const albumData = result.resources.albums ? Object.values(result.resources.albums)[0] : null;
          const genreData = result.resources.genres ? Object.values(result.resources.genres)[0] : null;

          const duration = songData.meta?.duration || 0;
          const minutes = Math.floor(duration / 60);
          const seconds = Math.floor(duration % 60);

          let infoMessage = `✅ Song Information\n\n`;
          infoMessage += `🎵 ${attributes.title}\n`;
          infoMessage += `👤 ${attributes.artist}\n`;

          if (albumData) {
            infoMessage += `💿 ${albumData.attributes.name}\n`;
            infoMessage += `📅 ${albumData.attributes.releaseDate}\n`;
          }

          infoMessage += `🏷️ ${attributes.label}\n`;

          if (genreData) {
            infoMessage += `🎸 ${genreData.attributes.name}\n`;
          }

          infoMessage += `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`;

          const attachments = [];

          if (attributes.images?.coverArtHq) {
            try {
              const artResponse = await axios.get(attributes.images.coverArtHq, { 
                responseType: "arraybuffer"
              });
              const artPath = path.join(cacheDir, `cover_${Date.now()}.jpg`);
              fs.writeFileSync(artPath, Buffer.from(artResponse.data));
              attachments.push(fs.createReadStream(artPath));
            } catch (err) {
              console.error("Cover art error:", err.message);
            }
          }

          if (previewUrl) {
            try {
              const audioResponse = await axios.get(previewUrl, { 
                responseType: "arraybuffer",
                maxContentLength: Infinity,
                maxBodyLength: Infinity
              });
              const audioPath = path.join(cacheDir, `preview_${Date.now()}.m4a`);
              fs.writeFileSync(audioPath, Buffer.from(audioResponse.data));
              attachments.push(fs.createReadStream(audioPath));
              console.log("Audio preview downloaded successfully");
            } catch (err) {
              console.error("Audio preview error:", err.message);
              infoMessage += `\n\n⚠️ Audio preview unavailable`;
            }
          }

          if (attachments.length > 0) {
            await message.reply({
              body: infoMessage,
              attachment: attachments
            });
          } else {
            await message.reply(infoMessage);
          }

          setTimeout(() => {
            try {
              const cacheFiles = fs.readdirSync(cacheDir).filter(f => f.startsWith('cover_') || f.startsWith('preview_'));
              cacheFiles.forEach(f => {
                try {
                  fs.unlinkSync(path.join(cacheDir, f));
                } catch (err) {}
              });
            } catch (err) {}
          }, 5000);

        } else {
          let basicMessage = `✅ Song Found!\n\n`;
          basicMessage += `🎵 ${attributes.title}\n`;
          basicMessage += `👤 ${attributes.artist}`;

          if (previewUrl) {
            try {
              const audioResponse = await axios.get(previewUrl, { 
                responseType: "arraybuffer",
                maxContentLength: Infinity,
                maxBodyLength: Infinity
              });

              const audioPath = path.join(cacheDir, `preview_${Date.now()}.mp3`);
              fs.writeFileSync(audioPath, Buffer.from(audioResponse.data));

              await message.reply({
                body: basicMessage,
                attachment: fs.createReadStream(audioPath)
              });

              setTimeout(() => {
                try {
                  if (fs.existsSync(audioPath)) {
                    fs.unlinkSync(audioPath);
                  }
                } catch (err) {
                  console.error("Cleanup error:", err.message);
                }
              }, 5000);

            } catch (err) {
              console.error("Audio preview error:", err.message);
              basicMessage += `\n\n⚠️ Audio preview unavailable`;
              await message.reply(basicMessage);
            }
          } else {
            basicMessage += `\n\n⚠️ No audio preview available`;
            await message.reply(basicMessage);
          }
        }

      } else {
        return message.reply("❌ No matches found. The song might not be in Shazam's database.");
      }

    } catch (err) {
      console.error(err);
      await message.unsend(processingMsg.messageID);
      return message.reply("⚠️ Error during recognition: " + err.message);
    }
  }
};