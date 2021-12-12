import DiscordJS, { Intents, Message } from 'discord.js'
import dotenv from 'dotenv'
dotenv.config()

const client = new DiscordJS.Client({
	intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS],
})

client.on('ready', () => {
	console.log('Hello world!')
})

client.on('messageCreate', msg => {
	if (msg.content === 'empty message pls') {
		msg.channel.sendTyping().then(() => {
			setTimeout(() => {
				msg.channel.send('n i e')
			}, 3000)
		})
	}
})

client.login(process.env.TOKEN)
