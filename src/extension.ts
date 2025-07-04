import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface LanguageStats {
    [language: string]: {
        files: number;
        lines: number;
        bytes: number;
        percentage: number;
    };
}

interface FileInfo {
    extension: string;
    lines: number;
    bytes: number;
}

class LanguageStatsProvider implements vscode.TreeDataProvider<StatsItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<StatsItem | undefined | null | void> = new vscode.EventEmitter<StatsItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<StatsItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private stats: LanguageStats = {};
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    refresh(): void {
        this.analyzeWorkspace();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: StatsItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: StatsItem): Thenable<StatsItem[]> {
        if (!element) {
            // Root level - show language statistics
            const items: StatsItem[] = [];
            
            if (Object.keys(this.stats).length === 0) {
                const noStatsItem = new StatsItem('No statistics available. Click "Analyze Workspace" to generate stats.', '', vscode.TreeItemCollapsibleState.None);
                noStatsItem.iconPath = new vscode.ThemeIcon('info', new vscode.ThemeColor('charts.foreground'));
                return Promise.resolve([noStatsItem]);
            }

            const sortedLanguages = Object.entries(this.stats)
                .sort(([,a], [,b]) => b.percentage - a.percentage);

            for (const [language, data] of sortedLanguages) {
                const label = `${language}`;
                const description = `${data.percentage.toFixed(1)}% • ${data.files} files • ${data.lines.toLocaleString()} lines`;
                const item = new StatsItem(label, description, vscode.TreeItemCollapsibleState.Collapsed, language);
                
                // Set language-specific icon and color
                const iconInfo = this.getLanguageIcon(language);
                if (iconInfo.iconPath) {
                    item.iconPath = iconInfo.iconPath;
                } else {
                    item.iconPath = new vscode.ThemeIcon(iconInfo.icon, new vscode.ThemeColor(iconInfo.color));
                }
                
                items.push(item);
            }

            return Promise.resolve(items);
        } else if (element.language) {
            // Show details for a specific language
            const data = this.stats[element.language];
            const items: StatsItem[] = [
                new StatsItem(`Files: ${data.files}`, '', vscode.TreeItemCollapsibleState.None),
                new StatsItem(`Lines: ${data.lines.toLocaleString()}`, '', vscode.TreeItemCollapsibleState.None),
                new StatsItem(`Size: ${this.formatBytes(data.bytes)}`, '', vscode.TreeItemCollapsibleState.None),
                new StatsItem(`Percentage: ${data.percentage.toFixed(2)}%`, '', vscode.TreeItemCollapsibleState.None)
            ];
            
            // Add colored icons for detail items
            items[0].iconPath = new vscode.ThemeIcon('folder', new vscode.ThemeColor('charts.blue'));
            items[1].iconPath = new vscode.ThemeIcon('symbol-ruler', new vscode.ThemeColor('charts.green'));
            items[2].iconPath = new vscode.ThemeIcon('database', new vscode.ThemeColor('charts.purple'));
            items[3].iconPath = new vscode.ThemeIcon('pie-chart', new vscode.ThemeColor('charts.orange'));
            
            return Promise.resolve(items);
        }

        return Promise.resolve([]);
    }

    private getLanguageIcon(language: string): { icon: string, color: string, iconPath?: vscode.Uri } {
        const iconMap: { [key: string]: { icon: string, color: string, iconPath?: vscode.Uri } } = {
            'JavaScript': { icon: 'symbol-function', color: 'charts.yellow' },
            'TypeScript': { icon: 'symbol-class', color: 'charts.blue' },
            'Python': { icon: 'symbol-function', color: 'charts.green' },
            'Java': { icon: 'symbol-class', color: 'charts.red' },
            'C++': { icon: 'symbol-structure', color: 'charts.blue' },
            'C': { icon: 'symbol-structure', color: 'charts.blue' },
            'C#': { icon: 'symbol-class', color: 'charts.purple' },
            'Go': { icon: 'symbol-function', color: 'charts.cyan' },
            'Rust': { icon: 'gear', color: 'charts.orange' },
            'PHP': { icon: 'symbol-function', color: 'charts.purple' },
            'Ruby': { icon: 'ruby', color: 'charts.red' },
            'Swift': { icon: 'symbol-class', color: 'charts.orange' },
            'Kotlin': { icon: 'symbol-class', color: 'charts.purple' },
            'Scala': { icon: 'symbol-class', color: 'charts.red' },
            'HTML': { icon: 'code', color: 'charts.orange' },
            'CSS': { icon: 'symbol-color', color: 'charts.blue' },
            'SCSS': { icon: 'symbol-color', color: 'charts.pink' },
            'Sass': { icon: 'symbol-color', color: 'charts.pink' },
            'Less': { icon: 'symbol-color', color: 'charts.blue' },
            'Vue': { icon: 'symbol-structure', color: 'charts.green' },
            'Svelte': { icon: 'symbol-structure', color: 'charts.orange' },
            'React': { icon: 'symbol-structure', color: 'charts.cyan' },
            'JSON': { icon: 'symbol-object', color: 'charts.yellow' },
            'YAML': { icon: 'symbol-array', color: 'charts.red' },
            'XML': { icon: 'gear', color: 'charts.green' },
            'SQL': { icon: 'database', color: 'charts.blue' },
            'Shell': { icon: 'terminal', color: 'charts.green' },
            'Bash': { icon: 'terminal', color: 'charts.green' },
            'PowerShell': { icon: 'terminal', color: 'charts.blue' },
            'R': { icon: 'graph', color: 'charts.blue' },
            'MATLAB': { icon: 'graph', color: 'charts.orange' },
            'Perl': { icon: 'symbol-function', color: 'charts.blue' },
            'Lua': { icon: 'symbol-function', color: 'charts.blue' },
            'Dart': { icon: 'symbol-class', color: 'charts.cyan' },
            'Elm': { icon: 'symbol-function', color: 'charts.blue' },
            'Haskell': { icon: 'symbol-function', color: 'charts.purple' },
            'Clojure': { icon: 'symbol-function', color: 'charts.green' },
            'F#': { icon: 'symbol-function', color: 'charts.blue' },
            'Erlang': { icon: 'symbol-function', color: 'charts.red' },
            'Elixir': { icon: 'symbol-function', color: 'charts.purple' },
            'Crystal': { icon: 'symbol-structure', color: 'charts.cyan' },
            'Nim': { icon: 'symbol-function', color: 'charts.yellow' },
            'Julia': { icon: 'symbol-function', color: 'charts.purple' },
            'Zig': { icon: 'symbol-structure', color: 'charts.orange' }
        };

        return iconMap[language] || { icon: 'symbol-file', color: 'charts.foreground' };
    }

    private analyzeWorkspace(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showWarningMessage('No workspace folder is open');
            return;
        }

        this.stats = {};
        const fileStats: { [extension: string]: FileInfo[] } = {};

        // Analyze each workspace folder
        for (const folder of workspaceFolders) {
            this.analyzeDirectory(folder.uri.fsPath, fileStats);
        }

        // Calculate statistics
        this.calculateStats(fileStats);
    }

    private analyzeDirectory(dirPath: string, fileStats: { [extension: string]: FileInfo[] }): void {
        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stat = fs.statSync(fullPath);

                // Skip hidden files, node_modules, .git, etc.
                if (item.startsWith('.') || item === 'node_modules' || item === '__pycache__') {
                    continue;
                }

                if (stat.isDirectory()) {
                    this.analyzeDirectory(fullPath, fileStats);
                } else if (stat.isFile()) {
                    const extension = path.extname(item).toLowerCase();
                    if (extension && this.isCodeFile(extension)) {
                        const lines = this.countLines(fullPath);
                        const bytes = stat.size;

                        if (!fileStats[extension]) {
                            fileStats[extension] = [];
                        }

                        fileStats[extension].push({
                            extension,
                            lines,
                            bytes
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`Error analyzing directory ${dirPath}:`, error);
        }
    }

    private isCodeFile(extension: string): boolean {
        const codeExtensions = [
            '.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte',
            '.py', '.pyx', '.pyi',
            '.java', '.kt', '.scala',
            '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp',
            '.cs', '.fs', '.vb',
            '.rb', '.php', '.swift', '.go', '.rs',
            '.html', '.htm', '.xml', '.xhtml',
            '.css', '.scss', '.sass', '.less', '.styl',
            '.json', '.yaml', '.yml', '.toml',
            '.sql', '.sh', '.bash', '.zsh', '.fish',
            '.r', '.m', '.pl', '.lua', '.dart', '.elm',
            '.clj', '.cljs', '.ex', '.exs', '.erl', '.hrl',
            '.hs', '.lhs', '.ml', '.mli', '.ocaml',
            '.nim', '.cr', '.jl', '.zig', '.odin'
        ];
        return codeExtensions.includes(extension);
    }

    private countLines(filePath: string): number {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return content.split('\n').length;
        } catch (error) {
            return 0;
        }
    }

    private calculateStats(fileStats: { [extension: string]: FileInfo[] }): void {
        const languageMap: { [extension: string]: string } = {
            '.js': 'JavaScript',
            '.ts': 'TypeScript',
            '.jsx': 'JavaScript',
            '.tsx': 'TypeScript',
            '.vue': 'Vue',
            '.svelte': 'Svelte',
            '.py': 'Python',
            '.pyx': 'Python',
            '.pyi': 'Python',
            '.java': 'Java',
            '.kt': 'Kotlin',
            '.scala': 'Scala',
            '.cpp': 'C++',
            '.cc': 'C++',
            '.cxx': 'C++',
            '.c': 'C',
            '.h': 'C/C++',
            '.hpp': 'C++',
            '.cs': 'C#',
            '.fs': 'F#',
            '.vb': 'Visual Basic',
            '.rb': 'Ruby',
            '.php': 'PHP',
            '.swift': 'Swift',
            '.go': 'Go',
            '.rs': 'Rust',
            '.html': 'HTML',
            '.htm': 'HTML',
            '.xml': 'XML',
            '.xhtml': 'XHTML',
            '.css': 'CSS',
            '.scss': 'SCSS',
            '.sass': 'Sass',
            '.less': 'Less',
            '.styl': 'Stylus',
            '.json': 'JSON',
            '.yaml': 'YAML',
            '.yml': 'YAML',
            '.toml': 'TOML',
            '.sql': 'SQL',
            '.sh': 'Shell',
            '.bash': 'Bash',
            '.zsh': 'Zsh',
            '.fish': 'Fish',
            '.r': 'R',
            '.m': 'MATLAB',
            '.pl': 'Perl',
            '.lua': 'Lua',
            '.dart': 'Dart',
            '.elm': 'Elm'
        };

        // Calculate totals
        let totalLines = 0;
        let totalBytes = 0;

        for (const [extension, files] of Object.entries(fileStats)) {
            const language = languageMap[extension] || extension.substring(1).toUpperCase();
            
            const stats = files.reduce((acc, file) => ({
                files: acc.files + 1,
                lines: acc.lines + file.lines,
                bytes: acc.bytes + file.bytes
            }), { files: 0, lines: 0, bytes: 0 });

            if (!this.stats[language]) {
                this.stats[language] = { files: 0, lines: 0, bytes: 0, percentage: 0 };
            }

            this.stats[language].files += stats.files;
            this.stats[language].lines += stats.lines;
            this.stats[language].bytes += stats.bytes;

            totalLines += stats.lines;
            totalBytes += stats.bytes;
        }

        // Calculate percentages
        for (const language of Object.keys(this.stats)) {
            this.stats[language].percentage = totalLines > 0 ? (this.stats[language].lines / totalLines) * 100 : 0;
        }
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    public getStats(): LanguageStats {
        return this.stats;
    }
}

class StatsItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly language?: string
    ) {
        super(label, collapsibleState);
        this.description = description;
        this.contextValue = language ? 'language' : 'stat';
        
        // Add tooltip for better UX
        if (language) {
            this.tooltip = `${language} - Click to expand details`;
        } else if (description) {
            this.tooltip = description;
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    const provider = new LanguageStatsProvider(context);
    const treeView = vscode.window.createTreeView('languageStats', { 
        treeDataProvider: provider,
        showCollapseAll: true
    });

    // Register commands
    const refreshCommand = vscode.commands.registerCommand('languageStats.refresh', () => {
        provider.refresh();
        vscode.window.showInformationMessage('🔄 Language statistics refreshed!');
    });

    const analyzeCommand = vscode.commands.registerCommand('languageStats.analyze', () => {
        provider.refresh();
        vscode.window.showInformationMessage('📊 Workspace analysis complete!');
    });

    // Add a command to show summary
    const summaryCommand = vscode.commands.registerCommand('languageStats.showSummary', () => {
        const stats = provider.getStats();
        if (Object.keys(stats).length === 0) {
            vscode.window.showInformationMessage('No language statistics available. Analyze your workspace first!');
            return;
        }

        const total = Object.values(stats).reduce((sum, lang) => sum + lang.lines, 0);
        const topLanguages = Object.entries(stats)
            .sort(([,a], [,b]) => b.percentage - a.percentage)
            .slice(0, 5)
            .map(([lang, data]) => `${lang}: ${data.percentage.toFixed(1)}%`)
            .join(', ');

        vscode.window.showInformationMessage(
            `📈 Workspace Summary: ${total.toLocaleString()} total lines | Top languages: ${topLanguages}`
        );
    });

    context.subscriptions.push(treeView, refreshCommand, analyzeCommand, summaryCommand);

    // Initial analysis
    provider.refresh();
}

export function deactivate() {}