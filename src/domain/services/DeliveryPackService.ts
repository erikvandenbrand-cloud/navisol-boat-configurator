/**
 * Delivery Pack Service - v4
 * Creates ZIP bundles of all FINAL project documents with metadata
 */

import type { Project, ProjectDocument, DocumentType, Client } from '@/domain/models';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { ProjectRepository, ClientRepository } from '@/data/repositories';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';
import { SettingsService } from './SettingsService';

// ============================================
// TYPES
// ============================================

export interface DeliveryPackDocument {
  documentId: string;
  type: DocumentType;
  title: string;
  version: number;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  generatedAt: string;
  finalizedAt: string;
  finalizedBy: string;
}

export interface DeliveryPackMetadata {
  id: string;
  projectId: string;
  projectNumber: string;
  projectTitle: string;
  clientName: string;
  clientCountry?: string;
  generatedAt: string;
  generatedBy: string;
  documentCount: number;
  documents: DeliveryPackDocument[];
  companyName: string;
  notes?: string;
}

export interface DeliveryPackResult {
  metadata: DeliveryPackMetadata;
  zipBlob: Blob;
  filename: string;
}

// ============================================
// HELPERS
// ============================================

function getDocumentFilename(doc: ProjectDocument, projectNumber: string): string {
  const typeMap: Record<DocumentType, string> = {
    CE_DECLARATION: 'CE-Declaration',
    OWNERS_MANUAL: 'Owners-Manual',
    TECHNICAL_FILE: 'Technical-File',
    DELIVERY_NOTE: 'Delivery-Note',
    INVOICE: 'Invoice',
    QUOTE: 'Quote',
  };

  const typeName = typeMap[doc.type] || doc.type;
  const ext = doc.mimeType === 'application/pdf' ? 'pdf' : 'html';
  return `${projectNumber}_${typeName}_v${doc.version}.${ext}`;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Handle both regular base64 and data URLs
  const b64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// ============================================
// SERVICE
// ============================================

export const DeliveryPackService = {
  /**
   * Get all FINAL documents eligible for delivery pack
   */
  async getFinalDocuments(projectId: string): Promise<ProjectDocument[]> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return [];
    }

    return project.documents
      .filter((doc) => doc.status === 'FINAL')
      .sort((a, b) => {
        // Sort by document type priority
        const priority: Record<DocumentType, number> = {
          CE_DECLARATION: 1,
          TECHNICAL_FILE: 2,
          OWNERS_MANUAL: 3,
          DELIVERY_NOTE: 4,
          INVOICE: 5,
          QUOTE: 6,
        };
        return (priority[a.type] || 99) - (priority[b.type] || 99);
      });
  },

  /**
   * Check if project is ready for delivery pack generation
   */
  async isReadyForDeliveryPack(projectId: string): Promise<{
    ready: boolean;
    missingDocuments: DocumentType[];
    hasFinalDocuments: boolean;
  }> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return { ready: false, missingDocuments: [], hasFinalDocuments: false };
    }

    const finalDocs = project.documents.filter((d) => d.status === 'FINAL');
    const finalTypes = new Set(finalDocs.map((d) => d.type));

    // Required documents for a complete delivery pack
    const requiredTypes: DocumentType[] = [
      'CE_DECLARATION',
      'OWNERS_MANUAL',
      'DELIVERY_NOTE',
    ];

    const missingDocuments = requiredTypes.filter((t) => !finalTypes.has(t));

    return {
      ready: missingDocuments.length === 0 && finalDocs.length > 0,
      missingDocuments,
      hasFinalDocuments: finalDocs.length > 0,
    };
  },

  /**
   * Generate delivery pack metadata
   */
  async generateMetadata(
    project: Project,
    client: Client | null,
    documents: ProjectDocument[],
    context: AuditContext
  ): Promise<DeliveryPackMetadata> {
    const companyInfo = await SettingsService.getCompanyInfo();

    const packDocs: DeliveryPackDocument[] = documents.map((doc) => ({
      documentId: doc.id,
      type: doc.type,
      title: doc.title,
      version: doc.version,
      filename: getDocumentFilename(doc, project.projectNumber),
      mimeType: doc.mimeType,
      fileSizeBytes: doc.fileSizeBytes || 0,
      generatedAt: doc.generatedAt,
      finalizedAt: doc.finalizedAt || doc.generatedAt,
      finalizedBy: doc.finalizedBy || doc.generatedBy,
    }));

    return {
      id: generateUUID(),
      projectId: project.id,
      projectNumber: project.projectNumber,
      projectTitle: project.title,
      clientName: client?.name || 'Unknown Client',
      clientCountry: client?.country,
      generatedAt: now(),
      generatedBy: context.userId,
      documentCount: documents.length,
      documents: packDocs,
      companyName: companyInfo.legalName || companyInfo.name,
    };
  },

  /**
   * Generate a delivery pack ZIP file
   * Uses JSZip library for ZIP creation
   *
   * IMPORTANT: Only includes documents with status FINAL
   * Required documents are validated before generation
   */
  async generateDeliveryPack(
    projectId: string,
    context: AuditContext,
    options?: {
      includeDocumentTypes?: DocumentType[];
      notes?: string;
      skipRequiredValidation?: boolean; // Only for partial packs
    }
  ): Promise<Result<DeliveryPackResult, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const client = await ClientRepository.getById(project.clientId);

    // Get FINAL documents only
    let documents = await this.getFinalDocuments(projectId);

    if (documents.length === 0) {
      return Err('No finalized documents available for delivery pack');
    }

    // Validate required documents unless explicitly skipped
    if (!options?.skipRequiredValidation) {
      const readiness = await this.isReadyForDeliveryPack(projectId);
      if (!readiness.ready) {
        const missing = readiness.missingDocuments.map(t => t.replace(/_/g, ' ')).join(', ');
        return Err(`Missing required finalized documents: ${missing}`);
      }
    }

    // Filter by specified types if provided
    if (options?.includeDocumentTypes && options.includeDocumentTypes.length > 0) {
      documents = documents.filter((d) => options.includeDocumentTypes!.includes(d.type));
      if (documents.length === 0) {
        return Err('No documents match the specified types');
      }
    }

    // Generate metadata
    const metadata = await this.generateMetadata(project, client, documents, context);
    if (options?.notes) {
      metadata.notes = options.notes;
    }

    // Create ZIP using JSZip
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Create folder structure
      const docsFolder = zip.folder('documents');
      if (!docsFolder) {
        return Err('Failed to create documents folder');
      }

      // Add each document
      for (const doc of documents) {
        if (!doc.fileData) {
          console.warn(`Document ${doc.id} has no file data, skipping`);
          continue;
        }

        const filename = getDocumentFilename(doc, project.projectNumber);
        const content = base64ToArrayBuffer(doc.fileData);
        docsFolder.file(filename, content);
      }

      // Add metadata JSON
      const metadataJson = JSON.stringify(metadata, null, 2);
      zip.file('manifest.json', metadataJson);

      // Add README
      const readme = this.generateReadme(metadata);
      zip.file('README.txt', readme);

      // Generate ZIP blob
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });

      const zipFilename = `${project.projectNumber}_DeliveryPack_${new Date().toISOString().split('T')[0]}.zip`;

      // Log the generation
      await AuditService.log(
        context,
        'CREATE',
        'DeliveryPack',
        metadata.id,
        `Generated delivery pack with ${documents.length} documents`
      );

      return Ok({
        metadata,
        zipBlob,
        filename: zipFilename,
      });
    } catch (error) {
      console.error('Failed to generate delivery pack:', error);
      return Err('Failed to generate delivery pack ZIP file');
    }
  },

  /**
   * Generate README content for the delivery pack
   */
  generateReadme(metadata: DeliveryPackMetadata): string {
    const lines = [
      '========================================',
      'DELIVERY PACK',
      '========================================',
      '',
      `Project: ${metadata.projectNumber}`,
      `Title: ${metadata.projectTitle}`,
      `Client: ${metadata.clientName}`,
      `Generated: ${new Date(metadata.generatedAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      '',
      '----------------------------------------',
      'INCLUDED DOCUMENTS',
      '----------------------------------------',
      '',
    ];

    for (const doc of metadata.documents) {
      lines.push(`- ${doc.filename}`);
      lines.push(`  Type: ${doc.type.replace(/_/g, ' ')}`);
      lines.push(`  Version: ${doc.version}`);
      lines.push(`  Finalized: ${new Date(doc.finalizedAt).toLocaleDateString('en-GB')}`);
      lines.push('');
    }

    if (metadata.notes) {
      lines.push('----------------------------------------');
      lines.push('NOTES');
      lines.push('----------------------------------------');
      lines.push('');
      lines.push(metadata.notes);
      lines.push('');
    }

    lines.push('----------------------------------------');
    lines.push(`Generated by ${metadata.companyName}`);
    lines.push('========================================');

    return lines.join('\n');
  },

  /**
   * Download the delivery pack
   * Triggers browser download of the ZIP file
   */
  downloadDeliveryPack(result: DeliveryPackResult): void {
    const url = URL.createObjectURL(result.zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
