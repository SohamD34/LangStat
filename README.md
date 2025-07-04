Attempt to create a VS Code Extension that mimics GitHub's language statistics for the current open directory.

## Features
- Displays the language statistics of the current directory in a tree view.
- Shows the following statistics:
    - Number of files for each language
    - Total lines of code for each language
    - Total size of files for each language
    - Percentage of each language in the total codebase
- Support for 50 languages and frameworks.

## Demo

<div style="display: flex; gap: 16px; align-items: flex-start;">
    <img src="static/logo.png" alt="Extension Logo" style="height: 250px;">
    <img src="static/ext.png" alt="Extension Interface" style="height: 250px;">
</div>

## Try it Out

1. Clone the repository:
   ```bash
   git clone https://github.com/SohamD34/LangStat.git
   ```
2. Install the dependencies:
   ```bash
   cd LangStat
   npm install
   ```
3. Open the project in Visual Studio Code:
   ```bash
   code .
   ```
4. Press `F5` to start the extension development host.

## Usage

1. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
2. Type `LangStat: Show Language Statistics` and select it.
3. The language statistics will be displayed in a tree view in the sidebar.

## Install the Extension

1. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
2. Type ```Extensions: Install from VSIX``` and select it.
3. Select the VSIX file provided and click ```Install```.
