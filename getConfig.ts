import { BotConfig } from './BotConfig'

export function getConfig(): BotConfig {
	return new BotConfig('./config.db')
}
