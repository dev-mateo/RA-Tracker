const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with the bot's ping"),
  async execute(interaction) {
    const message = await interaction.deferReply({
      fetchReply: true,
    });

    const newMessage = `🎯 API Latency: ${
      interaction.client.ws.ping
    }\n🏓 Client Ping: ${
      message.createdTimestamp - interaction.createdTimestamp
    }`;

    const responseEmbed = new EmbedBuilder()
      .setTitle("Ping Command")
      .setDescription(newMessage)
      .setTimestamp()
      .setFooter({
        text: interaction.user.id,
        iconURL: interaction.user.displayAvatarURL({ extension: "jpg" }),
      });

    await interaction.editReply({ embeds: [responseEmbed] });
  },
};
