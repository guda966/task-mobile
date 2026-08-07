import { Platform } from 'react-native';

/** Mock file picker — stores metadata only (no real upload backend yet). */
export function pickMockDocument(
  accept = '.pdf,.doc,.docx,.png,.jpg',
): Promise<{ fileName: string; sizeLabel: string }> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error('No file selected.'));
          return;
        }
        resolve({
          fileName: file.name,
          sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
        });
      };
      input.oncancel = () => reject(new Error('Cancelled'));
      input.click();
    });
  }

  const stamp = Date.now().toString().slice(-5);
  return Promise.resolve({
    fileName: `document_${stamp}.pdf`,
    sizeLabel: '240 KB',
  });
}
