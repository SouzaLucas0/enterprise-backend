import { Injectable, Logger } from '@nestjs/common'
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JobStatusType } from '../../@types/jobStatusType'
import { AppMetaService } from '../../core/app-meta/app-meta.service'

@WebSocketGateway({
	cors: {
		origin: '*',
    credentials: true,
	},
})
@Injectable()
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server

  private statuses = new Map<string, JobStatusType>()
	private readonly logger = new Logger(NotificationsGateway.name)

  constructor(private readonly appMetaService: AppMetaService) {}

	handleConnection(client: Socket) {
		this.logger.log(`Cliente conectado: ${client.id}`)
    void this.emitSnapshot()
	}

	handleDisconnect(client: Socket) {
		this.logger.log(`Cliente desconectado: ${client.id}`)
	}

  sendAlert(message: string, type: 'success' | 'error' | 'info' | 'update') {
    this.logger.debug(`Enviando alerta: ${message}`)
    this.server.emit('alert', {
      message,
      type
    })
  }

  updateJobStatus(key: string, patch: Partial<JobStatusType>) {
    const current = this.statuses.get(key) ?? {key} as JobStatusType
    const next = { ...current, ...patch }
    this.statuses.set(key, next)
    this.server.emit('job:status', next)
  }

  async emitSnapshot() {
    const [anniversarySentCount, chargeSentCount, bankSlipSentCount, nfeSentCount, saleSentCount, osSentCount] =
      await Promise.all([
        this.appMetaService.get('anniversary_sent_count'),
        this.appMetaService.get('charge_sent_count'),
        this.appMetaService.get('bankslip_sent_count'),
        this.appMetaService.get('nfe_sent_count'),
        this.appMetaService.get('sale_sent_count'),
        this.appMetaService.get('os_sent_count'),
      ])

    const sentCountByJob: Record<string, number> = {
      anniversary: Number(anniversarySentCount) || 0,
      charge: Number(chargeSentCount) || 0,
      bankSlip: Number(bankSlipSentCount) || 0,
      nfe: Number(nfeSentCount) || 0,
      sale: Number(saleSentCount) || 0,
      os: Number(osSentCount) || 0,
    }

    const snapshot = Array.from(this.statuses.values()).map((status) => {
      const sentCount = sentCountByJob[status.key]

      if (sentCount !== undefined) {
        return {
          ...status,
          sentCount,
        }
      }

      return status
    })

    this.server.emit('job:snapshot', snapshot)
  }
}
