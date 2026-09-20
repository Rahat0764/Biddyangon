// jsPDF's addImage needs to know the actual encoding — passing 'JPEG' for a
// PNG (or vice versa) silently produces a broken/blank image in the PDF.
// Institute logos are commonly uploaded as PNG (for transparency), so this
// was a real bug: every non-JPEG logo broke every marksheet and receipt.
export function detectImageFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
}
