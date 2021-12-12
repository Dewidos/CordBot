const { SlashCommandBuilder } = require('@discordjs/builders')
const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v9')
import 'dotenv/config'

const commands = [
	new SlashCommandBuilder().setName('ping').setDescription('Odpowiadam pong!'),
	new SlashCommandBuilder().setName('stalking').setDescription('Włącz stalkowanie!'),
].map(command => command.toJSON())

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN)

rest
	.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error)
