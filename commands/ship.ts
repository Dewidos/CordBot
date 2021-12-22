import { CacheType, Client, CommandInteraction, GuildMember, MessageEmbed } from 'discord.js'
import { BotConfig } from '../BotConfig'

export default function (interaction: CommandInteraction<CacheType>, client: Client, botConfig: BotConfig) {
	const firstPartner = interaction.options.getMentionable('partner_1') as GuildMember
	const secondPartner = interaction.options.getMentionable('partner_2') as GuildMember

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
