import * as vscode from "vscode";
import {
  expandHandler
} from "./command-handler";

//Entry point for the extension
export function activate({ subscriptions }: vscode.ExtensionContext) {
  //Register out command handlers
  subscriptions.push(
    vscode.commands.registerCommand(expandHandler.commandName, expandHandler.command)
  );
}
