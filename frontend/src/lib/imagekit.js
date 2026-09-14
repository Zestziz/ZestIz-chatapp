// Chat media is stored on ImageKit, so we optimize delivery on the fly via URL
// transformations instead of shipping the full-resolution originals.
// https://imagekit.io/docs/image-transformation

export function isImageKitUrl(url) {
  return typeof url === "string" && url.includes("ik.imagekit.io");
}

/** Append a `tr` query param to an ImageKit URL (no-op for other URLs). */
export function withTransform(url, transform) {
  if (!isImageKitUrl(url)) return url;
  const [path, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.set("tr", transform);
  return `${path}?${params.toString()}`;
}

/**
 * Returns optimized media URL based on usage:
 * - 'avatar': 80x80, WebP, quality 75
 * - 'thumbnail': 400px width, WebP
 */
export function getOptimizedMediaUrl(url, type = 'thumbnail') {
  if (!isImageKitUrl(url)) return url;

  const transform = type === 'avatar'
    ? 'tr=w-80,h-80,q-75,f-webp,fo-auto'
    : 'tr=w-400,f-webp,fo-auto';

  // Use the new withTransform to handle the URL + tr params logic
  return withTransform(url, transform.replace('tr=', ''));
}
