import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

const langKey = "rust";

/**
 * Validates if Cargo.toml exists
 * @param {vscode.TextDocument} document - The document to validate.
 * @returns {string} the path if the document is valid otherwise null
 */
export function getCrateDir(document: vscode.TextDocument): string | null {
  let cargo_toml_found = false;
  let cargo_toml_dir: string | null = null;
  let dirs = path.dirname(document.fileName).split(path.sep);

  while(true) {
    const dir = dirs.join(path.sep);
    let files = fs.readdirSync(dir);

    cargo_toml_dir = files.find((path) => path == "Cargo.toml") || null;
    if (cargo_toml_dir) {
      // add trailing slash
      cargo_toml_dir = dir + path.sep;
      cargo_toml_found = true;
      break;
    }

    if (!dirs.pop()) {
      break;
    }
  }

  if (!cargo_toml_found) {
    vscode.window.showErrorMessage(
      "🦀 No Cargo.toml was found in the workspace! 🦀"
    );
  }

  return cargo_toml_dir;
}

/**
 * Validates document uri according to passed in options
 * @param {ValidateDocumentUriOptions} options - validation options
 * @see {@link ValidationDocumentUriInput}.
 * @returns {string | null} The validated document uri or null if validation failed
 */
export function getCrateName(
  document: vscode.TextDocument,
  crate_dir: string
): string | null {
  const fileName = path.basename(document.fileName);

  const cargoContent = fs.readFileSync(path.join(crate_dir, "Cargo.toml")).toString();
  const regex = new RegExp('(?:[package](?:(?:.|\r|\n)*?)(?:name.*?=.*?"(?<cargoname>.*?)"))');
  let result = cargoContent.match(regex);

  if (result && result.groups && result.groups.cargoname) {
    return result.groups.cargoname;
  } else {
    vscode.window.showErrorMessage("🦀 Could not parse crate name from Cargo.toml! 🦀");
    return null;
  }
}

/**
 * Validates if the current document can be expanded according to passed in options
 * @param {boolean} checkLang - should the language of the document be checked
 * @returns {vscode.TextDocument} The validated document or null if validation failed
 * @see {@link vscode.TextDocument}.
 */
export function validateActiveDocument(
  checkLang?: boolean
): vscode.TextDocument | null {
  if (vscode.window.activeTextEditor) {
    const { document } = vscode.window.activeTextEditor;
    if (checkLang && document.languageId !== langKey) {
      vscode.window.showErrorMessage(
        "🦀 You can only run Rust Expand Macro in Rust (.rs) files! 🦀"
      );
      return null;
    }
    return document;
  } else {
    vscode.window.showErrorMessage(
      "🦀 Cannot expand when no active editor is available! 🦀"
    );

    return null;
  }
}

/**
 * Validates the current expand command according to passed in options
 * @param {boolean} isCrate - is the command a crate command, crate commands are treated as global, globals are
 * auto expanded if auto save is enabled
 * @returns {Promise<{source_path: string, crate_dir: string} | null>} The validation result or null if validation failed
 */
export async function getActiveDocumentInfo(isCrate?: boolean): Promise<{
  source_path: string,
  crate_dir: string
} | null> {
  const document = validateActiveDocument(true);
  if (document) {
    const doc = document as vscode.TextDocument;
    const crate_dir = await getCrateDir(doc);
    if (crate_dir) {
      const crate_name = getCrateName(doc, crate_dir);
      vscode.window.showInformationMessage(
        `🦀 Running cargo expand on: ${crate_name} 🦀`
      );
      return {
        source_path: doc.fileName,
        crate_dir: crate_dir
      };
    }
  }

  return null;
}

/**
 * Validates module path
 * @returns {string} The module string
 */
export function pathToMod(
  source_path: string,
  crate_dir: string
): string {
  let mod = source_path
    .replace(crate_dir, "")
    .replace(`src${path.sep}`, "")
    .replace(`${path.sep}mod.rs`, "")
    .replace(".rs", "")
    .replace(path.sep, "::")
    .trim();

  if (mod == "lib") {
    mod = "";
  }

  return mod;
}
