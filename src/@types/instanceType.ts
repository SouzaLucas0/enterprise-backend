export interface WhatsappInstanceType {
    clientId: string
    token: string
    status: string
    name: string
    qrcode?: string
}

export interface WhatsappInstanceResponsetype {
    name: string
    status: string
    systemName: string
    owner: string
}