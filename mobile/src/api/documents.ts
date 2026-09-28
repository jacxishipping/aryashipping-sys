import client from './client';
import { DocumentCreateInput, DocumentFilters, DocumentListResponse, UploadDocumentResult } from '../types/document';
import { PickedDocumentAsset } from './finance';

export const documentsApi = {
  async getDocuments(filters?: DocumentFilters): Promise<DocumentListResponse> {
    const response = await client.get<DocumentListResponse>('/api/documents', {
      params: filters,
    });

    return response.data;
  },

  async uploadFile(asset: PickedDocumentAsset): Promise<UploadDocumentResult> {
    const formData = new FormData();

    const webFile = asset.file;
    if (webFile) {
      (formData as any).append('file', webFile as Blob, asset.name || 'document-upload');
    } else {
      formData.append('file', {
        uri: asset.uri,
        name: asset.name || 'document-upload',
        type: asset.mimeType || 'application/octet-stream',
      } as any);
    }

    const response = await client.post<UploadDocumentResult>('/api/upload', formData);
    return response.data;
  },

  async createDocument(input: DocumentCreateInput) {
    const response = await client.post('/api/documents', input);
    return response.data;
  },

  async deleteDocument(id: string) {
    const response = await client.delete(`/api/documents/${id}`);
    return response.data;
  },
};