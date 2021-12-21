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

	public updateBotConfig(): boolean {
		if (!this.db) this.openDbConnection()

		this.db?.all("SELECT * from 'guilds'", (err, rows) => {
			if (err) return console.error(err.message)

			this._guilds = rows
		})

		this.db?.all("SELECT * from 'counting_channel'", (err, rows) => {
			if (err) return console.error(err.message)

			this._countingChannel = rows
		})

		this.db?.all("SELECT * from 'repeater_channel'", (err, rows) => {
			if (err) return console.error(err.message)

			this._repeaterChannel = rows
		})

		this.db?.all("SELECT * from 'deleted_messages_logger'", (err, rows) => {
			if (err) return console.error(err.message)

			this._deletedMessagesLogger = rows
		})

		this.closeDb()

		return true
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
