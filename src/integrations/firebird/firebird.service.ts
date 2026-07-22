import { Injectable } from '@nestjs/common'
import * as fs from 'fs'
import * as ini from 'ini'
import * as Firebird from 'node-firebird'
import * as path from 'path'

@Injectable()
export class FirebirdService {
  
	private readonly filePath = path.resolve(process.cwd(), 'params.ini')
	private readonly params = ini.parse(fs.readFileSync(this.filePath, 'utf-8'))
	private readonly dbEncoding = (this.params.dbEncoding || process.env.FIREBIRD_ENCODING || 'WIN1252').toUpperCase()
	private readonly config: Firebird.Options = {
		host: this.params.dbIp,
		port: this.params.dbPort,
		database: this.params.dbPath,
		user: this.params.dbUser,
		password: this.params.dbPassword,
		encoding: this.dbEncoding as any,
		lowercase_keys: false,
		pageSize: 4096,
	}

	async query(sql: string, params: any[] = []): Promise<any[]> {
		return new Promise((resolve, reject) => {
			Firebird.attach(this.config, (err, db) => {
				if (err) return reject(err)

				db.query(sql, params, (err, result) => {
					db.detach()
					if (err) return reject(err)
					resolve(result)
				})
			})
		})
	}
}
