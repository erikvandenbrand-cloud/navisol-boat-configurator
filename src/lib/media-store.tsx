'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { MediaNote, MediaAuditLog } from './types';
import { generateId } from './formatting';
import { normalizeLabels, stripHtml, validateMediaFile, validateGeotag, MEDIA_VALIDATION } from './types';
import { extractImageMetadata } from './exif-utils';

interface MediaState {
  // State
  mediaItems: MediaNote[];
  auditLogs: MediaAuditLog[];
  isLoading: boolean;

  // Queries
  getMediaForVessel: (vesselId: string, includeDeleted?: boolean) => MediaNote[];
  getMediaById: (id: string) => MediaNote | undefined;
  getAllLabels: () => string[];
  searchLabels: (query: string) => string[];

  // Commands
  uploadMedia: (
    vesselId: string,
    file: File,
    uploaderId: string,
    metadata?: {
      labels?: string[];
      notes?: string;
      taken_at?: string;
      geotag_lat?: number;
      geotag_lon?: number;
    }
  ) => Promise<{ success: boolean; mediaId?: string; error?: string }>;

  updateMedia: (
    id: string,
    userId: string,
    updates: {
      labels?: string[];
      notes?: string;
      taken_at?: string;
      geotag_lat?: number;
      geotag_lon?: number;
    }
  ) => boolean;

  deleteMedia: (id: string, userId: string) => boolean;

  // Batch operations
  applyLabelsToMultiple: (mediaIds: string[], labels: string[], userId: string) => number;

  // Audit
  logMediaAction: (
    action: MediaAuditLog['action'],
    userId: string,
    vesselId: string,
    mediaId: string,
    summary: string,
    diff?: MediaAuditLog['diff']
  ) => void;
}

const MediaContext = createContext<MediaState | undefined>(undefined);

const STORAGE_KEYS = {
  media: 'navisol_media_notes',
  audit: 'navisol_media_audit',
};

export function MediaProvider({ children }: { children: ReactNode }) {
  const [mediaItems, setMediaItems] = useState<MediaNote[]>([]);
  const [auditLogs, setAuditLogs] = useState<MediaAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    loadStoredData();
  }, []);

  // Save media when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoading && mediaItems.length >= 0) {
      // Store only metadata, not the actual image data (which would be in S3)
      // For demo, we store everything in localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.media, JSON.stringify(mediaItems));
      } catch (e) {
        console.error('Failed to save media to localStorage:', e);
      }
    }
  }, [mediaItems, isLoading]);

  // Save audit logs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoading && auditLogs.length >= 0) {
      try {
        localStorage.setItem(STORAGE_KEYS.audit, JSON.stringify(auditLogs.slice(-1000))); // Keep last 1000
      } catch (e) {
        console.error('Failed to save audit logs:', e);
      }
    }
  }, [auditLogs, isLoading]);

  const loadStoredData = () => {
    // SSR safety check
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const storedMedia = localStorage.getItem(STORAGE_KEYS.media);
      if (storedMedia) {
        setMediaItems(JSON.parse(storedMedia));
      }

      const storedAudit = localStorage.getItem(STORAGE_KEYS.audit);
      if (storedAudit) {
        setAuditLogs(JSON.parse(storedAudit));
      }
    } catch (e) {
      console.error('Failed to load media data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const getMediaForVessel = (vesselId: string, includeDeleted = false): MediaNote[] => {
    return mediaItems
      .filter(m => m.vessel_instance_id === vesselId)
      .filter(m => includeDeleted || m.status !== 'deleted')
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  };

  const getMediaById = (id: string): MediaNote | undefined => {
    return mediaItems.find(m => m.id === id);
  };

  const getAllLabels = (): string[] => {
    const labels = new Set<string>();
    for (const item of mediaItems) {
      if (item.status !== 'deleted') {
        for (const label of item.labels) {
          labels.add(label);
        }
      }
    }
    return Array.from(labels).sort();
  };

  const searchLabels = (query: string): string[] => {
    const q = query.toLowerCase().trim();
    if (!q) return getAllLabels().slice(0, 10);

    return getAllLabels()
      .filter(label => label.includes(q))
      .slice(0, 10);
  };

  const logMediaAction = (
    action: MediaAuditLog['action'],
    userId: string,
    vesselId: string,
    mediaId: string,
    summary: string,
    diff?: MediaAuditLog['diff']
  ) => {
    const log: MediaAuditLog = {
      id: generateId(),
      action,
      user_id: userId,
      vessel_id: vesselId,
      media_id: mediaId,
      timestamp: new Date().toISOString(),
      summary,
      diff,
    };
    setAuditLogs(prev => [...prev, log]);
  };

  const uploadMedia = async (
    vesselId: string,
    file: File,
    uploaderId: string,
    metadata?: {
      labels?: string[];
      notes?: string;
      taken_at?: string;
      geotag_lat?: number;
      geotag_lon?: number;
    }
  ): Promise<{ success: boolean; mediaId?: string; error?: string }> => {
    // Validate file
    const validation = validateMediaFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Validate geotag if provided
    if (metadata?.geotag_lat !== undefined || metadata?.geotag_lon !== undefined) {
      if (!validateGeotag(metadata?.geotag_lat, metadata?.geotag_lon)) {
        return { success: false, error: 'Invalid geotag coordinates' };
      }
    }

    try {
      // Read file as base64 (simulating S3 upload)
      const base64 = await fileToBase64(file);

      // Extract EXIF metadata, dimensions, and create thumbnail
      const imageMetadata = await extractImageMetadata(file);
      const { exif, dimensions, thumbnail } = imageMetadata;

      // Use EXIF data for date taken and geotag if not provided in metadata
      const takenAt = metadata?.taken_at || exif.dateTaken;
      const geotagLat = metadata?.geotag_lat ?? exif.latitude;
      const geotagLon = metadata?.geotag_lon ?? exif.longitude;

      // Create media note
      const mediaId = generateId();
      const now = new Date().toISOString();

      const mediaNote: MediaNote = {
        id: mediaId,
        vessel_instance_id: vesselId,
        s3_key: base64, // In demo, store base64 directly
        thumb_key: thumbnail, // Store thumbnail for gallery view
        labels: normalizeLabels(metadata?.labels || []),
        notes: metadata?.notes ? stripHtml(metadata.notes) : undefined,
        taken_at: takenAt,
        geotag_lat: geotagLat,
        geotag_lon: geotagLon,
        byte_size: file.size,
        width: dimensions.width,
        height: dimensions.height,
        content_type: file.type,
        original_filename: file.name,
        status: 'ready',
        internal_only: true,
        uploader_id: uploaderId,
        uploaded_at: now,
      };

      setMediaItems(prev => [...prev, mediaNote]);

      // Log with EXIF info
      const exifInfo = exif.dateTaken ? ` (EXIF date: ${exif.dateTaken})` : '';
      const gpsInfo = exif.latitude && exif.longitude ? ` (GPS: ${exif.latitude}, ${exif.longitude})` : '';
      logMediaAction('upload', uploaderId, vesselId, mediaId, `Uploaded ${file.name}${exifInfo}${gpsInfo}`);

      return { success: true, mediaId };
    } catch (e) {
      console.error('Upload failed:', e);
      return { success: false, error: 'Failed to process image' };
    }
  };

  const updateMedia = (
    id: string,
    userId: string,
    updates: {
      labels?: string[];
      notes?: string;
      taken_at?: string;
      geotag_lat?: number;
      geotag_lon?: number;
    }
  ): boolean => {
    const existing = mediaItems.find(m => m.id === id);
    if (!existing || existing.status === 'deleted') return false;

    // Validate geotag
    if (updates.geotag_lat !== undefined || updates.geotag_lon !== undefined) {
      if (!validateGeotag(updates.geotag_lat, updates.geotag_lon)) return false;
    }

    const diff: MediaAuditLog['diff'] = {};

    setMediaItems(prev => prev.map(m => {
      if (m.id !== id) return m;

      const updated = { ...m, updated_at: new Date().toISOString() };

      if (updates.labels !== undefined) {
        const newLabels = normalizeLabels(updates.labels);
        if (JSON.stringify(m.labels) !== JSON.stringify(newLabels)) {
          diff.labels = { old: m.labels, new: newLabels };
          updated.labels = newLabels;
        }
      }

      if (updates.notes !== undefined) {
        const newNotes = stripHtml(updates.notes);
        if (m.notes !== newNotes) {
          diff.notes = { old: m.notes, new: newNotes };
          updated.notes = newNotes;
        }
      }

      if (updates.taken_at !== undefined && m.taken_at !== updates.taken_at) {
        diff.taken_at = { old: m.taken_at, new: updates.taken_at };
        updated.taken_at = updates.taken_at;
      }

      if (updates.geotag_lat !== undefined && m.geotag_lat !== updates.geotag_lat) {
        diff.geotag_lat = { old: m.geotag_lat, new: updates.geotag_lat };
        updated.geotag_lat = updates.geotag_lat;
      }

      if (updates.geotag_lon !== undefined && m.geotag_lon !== updates.geotag_lon) {
        diff.geotag_lon = { old: m.geotag_lon, new: updates.geotag_lon };
        updated.geotag_lon = updates.geotag_lon;
      }

      return updated;
    }));

    if (Object.keys(diff).length > 0) {
      logMediaAction('update', userId, existing.vessel_instance_id, id, 'Updated media metadata', diff);
    }

    return true;
  };

  const deleteMedia = (id: string, userId: string): boolean => {
    const existing = mediaItems.find(m => m.id === id);
    if (!existing || existing.status === 'deleted') return false;

    setMediaItems(prev => prev.map(m => {
      if (m.id !== id) return m;
      return {
        ...m,
        status: 'deleted' as const,
        deleted_at: new Date().toISOString(),
      };
    }));

    logMediaAction('delete', userId, existing.vessel_instance_id, id, `Deleted ${existing.original_filename || 'media'}`);

    return true;
  };

  const applyLabelsToMultiple = (mediaIds: string[], labels: string[], userId: string): number => {
    const normalizedLabels = normalizeLabels(labels);
    let count = 0;

    setMediaItems(prev => prev.map(m => {
      if (!mediaIds.includes(m.id) || m.status === 'deleted') return m;

      // Merge labels, deduplicate
      const mergedLabels = normalizeLabels([...m.labels, ...normalizedLabels]);
      if (JSON.stringify(m.labels) === JSON.stringify(mergedLabels)) return m;

      count++;
      logMediaAction('update', userId, m.vessel_instance_id, m.id, `Batch added labels: ${normalizedLabels.join(', ')}`);

      return {
        ...m,
        labels: mergedLabels,
        updated_at: new Date().toISOString(),
      };
    }));

    return count;
  };

  return (
    <MediaContext.Provider value={{
      mediaItems,
      auditLogs,
      isLoading,
      getMediaForVessel,
      getMediaById,
      getAllLabels,
      searchLabels,
      uploadMedia,
      updateMedia,
      deleteMedia,
      applyLabelsToMultiple,
      logMediaAction,
    }}>
      {children}
    </MediaContext.Provider>
  );
}

export function useMedia() {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMedia must be used within a MediaProvider');
  }
  return context;
}

// Helper: Convert File to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Note: getImageDimensions is now imported from exif-utils via extractImageMetadata
