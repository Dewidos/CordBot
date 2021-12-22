import { Guild } from 'discord.js'
import sqlite3 from 'sqlite3'
/**
 * Stores discord bot's config
 */
export class BotConfig {
	private dbFile: string
	private db?: sqlite3.Database
	private _guilds: GuildDatabaseEntry[] = []
	private _countingChannel: CountingChannelDatabaseEntry[] = []
	private _repeaterChannel: RepeaterChannelDatabaseEntry[] = []
	private _deletedMessagesLogger: DeletedMessagesLoggerDatabaseEntry[] = []

	/**
	 * Initializes bot's configuration
	 * @param  {string} dbFile - path to database file
	 * @param  {(errorMessage:string|undefined)=>void} callback ran after constructor execution, receives error message when error has occured
	 */
	constructor(dbFile: string, callback?: (errorMessage: string | undefined) => void) {
		this.dbFile = dbFile

		let errMsg

		if (!this.openDbConnection()) errMsg = "Can't connect to database"
		else if (!this.updateBotConfig()) errMsg = "Can't download bot's config from database"

		if (callback) callback(errMsg)
	}

	public get guilds() {
		return this._guilds
	}

	public get countingChannel() {
		return this._countingChannel
	}

	public get repeaterChannel() {
		return this._repeaterChannel
	}

	public get deletedMessagesLogger() {
		return this._deletedMessagesLogger
	}

	public async updateBotConfig(): Promise<boolean> {
		if (!this.db) this.openDbConnection()

		return new Promise<boolean>((baseResolve, baseReject) => {
			new Promise<boolean>((resolve, reject) => {
				this.db?.all("SELECT * from 'guilds'", (err, rows) => {
					if (err) {
						console.error(err.message)
						reject()
						return
					}

					this._guilds = rows
					resolve(true)
				})
			})
				.then(() => {
					return new Promise<boolean>((resolve, reject) => {
						this.db?.all("SELECT * from 'counting_channel'", (err, rows) => {
							if (err) {
								console.error(err.message)
								reject()
								return
							}

							this._countingChannel = rows
							resolve(true)
						})
					})
				})
				.then(() => {
					return new Promise<boolean>((resolve, reject) => {
						this.db?.all("SELECT * from 'repeater_channel'", (err, rows) => {
							if (err) {
								console.error(err.message)
								reject()
								return
							}

							this._repeaterChannel = rows
							resolve(true)
						})
					})
				})
				.then(() => {
					return new Promise<boolean>((resolve, reject) => {
						this.db?.all("SELECT * from 'deleted_messages_logger'", (err, rows) => {
							if (err) {
								console.error(err.message)
								reject()
								return
							}

							this._deletedMessagesLogger = rows
							resolve(true)
						})
					})
				})
				.then(() => {
					baseResolve(this.closeDb())
				})
				.catch(() => {
					baseReject()
				})
		})
	}

	public async addNewGuild(guild: Guild): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			if (!this.db) this.openDbConnection()

			let errorMessage: string | undefined

			const callback = (err: Error | null) => {
				if (err === null) return
				console.error(err.message)
				errorMessage = err.message
				reject(errorMessage)
			}

			const promise = new Promise<number>((resolve2, reject2) => {
				this.db?.run('INSERT INTO guilds VALUES (NULL, ?, NULL)', guild.id, callback)
				this.db?.get('SELECT id FROM guilds WHERE discord_guild_id=?', guild.id, (err, row) => {
					if (err !== null) {
						console.error(err.message)
						reject2(err.message)
						return
					}
					resolve2(row.id)
				})
			})

			promise
				.then(async dbId => {
					this.db?.run('INSERT INTO counting_channel VALUES (NULL, ?, NULL)', dbId, callback)
					this.db?.run('INSERT INTO repeater_channel VALUES (NULL, ?, NULL, 30)', dbId, callback)
					this.db?.run('INSERT INTO deleted_messages_logger VALUES (NULL, ?, NULL, false)', dbId, callback)

					await this.updateBotConfig()

					resolve(true)
				})
				.catch(() => {
					reject(errorMessage)
				})
		})
	}

	public async deleteGuild(guild: Guild): Promise<boolean> {
		return new Promise<boolean>(async (resolve, reject) => {
			if (!this.db) this.openDbConnection()

			const callback = (err: Error | null) => {
				if (err === null) return
				console.error(err.message)
				reject()
			}

			const dbId = this._guilds.find(guildEntry => guildEntry.discord_guild_id === guild.id)?.id

			if (dbId === undefined) {
				reject()
				return
			}

			this.db?.run('DELETE FROM guilds WHERE id=?', dbId, callback)
			this.db?.run('DELETE FROM counting_channel WHERE guild_id=?', dbId, callback)
			this.db?.run('DELETE FROM repeater_channel WHERE guild_id=?', dbId, callback)
			this.db?.run('DELETE FROM deleted_messages_logger WHERE guild_id=?', dbId, callback)

			await this.updateBotConfig()
			resolve(true)
		})
	}

	/**
	 * Opens a connection with a database
	 * @returns {boolean} true, if the operation succeeded
	 */
	private openDbConnection(): boolean {
		let errorDidntHappen = true

		const db = new sqlite3.Database(this.dbFile, sqlite3.OPEN_READWRITE, err => {
			if (err) {
				errorDidntHappen = false
				return console.error(err.message)
			}
		})

		db.on('error', err => console.error(err.message))

		this.db = db

		return errorDidntHappen
	}

	/**
	 * Closes a connection with a database
	 * @returns {boolean} true, if the operation succeeded
	 */
	private closeDb(): boolean {
		if (!this.db) return false

		this.db?.close()
		this.db = undefined

		return true
	}
}

export interface GuildDatabaseEntry {
	id: number
	discord_guild_id: string
	main_channel_id: string
}

export interface CountingChannelDatabaseEntry {
	id: number
	guild_id: number
	channel_id: string
}

export interface RepeaterChannelDatabaseEntry {
	id: number
	guild_id: number
	channel_id: string
	max_char_count: number
}

export interface DeletedMessagesLoggerDatabaseEntry {
	id: number
	guild_id: number
	channel_id: string
	log_bot_messages: boolean
}
