import { Client, Message } from 'discord.js'
import { BotConfig } from '../BotConfig'

export default function (msg: Message, client: Client, botConfig: BotConfig) {
	msg.channel.send('Funkcje czatu prywatnego jeszcze nie są gotowe. Spróbuj ponownie później.')
}
