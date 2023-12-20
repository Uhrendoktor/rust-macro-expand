import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ExtensionSettings } from "./types";
import { exec } from "child_process";

export class TmpDir extends vscode.Disposable {
    private readonly dir: string;

    constructor(
        dir_name: string
    ) {
        super(() => {
            this.dispose();
        });
        this.dir = fs.mkdtempSync(path.join(os.tmpdir(), `rust-macro-expand-${dir_name}`));
    }

    create_file(
        file_name: string,
        content: string,
    ): vscode.Uri {
        fs.writeFileSync(path.join(this.dir, file_name), content);
        console.log(`🦀 Created ${path.join(this.dir, file_name)} 🦀`);
        return vscode.Uri.file(path.join(this.dir, file_name));
    }

    get path() {
        return this.dir;
    }

    dispose() {
        console.log(`🦀 Deleting ${this.dir} 🦀`);
        fs.rmSync(this.dir, { recursive: true });
    }
}

const settingsKey = "rustMacroExpand";

class FileHandle extends vscode.Disposable {
    readonly dir: TmpDir;
    readonly crate_dir: string;
    readonly command: string;
    readonly source_uri: vscode.Uri;
    readonly expanded_uri: vscode.Uri;

    constructor(
        crate_dir: string,
        command: string,
        source_uri: vscode.Uri,
        tmp_path?: string[] 
    ) {
        super(() => {
            this.dispose();
        });
        // get filename
        const file_name = path.basename(source_uri.fsPath);
        this.dir = new TmpDir(file_name);
        this.crate_dir = crate_dir;
        this.command = command;
        this.source_uri = source_uri;

        // create folders in tmp dir if defined
        if (tmp_path) {
            let tmp_dir = this.dir.path;
            tmp_path.forEach((dir) => {
                tmp_dir = path.join(tmp_dir, dir);
                fs.mkdirSync(tmp_dir);
            });
        }

        this.expanded_uri = this.dir.create_file(path.join(tmp_path?.join(path.sep) || "", file_name), "");
    }

    dispose() {
        this.dir.dispose();
    }
}

export class Handler {
    private documents: FileHandle[] = [];
    private settings: ExtensionSettings;

    onDidChangeEmitter = new vscode.EventEmitter<FileHandle>();
    onDidCloseEmitter = new vscode.EventEmitter<FileHandle>();

    constructor() {
        this.settings = vscode.workspace.getConfiguration(settingsKey) as unknown as ExtensionSettings;

        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(settingsKey)) {
                this.settings = vscode.workspace.getConfiguration(
                settingsKey
                ) as unknown as ExtensionSettings;
            }
        });

        vscode.workspace.onDidSaveTextDocument((event) => {
            if (this.settings.expandOnSave) {
                this.documentSaved(event.uri);
            }
        });

        vscode.workspace.onDidCloseTextDocument((event) => {
            this.documentClosed(event.uri);
        });
    }

    async expand(
        crate_dir: string,
        command: string,
        source_uri: vscode.Uri
    ) {
        let doc = this.documents.find((doc) => doc.source_uri.fsPath === source_uri.fsPath);
        if (!doc) {
            doc = new FileHandle(crate_dir, command, source_uri, ["src"]);
            // copy Cargo.toml to tmp dir
            let tmp_cargo_toml_path = path.join(doc.dir.path, "Cargo.toml");
            fs.copyFileSync(path.join(crate_dir, "Cargo.toml"), tmp_cargo_toml_path);

            // replace all relative paths in command with absolute paths
            let toml = fs.readFileSync(tmp_cargo_toml_path).toString();
            // replace all occurences of relative paths with absolute paths
            while(true) {
                let match = toml.match(new RegExp('path = "(?<path>[^\/~].{1,})"'));
                if (match) {
                    let mod_path = match.groups?.path;
                    if (mod_path) {
                        toml = toml.replace(mod_path, path.join(crate_dir, mod_path));
                    }
                } else {
                    break;
                }
            }

            fs.writeFileSync(tmp_cargo_toml_path, toml);
            this.documents.push(doc);

            // add cargo.toml path to settings.json of workspace (rust-analyzer.linkedProjects)
            let workspace_config = vscode.workspace.getConfiguration("rust-analyzer", doc.source_uri);
            let linked_projects = workspace_config.get<string[]>("linkedProjects") || [];
            linked_projects.push(tmp_cargo_toml_path);

            workspace_config.update("linkedProjects", linked_projects);
        }
        await this.openDocument(doc, true);
        this.onDidChangeEmitter.fire(doc);
    }

    private async openDocument(handle: FileHandle, focus: boolean) {
        let expanded_text;
        try {
            //expand and save to expanded_uri
            expanded_text = await this.execute(handle, true, true);

            let header = `// 🦀 Generated by Rust Macro Expand 🦀\r\n`;
            if (this.settings.displayTimestamp) {
                header += `// 🦀 Timestamp: ${new Date().toLocaleString()}  🦀\r\n`;
            }

            if (this.settings.displayCargoCommand) {
                header += `// 🦀 Cargo expand command: ${handle.command}  🦀\r\n`;
            }

            if (this.settings.displayCargoCommandPath) {
                header += `// 🦀 Cargo expand command was executed in: ${handle.source_uri}  🦀\r\n`;
            }

            expanded_text = header + "\r\n" + expanded_text;

            console.log(`🦀 Writing to ${handle.expanded_uri} 🦀`);
        } catch (error) {
            expanded_text = `/*\r\n🦀 Executing command failed! 🦀 \r\n*/\r\n ${error}`;
        }

        fs.writeFileSync(handle.expanded_uri.fsPath, expanded_text);

        let doc = await vscode.workspace.openTextDocument(handle.expanded_uri);
        if (focus) {
            await vscode.window.showTextDocument(doc, { preview: false });
        }
    }

    private execute(handle: FileHandle, includeError: boolean, notifyWarnings: boolean) {
        const self = this;
        return new Promise<string>(function (resolve, reject) {
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    cancellable: false,
                    title: "🦀 Expanding macros 🦀",
                },
                async (progress) => {
                    try {
                        const result = await self.executeCommand(handle);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    private async executeCommand(handle: FileHandle): Promise<string>{
        return new Promise<string>((resolve, reject) =>{
            exec(
                handle.command,
                {
                    cwd: handle.crate_dir,
                },
                function (error, standardOutput, standardError) {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(standardOutput);
                }
            );
        });
    }

    private documentSaved(uri: vscode.Uri) {
        let doc = this.documents.find((doc) => doc.source_uri.fsPath === uri.fsPath);
        if (doc) {
            this.openDocument(doc, true);
            this.onDidChangeEmitter.fire(doc);
        }
    }

    private documentClosed(uri: vscode.Uri) {
        let doc = this.documents.find((doc) => doc.source_uri.fsPath === uri.fsPath);
        if (doc) {
            // close window
            vscode.workspace.textDocuments.forEach((editor) => {
                if (editor.uri.fsPath === doc?.expanded_uri.fsPath) {
                    vscode.window.showTextDocument(editor).then((_) => {
                        vscode.commands.executeCommand("workbench.action.closeActiveEditor");
                    });
                }
            });

            this.documents = this.documents.filter((doc) => doc.source_uri.fsPath !== uri.fsPath);

            // remove cargo.toml path from settings.json of workspace (rust-analyzer.linkedProjects)
            let workspace_config = vscode.workspace.getConfiguration("rust-analyzer", doc.source_uri);
            let linked_projects = workspace_config.get<string[]>("linkedProjects") || [];
            let tmp_cargo_toml_path = path.join(doc.dir.path, "Cargo.toml")
            linked_projects = linked_projects.filter((cargo_toml_path) => cargo_toml_path !== tmp_cargo_toml_path);

            workspace_config.update("linkedProjects", linked_projects);

            this.onDidCloseEmitter.fire(doc);
            doc.dispose();
        }
    }
}

