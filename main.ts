import DiscordJS, { Intents } from 'discord.js'
import 'dotenv/config'

const playersToStalk: Array<string> = []

const client = new DiscordJS.Client({
	intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS],
})

client.on('ready', () => {
	console.log('Hello world!')
})

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return

	const { commandName } = interaction

	switch (commandName) {
		case 'ping':
			await interaction.reply('pong')
			break
		case 'stalking':
			if (playersToStalk.indexOf(interaction.user.id) == -1) {
				playersToStalk.push(interaction.user.id)
				await interaction.reply('Od teraz będę Cię stalkował :)')
			} else {
				playersToStalk.splice(playersToStalk.indexOf(interaction.user.id), 1)
				await interaction.reply('Od teraz nie będę Ciebie stalkować :(')
			}
			break
	}
})

client.on('messageCreate', msg => {
	if (msg.channel.id === process.env.REPEATER_CHANNEL && !msg.author.bot) {
		msg.channel.send(msg.content)
	} else if (playersToStalk.indexOf(msg.author.id) != -1) {
		msg.reply(`Siema ${msg.author.username}!`)
	}
})

client.login(process.env.TOKEN)
