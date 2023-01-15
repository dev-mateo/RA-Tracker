const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const fs = require("node:fs");
const path = require("node:path");

const dotenv = require("dotenv");
dotenv.config();

const TRACKER_ROLE = process.env.TRACKER_PERM_ROLE;
const JSON_FILE = path.join(__dirname, "..", "users.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove a user from the tracker")
    .addStringOption((option) =>
      option
        .setName("user")
        .setDescription("The user to remove from the tracker")
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getString("user");
    let userId;
    let username;

    if (isNaN(user)) {
      const API =
        "https://api.roblox.com/users/get-by-username?username=" + user;
      const response = await axios.get(API);
      const json = response.data;
      userId = json.Id;
      username = json.Username;

      if (!userId) {
        await interaction.editReply({
          content: "User not found.",
          ephemeral: true,
        });
        return;
      }
    } else {
      const API = "https://api.roblox.com/users/" + user;
      const response = await axios.get(API);
      const json = response.data;
      userId = json.Id;
      username = json.Username;
      if (!userId) {
        await interaction.editReply({
          content: "User not found.",
          ephemeral: true,
        });
        return;
      }
    }

    const role = interaction.guild.roles.cache.find(
      (role) => role.id === TRACKER_ROLE
    );
    if (role) {
      if (!interaction.member.roles.cache.find((r) => r.id == TRACKER_ROLE)) {
        await interaction.editReply(
          "You do not have permission to use this command.",
          { ephemeral: true }
        );
        return;
      }

      let data = fs.readFileSync(JSON_FILE);
      data = JSON.parse(data);
      let s = true;
      data.forEach(async (user) => {
        if (user.id == userId) {
          s = false;
          data.splice(data.indexOf(user), 1);
        }
      });

      if (s) {
        const embed = new EmbedBuilder()
          .setTitle("Error")
          .setDescription(`User isn't being tracked.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      fs.writeFile(JSON_FILE, JSON.stringify(data), function (err) {
        if (err) throw err;
      });
      const embed = new EmbedBuilder()
        .setTitle("User removed from the tracker")
        .setDescription(
          `Removed \`${username}(${userId})\` from the tracker. You will no longer receive updates when they are online.`
        );
      interaction.editReply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder().setTitle("Error").setDescription(
        `The role
                ${TRACKER_ROLE} does not exist. Please contact an administrator.`
      );
      interaction.editReply({ embeds: [embed] });
    }
  },
};
