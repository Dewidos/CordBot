import DiscordJS, { Intents, MessageAttachment, MessageEmbed } from 'discord.js'
import { BotConfig } from './BotConfig'
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import featureHandlers from './featureHandlers/featureHandlers'

const botConfig = new BotConfig(process.env.DB_PATH!)

const playersToStalk: Array<string> = []

const client = new DiscordJS.Client({
	intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS, Intents.FLAGS.DIRECT_MESSAGES],
	partials: ['CHANNEL'],
})

client.on('ready', () => {
	console.log('Hello world!')

	botConfig.guilds.forEach(async guildEntry => {
		const guild = await client.guilds.fetch(guildEntry.discord_guild_id)

		guild.channels.cache.forEach(async channel => {
			if (!channel.isText()) return

			await channel.messages.fetch({ limit: 100 })
		})
	})
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
		default:
			const commandDir = './commands'
			const extension = path.extname(__filename)
			const files = fs.readdirSync(commandDir)

			const commandFile = files.find(file => file == `${commandName}${extension}`)

			if (commandFile === undefined) {
				interaction.reply('Nieznana komenda.')
				break
			}

			try {
				require(`${commandDir}/${commandFile}`).default(interaction, client, botConfig)
			} catch (error) {
				console.error(error)
			}
			break
	}
})

client.on('messageCreate', async msg => {
	if (msg.author.bot) return

	if (msg.channel.type === 'DM') {
		featureHandlers.dmHandler(msg, client, botConfig)
		return
	}

	const dbId = botConfig.guilds.find(guildEntry => guildEntry.discord_guild_id === msg.guild?.id)?.id

	if (!dbId) {
		console.error(`Guild with id ${msg.guild?.id} isn't configured.`)
		return
	}

	const repeaterChannelId = botConfig.repeaterChannel.find(repeaterEntry => repeaterEntry.guild_id === dbId)?.channel_id
	const countingChannelId = botConfig.countingChannel.find(cChEntry => cChEntry.guild_id === dbId)?.channel_id

	switch (msg.channel.id) {
		case repeaterChannelId:
			await featureHandlers.repeater(msg, botConfig, dbId)
			break
		case countingChannelId:
			featureHandlers.countingChannel(msg)
			break
		default:
			if (playersToStalk.indexOf(msg.author.id) != -1) {
				await msg.reply(`Siema ${msg.author.username}!`)
			}
			break
	}

	if (msg.content.toLowerCase().includes('sus')) msg.reply('ඞ')
})

client.on('messageDelete', async deletedMessage => {
	if (deletedMessage.partial) await deletedMessage.fetch()

	featureHandlers.messageDeletionLogger(
		<DiscordJS.Message>deletedMessage,
		botConfig,
		client.user?.displayAvatarURL() || ''
	)
})

client.on('guildCreate', guild => {
	botConfig.addNewGuild(guild)

	guild.fetchOwner().then(owner => {
		const welcomeEmbed = new MessageEmbed()
			.setColor('#205796')
			.setTitle('Dziękuję za dodanie mnie do Twojego serwera!')
			.setAuthor(client.user?.username!, client.user?.displayAvatarURL())
			.setDescription(
				`Dziękuję Ci za zaufanie i zaproszenie do serwera *${guild.name}*! Ja już zapisałem sobie informację o nowym pracodawcy, jednak brakuje mi kilku ważnych informacji. Są one wymagane do mojego poprawnego działania. Aby je uzupełnić, użyj na swoim serwerze komendy **/konfiguracja**. Uruchomi się wtedy wygodny kreator konfiguracji. Jeszcze raz dziękuję i polecam się na przyszłość 😊`
			)
			.setTimestamp()
			.setFooter(client.user?.username!, client.user?.displayAvatarURL())

		owner.user.send({ embeds: [welcomeEmbed] })
	})
})

client.on('guildDelete', guild => {
	botConfig.deleteGuild(guild)
})

client.login(process.env.TOKEN)
