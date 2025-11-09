const { getPrefix } = global.utils;

module.exports = {
  config: {
    name: "friendlist",
    aliases: ["fl"],
    version: "2.4.71",
    author: "Sheikh Tamim",
    countDown: 5,
    role: 2,
    shortDescription: {
      vi: "Hiển thị danh sách bạn bè",
      en: "Show friends list with enhanced search and management options"
    },
    longDescription: {
      vi: "Hiển thị danh sách tất cả bạn bè với thông tin chi tiết",
      en: "Display all friends list with detailed information, enhanced search, and unfriend functionality"
    },
    category: "owner",
    guide: {
      vi: "{pn} [số trang]\n{pn} -s <tên> - Tìm kiếm bạn bè",
      en: "{pn} [page number]\n{pn} -s <name> - Enhanced search friends\n{pn} -search <name> - Alternative search\n\nReply with page number to navigate\nReply with 'unfriend <number>' to unfriend\nReply with 'r <number>' to unfriend"
    }
  },

  ST: async function ({ api, event, args, message }) {
    try {
      // Check if it's a search command
      if (args[0] === "-s" || args[0] === "-search") {
        const searchQuery = args.slice(1).join(" ");
        if (!searchQuery) {
          return message.reply("❌ Please provide a search term!\n💡 Example: friendlist -s John");
        }

        if (searchQuery.length < 2) {
          return message.reply("❌ Search query must be at least 2 characters long!");
        }



        // Use enhanced search from remade searchFriends
        const searchResults = await new Promise((resolve, reject) => {
          api.searchFriends(searchQuery, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });

        if (!searchResults || searchResults.length === 0) {
          return message.reply(`❌ No friends found with name "${searchQuery}"\n\n💡 Enhanced Search Tips:\n• Try using partial names (e.g., "jo" for "john")\n• Check different spellings\n• Use nicknames or alternative names\n• Search is case-insensitive\n• Results are sorted by relevance`);
        }

        let searchMsg = `🔍 ENHANCED SEARCH RESULTS FOR "${searchQuery}"\n`;
        searchMsg += `📊 Found: ${searchResults.length} friend(s)\n`;
        searchMsg += `🎯 Sorted by relevance and mutual connections\n`;
        searchMsg += `═══════════════════════════\n\n`;

        searchResults.forEach((friend, index) => {
          searchMsg += `${index + 1}. ${friend.name}`;

          // Add relevance indicators
          const queryLower = searchQuery.toLowerCase();
          const nameLower = friend.name.toLowerCase();
          if (nameLower === queryLower) {
            searchMsg += ` 🎯 (Exact match)`;
          } else if (nameLower.startsWith(queryLower)) {
            searchMsg += ` 🔸 (Starts with)`;
          }

          searchMsg += `\n   👤 ID: ${friend.userID}\n`;

          if (friend.friendshipStatus && friend.friendshipStatus !== "UNKNOWN") {
            searchMsg += `   🤝 Status: ${friend.friendshipStatus}\n`;
          }

          if (friend.gender) {
            searchMsg += `   👥 Gender: ${friend.gender}\n`;
          }

          if (friend.mutualFriends > 0) {
            searchMsg += `   🤝 ${friend.mutualFriends} mutual friend${friend.mutualFriends > 1 ? 's' : ''}\n`;
          }

          if (friend.profileUrl) {
            searchMsg += `   🔗 Profile: ${friend.profileUrl}\n`;
          }

          if (friend.subtitle && friend.subtitle !== `${friend.mutualFriends} mutual friend${friend.mutualFriends > 1 ? 's' : ''}`) {
            searchMsg += `   ℹ️ ${friend.subtitle}\n`;
          }

          searchMsg += `─────────────────────────\n`;
        });

        searchMsg += `\n💡 Commands:\n• Reply "unfriend <number>" to unfriend\n• Reply "profile <number>" for more details\n• Use "${getPrefix(event.threadID)}friendlist" to see full list`;

        return message.reply(searchMsg, (err, info) => {
          if (!err) {
            global.GoatBot.onReply.set(info.messageID, {
              commandName: module.exports.config.name,
              messageID: info.messageID,
              author: event.senderID,
              searchResults: searchResults,
              searchQuery: searchQuery,
              isSearchResult: true
            });
          }
        });
      }



      const friendsData = await new Promise((resolve, reject) => {
        api.friendList((err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      if (!friendsData || !friendsData.friends || friendsData.friends.length === 0) {
        return message.reply("❌ No friends found or unable to fetch friends list.\n💡 Try again later or check your connection.");
      }

      const page = parseInt(args[0]) || 1;
      const friendsPerPage = 10;
      const totalPages = Math.ceil(friendsData.friends.length / friendsPerPage);

      if (page > totalPages || page < 1) {
        return message.reply(`❌ Invalid page number. Available pages: 1-${totalPages}`);
      }

      const startIndex = (page - 1) * friendsPerPage;
      const endIndex = startIndex + friendsPerPage;
      const friendsToShow = friendsData.friends.slice(startIndex, endIndex);

      let friendsList = `👥 FRIENDS LIST (Page ${page}/${totalPages})\n`;
      friendsList += `📊 Total Friends: ${friendsData.friendCount || friendsData.friends.length}\n`;
      friendsList += `🔍 Enhanced search available with -s option\n`;
      friendsList += `═══════════════════════════\n\n`;

      friendsToShow.forEach((friend, index) => {
        const displayIndex = startIndex + index + 1;
        friendsList += `${displayIndex}. ${friend.name}\n`;
        friendsList += `   👤 ID: ${friend.userID}\n`;
        friendsList += `   🌐 Gender: ${friend.gender || 'Unknown'}\n`;
        if (friend.socialContext) {
          friendsList += `   🤝 Context: ${friend.socialContext}\n`;
        }
        if (friend.profileUrl) {
          friendsList += `   🔗 Profile: ${friend.profileUrl}\n`;
        }
        friendsList += `─────────────────────────\n`;
      });

      friendsList += `\n💡 Navigation & Commands:\n`;
      friendsList += `• Reply with page number (1-${totalPages}) to navigate\n`;
      friendsList += `• Reply "unfriend <number>" or "r <number>" to unfriend\n`;
      friendsList += `• Use "${getPrefix(event.threadID)}friendlist -s <name>" for enhanced search\n`;
      friendsList += `• Use "${getPrefix(event.threadID)}friendlist -search <name>" alternative search\n`;

      if (totalPages > 1) {
        friendsList += `\n📄 Quick Navigation:\n`;
        friendsList += `• Next: "${getPrefix(event.threadID)}friendlist ${Math.min(page + 1, totalPages)}"\n`;
        if (page > 1) {
          friendsList += `• Previous: "${getPrefix(event.threadID)}friendlist ${page - 1}"\n`;
        }
        friendsList += `• Last: "${getPrefix(event.threadID)}friendlist ${totalPages}"`;
      }

      return message.reply(friendsList, (err, info) => {
        if (!err) {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: module.exports.config.name,
            messageID: info.messageID,
            author: event.senderID,
            friendsData: friendsData,
            currentPage: page,
            totalPages: totalPages,
            friendsPerPage: friendsPerPage,
            isSearchResult: false
          });
        }
      });

    } catch (error) {
      console.error("Error in friendlist command:", error);
      return message.reply(`❌ An error occurred while fetching friends list: ${error.message}\n💡 Please try again later.`);
    }
  },

  onReply: async function ({ message, event, Reply, api }) {
    const { author, isSearchResult } = Reply;

    if (event.senderID !== author) {
      return message.reply("❌ You can't use this reply!");
    }

    const input = event.body.trim().toLowerCase();

    // Handle profile command for search results
    if (input.startsWith("profile ") && isSearchResult) {
      const numberStr = input.replace("profile ", "");
      const friendNumber = parseInt(numberStr);

      if (isNaN(friendNumber) || friendNumber < 1) {
        return message.reply("❌ Please provide a valid friend number!");
      }

      const { searchResults } = Reply;
      const friendIndex = friendNumber - 1;
      const friend = searchResults[friendIndex];

      if (!friend) {
        return message.reply("❌ Friend number not found!");
      }

      let profileInfo = `👤 FRIEND PROFILE\n\n`;
      profileInfo += `📛 Name: ${friend.name}\n`;
      profileInfo += `🆔 ID: ${friend.userID}\n`;

      if (friend.shortName) {
        profileInfo += `📝 Short Name: ${friend.shortName}\n`;
      }

      if (friend.gender) {
        profileInfo += `👥 Gender: ${friend.gender}\n`;
      }

      if (friend.friendshipStatus) {
        profileInfo += `🤝 Friendship: ${friend.friendshipStatus}\n`;
      }

      if (friend.mutualFriends > 0) {
        profileInfo += `👫 Mutual Friends: ${friend.mutualFriends}\n`;
      }

      if (friend.profileUrl) {
        profileInfo += `🔗 Profile URL: ${friend.profileUrl}\n`;
      }

      return message.reply(profileInfo);
    }

    // Handle unfriend commands
    if (input.startsWith("unfriend ") || input.startsWith("r ")) {
      const numberStr = input.replace(/^(unfriend|r)\s+/, "");
      const friendNumber = parseInt(numberStr);

      if (isNaN(friendNumber) || friendNumber < 1) {
        return message.reply("❌ Please provide a valid friend number!");
      }

      let friend;
      if (isSearchResult) {
        const { searchResults } = Reply;
        const friendIndex = friendNumber - 1;
        friend = searchResults[friendIndex];
      } else {
        const { friendsData } = Reply;
        const friendIndex = friendNumber - 1;
        friend = friendsData.friends[friendIndex];
      }

      if (!friend) {
        return message.reply("❌ Friend number not found!");
      }

      try {
        message.reply(`⏳ Unfriending ${friend.name}...`);

        await new Promise((resolve, reject) => {
          api.unfriend(friend.userID, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });

        return message.reply(`✅ Successfully unfriended ${friend.name} (${friend.userID})\n📊 Your friend count has been updated.`);
      } catch (error) {
        console.error("Error unfriending:", error);
        return message.reply(`❌ Failed to unfriend ${friend.name}: ${error.message}\n💡 Please try again later.`);
      }
    }

    // Handle page navigation (only for non-search results)
    if (!isSearchResult) {
      const { friendsData, totalPages, friendsPerPage } = Reply;
      const newPage = parseInt(input);

      if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages) {
        const startIndex = (newPage - 1) * friendsPerPage;
        const endIndex = startIndex + friendsPerPage;
        const friendsToShow = friendsData.friends.slice(startIndex, endIndex);

        let friendsList = `👥 FRIENDS LIST (Page ${newPage}/${totalPages})\n`;
        friendsList += `📊 Total Friends: ${friendsData.friendCount || friendsData.friends.length}\n`;
        friendsList += `🔍 Enhanced search available with -s option\n`;
        friendsList += `═══════════════════════════\n\n`;

        friendsToShow.forEach((friend, index) => {
          const displayIndex = startIndex + index + 1;
          friendsList += `${displayIndex}. ${friend.name}\n`;
          friendsList += `   👤 ID: ${friend.userID}\n`;
          friendsList += `   🌐 Gender: ${friend.gender || 'Unknown'}\n`;
          if (friend.socialContext) {
            friendsList += `   🤝 Context: ${friend.socialContext}\n`;
          }
          friendsList += `─────────────────────────\n`;
        });

        friendsList += `\n💡 Navigation & Commands:\n`;
        friendsList += `• Reply with page number (1-${totalPages}) to navigate\n`;
        friendsList += `• Reply "unfriend <number>" or "r <number>" to unfriend\n`;
        friendsList += `• Use "${getPrefix(event.threadID)}friendlist -s <name>" for enhanced search\n`;

        return message.reply(friendsList, (err, info) => {
          if (!err) {
            global.GoatBot.onReply.set(info.messageID, {
              commandName: module.exports.config.name,
              messageID: info.messageID,
              author: event.senderID,
              friendsData: friendsData,
              currentPage: newPage,
              totalPages: totalPages,
              friendsPerPage: friendsPerPage,
              isSearchResult: false
            });
          }
        });
      } else {
        return message.reply(`❌ Invalid input! Please reply with:\n• Page number (1-${totalPages})\n• "unfriend <number>" or "r <number>" to unfriend\n• Use "${getPrefix(event.threadID)}friendlist -s <name>" for enhanced search`);
      }
    } else {
      const { searchQuery } = Reply;
      return message.reply(`❌ Invalid input! Please reply with:\n• "unfriend <number>" or "r <number>" to unfriend\n• "profile <number>" for friend details\n• Use "${getPrefix(event.threadID)}friendlist -s <name>" for new search\n• Current search: "${searchQuery}"`);
    }
  }
};
