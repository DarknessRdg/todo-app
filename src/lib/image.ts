/**
 * Pictures pasted or dropped into a description.
 *
 * There is no server to upload to — the app is the browser and IndexedDB — so
 * a picture is carried *inside* the todo, as a data url in its own markdown.
 * That is the whole reason for a size limit: the picture is re-read and
 * re-written with every edit of that todo, and a screenshot pasted without a
 * second thought is a few megabytes of base64 riding along forever.
 */

/**
 * The biggest picture the app will swallow, in bytes before encoding — base64
 * makes it roughly a third larger again. Two megabytes covers a full-screen
 * screenshot on a retina display, which is the thing people actually paste.
 */
export const ImageSizeLimit = 2 * 1024 * 1024;

/** Whether the browser calls this file a picture. */
function isImage(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * The picture among whatever a paste or a drop carried, if there is one. A
 * clipboard can hold several files and a screenshot arrives beside plain text
 * and html, so the first picture is what is wanted rather than the first file.
 */
export function firstImageFile(
  files: readonly File[] | FileList | null | undefined
): File | null {
  if (files === null || files === undefined) return null;

  for (const file of Array.from(files)) {
    if (isImage(file)) return file;
  }
  return null;
}

/** Whether a picture is small enough to live inside a todo. */
export function fitsImageSizeLimit(file: File): boolean {
  return file.size <= ImageSizeLimit;
}

/** Reads a picture into the data url the document stores it as. */
export function readImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("the picture could not be read"));

    reader.readAsDataURL(file);
  });
}
