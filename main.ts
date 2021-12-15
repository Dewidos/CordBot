import DiscordJS, { Intents, MessageAttachment, MessageEmbed } from 'discord.js'
import 'dotenv/config'

const playersToStalk: Array<string> = []
let actualNumber = 0

const client = new DiscordJS.Client({
	intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS],
})

client.on('ready', async () => {
	console.log('Hello world!')

	if (typeof process.env.COUNTING_CHANNEL === 'undefined') return

	const countingChannel = client.channels.cache.get(process.env.COUNTING_CHANNEL!) as DiscordJS.TextChannel

	countingChannel.messages.fetch().then(messages => {
		let lastNumber: number

		for (let i = messages.size - 1; i >= 0; i--) {
			let msg = messages.at(i)!

			lastNumber = parseInt(msg.content!)

			if (isNaN(lastNumber)) {
				if (msg.deletable) msg.delete()
				continue
			}

			if (lastNumber >= 0) actualNumber = lastNumber
		}
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

	if (msg.channel.id === process.env.REPEATER_CHANNEL) {
		const attachmentsArray: Array<MessageAttachment> = []

		if (msg.content.length > 30) {
			const botReply = await msg.reply(
				`Maksymalna długość wiadomości jaką mam powtórzyć to 30 znaków. Twoja wiadomość składa się z aż ${msg.content.length} znaków!`
			)

			if (msg.deletable) await msg.delete()

			setTimeout(() => botReply.delete(), 5000)

			msg.guild?.channels.fetch(process.env.MAIN_TEXT_CHANNEL!).then(channel => {
				let txtChannel = channel as DiscordJS.TextChannel

				txtChannel.send({
					content: `@here\n${msg.author.toString()} właśnie spamował na przedrzeźniaczu! Wysłał wiadomość złożoną z aż ${msg.content.length} znaków!`,
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
	} else if (msg.channel.id === process.env.COUNTING_CHANNEL) {
		let parsedNumber = parseInt(msg.content)

		if (isNaN(parsedNumber)) {
			if (msg.deletable) msg.delete()
		} else {
			if (parsedNumber - 1 === actualNumber) actualNumber++
			else if (msg.deletable) msg.delete()
		}
	} else if (playersToStalk.indexOf(msg.author.id) != -1) {
		await msg.reply(`Siema ${msg.author.username}!`)
	}

	if (msg.content.toLowerCase().includes('sus')) msg.reply('ඞ')
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
