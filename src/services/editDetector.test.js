import { scanMetadata } from "./editDetector";

function details(text) {
  return scanMetadata(text).signals.map((signal) => signal.detail);
}

test("finds editing software named in XMP", () => {
  const xmp = '<x:xmpmeta><xmp:CreatorTool>Adobe Photoshop 25.0 (Macintosh)</xmp:CreatorTool></x:xmpmeta>';
  const { signals, hasMetadata } = scanMetadata(xmp);
  expect(hasMetadata).toBe(true);
  expect(signals).toContainEqual(
    expect.objectContaining({ kind: "edit", strength: "strong", detail: "Adobe Photoshop" }),
  );
});

test("does not mistake 'Canvas' for Canva", () => {
  expect(details("HTMLCanvasElement")).not.toContain("Canva");
  expect(details("Software\0Canva\0")).toContain("Canva");
});

test("does not treat the IPTC 'Photoshop 3.0' header as an edit", () => {
  expect(details("Photoshop 3.0\u00008BIM")).toEqual([]);
});

test("separates AI edits from fully AI-generated tags", () => {
  const base = "http://cv.iptc.org/newscodes/digitalsourcetype/";
  expect(details(`${base}compositeWithTrainedAlgorithmicMedia`)).toEqual([
    "Edited with generative AI (IPTC source tag)",
  ]);
  expect(details(`${base}trainedAlgorithmicMedia`)).toEqual([
    "AI-generated (IPTC source tag)",
  ]);
});

test("reads the generator from a C2PA manifest", () => {
  const manifest =
    "jumb\0c2pa\0claim_generator\0ChatGPT\0digitalSourceType\0http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia";
  const ai = scanMetadata(manifest).signals.filter((signal) => signal.kind === "ai");
  expect(ai.map((signal) => signal.detail)).toEqual([
    "AI-generated (IPTC source tag)",
    "ChatGPT",
  ]);
});

test("reports camera files without editing traces as clean", () => {
  const { signals, hasMetadata } = scanMetadata("Exif\0\0Apple iPhone 15 Pro");
  expect(hasMetadata).toBe(true);
  expect(signals).toEqual([]);
});
