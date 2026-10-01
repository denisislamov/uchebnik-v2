#!/usr/bin/env node
// Read-only coverage report for original textbook illustrations.
const fs = require("node:fs");
const path = require("node:path");

function optionsFrom(argv) {
  const options = {
    root: path.resolve(__dirname, ".."),
    json: false,
    check: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") options.json = true;
    else if (arg === "--check") options.check = true;
    else if (arg === "--root" && argv[i + 1])
      options.root = path.resolve(argv[++i]);
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  return options;
}

function svgFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, item.name);
    if (item.isDirectory()) files.push(...svgFiles(full));
    else if (item.isFile() && item.name.toLowerCase().endsWith(".svg"))
      files.push(full);
  }
  return files.sort();
}

function reportFor(root) {
  const originals = JSON.parse(
    fs.readFileSync(path.join(root, "textbook/data/assets.json"), "utf8"),
  );
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "assets/book2/manifest.json"), "utf8"),
  );
  const removedPath = path.join(root, "assets/book2/removed.json");
  const removed = fs.existsSync(removedPath)
    ? JSON.parse(fs.readFileSync(removedPath, "utf8"))
    : [];
  if (!Array.isArray(originals) || !Array.isArray(manifest) || !Array.isArray(removed)) {
    throw new Error("Original registry, revised manifest and removed list must be arrays");
  }

  const errors = [];
  const originalsById = new Map();
  for (const asset of originals) {
    if (!asset || typeof asset.id !== "string" || !asset.id) {
      errors.push("invalid original asset ID");
    } else if (originalsById.has(asset.id)) {
      errors.push(`duplicate original ID: ${asset.id}`);
    } else {
      originalsById.set(asset.id, asset);
    }
  }

  const rasterClaims = new Map();
  for (const item of manifest) {
    if (!item || typeof item.id !== "string" || !item.id) {
      errors.push("invalid raster manifest ID");
      continue;
    }
    rasterClaims.set(item.id, (rasterClaims.get(item.id) || 0) + 1);
  }

  const book2 = path.join(root, "assets/book2");
  const validRaster = new Set();
  for (const id of [...rasterClaims.keys()].sort()) {
    const count = rasterClaims.get(id);
    if (count > 1) errors.push(`duplicate raster ID: ${id}`);
    if (!originalsById.has(id)) errors.push(`unknown raster ID: ${id}`);
    const filenames = [`${id}.png`, `${id}@2x.png`];
    const exists = filenames.map((name) => {
      try {
        return fs.statSync(path.join(book2, name)).isFile();
      } catch {
        return false;
      }
    });
    filenames.forEach((name, i) => {
      if (!exists[i]) errors.push(`missing raster file: ${name}`);
    });
    if (count === 1 && originalsById.has(id) && exists.every(Boolean))
      validRaster.add(id);
  }

  const vectorClaims = new Map();
  for (const file of svgFiles(path.join(book2, "vector"))) {
    const id = path.basename(file, path.extname(file));
    vectorClaims.set(id, (vectorClaims.get(id) || 0) + 1);
  }
  const validVector = new Set();
  for (const id of [...vectorClaims.keys()].sort()) {
    if (vectorClaims.get(id) > 1) errors.push(`duplicate vector ID: ${id}`);
    if (!originalsById.has(id)) errors.push(`unknown vector ID: ${id}`);
    if (vectorClaims.get(id) === 1 && originalsById.has(id))
      validVector.add(id);
  }

  for (const id of [...rasterClaims.keys()].sort()) {
    if (vectorClaims.has(id)) {
      errors.push(`raster and vector both claim ID: ${id}`);
      validRaster.delete(id);
      validVector.delete(id);
    }
  }

  const removedIds = new Set();
  for (const item of removed) {
    const id = item && item.id;
    if (typeof id !== "string" || !id) {
      errors.push("invalid removed ID");
      continue;
    }
    if (!originalsById.has(id)) errors.push(`unknown removed ID: ${id}`);
    if (removedIds.has(id)) errors.push(`duplicate removed ID: ${id}`);
    if (validRaster.has(id) || validVector.has(id))
      errors.push(`removed ID also has revised asset: ${id}`);
    if (originalsById.has(id)) removedIds.add(id);
  }

  const completeIds = [...new Set([...validRaster, ...validVector, ...removedIds])].sort();
  const complete = new Set(completeIds);
  const remainingByPage = {};
  for (const id of [...originalsById.keys()].sort()) {
    if (complete.has(id)) continue;
    const source = originalsById.get(id);
    const page = Number.isInteger(source.page)
      ? source.page
      : Number.parseInt(id.slice(1, 4), 10);
    const key = String(page).padStart(3, "0");
    (remainingByPage[key] ||= []).push(id);
  }
  const sortedPages = Object.fromEntries(
    Object.entries(remainingByPage).sort(([a], [b]) => a.localeCompare(b)),
  );
  return {
    totalOriginal: originalsById.size,
    revisedRasterIds: [...validRaster].sort(),
    revisedVectorIds: [...validVector].sort(),
    removedIds: [...removedIds].sort(),
    completeIds,
    remainingCount: originalsById.size - completeIds.length,
    remainingByPage: sortedPages,
    errors: errors.sort(),
  };
}

function humanReport(report) {
  const lines = [
    `Original: ${report.totalOriginal}`,
    `Revised raster: ${report.revisedRasterIds.length}`,
    `Revised vector: ${report.revisedVectorIds.length}`,
    `Removed by design: ${report.removedIds.length}`,
    `Complete: ${report.completeIds.length}`,
    `Remaining: ${report.remainingCount}`,
  ];
  for (const [page, ids] of Object.entries(report.remainingByPage)) {
    lines.push(`Page ${page} (${ids.length}): ${ids.join(", ")}`);
  }
  for (const error of report.errors) lines.push(`Error: ${error}`);
  return lines.join("\n") + "\n";
}

try {
  const options = optionsFrom(process.argv.slice(2));
  const report = reportFor(options.root);
  process.stdout.write(
    options.json ? `${JSON.stringify(report, null, 2)}\n` : humanReport(report),
  );
  if (options.check && report.errors.length) process.exitCode = 1;
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 2;
}
