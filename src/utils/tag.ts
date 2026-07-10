export function tagToSlug(tag: string): string {
  return tag.replace(/#/g, 'sharp');
}
