const { SlashCommandBuilder } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

const dotenv = require("dotenv");
dotenv.config();

const JSON_FILE = path.join(__dirname, "..", "users.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tracked-users")
    .setDescription("Show all the users in the tracker"),
  async execute(interaction) {
    await interaction.deferReply();

    let data = fs.readFileSync(JSON_FILE);
    data = JSON.parse(data);

    let msg;

    data.forEach((user) => {
      msg += `\`\`\`${user.user} - ${user.reason}\n\`\`\``;
    });

    await interaction.editReply({
      content: msg,
    });
  },
};
