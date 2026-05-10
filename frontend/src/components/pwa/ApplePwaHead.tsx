/**
 * iOS splash / startup image (not fully expressible via Metadata API alone).
 */
export function ApplePwaHead() {
  return (
    <link rel="apple-touch-startup-image" href="/icon-512.png" media="(orientation: portrait)" />
  );
}
