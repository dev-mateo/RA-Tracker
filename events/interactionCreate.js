const {
  Events,
  Collection,
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  EmbedBuilder,
  ButtonBuilder,
} = require("discord.js");
const { MongoClient } = require("mongodb");

const cooldowns = new Collection();
const dotenv = require("dotenv").config();
const postChannel = dotenv.parsed.EVENTPOSTCHANNELID;
const uri = dotenv.parsed.DBURI;
const eventCheckChannel = dotenv.parsed.EVENTCHECKCHANNELID;

async function endEvent() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const col = client.db("RTracker").collection("HostSettings");
    const query = {};
    const options = { upsert: true };
    const updateDoc = {
      $set: {
        ongoingEvent: false,
        hostId: "",
        startTime: "",
        eventType: "",
        checkedUsers: [],
        eventCheckMessage: "",
      },
    };
    await col.updateOne(query, updateDoc, options);
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

async function getHostData() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const col = client.db("RTracker").collection("HostSettings");
    const query = {};

    const cursor = col.find(query);
    const results = await cursor.toArray();
    return results;
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }

      try {
        await command.execute(interaction);
        if (!cooldowns.has(command.name)) {
          cooldowns.set(command.name, new Collection());
        }
        const now = Date.now();
        const timestamps = cooldowns.get(command.name);
        //two as default cooldown
        const cooldownAmount = (command.cooldown || 10) * 1000;
        if (timestamps.has(interaction.user.id)) {
          const expirationTime =
            timestamps.get(interaction.user.id) + cooldownAmount;
          if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return interaction.reply(
              `Please wait ${timeLeft.toFixed(
                1
              )} more seconds before using that command again`
            );
          }
        }
        timestamps.set(interaction.user.id, now);
        setTimeout(
          () => timestamps.delete(interaction.user.id),
          cooldownAmount
        );
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}`);
        console.error(error);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId === "eventDetails") {
        const data = await getHostData().catch(console.error);
        const profileLink = interaction.fields.getTextInputValue("profileLink");
        const eventInfo = interaction.fields.getTextInputValue("eventInfo");
        const eventEmbed = new EmbedBuilder()
          .setTitle("Event Started")
          .setDescription(
            `**Event Type:** ${data[0].eventType}\n**Event Host:** ${interaction.user}\n**Event Info:** ${eventInfo}`
          )
          .setTimestamp()
          .setFooter({
            text: interaction.user.id,
            iconURL: interaction.user.displayAvatarURL({ extension: "jpg" }),
          });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Game Link")
            .setStyle("Link")
            .setURL(profileLink),
          new ButtonBuilder()
            .setCustomId("end_event")
            .setLabel("End Event")
            .setStyle("Danger")
        );
        await interaction.reply({
          content: "Event started!",
          ephemeral: true,
        });
        const channel = await interaction.guild.channels.cache.get(postChannel);
        const msg = await channel.send({
          embeds: [eventEmbed],
          components: [row],
        });
        await interaction.channel.send("@everyone Event has started!");
      }
    } else if (interaction.isButton()) {
      if (interaction.customId === "start_event") {
        // dont allow other users to start event
        if (interaction.user.id !== interaction.member.user.id) {
          await interaction.reply({
            content: "You are not allowed to start an event.",
            ephemeral: true,
          });
          return;
        }
        const modal = new ModalBuilder()
          .setCustomId("eventDetails")
          .setTitle("Event Details");
        const profileLink = new TextInputBuilder()
          .setCustomId("profileLink")
          .setLabel("Enter your ROBLOX profile link")
          .setRequired(true)
          .setStyle(TextInputStyle.Short);

        const details = new TextInputBuilder()
          .setCustomId("eventInfo")
          .setLabel("Enter extra event info (not required)")
          .setRequired(false)
          .setPlaceholder("STS at immigrant spawn, no TK/SK")
          .setStyle(TextInputStyle.Short);
        const firstActionRow = new ActionRowBuilder().addComponents(
          profileLink
        );
        const secondActionRow = new ActionRowBuilder().addComponents(details);

        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);
      } else if (interaction.customId === "cancel_event") {
        // dont allow other users to cancel event
        if (interaction.user.id !== interaction.message.interaction.user.id) {
          await interaction.reply({
            content: "You are not allowed to cancel an event.",
            ephemeral: true,
          });
          return;
        }
        await interaction.reply({
          content: "Cancelling event...",
          ephemeral: true,
        });
        const data = await getHostData().catch(console.error);
        if (data[0].ongoingEvent === true) {
          for (const user of data[0].checkedUsers) {
            const member = await interaction.guild.members.fetch(user);
            await member.send(
              "The `" +
                data[0].eventType +
                "` by `" +
                interaction.user +
                "` has been cancelled."
            );
          }
          await endEvent().catch(console.error);
        }
        setTimeout(async () => {
          await interaction.message.delete();
        }, 3000);
      } else if (interaction.customId === "end_event") {
        const data = await getHostData().catch(console.error);

        if (interaction.user.id != data[0].hostId) {
          await interaction.reply({
            content: "You are not allowed to end this event.",
            ephemeral: true,
          });
          return;
        }
        await interaction.reply({
          content: "Ending event...",
          ephemeral: true,
        });
        if (data[0].ongoingEvent === true) {
          for (const user of data[0].checkedUsers) {
            const member = await interaction.guild.members.fetch(user);
            await member.send(
              "The `" +
                data[0].eventType +
                "` by `" +
                interaction.user +
                "` has ended."
            );
          }
          await endEvent().catch(console.error);
        }
        const checkMessage = await interaction.guild.channels
          .fetch(eventCheckChannel)
          .then((channel) => channel.messages.fetch(data[0].eventCheckMessage));
        setTimeout(async () => {
          await interaction.message.delete();
          await checkMessage.delete();
        }, 3000);

        await interaction.guild.members
          .fetch(data[0].hostId)
          .then(async (member) => {
            await member.send(
              `Here is a list of the users that originally checked your event: `
            );
            data[0].checkedUsers.forEach((m) => {
              if (m !== data[0].hostId) {
                let mem = interaction.guild.members.cache.get(m);
                member.send(
                  "`" + mem.user.username + "#" + mem.user.discriminator + "`"
                );
              }
            });
          });
        await endEvent().catch(console.error);
      }
    }
  },
};
