import { Client, OverwriteResolvable } from 'discord.js'

export default function (data: string[], client: Client) {
	client.guilds
		.fetch()
		.then(guilds => guilds.find(guild => guild.name === data[0])?.fetch())
		.then(async guild => {
			if (guild === undefined) return

			const member = await guild.members.fetch(data[1])

			if (member === undefined) return

			const modRoles = guild.roles.cache.filter(role => role.permissions.has('MANAGE_MESSAGES'))

			const permissionOverwrites: OverwriteResolvable[] = [
				{
					id: guild.roles.everyone,
					deny: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
				},
				{
					id: data[1],
					allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
				},
			]

			for (let modRole of modRoles) {
				permissionOverwrites.push({
					id: modRole[1].id,
					allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
				})
			}

			const ticketChannel = await guild.channels.create('tiketoCordBoto', {
				type: 'GUILD_TEXT',
				topic: `Ticket użytkownika ${member.user.username}`,
				permissionOverwrites: permissionOverwrites,
			})

			ticketChannel.send(`${member.toString()} powiedział:\n${data[2]}`)
		})
		.catch(console.error)
}
