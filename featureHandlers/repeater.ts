import { Message, MessageAttachment, TextChannel } from 'discord.js'
import { BotConfig } from '../BotConfig'

export default async function (msg: Message, botConfig: BotConfig, dbId: number) {
	const attachmentsArray: MessageAttachment[] = []

	const repeaterMaxCharCount = botConfig.repeaterChannel.find(
		repeaterEntry => repeaterEntry.guild_id === dbId
	)?.max_char_count

	const mainChannelId = botConfig.guilds.find(guildEntry => guildEntry.id === dbId)?.main_channel_id

	if (repeaterMaxCharCount === undefined) {
		console.error(`Guild with id ${msg.guild?.id} has invalid configuration.`)
		return
	}

	if (msg.content.length > repeaterMaxCharCount) {
		const botReply = await msg.reply(
			`Maksymalna długość wiadomości jaką mam powtórzyć to ${repeaterMaxCharCount} znaków. Twoja wiadomość składa się z aż ${msg.content.length} znaków!`
		)

		if (msg.deletable) await msg.delete()

		setTimeout(() => botReply.delete(), 5000)

		if (mainChannelId)
			msg.guild?.channels.fetch(mainChannelId).then(channel => {
				let txtChannel = channel as TextChannel

				txtChannel.send({
					content: `${msg.author.toString()} właśnie spamował na przedrzeźniaczu! Wysłał wiadomość złożoną z aż ${
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
}
