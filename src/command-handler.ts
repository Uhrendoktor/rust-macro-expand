import * as vscode from "vscode";
import { CommandHandler } from "./types";
import {
  getActiveDocumentInfo,
  pathToMod,
} from "./command-validator";
import { Handler } from "./macro-file-provider";

/** Base cargo-expand command */
const cargoComand = "cargo expand --silent";
/** Available extension commands */
const commands = {
  expand: "rust-macro-expand.expand"
};

/** Macro text provider instance */
export const handler = new Handler();

/**
 * Command handler for {@link commands.expand} command
 *
 * Expand macros in the current file. Tries to find the module in which the current file resides and expands the macros
 * in it. If it doesn't exist defaults to crate expand.
 */
export const expandHandler: CommandHandler = {
  commandName: commands.expand,
  command: async () => {
    const {
      source_path,
      crate_dir
    } = await getActiveDocumentInfo() || {};
    if (source_path && crate_dir) {
      const mod = await pathToMod(source_path, crate_dir);
      await handler.expand(
        crate_dir,
        `${cargoComand} ${mod}`,
        vscode.Uri.file(source_path)
      );
    }
  },
};