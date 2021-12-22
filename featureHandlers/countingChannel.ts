import { Message } from 'discord.js'

export default function (msg: Message, countingChannelNumber: number) {
	let parsedNumber = parseInt(msg.content)

	if (isNaN(parsedNumber)) {
		if (msg.deletable) msg.delete()
	} else {
		if (parsedNumber - 1 === countingChannelNumber) countingChannelNumber++
		else if (msg.deletable) msg.delete()
	}
}
