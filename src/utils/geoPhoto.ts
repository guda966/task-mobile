import { Platform } from 'react-native';

export type PickedImage = {
  fileName: string;
  sizeLabel: string;
  dataUrl: string;
};

export type GeoPosition = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  capturedAt: string;
};

export type PickImageMode = 'camera' | 'gallery';

/** Pick a photo and return a preview data URL (web) or mock preview (native demo). */
export function pickImageWithPreview(mode: PickImageMode = 'camera'): Promise<PickedImage> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp,image/*';
      if (mode === 'camera') {
        input.capture = 'environment';
      }
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error('No photo selected.'));
          return;
        }
        if (!file.type.startsWith('image/')) {
          reject(new Error('Please choose an image file.'));
          return;
        }
        if (file.size > 2.5 * 1024 * 1024) {
          reject(new Error('Photo must be under 2.5 MB for this demo upload.'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            fileName: file.name,
            sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
            dataUrl: String(reader.result || ''),
          });
        };
        reader.onerror = () => reject(new Error('Unable to read photo.'));
        reader.readAsDataURL(file);
      };
      input.oncancel = () => reject(new Error('Cancelled'));
      input.click();
    });
  }

  const stamp = Date.now().toString().slice(-5);
  const label = mode === 'camera' ? 'Retake' : 'Reupload';
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">
      <rect fill="#0F6E6E" width="100%" height="100%"/>
      <text x="50%" y="48%" fill="#fff" font-size="28" text-anchor="middle" font-family="sans-serif">Class photo</text>
      <text x="50%" y="58%" fill="#D7EEEE" font-size="16" text-anchor="middle" font-family="sans-serif">${label} demo ${stamp}</text>
    </svg>`,
  );
  return Promise.resolve({
    fileName: `class_photo_${stamp}.jpg`,
    sizeLabel: '180 KB',
    dataUrl: `data:image/svg+xml;charset=utf-8,${svg}`,
  });
}

/**
 * Capture device GPS. Required for My attendance — only geo-tagged photos are accepted.
 */
export function getCurrentPosition(): Promise<GeoPosition> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            accuracyMeters: pos.coords.accuracy
              ? Math.round(pos.coords.accuracy)
              : undefined,
            capturedAt: new Date().toISOString(),
          });
        },
        (err) => {
          reject(
            new Error(
              err.code === 1
                ? 'Location permission denied. Only geo-tagged photos are considered — allow location access.'
                : 'Unable to read GPS. Only geo-tagged photos are considered — try again outdoors or check permissions.',
            ),
          );
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }

  // Hyderabad demo fallback for native / unsupported environments.
  return Promise.resolve({
    latitude: 17.4065,
    longitude: 78.4772,
    accuracyMeters: 25,
    capturedAt: new Date().toISOString(),
  });
}

export function mapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
