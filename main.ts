import DiscordJS, { Intents } from 'discord.js'
import dotenv from 'dotenv'
dotenv.config()

const client = new DiscordJS.Client({
	intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS],
})

client.on('ready', () => {
	console.log('Hello world!')
})

client.on('messageCreate', msg => {
	console.log(msg.content)
})

client.login(process.env.TOKEN)
