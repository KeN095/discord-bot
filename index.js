const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');


const client = new Client({ intents: [GatewayIntentBits.Guilds] });
//New Client instance

client.cooldowns = new Collection();
/* This map holds the command name as a key and holds another map as the value
   The second map contains the user id as a key and the value will hold the timestamp of when the user has last used the command 
   (ex: <Ping: <user_id,7-26-23 03:42:22>>)
*/

client.commands = new Collection();
//This will hold all the implemented commands 

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	//Loop through the folders in the command folder
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			//If both data and execute properties are found in the command files then store them
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.once(Events.ClientReady, () => {
	console.log('Ready!');
});

client.on(Events.InteractionCreate, async interaction => {
	//Once a slash command is inputted, a listener is created to listen for slash commands
	if (!interaction.isChatInputCommand()) return;
	//Verify a slash command is being handled
	const command = client.commands.get(interaction.commandName);
	//Retrieve the command being called from the commands list

	if (!command) return;

	const { cooldowns } = client;

	if (!cooldowns.has(command.data.name)) {
		cooldowns.set(command.data.name, new Collection());
		//If the command is not in the collection, store it as the key and store a new map as the value
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.data.name);
	const defaultCooldownDuration = 3;
	const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;
	//If a cooldown for a command exists, multiply it by 1000 otherwise, use the defaultDuration


	if (timestamps.has(interaction.user.id)) {
		const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
		//Add cooldownAmount time to when the user last interacted with the slash command

		if (now < expirationTime) {
			const expiredTimestamp = Math.round(expirationTime / 1000);
			return interaction.reply({ content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, ephemeral: true });
			//If expiration time is still valid, display a message that shows when to use the slash command again
		}
	}

	timestamps.set(interaction.user.id, now);
	setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

client.login(token);
//Login with token from config file