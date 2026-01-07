'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Camera, Upload, X, Edit, Trash2, Tag, Search, Filter,
  Image as ImageIcon, Calendar, MapPin, Check, Plus, AlertCircle,
  ZoomIn, Download, ChevronLeft, ChevronRight, Loader2, Shield
} from 'lucide-react';
import { useAuth } from '@/lib/auth-store';
import { useMedia } from '@/lib/media-store';
import { useNavisol } from '@/lib/store';
import { formatEuroDate } from '@/lib/formatting';
import { MEDIA_VALIDATION, type MediaNote } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';

export function VesselPhotos() {
  const { currentUser, hasPermission } = useAuth();
  const { clientBoats } = useNavisol();
  const {
    getMediaForVessel,
    getAllLabels,
    searchLabels,
    uploadMedia,
    updateMedia,
    deleteMedia,
    applyLabelsToMultiple,
    isLoading
  } = useMedia();

  // State
  const [selectedBoatId, setSelectedBoatId] = useState<string>('');
  const [filterLabel, setFilterLabel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<MediaNote | null>(null);
  const [editingMedia, setEditingMedia] = useState<MediaNote | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MediaNote | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedForBatch, setSelectedForBatch] = useState<Set<string>>(new Set());
  const [batchLabels, setBatchLabels] = useState('');
  const [showBatchDialog, setShowBatchDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check permissions - use dedicated media permissions
  const canManageMedia = hasPermission('manageMedia');
  const canViewMedia = hasPermission('viewMedia');

  // Get media for selected vessel
  const vesselMedia = useMemo(() => {
    if (!selectedBoatId) return [];
    let media = getMediaForVessel(selectedBoatId);

    // Filter by label
    if (filterLabel && filterLabel !== 'all') {
      media = media.filter(m => m.labels.includes(filterLabel));
    }

    // Search by filename or notes
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      media = media.filter(m =>
        m.original_filename?.toLowerCase().includes(q) ||
        m.notes?.toLowerCase().includes(q) ||
        m.labels.some(l => l.includes(q))
      );
    }

    return media;
  }, [selectedBoatId, filterLabel, searchQuery, getMediaForVessel]);

  // All unique labels for the filter dropdown
  const allLabels = useMemo(() => getAllLabels(), [getAllLabels]);

  // Upload files
  const handleUploadFiles = useCallback(async (files: File[]) => {
    if (!currentUser || !selectedBoatId) return;

    setIsUploading(true);
    setUploadError(null);

    let successCount = 0;
    let lastError = '';

    for (const file of files) {
      const result = await uploadMedia(selectedBoatId, file, currentUser.id);
      if (result.success) {
        successCount++;
      } else {
        lastError = result.error || 'Unknown error';
      }
    }

    setIsUploading(false);

    if (successCount < files.length) {
      setUploadError(`Uploaded ${successCount}/${files.length} files. Error: ${lastError}`);
    }
  }, [currentUser, selectedBoatId, uploadMedia]);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!canManageMedia || !selectedBoatId || !currentUser) return;

    const files = Array.from(e.dataTransfer.files).filter(f =>
      MEDIA_VALIDATION.ALLOWED_TYPES.includes(f.type as typeof MEDIA_VALIDATION.ALLOWED_TYPES[number])
    );

    if (files.length > 0) {
      handleUploadFiles(files);
    }
  }, [canManageMedia, selectedBoatId, currentUser, handleUploadFiles]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleUploadFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save media edits
  const handleSaveEdit = () => {
    if (!editingMedia || !currentUser) return;

    updateMedia(editingMedia.id, currentUser.id, {
      labels: editingMedia.labels,
      notes: editingMedia.notes,
      taken_at: editingMedia.taken_at,
      geotag_lat: editingMedia.geotag_lat,
      geotag_lon: editingMedia.geotag_lon,
    });

    setEditingMedia(null);
  };

  // Delete media
  const handleDelete = () => {
    if (!deleteConfirm || !currentUser) return;
    deleteMedia(deleteConfirm.id, currentUser.id);
    setDeleteConfirm(null);
    if (selectedMedia?.id === deleteConfirm.id) {
      setSelectedMedia(null);
    }
  };

  // Apply batch labels
  const handleApplyBatchLabels = () => {
    if (!currentUser || selectedForBatch.size === 0) return;

    const labels = batchLabels.split(',').map(l => l.trim()).filter(l => l);
    applyLabelsToMultiple(Array.from(selectedForBatch), labels, currentUser.id);

    setShowBatchDialog(false);
    setBatchLabels('');
    setSelectedForBatch(new Set());
  };

  // Toggle batch selection
  const toggleBatchSelect = (mediaId: string) => {
    setSelectedForBatch(prev => {
      const next = new Set(prev);
      if (next.has(mediaId)) {
        next.delete(mediaId);
      } else {
        next.add(mediaId);
      }
      return next;
    });
  };

  // Access denied for viewers
  if (!canViewMedia) {
    return (
      <div className="p-8 text-center">
        <Shield className="h-16 w-16 mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-700">Access Denied</h2>
        <p className="text-slate-500">You don't have permission to view vessel photos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Camera className="h-7 w-7 text-teal-600" />
            Vessel Photos
          </h1>
          <p className="text-slate-600">Internal photos and documentation for Technical Dossier</p>
        </div>
      </div>

      {/* Vessel Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label>Select Vessel</Label>
              <Select value={selectedBoatId} onValueChange={setSelectedBoatId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a vessel to manage photos..." />
                </SelectTrigger>
                <SelectContent>
                  {clientBoats.map(boat => (
                    <SelectItem key={boat.id} value={boat.id}>
                      {boat.boat_name || boat.boat_model} - {boat.hull_identification_number || 'No HIN'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedBoatId && (
              <>
                <div className="w-full md:w-64">
                  <Label>Filter by Label</Label>
                  <Select value={filterLabel} onValueChange={setFilterLabel}>
                    <SelectTrigger className="mt-1">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All labels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All labels</SelectItem>
                      {allLabels.map(label => (
                        <SelectItem key={label} value={label}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-64">
                  <Label>Search</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search photos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedBoatId ? (
        <>
          {/* Upload Area */}
          {canManageMedia && (
            <Card
              className={`border-2 border-dashed transition-colors ${
                isDragging ? 'border-teal-500 bg-teal-50' : 'border-slate-300 hover:border-teal-400'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <CardContent className="py-8">
                <div className="text-center">
                  <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-teal-500' : 'text-slate-400'}`} />
                  <p className="text-lg font-medium text-slate-700">
                    {isDragging ? 'Drop files here' : 'Drag & drop photos here'}
                  </p>
                  <p className="text-sm text-slate-500 mb-4">
                    or click to select files (JPEG, PNG, WebP up to 25MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={MEDIA_VALIDATION.ALLOWED_TYPES.join(',')}
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Select Files
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {/* Batch Actions */}
          {selectedForBatch.size > 0 && canManageMedia && (
            <Card className="bg-teal-50 border-teal-200">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-teal-800">
                    {selectedForBatch.size} photo(s) selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedForBatch(new Set())}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowBatchDialog(true)}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      <Tag className="h-4 w-4 mr-2" />
                      Add Labels to Selected
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Photo Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Photos ({vesselMedia.length})</span>
                {canManageMedia && vesselMedia.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedForBatch.size === vesselMedia.length) {
                        setSelectedForBatch(new Set());
                      } else {
                        setSelectedForBatch(new Set(vesselMedia.map(m => m.id)));
                      }
                    }}
                  >
                    {selectedForBatch.size === vesselMedia.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vesselMedia.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">No photos yet</p>
                  <p className="text-sm">Upload photos to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {vesselMedia.map((media) => (
                    <div
                      key={media.id}
                      className={`relative group aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        selectedForBatch.has(media.id)
                          ? 'border-teal-500 ring-2 ring-teal-200'
                          : 'border-transparent hover:border-slate-300'
                      }`}
                    >
                      {/* Image - use thumbnail for gallery, fallback to full image */}
                      <img
                        src={media.thumb_key || media.s3_key}
                        alt={media.original_filename || 'Photo'}
                        className="w-full h-full object-cover"
                        onClick={() => setSelectedMedia(media)}
                        loading="lazy"
                      />

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-white hover:bg-white/20"
                            onClick={() => setSelectedMedia(media)}
                          >
                            <ZoomIn className="h-6 w-6" />
                          </Button>
                        </div>
                      </div>

                      {/* Selection checkbox */}
                      {canManageMedia && (
                        <button
                          className={`absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                            selectedForBatch.has(media.id)
                              ? 'bg-teal-500 border-teal-500 text-white'
                              : 'bg-white/80 border-slate-300 opacity-0 group-hover:opacity-100'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBatchSelect(media.id);
                          }}
                        >
                          {selectedForBatch.has(media.id) && <Check className="h-4 w-4" />}
                        </button>
                      )}

                      {/* Labels */}
                      {media.labels.length > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                          <div className="flex flex-wrap gap-1">
                            {media.labels.slice(0, 3).map(label => (
                              <Badge
                                key={label}
                                variant="secondary"
                                className="text-xs bg-white/80"
                              >
                                {label}
                              </Badge>
                            ))}
                            {media.labels.length > 3 && (
                              <Badge variant="secondary" className="text-xs bg-white/80">
                                +{media.labels.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Camera className="h-16 w-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium text-slate-700">Select a Vessel</p>
            <p className="text-sm text-slate-500">Choose a vessel from the dropdown to manage its photos</p>
          </CardContent>
        </Card>
      )}

      {/* Photo Detail Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          {selectedMedia && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMedia.original_filename || 'Photo'}</DialogTitle>
                <DialogDescription>
                  Uploaded {formatEuroDate(selectedMedia.uploaded_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image */}
                <div className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                  <img
                    src={selectedMedia.s3_key}
                    alt={selectedMedia.original_filename || 'Photo'}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-500">Labels</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedMedia.labels.length > 0 ? (
                        selectedMedia.labels.map(label => (
                          <Badge key={label} variant="secondary">{label}</Badge>
                        ))
                      ) : (
                        <span className="text-sm text-slate-400">No labels</span>
                      )}
                    </div>
                  </div>

                  {selectedMedia.notes && (
                    <div>
                      <Label className="text-slate-500">Notes</Label>
                      <p className="text-sm mt-1">{selectedMedia.notes}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-slate-500">Size</Label>
                      <p>{selectedMedia.width} x {selectedMedia.height}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">File Size</Label>
                      <p>{((selectedMedia.byte_size || 0) / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    {selectedMedia.taken_at && (
                      <div>
                        <Label className="text-slate-500">Taken At</Label>
                        <p>{formatEuroDate(selectedMedia.taken_at)}</p>
                      </div>
                    )}
                    {selectedMedia.geotag_lat && selectedMedia.geotag_lon && (
                      <div>
                        <Label className="text-slate-500">Location</Label>
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {selectedMedia.geotag_lat.toFixed(4)}, {selectedMedia.geotag_lon.toFixed(4)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {canManageMedia && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingMedia({ ...selectedMedia });
                      setSelectedMedia(null);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setDeleteConfirm(selectedMedia);
                      setSelectedMedia(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingMedia} onOpenChange={() => setEditingMedia(null)}>
        <DialogContent>
          {editingMedia && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Photo</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Labels (comma-separated)</Label>
                  <Input
                    value={editingMedia.labels.join(', ')}
                    onChange={(e) => setEditingMedia({
                      ...editingMedia,
                      labels: e.target.value.split(',').map(l => l.trim()).filter(l => l)
                    })}
                    placeholder="wiring, engine, installation"
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Max {MEDIA_VALIDATION.MAX_LABELS} labels, {MEDIA_VALIDATION.MAX_LABEL_LENGTH} chars each
                  </p>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={editingMedia.notes || ''}
                    onChange={(e) => setEditingMedia({
                      ...editingMedia,
                      notes: e.target.value
                    })}
                    placeholder="Add notes about this photo..."
                    className="mt-1"
                    rows={4}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Max {MEDIA_VALIDATION.MAX_NOTES_LENGTH} characters
                  </p>
                </div>

                <div>
                  <Label>Date Taken</Label>
                  <Input
                    type="datetime-local"
                    value={editingMedia.taken_at?.slice(0, 16) || ''}
                    onChange={(e) => setEditingMedia({
                      ...editingMedia,
                      taken_at: e.target.value ? new Date(e.target.value).toISOString() : undefined
                    })}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Latitude (-90 to 90)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="-90"
                      max="90"
                      value={editingMedia.geotag_lat ?? ''}
                      onChange={(e) => setEditingMedia({
                        ...editingMedia,
                        geotag_lat: e.target.value ? Number.parseFloat(e.target.value) : undefined
                      })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Longitude (-180 to 180)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="-180"
                      max="180"
                      value={editingMedia.geotag_lon ?? ''}
                      onChange={(e) => setEditingMedia({
                        ...editingMedia,
                        geotag_lon: e.target.value ? Number.parseFloat(e.target.value) : undefined
                      })}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingMedia(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} className="bg-teal-600 hover:bg-teal-700">
                  Save Changes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Delete Photo
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.original_filename}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Labels Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Labels to {selectedForBatch.size} Photos</DialogTitle>
            <DialogDescription>
              Enter labels to add to all selected photos (comma-separated)
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label>Labels</Label>
            <Input
              value={batchLabels}
              onChange={(e) => setBatchLabels(e.target.value)}
              placeholder="wiring, engine, installation"
              className="mt-1"
            />
            <div className="mt-2">
              <p className="text-xs text-slate-500 mb-2">Suggested labels:</p>
              <div className="flex flex-wrap gap-1">
                {searchLabels(batchLabels.split(',').pop()?.trim() || '').map(label => (
                  <Badge
                    key={label}
                    variant="outline"
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => {
                      const parts = batchLabels.split(',').map(l => l.trim()).filter(l => l);
                      parts.pop();
                      parts.push(label);
                      setBatchLabels(parts.join(', '));
                    }}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyBatchLabels} className="bg-teal-600 hover:bg-teal-700">
              Apply Labels
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
