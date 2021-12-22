import { Message, MessageEmbed, TextChannel } from 'discord.js'
import { BotConfig } from '../BotConfig'

export default async function (deletedMessage: Message, botConfig: BotConfig, displayAvatarURL: string) {
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
		const msgChannel = deletedMessage.channel as TextChannel
		infoChannel = infoChannel as TextChannel

		const answerEmbed = new MessageEmbed()
			.setColor('#ff6a00')
			.setTitle('Usunięto wiadomość.')
			.setAuthor(deletedMessage.guild?.me?.displayName!, displayAvatarURL)
			.addField('Autor wiadomości', deletedMessage.author?.tag || 'nie da się odczytać', true)
			.addField('Kanał', msgChannel.name || 'nie da się odczytać', true)
			.addField('Treść wiadomości', deletedMessage.content || '')
			.setTimestamp()
			.setFooter(deletedMessage.guild?.me?.displayName!, displayAvatarURL)

		infoChannel.send({ embeds: [answerEmbed] })
	})
}
