# Rust Macro Expand

VS Code extension for expanding macros in Rust code. Enables macro expansion based on module, crate or any other parameters supported by the [cargo-expand](https://github.com/dtolnay/cargo-expand) crate.  

##### **Enables** reloading expanded macros on file save, saving you precious time while working with macros.

## Requirements

Requires that you have the following installed:

* [cargo-expand](https://github.com/dtolnay/cargo-expand) A cargo crate for easier handling of compiler commands
* Rust nightly compiler, you can install it with `rustup toolchain install nightly`

## Features

### Commands  

This extension offers 5 commands to handle various use cases when expanding macros in Rust code.  
The commands are as follows (long version first followed by the short version):

* `Expand Macros`, `rustex`: Expand macros in the current file. Tries to find the module in which the current file resides and expands the macros in it. If it doesn't exist defaults to crate expand.  
![feature expand](images/expand_cmd.gif)

### Quick Actions

#### Depending on the file context, the extension exposes icons next to Editor Groups
* `Expand Macros`

## Extension Settings
The following settings are available:

* `rustMacroExpand.displayWarnings`: Specifies whether or not to display warnings in the generated output. Warnings will be displayed as a multiline comment at the top of the generated output.
* `rustMacroExpand.notifyWarnings`: Specifies whether or not to display warnings as an action in a notification. After expand has been completed, if there were any warnings you will get a notification with a button which upon click will display the warnings in a spearate window.
* `rustMacroExpand.displayCargoCommand`: Specifies whether or not to display in the generated output the command sent to cargo expand.
* `rustMacroExpand.displayCargoCommandPath`: Specifies whether or not to display in the generated output the folder in which the cargo expand command was executed.
* `rustMacroExpand.displayTimestamp`: Specifies whether or not to display the timestamp in the generated output.
* `rustMacroExpand.expandOnSave`: Specifies whether or not to refresh expanded files on save.

## Contributing

Contributions of any kind are welcome and encouraged.

[GitHub Project Page](https://github.com/Odiriuss/rust-macro-expand)

## Release Notes

### 1.0.0

Initial release of Rust Macro Expand
