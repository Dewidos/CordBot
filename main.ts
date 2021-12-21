import DiscordJS, { Intents, MessageAttachment, MessageEmbed } from 'discord.js'
import { BotConfig } from './BotConfig'
import 'dotenv/config'

const botConfig = new BotConfig(process.env.DB_PATH!)

const playersToStalk: Array<string> = []
let countingChannelNumber = 0

const client = new DiscordJS.Client({
	intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS],
})

client.on('ready', () => {
	console.log('Hello world!')
	console.log(botConfig.guilds)

	botConfig.guilds.forEach(async guildEntry => {
		const guild = await client.guilds.fetch(guildEntry.discord_guild_id)

		guild.channels.cache.forEach(async channel => {
			if (!channel.isText()) return

			await channel.messages.fetch({ limit: 100 })
		})

		let countingChannelId = botConfig.countingChannel.find(cChEntry => cChEntry.guild_id == guildEntry.id)?.channel_id

		if (!countingChannelId) {
			console.error(`Guild with id ${guild.id} isn't configured.`)
			return
		}

		const countingChannel = client.channels.cache.get(countingChannelId) as DiscordJS.TextChannel

		countingChannel.messages.fetch().then(messages => {
			let lastNumber: number

			for (let i = messages.size - 1; i >= 0; i--) {
				let msg = messages.at(i)!

				lastNumber = parseInt(msg.content!)

				if (isNaN(lastNumber)) {
					if (msg.deletable) msg.delete()
					continue
				}

				if (lastNumber >= 0) countingChannelNumber = lastNumber
			}
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
		case 'ship':
			shipHandler(interaction)
			break
	}
})

client.on('messageCreate', async msg => {
	if (msg.author.bot) return

	const dbId = botConfig.guilds.find(guildEntry => guildEntry.discord_guild_id === msg.guild?.id)?.id

	if (!dbId) {
		console.error(`Guild with id ${msg.guild?.id} isn't configured.`)
		return
	}

	let repeaterChannelId = botConfig.repeaterChannel.find(repeaterEntry => repeaterEntry.guild_id === dbId)?.channel_id
	let repeaterMaxCharCount = botConfig.repeaterChannel.find(
		repeaterEntry => repeaterEntry.guild_id === dbId
	)?.max_char_count
	let countingChannelId = botConfig.countingChannel.find(cChEntry => cChEntry.guild_id === dbId)?.channel_id
	let mainChannelId = botConfig.guilds.find(guildEntry => guildEntry.id === dbId)?.main_channel_id

	if (!repeaterChannelId || typeof repeaterMaxCharCount === 'undefined' || !countingChannelId || !mainChannelId) {
		console.error(`Guild with id ${msg.guild?.id} has invalid configuration.`)
		return
	}

	if (msg.channel.id === repeaterChannelId) {
		const attachmentsArray: Array<MessageAttachment> = []

		if (msg.content.length > repeaterMaxCharCount) {
			const botReply = await msg.reply(
				`Maksymalna długość wiadomości jaką mam powtórzyć to 30 znaków. Twoja wiadomość składa się z aż ${msg.content.length} znaków!`
			)

			if (msg.deletable) await msg.delete()

			setTimeout(() => botReply.delete(), 5000)

			msg.guild?.channels.fetch(mainChannelId).then(channel => {
				let txtChannel = channel as DiscordJS.TextChannel

				txtChannel.send({
					content: `@here\n${msg.author.toString()} właśnie spamował na przedrzeźniaczu! Wysłał wiadomość złożoną z aż ${
						msg.content.length
					} znaków!`,
					allowedMentions: {
						parse: ['everyone'],
					},
				})
			})
		} else {
			if (msg.attachments.size > 0) msg.attachments.forEach(att => attachmentsArray.push(att))

			await msg.channel.send({
				content: msg.content == '' ? '\n' : msg.content,
				files: attachmentsArray,
			})
		}
	} else if (msg.channel.id === countingChannelId) {
		let parsedNumber = parseInt(msg.content)

		if (isNaN(parsedNumber)) {
			if (msg.deletable) msg.delete()
		} else {
			if (parsedNumber - 1 === countingChannelNumber) countingChannelNumber++
			else if (msg.deletable) msg.delete()
		}
	} else if (playersToStalk.indexOf(msg.author.id) != -1) {
		await msg.reply(`Siema ${msg.author.username}!`)
	}

	if (msg.content.toLowerCase().includes('sus')) msg.reply('ඞ')
})

client.on('messageDelete', async deletedMessage => {
	if (deletedMessage.partial) await deletedMessage.fetch()

	const dbId = botConfig.guilds.find(guildEntry => guildEntry.discord_guild_id === deletedMessage.guild?.id)?.id

	if (!dbId) {
		console.error(`Guild with id ${deletedMessage.guild?.id} isn't configured.`)
		return
	}

	let dMLChannelId = botConfig.deletedMessagesLogger.find(loggerEntry => loggerEntry.guild_id === dbId)?.channel_id
	let logBotMessages = botConfig.deletedMessagesLogger.find(
		loggerEntry => loggerEntry.guild_id === dbId
	)?.log_bot_messages

	if (!dMLChannelId || typeof logBotMessages === 'undefined') {
		console.error(`Guild with id ${deletedMessage.guild?.id} has invalid configuration.`)
		return
	}

	if (deletedMessage.author?.bot && !logBotMessages) return

	deletedMessage.guild?.channels.fetch(dMLChannelId).then(infoChannel => {
		const msgChannel = deletedMessage.channel as DiscordJS.TextChannel
		infoChannel = infoChannel as DiscordJS.TextChannel

		const answerEmbed = new MessageEmbed()
			.setColor('#ff6a00')
			.setTitle('Usunięto wiadomość.')
			.setAuthor(deletedMessage.guild?.me?.displayName!, client.user?.displayAvatarURL())
			.addField('Autor wiadomości', deletedMessage.author?.tag || 'nie da się odczytać', true)
			.addField('Kanał', msgChannel.name || 'nie da się odczytać', true)
			.addField('Treść wiadomości', deletedMessage.content || '')
			.setTimestamp()
			.setFooter(deletedMessage.guild?.me?.displayName!, client.user?.displayAvatarURL())

		infoChannel.send({ embeds: [answerEmbed] })
	})
})

function shipHandler(interaction: DiscordJS.CommandInteraction<DiscordJS.CacheType>) {
	const firstPartner = interaction.options.getMentionable('partner_1') as DiscordJS.GuildMember
	const secondPartner = interaction.options.getMentionable('partner_2') as DiscordJS.GuildMember

	if (firstPartner.user.bot || secondPartner.user.bot) {
		interaction.reply({
			content: 'Bot nie człowiek, uczucia nie odwzajemni ;)',
			ephemeral: true,
		})
		return
	}

	if (firstPartner.id == secondPartner.id) {
		interaction.reply({
			content: 'Sam do siebie zawsze pasujesz w 100% ;)',
			ephemeral: true,
		})
		return
	}

	const randomPercent = Math.round(Math.random() * 100)

	const answerEmbed = new MessageEmbed()
		.setColor('#e3175e')
		.setTitle('Wasz ship!')
		.setAuthor(interaction.guild?.me?.displayName!, client.user?.displayAvatarURL())
		.setDescription(
			`**${firstPartner.displayName}** i **${secondPartner.displayName}** pasują do siebie w ${randomPercent}%!`
		)
		.setImage(
			randomPercent >= 50
				? 'https://cdn.pixabay.com/photo/2015/10/16/19/18/balloon-991680_960_720.jpg'
				: 'https://cdn.pixabay.com/photo/2017/01/09/10/48/heart-1966018_960_720.png'
		)
		.setTimestamp()
		.setFooter(interaction.guild?.me?.displayName!, client.user?.displayAvatarURL())

	interaction.reply({ embeds: [answerEmbed] })
}

client.login(process.env.TOKEN)
