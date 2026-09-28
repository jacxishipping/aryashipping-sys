type PdfCanvasGlobalName = 'DOMMatrix' | 'DOMPoint' | 'DOMRect' | 'ImageData' | 'Path2D';

type PdfCanvasGlobals = Record<PdfCanvasGlobalName, unknown>;

let loaded = false;

export async function ensurePdfNodePolyfills() {
  if (loaded) return;

  const globals = globalThis as unknown as PdfCanvasGlobals;
  const canvas = await import('@napi-rs/canvas');

  const polyfills: Record<PdfCanvasGlobalName, unknown> = {
    DOMMatrix: canvas.DOMMatrix,
    DOMPoint: canvas.DOMPoint,
    DOMRect: canvas.DOMRect,
    ImageData: canvas.ImageData,
    Path2D: canvas.Path2D,
  };

  for (const [name, value] of Object.entries(polyfills) as Array<[PdfCanvasGlobalName, unknown]>) {
    globals[name] ??= value;
  }

  loaded = true;
}
