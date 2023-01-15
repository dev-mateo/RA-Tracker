const fs = require("node:fs");
const path = require("node:path");
const {
  Client,
  GatewayIntentBits,
  Collection,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
} = require("discord.js");
const axios = require("axios");
const dotenv = require("dotenv").config();

const coruscantGameId = 4238077359;

const TOKEN = dotenv.parsed.TOKEN;
const COOKIE = dotenv.parsed.COOKIE;
const TRACKERCHANNEL = process.env.TRACKER_CHANNEL;

const JSON_FILE = path.join(__dirname, "users.json");

async function getUser(userObject) {
  let data = JSON.stringify({
    userIds: [userObject.id],
  });
  let config = {
    method: "post",
    url: "https://presence.roblox.com/v1/presence/users",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Cookie: ".ROBLOSECURITY=" + COOKIE,
    },

    data: data,
  };

  let res = axios(config)
    .then(async function (response) {
      return await response.data;
    })
    .catch(function (error) {
      return error;
    });
  return res;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

async function getData() {
  const data = fs.readFileSync(JSON_FILE);
  return JSON.parse(data);
}

async function updateUserData(userId, posted) {
  let data = await getData();
  data.forEach((userObject, u) => {
    if (userObject.id === userId) {
      data[u].posted = posted;
    }
  });
  fs.writeFile(JSON_FILE, JSON.stringify(data), function (err) {
    if (err) throw err;
  });
}

async function getUserName(id) {
  return axios
    .get("https://users.roblox.com/v1/users/" + id.toString())
    .then(async (res) => {
      return await res.data.name;
    });
}

async function createEmbed(data, o, r) {
  const name = await getUserName(data.userId).then((res) => {
    return res;
  });
  if (o) {
    const embed = new EmbedBuilder()
      .setTitle("User Online")
      .setDescription(
        `**${name}** has joined Coruscant.\n\n**KOS Reason**: ${r}`
      )
      .setColor(0x42f572)
      .setThumbnail(
        `https://www.roblox.com/headshot-thumbnail/image?userId=${data.userId.toString()}&width=420&height=420&format=png`
      );
    return embed;
  } else {
    const embed = new EmbedBuilder()
      .setTitle("User Offline")
      .setDescription(`**${name}** has left Coruscant.`)
      .setColor(0xf54242)
      .setThumbnail(
        `https://www.roblox.com/headshot-thumbnail/image?userId=${data.userId.toString()}&width=420&height=420&format=png`
      );
    return embed;
  }
}

function createRow(data, o) {
  if (o) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Game Link")
        .setStyle("Link")
        .setEmoji("🔗")
        .setURL(
          `https://www.roblox.com/home?placeId=${coruscantGameId}&gameId=${data.gameId}`
        ),
      new ButtonBuilder()
        .setLabel("Profile")
        .setEmoji("<:grayprofile:1064191345108992040>")
        .setStyle("Link")
        .setURL(
          `https://www.roblox.com/users/${data.userId.toString()}/profile`
        )
    );
    return row;
  } else {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Profile")
        .setEmoji("<:grayprofile:1064191345108992040>")
        .setStyle("Link")
        .setURL(
          `https://www.roblox.com/users/${data.userId.toString()}/profile`
        )
    );
    return row;
  }
}

setInterval(async () => {
  const data = await getData().catch(console.error);
  data.forEach(async (userObject, u) => {
    await getUser(userObject)
      .then(async (d) => {
        if (
          d.userPresences[0].userPresenceType === 2 &&
          d.userPresences[0].placeId === coruscantGameId
        ) {
          if (!data[u].posted) {
            updateUserData(userObject.id, true);
            const channel = client.channels.cache.get(TRACKERCHANNEL);

            const embed = await createEmbed(
              d["userPresences"][0],
              true,
              userObject.reason
            ).then((res) => {
              return res;
            });
            const row = createRow(d["userPresences"][0], true);
            await channel.send({
              embeds: [embed],
              components: [row],
            });
          }
        } else {
          if (data[u].posted) {
            updateUserData(userObject.id, false);
            const channel = client.channels.cache.get(TRACKERCHANNEL);

            const embed = await createEmbed(
              d["userPresences"][0],
              false,
              userObject.reason
            ).then((res) => {
              return res;
            });
            const row = createRow(d["userPresences"][0], false);
            await channel.send({
              embeds: [embed],
              components: [row],
            });
          }
        }
      })
      .catch((result) => console.log(result));
  });
}, 5_000);

client.login(TOKEN);
