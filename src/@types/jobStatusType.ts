export type JobStatusType = {
  key: string
  title: string
  enabled: boolean
  running: boolean
  hasError: boolean
  errorMessage?: string
  lastRunAt?: Date
  lastSyncAt?: Date
  sentCount?: number
}