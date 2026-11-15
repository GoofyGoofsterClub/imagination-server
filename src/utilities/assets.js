import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "../..");
export const DEFAULT_LANGUAGE = "en";

function readJsonFile(file) {
    try {
        return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
    } catch (error) {
        if (error.code === "ENOENT")
            throw new Error(`${file} not found - run a build first.`);
        throw new Error(`Failed to read ${file}: ${error.message}`);
    }
}

export const assetManifest = readJsonFile("public/asset-manifest.json");
export const defaultTranslations = readJsonFile(`public/translations/${DEFAULT_LANGUAGE}.json`);
export const languages = readJsonFile("public/languages.json");

export function jsonForScript(value) { return JSON.stringify(value).replace(/</g, "\\u003c"); }