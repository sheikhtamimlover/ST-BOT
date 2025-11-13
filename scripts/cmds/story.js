
module.exports = {
  config: {
    name: "story",
    aliases: [],
    version: "2.4.73",
    author: "ST | Sheikh Tamim",
    countDown: 3,
    role: 2,
    shortDescription: "Complete story management - reply, react, seen, add, delete",
    longDescription: "Comprehensive story management with support for replies, reactions, marking as seen, adding stories, and deleting stories",
    category: "owner",
    guide: {
      en: "   {pn} react <storyID> <reaction> -> react to story\n"
         + "   {pn} seen <storyID> -> mark story as seen\n"
         + "   {pn} add <attachment> -> add new story\n"
         + "   {pn} delete <storyID> -> delete your story\n"
         + "   {pn} check -> check your stories\n"
         + "   Reply with photo/video to add story"
    }
  },

  langs: {
    en: {
      loading: "⏳ Processing story request...",
      success: "✅ Story operation completed successfully",
      error: "❌ An error occurred: %1",
      invalidStoryId: "❌ Invalid story ID provided",
      noMessage: "❌ No message provided for reply",
      replySuccess: "✅ Reply sent to story successfully",
      reactSuccess: "✅ Reaction added to story",
      seenSuccess: "✅ Story marked as seen",
      storyAdded: "✅ Story added successfully",
      storyDeleted: "✅ Story deleted successfully",
      noStories: "📭 No stories found",
      selectOption: "Select an option:\n1️⃣ Reply to story\n2️⃣ React to story\n3️⃣ Mark as seen\n4️⃣ Check all stories\n5️⃣ Delete story"
    }
  },

  ST: async function ({ event, message, api, args, getLang, commandName }) {
    try {
      if (args.length === 0) {
        return message.reply(module.exports.config.guide.en);
      }

      const action = args[0].toLowerCase();

      switch (action) {
        case 'react':
          return await module.exports.handleStoryReaction(args, api, message, getLang);

        case 'seen':
          return await module.exports.handleStorySeen(args, api, message, getLang);

        case 'add':
          return await module.exports.handleAddStory(args, api, message, getLang, event);

        case 'delete':
          return await module.exports.handleDeleteStory(args, api, message, getLang);

        case 'check':
          return await module.exports.handleCheckStories(api, message, getLang, event);

        default:
          return message.reply(module.exports.config.guide.en);
      }

    } catch (error) {
      console.error("Story command error:", error);
      return message.reply(getLang("error", error.message));
    }
  },

  handleStoryReaction: async function (args, api, message, getLang) {
    if (args.length < 3) {
      return message.reply("Usage: story react <storyID> <reaction>");
    }

    const storyID = args[1];
    const reaction = args[2];

    try {
      const result = await new Promise((resolve, reject) => {
        api.setStoryReaction(storyID, reaction, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      let responseMsg = `${getLang("reactSuccess")}\n`;
      responseMsg += `📖 Story ID: ${result.story_id}\n`;
      responseMsg += `${result.reaction} Reaction: ${result.reaction}\n`;
      responseMsg += `🕐 Time: ${new Date(result.timestamp).toLocaleString()}`;

      return message.reply(responseMsg);
    } catch (error) {
      return message.reply(getLang("error", error.message));
    }
  },

  handleStorySeen: async function (args, api, message, getLang) {
    if (args.length < 2) {
      return message.reply("Usage: story seen <storyID>");
    }

    const storyID = args[1];

    try {
      const result = await new Promise((resolve, reject) => {
        api.setStorySeen(storyID, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      let responseMsg = `${getLang("seenSuccess")}\n`;
      responseMsg += `📖 Story ID: ${result.story_id}\n`;
      responseMsg += `🆔 Bucket ID: ${result.bucket_id}\n`;
      responseMsg += `🕐 Seen Time: ${new Date(result.seen_time).toLocaleString()}`;

      return message.reply(responseMsg);
    } catch (error) {
      return message.reply(getLang("error", error.message));
    }
  },

  handleAddStory: async function (args, api, message, getLang, event) {
    if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
      return message.reply("Reply to a photo/video to add as story or use: story add with attachment");
    }

    const attachment = event.messageReply.attachments[0];

    if (!['photo', 'video'].includes(attachment.type)) {
      return message.reply("❌ Only photo and video attachments are supported for stories");
    }

    try {
      const attachmentStream = await global.utils.getStreamFromURL(attachment.url);

      const result = await new Promise((resolve, reject) => {
        api.storyManager({ action: 'add', attachment: attachmentStream }, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      let responseMsg = `${getLang("storyAdded")}\n`;
      responseMsg += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      responseMsg += `📖 Story ID: ${result.story_id}\n`;
      responseMsg += `📷 Photo ID: ${result.photoID}\n`;
      responseMsg += `📊 Success: ${result.success ? 'Yes' : 'No'}\n`;
      responseMsg += `🕐 Created: ${new Date().toLocaleString()}\n`;
      responseMsg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      responseMsg += `💡 Save this Story ID for future reference: ${result.story_id}`;

      return message.reply(responseMsg);

    } catch (error) {
      return message.reply(getLang("error", error.message));
    }
  },

  handleDeleteStory: async function (args, api, message, getLang) {
    if (args.length < 2) {
      return message.reply("Usage: story delete <storyID>");
    }

    const storyID = args[1];

    try {
      const result = await new Promise((resolve, reject) => {
        api.storyManager({ action: 'delete', storyID: storyID }, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      let responseMsg = `${getLang("storyDeleted")}\n`;
      responseMsg += `📖 Deleted Story IDs: ${result.deleted_story_ids.join(', ')}\n`;
      responseMsg += `📊 Success: ${result.success ? 'Yes' : 'No'}\n`;
      responseMsg += `🕐 Deleted: ${new Date().toLocaleString()}`;

      return message.reply(responseMsg);
    } catch (error) {
      return message.reply(getLang("error", error.message));
    }
  },

  handleCheckStories: async function (api, message, getLang, event) {
    try {
      const result = await new Promise((resolve, reject) => {
        api.storyManager({ action: 'check' }, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      if (!result || (!result.stories && !result.count) || (result.stories && result.stories.length === 0) || (result.count === 0)) {
        return message.reply(getLang("noStories"));
      }

      const stories = result.stories || [];
      const storyCount = result.count || stories.length;

      let responseMsg = `📖 Your Stories (${storyCount}):\n`;
      responseMsg += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (stories.length > 0) {
        stories.slice(0, 10).forEach((story, index) => {
          responseMsg += `${index + 1}. Story ID: ${story.id}\n`;
          responseMsg += `   📅 Created: ${new Date(story.creation_time * 1000).toLocaleString()}\n`;
          responseMsg += `   📎 Attachments: ${story.attachments ? story.attachments.length : 0}\n`;
          if (story.bucket_id) {
            responseMsg += `   🗂️ Bucket ID: ${story.bucket_id}\n`;
          }
          responseMsg += `\n`;
        });

        if (stories.length > 10) {
          responseMsg += `... and ${stories.length - 10} more stories\n\n`;
        }
      } else if (storyCount > 0) {
        responseMsg += `📊 You have ${storyCount} stories available\n`;
        responseMsg += `🔄 Try refreshing or check your Facebook app\n\n`;
      }

      responseMsg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      responseMsg += `📊 Total Stories: ${storyCount}\n`;
      responseMsg += `🕐 Retrieved: ${new Date().toLocaleString()}`;

      return message.reply({
        body: responseMsg
      }, (err, info) => {
        if (!err) {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: module.exports.config.name,
            messageID: info.messageID,
            author: event.senderID,
            stories: stories,
            type: 'story_list'
          });
        }
      });

    } catch (error) {
      return message.reply(getLang("error", error.message));
    }
  },

  onReply: async function ({ message, event, Reply, getLang, api }) {
    const { storyID, stories, type } = Reply;
    const input = event.body.trim();

    if (type === 'options') {
      switch (input) {
        case '1':
        case '1️⃣':
          return message.reply(`Send your reply message for story: ${storyID}`);

        case '2':
        case '2️⃣':
          return message.reply("Send reaction emoji (👍, ❤️, 😂, 😮, 😢, 😡) or type (like, love, haha, wow, sad, angry)");

        case '3':
        case '3️⃣':
          try {
            await new Promise((resolve, reject) => {
              api.setStorySeen(storyID, (err, data) => {
                if (err) reject(err);
                else resolve(data);
              });
            });
            return message.reply(getLang("seenSuccess"));
          } catch (error) {
            return message.reply(getLang("error", error.message));
          }

        case '4':
        case '4️⃣':
          return await module.exports.handleCheckStories(api, message, getLang, event);

        case '5':
        case '5️⃣':
          return message.reply(`Send story ID to delete (current: ${storyID})`);
      }

      const reactionMap = {
        '👍': 'like',
        '❤️': 'love',
        '😂': 'haha',
        '😮': 'wow',
        '😢': 'sad',
        '😡': 'angry'
      };

      if (reactionMap[input] || ['like', 'love', 'haha', 'wow', 'sad', 'angry'].includes(input.toLowerCase())) {
        const reaction = reactionMap[input] || input.toLowerCase();
        try {
          await new Promise((resolve, reject) => {
            api.setStoryReaction(storyID, reaction, (err, data) => {
              if (err) reject(err);
              else resolve(data);
            });
          });
          return message.reply(getLang("reactSuccess"));
        } catch (error) {
          return message.reply(getLang("error", error.message));
        }
      }

      if (input.length > 0) {
        try {
          await new Promise((resolve, reject) => {
            api.sendStoryReply(storyID, input, (err, data) => {
              if (err) reject(err);
              else resolve(data);
            });
          });
          return message.reply(getLang("replySuccess"));
        } catch (error) {
          return message.reply(getLang("error", error.message));
        }
      }
    }

    if (type === 'story_list') {
      const storyIndex = parseInt(input) - 1;
      if (storyIndex >= 0 && storyIndex < stories.length) {
        const selectedStory = stories[storyIndex];
        let storyInfo = `📖 Story Details:\n`;
        storyInfo += `🆔 ID: ${selectedStory.id}\n`;
        storyInfo += `📅 Created: ${new Date(selectedStory.creation_time * 1000).toLocaleString()}\n`;
        storyInfo += `📎 Attachments: ${selectedStory.attachments.length}\n`;
        storyInfo += `🗂️ Bucket ID: ${selectedStory.bucket_id}\n\n`;
        storyInfo += `Options: reply ${selectedStory.id} <message> or react ${selectedStory.id} <reaction>`;

        return message.reply(storyInfo);
      }
    }
  }
};
