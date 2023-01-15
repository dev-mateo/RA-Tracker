const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const dotenv = require("dotenv").config();

const CLIENT = dotenv.parsed.CLIENT_ID;
const GUILD = dotenv.parsed.CLIENT_SERVER;
const TOKEN = dotenv.parsed.TOKEN;

const commands = [];
const commandFiles = fs
  .readdirSync(__dirname + "\\commands")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT, GUILD),
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();
