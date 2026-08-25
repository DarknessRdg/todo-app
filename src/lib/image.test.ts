import { describe, expect, it } from "vitest";

import {
  ImageSizeLimit,
  firstImageFile,
  fitsImageSizeLimit,
  readImageDataUrl,
} from "@/lib/image";

/** A file of a given size, without holding that many bytes in the spec. */
function makeFile(type: string, bytes = 8, name = "shot.png"): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: bytes });
  return file;
}

describe("image files", () => {
  describe("when a paste carries files", () => {
    it("Then the first picture among them is the one taken", () => {
      const picture = makeFile("image/png");

      expect(
        firstImageFile([makeFile("text/plain", 8, "notes.txt"), picture])
      ).toBe(picture);
    });

    it("Then files that are not pictures are passed over", () => {
      expect(firstImageFile([makeFile("application/pdf", 8, "a.pdf")])).toBe(
        null
      );
    });

    it("Then carrying no files at all is not a picture either", () => {
      expect(firstImageFile(null)).toBe(null);
      expect(firstImageFile([])).toBe(null);
    });
  });

  describe("when a picture is weighed against the limit", () => {
    it("Then one at the limit is still allowed", () => {
      expect(fitsImageSizeLimit(makeFile("image/png", ImageSizeLimit))).toBe(
        true
      );
    });

    it("Then one over it is not", () => {
      expect(
        fitsImageSizeLimit(makeFile("image/png", ImageSizeLimit + 1))
      ).toBe(false);
    });
  });

  it("when a picture is read, Then it comes back as a data url the document can carry", async () => {
    const url = await readImageDataUrl(makeFile("image/png"));

    expect(url.startsWith("data:image/png;base64,")).toBe(true);
  });
});
