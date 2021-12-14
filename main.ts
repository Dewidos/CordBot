import DiscordJS, { Intents, MessageAttachment } from 'discord.js'
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

client.on('messageCreate', async msg => {
	if (msg.author.bot) return

	if (msg.channel.id === process.env.REPEATER_CHANNEL) {
		const attachmentsArray: Array<MessageAttachment> = []

		if (msg.attachments.size > 0) msg.attachments.forEach(att => attachmentsArray.push(att))

		await msg.channel.send({
			content: msg.content == '' ? '\n' : msg.content,
			files: attachmentsArray,
		})
	} else if (playersToStalk.indexOf(msg.author.id) != -1) {
		await msg.reply(`Siema ${msg.author.username}!`)
	}

	if (msg.content.toLowerCase().includes('sus')) msg.reply('ඞ')
})

client.login(process.env.TOKEN)
