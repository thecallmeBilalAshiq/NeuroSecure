/**
 * Patches `HTMLCanvasElement.prototype.getContext` so that any 2D context
 * is created with `willReadFrequently: true` by default.
 *
 * Why: face-api.js (and TensorFlow.js) repeatedly call `getImageData(...)`
 * for face detection / pixel reads. When the underlying 2D context wasn't
 * created with the `willReadFrequently` hint, modern Chromium prints:
 *
 *   "Canvas2D: Multiple readback operations using getImageData are faster
 *    with the willReadFrequently attribute set to true."
 *
 * face-api.js internally calls `canvas.getContext("2d")` without options,
 * so we monkey-patch the prototype once (idempotent) to opt every 2D
 * context into the read-friendly path. Existing callers that explicitly
 * pass options keep their options intact.
 */

interface PatchableHTMLCanvasElement extends HTMLCanvasElement {
  __nsCanvasPatched?: boolean;
}

const PATCH_FLAG = "__nsCanvasPatched" as const;

export function ensureCanvas2dWillReadFrequently(): void {
  if (typeof HTMLCanvasElement === "undefined") return;
  const proto = HTMLCanvasElement.prototype as unknown as Record<
    string,
    unknown
  >;
  if (proto[PATCH_FLAG] === true) return;

  const original = HTMLCanvasElement.prototype.getContext;
  if (typeof original !== "function") return;

  type GetContextFn = HTMLCanvasElement["getContext"];

  const patched: GetContextFn = function patchedGetContext(
    this: HTMLCanvasElement,
    contextId: string,
    options?: CanvasRenderingContext2DSettings
  ) {
    if (contextId === "2d") {
      const merged: CanvasRenderingContext2DSettings = {
        willReadFrequently: true,
        ...(options ?? {}),
      };
      return (original as (
        id: string,
        opts?: CanvasRenderingContext2DSettings
      ) => RenderingContext | null).call(this, contextId, merged);
    }
    return (original as (
      id: string,
      opts?: unknown
    ) => RenderingContext | null).call(this, contextId, options);
  } as GetContextFn;

  HTMLCanvasElement.prototype.getContext = patched;
  (HTMLCanvasElement.prototype as PatchableHTMLCanvasElement)[PATCH_FLAG] =
    true;
}

ensureCanvas2dWillReadFrequently();
