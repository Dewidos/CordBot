import {
	CacheType,
	Client,
	Collection,
	FetchGuildsOptions,
	Message,
	MessageActionRow,
	MessageSelectMenu,
	MessageSelectOptionData,
	OAuth2Guild,
	OverwriteResolvable,
	SelectMenuInteraction,
} from 'discord.js'
import { BotConfig } from '../BotConfig'
import createTicket from './ticketing/createTicket'

export default function (msg: Message, client: Client, botConfig: BotConfig) {
	msg.channel.sendTyping()

	client.guilds.fetch({ force: true } as FetchGuildsOptions).then(guilds => {
		fetchUsersCommonGuilds(guilds, msg.author.id)
			.then(resolvedData => {
				let message,
					optionsArray: MessageSelectOptionData[] = []

				if (resolvedData.length > 1) {
					message = 'Wybierz, do administracji którego serwera mam wysłać tą wiadomość:\n'

					for (let i = 0; i < resolvedData.length; i++) {
						message += `\n**${i + 1}.** *${resolvedData[i]}*`

						optionsArray.push({
							label: resolvedData[i],
							value: `${resolvedData[i]};${msg.author.id};${msg.content}`,
						})
					}
				} else if (resolvedData.length === 1) {
					message = `Wiadomość ta zostanie wysłana do administracji serwera *${resolvedData[0]}*.`
				} else {
					message = `Nie jesteś obecny na żadnym z serwerów, na których pracuję. Nie mogę nic zrobić z Twoją wiadomością.`
				}

				const row = new MessageActionRow()

				if (resolvedData.length > 1 && optionsArray.length > 0) {
					row.addComponents(
						new MessageSelectMenu().setCustomId('guildSelect').setPlaceholder('Wybierz serwer').addOptions(optionsArray)
					)
				}

				msg.channel.send({ content: message, components: resolvedData.length > 1 ? [row] : undefined })
			})
			.catch(console.error)
	})
}

export function dmGuildSelectHandler(interaction: SelectMenuInteraction<CacheType>, client: Client) {
	const data = interaction.values[0].split(';')

	if (data.length !== 3) return

	interaction.update({ content: `Wysłałem wiadomość do administracji serwera *${data[0]}*.`, components: [] })

	createTicket(data, client)
}

function fetchUsersCommonGuilds(botGuilds: Collection<string, OAuth2Guild>, userId: string): Promise<string[]> {
	return new Promise(async (resolve, reject) => {
		let returnArray: string[] = []

		for (let i = 0; i < botGuilds.size; i++) {
			const guild = botGuilds.at(i)

			if (guild === undefined) continue

			const checkForGuildMembership = async (guild: OAuth2Guild): Promise<boolean> => {
				return new Promise(resolve => {
					guild
						.fetch()
						.then(fetchedGuild => {
							fetchedGuild.members
								.fetch(userId)
								.then(() => {
									resolve(true)
								})
								.catch(() => {
									resolve(false)
								})
						})
						.catch(console.error)
				})
			}

			const memberPresent = await checkForGuildMembership(guild)

			if (memberPresent) returnArray.push(guild.name)
		}

		resolve(returnArray)
	})
}
