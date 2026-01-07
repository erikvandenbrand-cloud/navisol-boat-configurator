/**
 * EXIF Metadata Extraction Utility
 * Extracts metadata from uploaded images including date taken, GPS coordinates, and camera info
 */

// EXIF tag constants
const EXIF_TAGS = {
  // Image tags
  ImageWidth: 0x0100,
  ImageHeight: 0x0101,
  Make: 0x010f,
  Model: 0x0110,
  Orientation: 0x0112,
  DateTime: 0x0132,

  // EXIF SubIFD tags
  DateTimeOriginal: 0x9003,
  DateTimeDigitized: 0x9004,

  // GPS tags
  GPSLatitudeRef: 0x0001,
  GPSLatitude: 0x0002,
  GPSLongitudeRef: 0x0003,
  GPSLongitude: 0x0004,
  GPSAltitudeRef: 0x0005,
  GPSAltitude: 0x0006,
};

export interface ExifData {
  // Date/Time
  dateTaken?: string; // ISO-8601 format

  // GPS
  latitude?: number;
  longitude?: number;
  altitude?: number;

  // Camera
  make?: string;
  model?: string;

  // Image
  width?: number;
  height?: number;
  orientation?: number;
}

/**
 * Extract EXIF data from an image file
 */
export async function extractExifData(file: File): Promise<ExifData> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result || typeof result === 'string') {
        resolve({});
        return;
      }

      try {
        const exifData = parseExif(new DataView(result));
        resolve(exifData);
      } catch (error) {
        console.warn('EXIF parsing failed:', error);
        resolve({});
      }
    };

    reader.onerror = () => {
      resolve({});
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse EXIF data from ArrayBuffer
 */
function parseExif(dataView: DataView): ExifData {
  const exifData: ExifData = {};

  // Check for JPEG marker
  if (dataView.getUint16(0) !== 0xffd8) {
    return exifData; // Not a JPEG
  }

  let offset = 2;
  const length = dataView.byteLength;

  while (offset < length) {
    if (dataView.getUint8(offset) !== 0xff) {
      offset++;
      continue;
    }

    const marker = dataView.getUint8(offset + 1);

    // APP1 marker (EXIF data)
    if (marker === 0xe1) {
      const app1Length = dataView.getUint16(offset + 2);

      // Check for "Exif\0\0" header
      if (
        dataView.getUint32(offset + 4) === 0x45786966 && // "Exif"
        dataView.getUint16(offset + 8) === 0x0000
      ) {
        const tiffOffset = offset + 10;
        parseExifData(dataView, tiffOffset, exifData);
      }

      offset += 2 + app1Length;
    } else if (marker === 0xd9 || marker === 0xda) {
      // End of image or start of scan
      break;
    } else {
      // Skip other markers
      if (offset + 3 < length) {
        const markerLength = dataView.getUint16(offset + 2);
        offset += 2 + markerLength;
      } else {
        break;
      }
    }
  }

  return exifData;
}

/**
 * Parse EXIF IFD data
 */
function parseExifData(dataView: DataView, tiffOffset: number, exifData: ExifData): void {
  // Check byte order
  const byteOrder = dataView.getUint16(tiffOffset);
  const littleEndian = byteOrder === 0x4949; // "II" = Intel = little-endian

  // Verify TIFF marker
  if (dataView.getUint16(tiffOffset + 2, littleEndian) !== 0x002a) {
    return;
  }

  // Get first IFD offset
  const firstIFDOffset = dataView.getUint32(tiffOffset + 4, littleEndian);
  const ifdOffset = tiffOffset + firstIFDOffset;

  // Parse IFD0 (main image tags)
  const result = parseIFD(dataView, ifdOffset, tiffOffset, littleEndian);

  // Check for EXIF SubIFD
  if (result.exifIFDPointer) {
    parseIFD(dataView, tiffOffset + result.exifIFDPointer, tiffOffset, littleEndian, exifData);
  }

  // Check for GPS IFD
  if (result.gpsIFDPointer) {
    parseGPSData(dataView, tiffOffset + result.gpsIFDPointer, tiffOffset, littleEndian, exifData);
  }

  // Apply IFD0 data
  if (result.make) exifData.make = result.make;
  if (result.model) exifData.model = result.model;
  if (result.dateTime) exifData.dateTaken = parseExifDate(result.dateTime);
  if (result.orientation) exifData.orientation = result.orientation;
}

interface IFDResult {
  make?: string;
  model?: string;
  dateTime?: string;
  orientation?: number;
  exifIFDPointer?: number;
  gpsIFDPointer?: number;
}

/**
 * Parse an IFD (Image File Directory)
 */
function parseIFD(
  dataView: DataView,
  ifdOffset: number,
  tiffOffset: number,
  littleEndian: boolean,
  exifData?: ExifData
): IFDResult {
  const result: IFDResult = {};

  if (ifdOffset >= dataView.byteLength - 2) return result;

  const numEntries = dataView.getUint16(ifdOffset, littleEndian);

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    if (entryOffset + 12 > dataView.byteLength) break;

    const tag = dataView.getUint16(entryOffset, littleEndian);
    const type = dataView.getUint16(entryOffset + 2, littleEndian);
    const count = dataView.getUint32(entryOffset + 4, littleEndian);
    const valueOffset = entryOffset + 8;

    switch (tag) {
      case 0x010f: // Make
        result.make = readString(dataView, valueOffset, tiffOffset, count, littleEndian);
        break;
      case 0x0110: // Model
        result.model = readString(dataView, valueOffset, tiffOffset, count, littleEndian);
        break;
      case 0x0112: // Orientation
        result.orientation = dataView.getUint16(valueOffset, littleEndian);
        break;
      case 0x0132: // DateTime
        result.dateTime = readString(dataView, valueOffset, tiffOffset, count, littleEndian);
        break;
      case 0x8769: // EXIF IFD Pointer
        result.exifIFDPointer = dataView.getUint32(valueOffset, littleEndian);
        break;
      case 0x8825: // GPS IFD Pointer
        result.gpsIFDPointer = dataView.getUint32(valueOffset, littleEndian);
        break;
      case 0x9003: // DateTimeOriginal (in EXIF SubIFD)
        if (exifData) {
          const dateStr = readString(dataView, valueOffset, tiffOffset, count, littleEndian);
          if (dateStr) {
            exifData.dateTaken = parseExifDate(dateStr);
          }
        }
        break;
    }
  }

  return result;
}

/**
 * Parse GPS data from GPS IFD
 */
function parseGPSData(
  dataView: DataView,
  gpsOffset: number,
  tiffOffset: number,
  littleEndian: boolean,
  exifData: ExifData
): void {
  if (gpsOffset >= dataView.byteLength - 2) return;

  const numEntries = dataView.getUint16(gpsOffset, littleEndian);

  let latRef = 'N';
  let lonRef = 'E';
  let latValues: number[] = [];
  let lonValues: number[] = [];

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = gpsOffset + 2 + i * 12;
    if (entryOffset + 12 > dataView.byteLength) break;

    const tag = dataView.getUint16(entryOffset, littleEndian);
    const type = dataView.getUint16(entryOffset + 2, littleEndian);
    const count = dataView.getUint32(entryOffset + 4, littleEndian);
    const valueOffset = entryOffset + 8;

    switch (tag) {
      case 0x0001: // GPSLatitudeRef
        latRef = String.fromCharCode(dataView.getUint8(valueOffset));
        break;
      case 0x0002: // GPSLatitude
        latValues = readRationals(dataView, valueOffset, tiffOffset, 3, littleEndian);
        break;
      case 0x0003: // GPSLongitudeRef
        lonRef = String.fromCharCode(dataView.getUint8(valueOffset));
        break;
      case 0x0004: // GPSLongitude
        lonValues = readRationals(dataView, valueOffset, tiffOffset, 3, littleEndian);
        break;
      case 0x0006: // GPSAltitude
        const altValues = readRationals(dataView, valueOffset, tiffOffset, 1, littleEndian);
        if (altValues.length > 0) {
          exifData.altitude = altValues[0];
        }
        break;
    }
  }

  // Convert GPS coordinates to decimal degrees
  if (latValues.length === 3) {
    let lat = latValues[0] + latValues[1] / 60 + latValues[2] / 3600;
    if (latRef === 'S') lat = -lat;
    exifData.latitude = Math.round(lat * 1000000) / 1000000;
  }

  if (lonValues.length === 3) {
    let lon = lonValues[0] + lonValues[1] / 60 + lonValues[2] / 3600;
    if (lonRef === 'W') lon = -lon;
    exifData.longitude = Math.round(lon * 1000000) / 1000000;
  }
}

/**
 * Read a string value from EXIF data
 */
function readString(
  dataView: DataView,
  valueOffset: number,
  tiffOffset: number,
  count: number,
  littleEndian: boolean
): string {
  let offset = valueOffset;

  // If count > 4, the value is a pointer
  if (count > 4) {
    offset = tiffOffset + dataView.getUint32(valueOffset, littleEndian);
  }

  if (offset + count > dataView.byteLength) return '';

  let str = '';
  for (let i = 0; i < count - 1; i++) {
    const char = dataView.getUint8(offset + i);
    if (char === 0) break;
    str += String.fromCharCode(char);
  }

  return str.trim();
}

/**
 * Read rational values (fractions) from EXIF data
 */
function readRationals(
  dataView: DataView,
  valueOffset: number,
  tiffOffset: number,
  count: number,
  littleEndian: boolean
): number[] {
  // Rationals are always pointed to (8 bytes each)
  const offset = tiffOffset + dataView.getUint32(valueOffset, littleEndian);

  if (offset + count * 8 > dataView.byteLength) return [];

  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const numerator = dataView.getUint32(offset + i * 8, littleEndian);
    const denominator = dataView.getUint32(offset + i * 8 + 4, littleEndian);
    values.push(denominator !== 0 ? numerator / denominator : 0);
  }

  return values;
}

/**
 * Parse EXIF date string to ISO-8601
 */
function parseExifDate(dateStr: string): string {
  // EXIF date format: "YYYY:MM:DD HH:MM:SS"
  const match = dateStr.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }
  return dateStr;
}

/**
 * Get image dimensions from file
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Create a thumbnail from an image file
 */
export async function createThumbnail(
  file: File,
  maxSize: number = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate thumbnail dimensions
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to base64
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      resolve(thumbnail);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Extract all metadata from an image file (EXIF + dimensions + thumbnail)
 */
export async function extractImageMetadata(file: File): Promise<{
  exif: ExifData;
  dimensions: { width: number; height: number };
  thumbnail?: string;
}> {
  const [exif, dimensions, thumbnail] = await Promise.all([
    extractExifData(file),
    getImageDimensions(file),
    createThumbnail(file, 200).catch(() => undefined),
  ]);

  return {
    exif: {
      ...exif,
      width: dimensions.width,
      height: dimensions.height,
    },
    dimensions,
    thumbnail,
  };
}
