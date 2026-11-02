import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "../..");
export const assetManifest = JSON.parse(fs.readFileSync(path.join(root, "public/asset-manifest.json"), "utf8"));
export const defaultTranslations = JSON.parse(fs.readFileSync(path.join(root, "public/translations/en.json"), "utf8"));
export const languages = JSON.parse(fs.readFileSync(path.join(root, "public/languages.json"), "utf8"));

export function jsonForScript(value) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
