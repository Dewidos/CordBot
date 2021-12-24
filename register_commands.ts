import { SlashCommandBuilder } from '@discordjs/builders'
const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v9')
import 'dotenv/config'

const commands = [
	new SlashCommandBuilder().setName('ping').setDescription('Odpowiadam pong!'),
	new SlashCommandBuilder().setName('stalking').setDescription('Włącz stalkowanie!'),
	new SlashCommandBuilder().setName('konfiguracja').setDescription('Uruchom proces konfiguracji bota.'),
	new SlashCommandBuilder()
		.setName('ship')
		.setDescription('Sprawdź czy twój wybranek do Ciebie pasuje!')
		.addMentionableOption(option =>
			option.setName('partner_1').setRequired(true).setDescription('Pierwsza osoba do zestawienia')
		)
		.addMentionableOption(option =>
			option.setName('partner_2').setRequired(true).setDescription('Druga osoba do zestawienia')
		),
].map(command => command.toJSON())

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN)

rest
	.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error)
