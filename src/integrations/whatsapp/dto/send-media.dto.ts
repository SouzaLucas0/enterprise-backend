export class SendMediaDto {
	clientId: string
	number: string
	caption?: string
	type: 'image' | 'video' | 'audio' | 'document'
	filePath: string
	docName: string
}