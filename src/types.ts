import * as vscode from "vscode";

/**
 * Interface for extensions settings. These settings are exposed to the user.
 *
 * @interface
 */
export interface ExtensionSettings {
  /**
   * Specifies whether or not to display in the generated output the command sent to cargo expand.
   */
  displayCargoCommand: boolean;
  /**
   * Specifies whether or not to display in the generated output the folder in which the cargo expand command was executed.
   */
  displayCargoCommandPath: boolean;
  /**
   * Specifies whether or not to display the timestamp in the generated output.
   */
  displayTimestamp: boolean;
  /**
   * Specifies whether or not to display warnings in the generated output.
   * Warnings will be displayed as a multiline comment at the top of the generated output.
   */
  displayWarnings: boolean;
  /**
   * Specifies whether or not to display warnings as an action in a notification.
   * After expand has been completed, if there were any warnings you will get a notification with a button which upon click will
   * display the warnings in a spearate window.
   */
  notifyWarnings: boolean;
  /**
   * Specifies whether or not to refresh expanded files on save.
   */
  expandOnSave: boolean;
}

/**
 * Interface for command handlers.
 *
 * @interface
 */
export interface CommandHandler {
  /**
   * The name of the command it handles
   */
  commandName: string;
  /**
   * The function which gets called on vs code callback
   * @see {@link vscode.commands.registerCommand}.
   */
  command: () => Promise<void>;
}
