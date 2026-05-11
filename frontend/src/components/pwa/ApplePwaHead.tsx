/**
 * iOS splash / startup image (not fully expressible via Metadata API alone).
 */
export function ApplePwaHead() {
  return (
    <link rel="apple-touch-startup-image" href="/web-app-manifest-512x512.png" media="(orientation: portrait)" />
  );
}
