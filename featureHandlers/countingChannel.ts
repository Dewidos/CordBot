import { Message } from 'discord.js'

export default function (msg: Message) {
	let countingChannelNumber = 0

	msg.channel.messages.fetch().then(messages => {
		let lastNumber: number

		for (let i = messages.size - 1; i > 0; i--) {
			let msg = messages.at(i)!

			lastNumber = parseInt(msg.content!)

			if (isNaN(lastNumber)) {
				if (msg.deletable) msg.delete()
				continue
			}

			if (lastNumber >= 0) countingChannelNumber = lastNumber
		}

		let parsedNumber = parseInt(msg.content)

		if (isNaN(parsedNumber)) {
			if (msg.deletable) msg.delete()
		} else {
			if (parsedNumber - 1 === countingChannelNumber) countingChannelNumber++
			else if (msg.deletable) msg.delete()
		}
	})
}
