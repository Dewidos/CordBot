import { CacheType, Client, CommandInteraction, GuildMember, Message, TextChannel } from 'discord.js'
import { BotConfig, DatabaseTables } from '../BotConfig'

export default async function (interaction: CommandInteraction<CacheType>, client: Client, botConfig: BotConfig) {
	// Checking, if command was used in guild

	if (!interaction.inGuild()) {
		interaction.reply({
			content: 'Nie możesz mnie konfigurować dla kanału prywatnych wiadomości.',
			ephemeral: true,
		})
		return
	}

	// Permissions check

	const guildMember = interaction.member as GuildMember

	if (!guildMember.permissions.has('ADMINISTRATOR')) {
		interaction.reply({
			content: 'Brak uprawnień. Musisz być administratorem, aby mnie konfigurować.',
			ephemeral: true,
		})
		return
	}

	await interaction.deferReply({
		ephemeral: true,
	})

	// Getting a dbId and creating new text channel

	const { guild } = interaction

	const dbId = botConfig.guilds.find(guildEntry => guildEntry.discord_guild_id === interaction.guild?.id)?.id

	if (!dbId) {
		console.error(`Guild with id ${interaction.guild?.id} isn't configured.`)
		return
	}

	guild?.channels
		.create(`${client.user?.username}-konfiguracja`, {
			topic:
				'Na tym kanale skonfiguruj CordBota. Kanał ten zostanie automatycznie usunięty po zakończonej konfiguracji.',
			permissionOverwrites: [
				{
					id: guild.roles.everyone,
					deny: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
				},
				{
					id: interaction.user.id,
					allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
				},
			],
		})
		.then(async configChannel => {
			// Greeting command user

			await interaction.editReply(`Skonfiguruj mnie na: <#${configChannel.id}>`)

			let welcomeMessageContent = `${interaction.user.toString()}\nNa tym kanale dokonasz mojej konfiguracji. `

			const wasConfigured = botConfig.guilds.find(guildEntry => guildEntry.id === dbId)?.was_configured

			if (wasConfigured === undefined) {
				let msg = `Guild with id ${interaction.guild?.id} has invalid configuration.`

				configChannel.send('Coś poszło nie tak. Proces konfiguracji będzie trzeba uruchomić ponownie.')

				endConfigProcess(configChannel, botConfig)

				return new Promise<TextChannel>((resolve, reject) => {
					reject(msg)
				})
			}

			// Choosing configuration variant

			if (!wasConfigured)
				welcomeMessageContent +=
					'Widzę, że konfigurujecie mnie tu pierwszy raz. Najpierw podaj mi ID głównego kanału tekstowego na waszym serwerze. Czasami będę wysyłać tam informacje skierowane do wszystkich członków serwera.'
			else
				welcomeMessageContent +=
					'Ponieważ skonfigurowaliście mnie już wcześniej, udostępniam Ci zestaw komend konfiguracyjnych, zmieniających różne wartości pojedynczo. Aby wyświetlić ich listę, użyj komendy **c!help**.'

			await configChannel.send({
				content: welcomeMessageContent,
				allowedMentions: {
					parse: ['users'],
				},
			})

			if (wasConfigured) return configViaCommandsHandler(interaction, configChannel, client, botConfig)

			// Getting a main text channel ID from the user

			new Promise<TextChannel>((resolve, reject) => {
				const newMessageListener = (configMessage: Message<boolean>) => {
					if (configMessage.channel.id !== configChannel.id || configMessage.author.bot) return

					const id = configMessage.content.replace(/[^\d+]/g, '')

					if (id.length !== 18) {
						configMessage.reply('To ID ma niepoprawny format. Spróbuj ponownie.')
						return
					}

					configMessage.guild?.channels
						.fetch(id)
						.then(mainChannel => {
							if (!(mainChannel instanceof TextChannel)) {
								configMessage.reply(
									'Kanał o takim ID nie jest kanałem tekstowym. Spróbuj ponownie, tym razem podając identyfikator kanału tekstowego.'
								)
							} else {
								client.removeListener('messageCreate', newMessageListener)

								botConfig
									.updateGuild(DatabaseTables.guilds, 'main_channel_id', id, dbId)
									.then(() => {
										configMessage.reply('Zapisałem informację o głównym kanale tekstowym!')

										resolve(configChannel)
									})
									.catch(err => {
										configMessage.reply('Coś poszło nie tak. Proces konfiguracji będzie trzeba uruchomić ponownie.')

										endConfigProcess(configChannel, botConfig)
										reject('There was an error while saving main channel id to database:\n' + err)
									})
							}
						})
						.catch(err => {
							configMessage.reply('Nie znalazłem kanału o takim ID. Spróbuj ponownie.')
						})
				}

				client.addListener('messageCreate', newMessageListener)
			})
				.then(async configChannel => {
					// Configuring repeater channel

					await configChannel.send(
						'Teraz skonfigurujemy moje dodatkowe funkcje. Czy chcesz skorzystać z funkcji przedrzeźniacza? Wszystkie nowe wiadomości na wskazanym przez Ciebie kanale będę papugował :) Jeżeli jesteś tą funkcją zainteresowany, oznacz lub wklej ID wybranego kanału tekstowego. Jeżeli nie chcesz uruchamiać przedrzeźniacza, napisz *nie*.'
					)

					return new Promise<TextChannel | { configChannel: TextChannel; skip: null }>((resolve, reject) => {
						const newMessageListener = async (configMessage: Message<boolean>) => {
							if (configMessage.channel.id !== configChannel.id || configMessage.author.bot) return

							if (configMessage.content.toLowerCase() !== 'nie') {
								const id = configMessage.content.replace(/[^\d+]/g, '')

								if (id.length !== 18) {
									configMessage.reply('To ID ma niepoprawny format. Spróbuj ponownie.')
									return
								}

								configMessage.guild?.channels
									.fetch(id)
									.then(mainChannel => {
										if (!(mainChannel instanceof TextChannel)) {
											configMessage.reply(
												'Kanał o takim ID nie jest kanałem tekstowym. Spróbuj ponownie, tym razem podając identyfikator kanału tekstowego.'
											)
										} else {
											client.removeListener('messageCreate', newMessageListener)

											botConfig
												.updateGuild(DatabaseTables.repeaterChannel, 'channel_id', id, dbId)
												.then(() => {
													configMessage.reply('Zapisałem informację o kanale przedrzeźniacza!')

													resolve(configChannel)
												})
												.catch(err => {
													configMessage.reply(
														'Coś poszło nie tak. Proces konfiguracji będzie trzeba uruchomić ponownie.'
													)

													endConfigProcess(configChannel, botConfig)
													reject('There was an error while saving repeater channel id to database:\n' + err)
												})
										}
									})
									.catch(err => {
										configMessage.reply('Nie znalazłem kanału o takim ID. Spróbuj ponownie.')
									})
							} else {
								client.removeListener('messageCreate', newMessageListener)

								await configMessage.reply('Oczywiście.')
								resolve({
									configChannel: configChannel,
									skip: null,
								})
							}
						}

						client.addListener('messageCreate', newMessageListener)
					})
				})
				.then(async configChannel => {
					if (!(configChannel instanceof TextChannel)) {
						return new Promise<TextChannel>((resolve, reject) => {
							resolve(configChannel.configChannel)
						})
					}

					// Repeater channel: max character count

					await configChannel.send(
						'Jako, że włączyłeś właśnie przedrzeźniacza, muszę z tobą ustalić jeszcze jedną rzecz. Często zdarza się, że ta funkcja będzie nadużywana, a na kanale przedrzeźniacza pojawi się spam. Aby temu zapobiec, mogę ustawić limit znaków w wiadomości danej mi do powtórzenia. Wskaż mi ten limit liczbą (nie słownie), a jeśli nie chcesz ustalać limitu, wpisz *-1*.'
					)

					return new Promise<TextChannel>((resolve, reject) => {
						const newMessageListener = async (configMessage: Message<boolean>) => {
							if (configMessage.channel.id !== configChannel.id || configMessage.author.bot) return

							const answerNum = parseInt(configMessage.content)

							if (isNaN(answerNum) || answerNum === 0 || answerNum < -1) {
								configMessage.reply(
									'To nie jest poprawna liczba. Spróbuj ponownie. Pamiętaj, że liczba ta musi być większa od zera albo równa -1.'
								)
								return
							}

							client.removeListener('messageCreate', newMessageListener)

							botConfig
								.updateGuild(DatabaseTables.repeaterChannel, 'max_char_count', answerNum.toString(), dbId)
								.then(() => {
									configMessage.reply('Zapisałem informację o limicie liczby znaków!')

									resolve(configChannel)
								})
								.catch(err => {
									configMessage.reply('Coś poszło nie tak. Proces konfiguracji będzie trzeba uruchomić ponownie.')

									endConfigProcess(configChannel, botConfig)
									reject('There was an error while saving repeater max char count to database:\n' + err)
								})
						}

						client.addListener('messageCreate', newMessageListener)
					})
				})
				.then(async configChannel => {
					// Configuring counting channel

					await configChannel.send(
						'Dobrze, następna dodatkowa funkcja. Czy chcesz skorzystać z funkcji kanału do liczenia? Wiele serwerów ma kanał, na którym członkowie serwera mogą wypisywać kolejne liczby. Ja, mogę przypilnować taką zabawę, nie pozwalając na wpisanie niepoprawnej liczby. Jeżeli jesteś tą funkcją zainteresowany, oznacz lub wklej ID wybranego kanału tekstowego. Jeżeli nie chcesz uruchamiać tej funkcji, napisz *nie*.'
					)

					return new Promise<TextChannel>((resolve, reject) => {
						const newMessageListener = async (configMessage: Message<boolean>) => {
							if (configMessage.channel.id !== configChannel.id || configMessage.author.bot) return

							if (configMessage.content.toLowerCase() !== 'nie') {
								const id = configMessage.content.replace(/[^\d+]/g, '')

								if (id.length !== 18) {
									configMessage.reply('To ID ma niepoprawny format. Spróbuj ponownie.')
									return
								}

								configMessage.guild?.channels
									.fetch(id)
									.then(countingChannel => {
										if (!(countingChannel instanceof TextChannel)) {
											configMessage.reply(
												'Kanał o takim ID nie jest kanałem tekstowym. Spróbuj ponownie, tym razem podając identyfikator kanału tekstowego.'
											)
										} else {
											client.removeListener('messageCreate', newMessageListener)

											botConfig
												.updateGuild(DatabaseTables.countingChannel, 'channel_id', id, dbId)
												.then(() => {
													configMessage.reply('Zapisałem informację o kanale do liczenia!')

													resolve(configChannel)
												})
												.catch(err => {
													configMessage.reply(
														'Coś poszło nie tak. Proces konfiguracji będzie trzeba uruchomić ponownie.'
													)

													endConfigProcess(configChannel, botConfig)
													reject('There was an error while saving counting channel id to database:\n' + err)
												})
										}
									})
									.catch(err => {
										configMessage.reply('Nie znalazłem kanału o takim ID. Spróbuj ponownie.')
									})
							} else {
								client.removeListener('messageCreate', newMessageListener)

								await configMessage.reply('Oczywiście.')
								resolve(configChannel)
							}
						}

						client.addListener('messageCreate', newMessageListener)
					})
				})
				.then(async configChannel => {
					// Configuring message deletion logger

					await configChannel.send(
						'Szybko poszło! Została jeszcze tylko jedna funkcja, z grubsza moderacyjna. Mogę zapisywać informacje o wszystkich usuwanych z kanałów tekstowych wiadomościach. Będziecie dzięki temu mogli wykryć np. ghost ping. Jeżeli jesteś tą funkcją zainteresowany, oznacz lub wklej ID wybranego kanału tekstowego, na który będę wysyłać informacje o usuniętych wiadomościach. Jeżeli nie chcesz uruchamiać tej funkcji, napisz *nie*.'
					)

					return new Promise<TextChannel | { configChannel: TextChannel; skip: null }>((resolve, reject) => {
						const newMessageListener = async (configMessage: Message<boolean>) => {
							if (configMessage.channel.id !== configChannel.id || configMessage.author.bot) return

							if (configMessage.content.toLowerCase() !== 'nie') {
								const id = configMessage.content.replace(/[^\d+]/g, '')

								if (id.length !== 18) {
									configMessage.reply('To ID ma niepoprawny format. Spróbuj ponownie.')
									return
								}

								configMessage.guild?.channels
									.fetch(id)
									.then(deletedMessagesLoggingChannel => {
										if (!(deletedMessagesLoggingChannel instanceof TextChannel)) {
											configMessage.reply(
												'Kanał o takim ID nie jest kanałem tekstowym. Spróbuj ponownie, tym razem podając identyfikator kanału tekstowego.'
											)
										} else {
											client.removeListener('messageCreate', newMessageListener)

											botConfig
												.updateGuild(DatabaseTables.deletedMessagesLogger, 'channel_id', id, dbId)
												.then(() => {
													configMessage.reply('Zapisałem informację o kanale do zapisywania usuwanych wiadomości!')

													resolve(configChannel)
												})
												.catch(err => {
													configMessage.reply(
														'Coś poszło nie tak. Proces konfiguracji będzie trzeba uruchomić ponownie.'
													)

													endConfigProcess(configChannel, botConfig)
													reject(
														'There was an error while saving message deletion logging channel id to database:\n' + err
													)
												})
										}
									})
									.catch(err => {
										configMessage.reply('Nie znalazłem kanału o takim ID. Spróbuj ponownie.')
									})
							} else {
								client.removeListener('messageCreate', newMessageListener)

								await configMessage.reply('Oczywiście.')
								resolve({
									configChannel: configChannel,
									skip: null,
								})
							}
						}

						client.addListener('messageCreate', newMessageListener)
					})
				})
				.then(async configChannel => {
					if (!(configChannel instanceof TextChannel)) {
						return new Promise<TextChannel>((resolve, reject) => {
							resolve(configChannel.configChannel)
						})
					}

					// Asking, if to log bot messages

					await configChannel.send(
						'Jako, że właśnie włączyłeś funkcję zapisywania informacji o usuniętych wiadomościach, muszę zapytać Cię o jeszcze jedną rzecz. Mianowicie, boty też wysyłają swoje wiadomości, wobec czego nie wiem, czy je też mam zapisywać. Jeżeli mam to robić, napisz *tak*, jeśli nie, napisz *nie*'
					)

					return new Promise<TextChannel>((resolve, reject) => {
						const newMessageListener = async (configMessage: Message<boolean>) => {
							if (configMessage.channel.id !== configChannel.id || configMessage.author.bot) return

							const answer = configMessage.content
							let sqlData

							switch (answer.toLowerCase()) {
								case 'tak':
									sqlData = '1'
									break
								case 'nie':
									sqlData = '0'
									break
								default:
									configMessage.reply('Nie taką odpowiedź miałem otrzymać. Spróbuj ponownie.')
									return
							}

							client.removeListener('messageCreate', newMessageListener)

							botConfig
								.updateGuild(DatabaseTables.deletedMessagesLogger, 'log_bot_messages', sqlData, dbId)
								.then(() => {
									configMessage.reply('Zapisałem informację na temat podejścia do wiadomości botów!')

									resolve(configChannel)
								})
								.catch(err => {
									configMessage.reply('Coś poszło nie tak. Proces konfiguracji będzie trzeba uruchomić ponownie.')

									endConfigProcess(configChannel, botConfig)
									reject('There was an error while saving if to log bot messages to database:\n' + err)
								})
						}

						client.addListener('messageCreate', newMessageListener)
					})
				})
				.then(configChannel => {
					// Ending configuration process

					configChannel.send('Wszystko gotowe!')
					endConfigProcess(configChannel, botConfig, dbId)
				})
				.catch(console.error)
		})
		.catch(console.error)
}

function configViaCommandsHandler(
	interaction: CommandInteraction<CacheType>,
	configChannel: TextChannel,
	client: Client,
	botConfig: BotConfig
) {
	configChannel.send(
		'Niestety, funkcja konfiguracji za pomocą komend nie jest jeszcze skończona. W celu zmiany ustawień, skontaktuj się z właścicielem bota.'
	)
	endConfigProcess(configChannel, botConfig)
}

async function endConfigProcess(configChannel: TextChannel, botConfig?: BotConfig, dbId?: number) {
	await configChannel.send('Za 5 sekund ten kanał zostanie usunięty. Dziękuję za przejście procesu konfiguracji.')

	setTimeout(() => {
		if (configChannel.deletable) configChannel.delete('Finished configuration process.')
	}, 5000)

	if (botConfig) {
		await botConfig.updateBotConfig()
		if (dbId) botConfig.updateGuild(DatabaseTables.guilds, 'was_configured', '1', dbId).catch(console.error)
	}
}
