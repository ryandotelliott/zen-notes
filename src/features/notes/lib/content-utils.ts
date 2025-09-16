export function computePreviewText(contentText: string): string {
  return contentText.substring(0, 50).trim();
}
