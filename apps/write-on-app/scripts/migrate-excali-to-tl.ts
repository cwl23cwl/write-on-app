#!/usr/bin/env ts-node

/**
 * Optional migration shim to translate a subset of legacy canvas scenes to TLDraw snapshots.
 *
 * Usage:
 *   pnpm ts-node scripts/migrate-excali-to-tl.ts input.json [output.json]
 *
 * Supported element mappings:
 *   - rectangle  -> TL geo rectangle
 *   - ellipse    -> TL geo ellipse
 *   - text       -> TL text shape
 *
 * All other element types are skipped. The output is a best-effort TLDraw
 * snapshot that can be manually imported and refined.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { nanoid } from "nanoid";

type ExLegacyElement = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  strokeColor?: string;
  backgroundColor?: string;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
};

type LegacyScene = {
  elements?: ExLegacyElement[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
};

if (process.argv.length < 3) {
  console.error("Usage: pnpm ts-node scripts/migrate-excali-to-tl.ts <input.json> [output.json]");
  process.exit(1);
}

const inputPath = resolve(process.argv[2]);
const outputPath = resolve(process.argv[3] ?? inputPath.replace(/\.json$/i, "-tl.json"));

const raw = readFileSync(inputPath, "utf8");
const legacyScene = JSON.parse(raw) as LegacyScene;

const TL_PAGE_ID = `page:${nanoid(8)}`;
const TL_DOCUMENT_ID = `doc:${nanoid(8)}`;

type TLShape = {
  id: string;
  type: string;
  parentId: string;
  index: string;
  typeName: "shape";
  x: number;
  y: number;
  rotation: number;
  meta: Record<string, unknown>;
  props: Record<string, unknown>;
};

const tlShapes: TLShape[] = [];

const pushShape = (shape: TLShape | null | undefined): void => {
  if (shape) {
    tlShapes.push(shape);
  }
};

const buildShapeIndex = (): string => {
  const base = "a".charCodeAt(0);
  const offset = tlShapes.length % 26;
  const repeat = Math.floor(tlShapes.length / 26);
  return String.fromCharCode(base + offset).repeat(Math.max(1, repeat + 1));
};

const toColor = (value: string | undefined): string =>
  value ?? "#1f2937"; // slate-800 fallback

const mapRectangle = (element: ExLegacyElement): TLShape => ({
  id: `shape:${element.id}`,
  type: "geo",
  typeName: "shape",
  parentId: TL_PAGE_ID,
  index: buildShapeIndex(),
  x: element.x,
  y: element.y,
  rotation: element.angle ?? 0,
  meta: {},
  props: {
    geo: "rectangle",
    w: element.width,
    h: element.height,
    color: toColor(element.strokeColor),
    fill: element.backgroundColor ? "solid" : "none",
    dash: "draw",
    size: "m",
    opacity: 1,
    font: "draw",
    align: "start",
    growY: 0,
  },
});

const mapEllipse = (element: ExLegacyElement): TLShape => ({
  id: `shape:${element.id}`,
  type: "geo",
  typeName: "shape",
  parentId: TL_PAGE_ID,
  index: buildShapeIndex(),
  x: element.x,
  y: element.y,
  rotation: element.angle ?? 0,
  meta: {},
  props: {
    geo: "ellipse",
    w: element.width,
    h: element.height,
    color: toColor(element.strokeColor),
    fill: element.backgroundColor ? "solid" : "none",
    dash: "draw",
    size: "m",
    opacity: 1,
    font: "draw",
    align: "middle",
    growY: 0,
  },
});

const mapText = (element: ExLegacyElement): TLShape => ({
  id: `shape:${element.id}`,
  type: "text",
  typeName: "shape",
  parentId: TL_PAGE_ID,
  index: buildShapeIndex(),
  x: element.x,
  y: element.y,
  rotation: element.angle ?? 0,
  meta: {},
  props: {
    text: element.text ?? "",
    color: toColor(element.strokeColor),
    size: element.fontSize ?? 24,
    font: element.fontFamily ?? "Open Sans, sans-serif",
    align: "start",
    autoSize: true,
  },
});

for (const element of legacyScene.elements ?? []) {
  switch (element.type) {
    case "rectangle":
      pushShape(mapRectangle(element));
      break;
    case "ellipse":
      pushShape(mapEllipse(element));
      break;
    case "text":
      pushShape(mapText(element));
      break;
    default:
      // Unsupported legacy element types are skipped but logged for manual review.
      console.warn(`[migrate-excali-to-tl] Skipping unsupported element type "${element.type}" (id: ${element.id})`);
  }
}

const snapshot = {
  meta: {
    migratedFrom: "legacy-canvas",
    migratedAt: new Date().toISOString(),
    notes: "Best-effort conversion. Review shapes in TLDraw before using in production.",
  },
  document: {
    id: TL_DOCUMENT_ID,
    name: "Migrated Scene",
    pageIds: [TL_PAGE_ID],
    pageStates: {
      [TL_PAGE_ID]: {
        id: TL_PAGE_ID,
        name: "Page 1",
        bindingIds: [],
        camera: { x: 0, y: 0, z: 1 },
      },
    },
  },
  page: {
    id: TL_PAGE_ID,
    shapeIds: tlShapes.map((shape) => shape.id),
    bindings: {},
  },
  shapes: Object.fromEntries(tlShapes.map((shape) => [shape.id, shape])),
};

writeFileSync(outputPath, JSON.stringify(snapshot, null, 2));

console.log(
  `[migrate-excali-to-tl] Migrated ${tlShapes.length} shapes from ${inputPath} -> ${outputPath}. Review manually for accuracy.`,
);
