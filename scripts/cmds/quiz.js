const axios = require("axios");

module.exports = {
  config: {
    name: "quiz",
    aliases: [],
    version: "2.4.71",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    description: "Interactive quiz game with multiple languages and categories",
    category: "game",
    guide: {
      en: "{pn} - Start quiz game\nSelect language and category, then answer questions"
    }
  },

  ST: async function({ message, event, args }) {
    const languageOptions = {
      "1": { name: "🇧🇩 Bangla", code: "bangla" },
      "2": { name: "🇬🇧 English", code: "english" },
      "3": { name: "🔀 Banglish", code: "banglish" }
    };

    const optionText = Object.entries(languageOptions)
      .map(([num, lang]) => `${num}. ${lang.name}`)
      .join("\n");

    const sent = await message.reply(
      `🎮 Quiz Game - Language Selection\n━━━━━━━━━━━━━━━━━━━━━━\n\n${optionText}\n\n━━━━━━━━━━━━━━━━━━━━━━\n💡 Reply with a number to select language`
    );

    global.GoatBot.onReply.set(sent.messageID, {
      commandName: module.exports.config.name,
      messageID: sent.messageID,
      author: event.senderID,
      type: "selectLanguage",
      languageOptions
    });
  },

  onReply: async function({ Reply, message, event, args, usersData, api }) {
    const { author, type, languageOptions, selectedLanguage, categoryOptions } = Reply;

    if (author !== event.senderID) return;

    const userInput = args[0]?.trim();

    if (type === "selectLanguage") {
      await message.unsend(Reply.messageID);

      if (!languageOptions[userInput]) {
        return message.reply("❌ Invalid selection. Please try again.");
      }

      const language = languageOptions[userInput];
      const categories = {
        "1": { name: "🇧🇩 Bangladesh", code: "bd" },
        "2": { name: "📰 Current Affairs", code: "current" },
        "3": { name: "😂 Funny", code: "funny" },
        "4": { name: "💕 GF/BF", code: "relationship" },
        "5": { name: "🧠 General", code: "general" },
        "6": { name: "🔬 Science", code: "science" },
        "7": { name: "📜 History", code: "history" },
        "8": { name: "⚽ Sports", code: "sports" },
        "9": { name: "🎬 Movies", code: "movies" },
        "10": { name: "🎵 Music", code: "music" },
        "11": { name: "📚 Literature", code: "literature" },
        "12": { name: "🌍 Geography", code: "geography" },
        "13": { name: "🔢 Math", code: "math" },
        "14": { name: "🔥 HARD MODE", code: "hard" },
        "15": { name: "🎯 Trivia", code: "trivia" }
      };

      const categoryText = Object.entries(categories)
        .map(([num, cat]) => `${num}. ${cat.name}`)
        .join("\n");

      const sent = await message.reply(
        `🎮 Quiz Game - Category Selection\n━━━━━━━━━━━━━━━━━━━━━━\nSelected Language: ${language.name}\n\n${categoryText}\n\n━━━━━━━━━━━━━━━━━━━━━━\n💡 Reply with a number to select category`
      );

      global.GoatBot.onReply.set(sent.messageID, {
        commandName: module.exports.config.name,
        messageID: sent.messageID,
        author: event.senderID,
        type: "selectCategory",
        selectedLanguage: language,
        categoryOptions: categories
      });
    }
    else if (type === "selectCategory") {
      await message.unsend(Reply.messageID);

      if (!categoryOptions[userInput]) {
        return message.reply("❌ Invalid selection. Please try again.");
      }

      const category = categoryOptions[userInput];

      try {
        const stbotApi = new global.utils.STBotApis();
        const response = await axios.post(`${stbotApi.baseURL}/api/quiz/generate`, {
          language: selectedLanguage.code,
          category: category.code
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.data.success) {
          return message.reply("❌ Failed to fetch quiz. Please try again.");
        }

        const quizData = response.data.data;
        const optionsText = Object.entries(quizData.options)
          .map(([key, value]) => `${key}. ${value}`)
          .join("\n\n");

        const sent = await message.reply(
          `❓ ${quizData.question}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n${optionsText}\n\n━━━━━━━━━━━━━━━━━━━━━━\n💡 Reply with A, B, C, or D`
        );

        global.GoatBot.onReply.set(sent.messageID, {
          commandName: module.exports.config.name,
          messageID: sent.messageID,
          author: event.senderID,
          type: "answerQuiz",
          quizData,
          selectedLanguage,
          selectedCategory: category,
          quizMessageID: sent.messageID
        });
      } catch (err) {
        return message.reply("❌ Failed to load quiz. Please try again.");
      }
    }
    else if (type === "answerQuiz") {
      const answer = userInput.toUpperCase();

      if (!['A', 'B', 'C', 'D'].includes(answer)) {
        return message.reply("❌ Please reply with A, B, C, or D");
      }

      const { quizData, selectedLanguage, selectedCategory, quizMessageID } = Reply;
      const isCorrect = answer === quizData.correct;

      if (isCorrect) {
        const randomValue = Math.random();
        let reward;
        if (randomValue < 0.7) {
          reward = Math.floor(Math.random() * 900) + 100;
        } else if (randomValue < 0.95) {
          reward = Math.floor(Math.random() * 500) + 1000;
        } else {
          reward = Math.floor(Math.random() * 501) + 1500;
        }

        try {
          const userData = await usersData.addMoney(event.senderID, reward);

          if (!userData) {
            throw new Error("Failed to update user balance");
          }

          // Edit the quiz message to show correct answer
          await api.editMessage(
            `✅ Correct!\n\n━━━━━━━━━━━━━━━━━━━━━━\n💰 You earned ${reward} coins!\n━━━━━━━━━━━━━━━━━━━━━━\n\n⏳ Loading next question...`,
            quizMessageID
          );

          // Load next quiz after correct answer
          setTimeout(async () => {
            try {
              const stbotApi = new global.utils.STBotApis();
              const response = await axios.post(`${stbotApi.baseURL}/api/quiz/generate`, {
                language: selectedLanguage.code,
                category: selectedCategory.code
              }, {
                headers: {
                  'Content-Type': 'application/json'
                }
              });

              if (!response.data.success) {
                return message.reply("❌ Failed to fetch next quiz.");
              }

              const newQuizData = response.data.data;
              const optionsText = Object.entries(newQuizData.options)
                .map(([key, value]) => `${key}. ${value}`)
                .join("\n\n");

              const newQuizMessage = await message.reply(
                `❓ ${newQuizData.question}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n${optionsText}\n\n━━━━━━━━━━━━━━━━━━━━━━\n💡 Reply with A, B, C, or D`
              );

              global.GoatBot.onReply.set(newQuizMessage.messageID, {
                commandName: module.exports.config.name,
                messageID: newQuizMessage.messageID,
                author: event.senderID,
                type: "answerQuiz",
                quizData: newQuizData,
                selectedLanguage,
                selectedCategory,
                quizMessageID: newQuizMessage.messageID
              });
            } catch (err) {
              message.reply("❌ Failed to load next quiz.");
            }
          }, 2000);
        } catch (err) {
          console.error("Quiz reward error:", err);
          return message.reply("❌ Failed to update balance. Please try again later.");
        }
      } else {
        await api.editMessage(
          `❌ Wrong!\n\n━━━━━━━━━━━━━━━━━━━━━━\nCorrect answer: ${quizData.correct}. ${quizData.options[quizData.correct]}\n━━━━━━━━━━━━━━━━━━━━━━\n\n⏳ Loading next question...`,
          quizMessageID
        );

        setTimeout(async () => {
          try {
            const stbotApi = new global.utils.STBotApis();
            const response = await axios.post(`${stbotApi.baseURL}/api/quiz/generate`, {
              language: selectedLanguage.code,
              category: selectedCategory.code
            }, {
              headers: {
                'Content-Type': 'application/json'
              }
            });

            if (!response.data.success) {
              return message.reply("❌ Failed to fetch next quiz.");
            }

            const newQuizData = response.data.data;
            const optionsText = Object.entries(newQuizData.options)
              .map(([key, value]) => `${key}. ${value}`)
              .join("\n\n");

            const newQuizMessage = await message.reply(
              `❓ ${newQuizData.question}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n${optionsText}\n\n━━━━━━━━━━━━━━━━━━━━━━\n💡 Reply with A, B, C, or D`
            );

            global.GoatBot.onReply.set(newQuizMessage.messageID, {
              commandName: module.exports.config.name,
              messageID: newQuizMessage.messageID,
              author: event.senderID,
              type: "answerQuiz",
              quizData: newQuizData,
              selectedLanguage,
              selectedCategory,
              quizMessageID: newQuizMessage.messageID
            });
          } catch (err) {
            message.reply("❌ Failed to load next quiz.");
          }
        }, 2000);
      }
    }
  }
};