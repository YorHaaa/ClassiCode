import * as vscode from 'vscode';
import * as path from 'path';
import { CommentNode, FileNode, EmptyCommentNode } from './CommentNode';
import { loadCommentsFromJson } from '../utils/fileUtils';
import { CommentsData } from '../utils/fileUtils';
import { javaColor, pythonColor, pharoColor, javaEmoji, pythonEmoji, pharoEmoji } from '../ui/color';

export class FileTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private commentData: CommentsData = {};
  private filter: string | null = null;
  private sortBy: string | null = null;
  private selectedFile: string | null = null;
  private currentPanel: vscode.WebviewPanel | undefined = undefined;

  setSelectedFile(filePath: string | null): void {
    this.selectedFile = filePath;
    this._onDidChangeTreeData.fire(); // Refresh the view
    console.log('Selected file:', this.selectedFile);
    }


  constructor(private jsonFilePath: string) {
    this.loadData();

    vscode.workspace.onDidOpenTextDocument((document) => {
      const filePath = document.uri.fsPath;
      if (this.hasCommentsForFile(filePath)) {
        this._onDidChangeTreeData.fire();
      }
    });

    vscode.window.onDidChangeActiveTextEditor(editor => {
      this.setSelectedFile(editor ? editor.document.fileName : null);
  });

  }

  setFilter(filter: string | null): void {
    this.filter = filter;
    this._onDidChangeTreeData.fire();
  }

  setSortBy(sortBy: string | null): void {
    this.sortBy = sortBy;
    this._onDidChangeTreeData.fire();
  }

  refresh(): void {
    this.loadData().then(() => this._onDidChangeTreeData.fire());
  }

  private async loadData(): Promise<void> {
    this.commentData = await loadCommentsFromJson(this.jsonFilePath);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (!element) {
      
      const updateAllButton = new vscode.TreeItem("Update All Files", vscode.TreeItemCollapsibleState.None);
            updateAllButton.iconPath = new vscode.ThemeIcon("symbol-keyword");
            updateAllButton.tooltip = "Classify all files for comments";
            updateAllButton.command = {
              command: 'commentClassifier.updateClassifyOfAllFiles',
              title: 'Update  Comments Classify of All Files',
              arguments: [false]
            };
      
      const classifyAllButton = new vscode.TreeItem("All Files", vscode.TreeItemCollapsibleState.None);
            classifyAllButton.iconPath = new vscode.ThemeIcon("symbol-keyword");
            classifyAllButton.tooltip = "Classify all files for comments";
            classifyAllButton.command = {
              command: 'commentClassifier.classifyAllFiles',
              title: 'Execute Comments Classify of All Files',
              arguments: [false]
            };
      
      const classifyCurrentButton = new vscode.TreeItem("Current File", vscode.TreeItemCollapsibleState.None);
            classifyCurrentButton.iconPath = new vscode.ThemeIcon("symbol-keyword");
            classifyCurrentButton.tooltip = "Classify current file for comments";
            classifyCurrentButton.command = {
              command: 'commentClassifier.classifyCurrentFile',
              title: 'Execute Comments Classify of Current file',
              arguments: [false]
            };
      
      const overallVisualizationButton = new vscode.TreeItem("All Files", vscode.TreeItemCollapsibleState.None);
            overallVisualizationButton.iconPath = new vscode.ThemeIcon("graph");
            overallVisualizationButton.tooltip = "Show overall visualization of all files";
            overallVisualizationButton.command = {
              command: 'commentVisualization.showChart',
              title: 'Overall Visualization',
              arguments: [false]
            };
      
      const currentVisualizationButton = new vscode.TreeItem("Current File", vscode.TreeItemCollapsibleState.None);
            currentVisualizationButton.iconPath = new vscode.ThemeIcon("graph");
            currentVisualizationButton.tooltip = "Show visualization for the current file";
            currentVisualizationButton.command = {
              command: 'commentVisualization.showChart',
              title: 'Show File Visualization',
              arguments: [true]
            };

      const workspaceNodes = await this.getWorkspaceRootNodes();
      return [classifyAllButton,classifyCurrentButton,updateAllButton,overallVisualizationButton,currentVisualizationButton, ...workspaceNodes];
    }

    if (element instanceof FileNode) {
      if (element.isDirectory) {
        return this.buildFileTree(element.filePath);
      } else {
        return this.getFileChildren(element.filePath);
      }
    }

    return [];
  }

  private async getFileChildren(filePath: string): Promise<vscode.TreeItem[]> {
    console.log('Getting comments for:', filePath);
    const comments = this.commentData[filePath] || [];

    // Ensure each comment has an absolutePath property
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const processedComments = comments.map(comment => ({
        ...comment,
        absolutePath: workspaceFolder ? path.join(workspaceFolder, comment.relativePath) : filePath
    }));


    const filteredComments = this.filter
      ? processedComments.filter(comment => comment.type.includes(this.filter!))
      : processedComments;

    const sortedComments = this.sortBy
      ? this.sortComments(filteredComments, this.sortBy)
      : filteredComments;

    return sortedComments.length > 0
      ? sortedComments.map(comment => new CommentNode(comment))
      : [new EmptyCommentNode(filePath)];
}

  private sortComments(comments: any[], sortBy: string): any[] {
    return comments.sort((a, b) => {
      switch (sortBy) {
        case 'lineNumber':
          return a.lineNumber[0] - b.lineNumber[0];
        // case 'type':
        //   return a.type.localeCompare(b.type);
        // case 'alphabetical':
        //   return a.content.localeCompare(b.content);
        case 'commit timestamp':
          if (!a.lastCommitDate || !b.lastCommitDate) {
            vscode.window.showErrorMessage('Last commit date not available for sorting.');
            return 0;
          }
          return a.lastCommitDate.localeCompare(b.lastCommitDate);
        default:
          return 0;
      }
    });
  }

  private async getWorkspaceRootNodes(): Promise<FileNode[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return [];
    }

    const nodes: FileNode[] = [];
    for (const folder of workspaceFolders) {
      try {
        const rootUri = folder.uri;
        const rootPath = rootUri.fsPath;
        const hasComments = this.hasCommentsInPath(rootPath);
        const rootNode = new FileNode(
          rootPath,
          hasComments,
          true,
          vscode.TreeItemCollapsibleState.Collapsed
        );
        rootNode.iconPath = vscode.ThemeIcon.Folder;
        rootNode.description = `Workspace: ${path.basename(rootPath)}`;
        nodes.push(rootNode);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to load workspace: ${error}`);
      }
    }
    return nodes;
  }

  private async buildFileTree(currentPath: string): Promise<FileNode[]> {
    try {
      const dirContents = await vscode.workspace.fs.readDirectory(vscode.Uri.file(currentPath));
      const nodes: FileNode[] = [];

      for (const [name, fileType] of dirContents) {
        const fullPath = path.join(currentPath, name);

        if (this.shouldSkipEntry(name, fileType)) {
          continue;
        }

        const isDirectory = fileType === vscode.FileType.Directory;
        const hasComments = isDirectory
          ? this.hasCommentsInPath(fullPath)
          : this.hasCommentsForFile(fullPath);

        // If it's a directory, check if it contains only one subdirectory (ignore files)
        if (isDirectory) {
          const mergedPath = await this.getMergedPath(fullPath);
          if (mergedPath) {
            const mergedNode = new FileNode(
              mergedPath.fullPath,
              this.hasCommentsInPath(mergedPath.fullPath),
              true,
              vscode.TreeItemCollapsibleState.Collapsed
            );

            mergedNode.iconPath = vscode.ThemeIcon.Folder;
            mergedNode.description = `${mergedPath.displayPath}/`;
            nodes.push(mergedNode);
            continue;
          }
        }

        // If no merging is needed, add the node as usual
        const node = new FileNode(
          fullPath,
          hasComments,
          isDirectory,
          isDirectory
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.Collapsed
        );

        if (isDirectory) {
          node.iconPath = vscode.ThemeIcon.Folder;
          node.description = `${path.basename(fullPath)}/`;
        } else {
          node.iconPath = hasComments
            ? new vscode.ThemeIcon('file-code', new vscode.ThemeColor('activityBar.foreground'))
            : vscode.ThemeIcon.File;
        }

        nodes.push(node);
      }

      return nodes.sort((a, b) => {
        const aIsDir = a.isDirectory ? 0 : 1;
        const bIsDir = b.isDirectory ? 0 : 1;
        return aIsDir - bIsDir || a.filePath.localeCompare(b.filePath);
      });

    } catch (error) {
      vscode.window.showErrorMessage(`Directory read failed: ${error}`);
      return [];
    }
  }

  private async getMergedPath(currentPath: string): Promise<{ fullPath: string; displayPath: string } | null> {
    const dirContents = await vscode.workspace.fs.readDirectory(vscode.Uri.file(currentPath));
    const validContents = dirContents.filter(([name, type]) => !this.shouldSkipEntry(name, type));

    const subDirs = validContents.filter(([_, type]) => type === vscode.FileType.Directory);

    if (subDirs.length === 1) {
      const [subDirName] = subDirs[0];
      const subDirPath = path.join(currentPath, subDirName);

      const nestedMergedPath = await this.getMergedPath(subDirPath);
      if (nestedMergedPath) {
        return {
          fullPath: nestedMergedPath.fullPath,
          displayPath: `${path.basename(currentPath)}/${nestedMergedPath.displayPath}`,
        };
      }

      return {
        fullPath: subDirPath,
        displayPath: `${path.basename(currentPath)}/${subDirName}`,
      };
    }

    return null;
  }

  private shouldSkipEntry(name: string, fileType: vscode.FileType): boolean {
    const config = vscode.workspace.getConfiguration('codeCommentExplorer');
    const ignorePatterns = [
      ...(config.get<string[]>('ignorePatterns') || []),
      '^\\.',
      'node_modules',
      'dist',
      'build'
    ];

    // Skip directories that match ignore patterns
    if (fileType === vscode.FileType.Directory) {
      return ignorePatterns.some(pattern => {
        const regex = new RegExp(pattern);
        return regex.test(name);
      });
    }

    // Skip files that do not have the allowed extensions
    const allowedExtensions = ['.java', '.py', '.st'];
    const fileExtension = path.extname(name).toLowerCase();
    return !allowedExtensions.includes(fileExtension);
  }

  private hasCommentsInPath(targetPath: string): boolean {
    const normalizedTarget = path.normalize(targetPath).toLowerCase() + path.sep;
    return Object.keys(this.commentData).some(filePath => {
      const normalizedFile = path.normalize(filePath).toLowerCase();
      return normalizedFile.startsWith(normalizedTarget);
    });
  }

  public hasCommentsForFile(filePath: string): boolean {
    console.log('Checking for comments in:', filePath);
    return this.commentData[filePath] && this.commentData[filePath].length > 0;
  }

  public async showChart(isOneFile:boolean): Promise<void> {
    const fileToVisualize = this.selectedFile || vscode.window.activeTextEditor?.document.fileName || null;
    if(isOneFile && !fileToVisualize) {
        vscode.window.showErrorMessage('No file has been opened before for visualization.');
        return;
    }
    const comments = (fileToVisualize && isOneFile)
        ? this.commentData[fileToVisualize] || []
        : Object.values(this.commentData).flat();

    const commentCounts: { [type: string]: number } = {};
    comments.forEach(comment => {
        comment.type.forEach((type: string) => {
            commentCounts[type] = (commentCounts[type] || 0) + 1;
        });
    });
    const viewColumn = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;
    const panelTitle = (isOneFile && fileToVisualize) ? `Comment Visualization - ${path.basename(fileToVisualize)}` : 'Overall Comment Visualization';

    if(isOneFile && fileToVisualize) {
      const panel = vscode.window.createWebviewPanel(
          'commentVisualization',
          panelTitle,
          { viewColumn: viewColumn, preserveFocus: true },
          {
              enableScripts: true,
              retainContextWhenHidden: true
          }
      );

      panel.webview.html = this.getBarChartHtml(commentCounts, panelTitle);
    } else {
      if (this.currentPanel) {
        // If a panel is already open, update its content
        this.currentPanel.webview.html = this.getBarChartHtml(commentCounts, panelTitle);
        this.currentPanel.reveal(viewColumn); // Open in the second column
    } else {
        // Otherwise, create a new panel
        this.currentPanel = vscode.window.createWebviewPanel(
            'commentVisualization',
            panelTitle,
            { viewColumn: viewColumn, preserveFocus: true },
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.currentPanel.webview.html = this.getBarChartHtml(commentCounts, panelTitle);

        // Handle panel disposal
        this.currentPanel.onDidDispose(() => {
            this.currentPanel = undefined;
        });
    }
    }
  }

  private getLanguageFromFile(filePath: string): 'java' | 'python' | 'pharo' {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.java':
            return 'java';
        case '.py':
            return 'python';
        case '.st': // Assuming Pharo uses .st files
            return 'pharo';
        default:
            return 'java'; // Default to Java or adjust as needed
    }
}


private getBarChartHtml(commentCounts: { [type: string]: number }, title: string): string {
    const types = Object.keys(commentCounts);
    const counts = Object.values(commentCounts);
    const language = 'java'; // This should be dynamic based on actual file


    function getColorForType(language: 'java' | 'python' | 'pharo', type: string): string {
        const colorMap = {
            'java': javaColor,
            'python': pythonColor,
            'pharo': pharoColor
        };
        return colorMap[language]?.[type as keyof typeof colorMap[typeof language]] || '#8884d8';
    }

    function getIconForType(language: string, type: string): string {
        const iconMap = {
            'java': javaEmoji,
            'python': pythonEmoji,
            'pharo': pharoEmoji
        };
        const languageMap = iconMap[language as 'java' | 'python' | 'pharo'];
        return languageMap && type in languageMap ? languageMap[type as keyof typeof languageMap] : "⚪";
    }
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
                overflow: hidden;
            }
            .chart-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
                height: 100%;
                width: 100%;
                max-width: 800px;
                min-width: 100px;
                margin: 0 auto;
                box-sizing: border-box;
                box-shadow: 0 0 0 1px rgba(0,0,0,0.1) when at max-width;
            }
            #chart-svg-container {
                width: 100%;
                height: calc(100% - 60px);
                min-height: 300px;
                max-height: 600px;  /* Add max-height if needed */
                overflow: visible;
            }
            .chart-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
            }
            .chart-title {
                font-size: 18px;
                font-weight: 600;
                white-space: nowrap;
            }
            .chart-options {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            button, select {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 5px 10px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                white-space: nowrap;
            }
            button:hover, select:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            .bar:hover {
                opacity: 0.8;
                transform: scaleX(1.02);
                transition: all 0.2s ease;
            }
            .pie-arc:hover {
                opacity: 0.8;
                stroke: white;
                stroke-width: 2px;
                transition: all 0.2s ease;
            }
            .axis-label {
                font-size: 12px;
                font-family: inherit;
                fill: var(--vscode-editor-foreground);
            }
            .axis line {
                stroke: var(--vscode-editorWidget-border);
            }
            .axis path {
                stroke: var(--vscode-editorWidget-border);
            }
            .axis text {
                fill: var(--vscode-editor-foreground);
            }
            #chart-svg-container {
                width: 100%;
                height: calc(100% - 60px);
                min-height: 300px;
                overflow: visible;
            }
            svg {
                width: 100%;
                height: 100%;
                overflow: visible;
            }
            .tooltip {
                position: absolute;
                padding: 8px;
                background: var(--vscode-editorWidget-background);
                border: 1px solid var(--vscode-editorWidget-border);
                border-radius: 4px;
                pointer-events: none;
                font-size: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
            .legend-item {
                display: flex;
                align-items: center;
                margin: 5px 0;
                cursor: pointer;
                font-size: 12px;
            }
            .legend-color {
                width: 15px;
                height: 15px;
                margin-right: 8px;
                border-radius: 3px;
                flex-shrink: 0;
            }
            .legend-text {
                font-size: 12px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            @media (max-width: 600px) {
                .chart-header {
                    flex-direction: column;
                    align-items: flex-start;
                }
                .chart-options {
                    width: 100%;
                }
                button, select {
                    flex-grow: 1;
                }
            }
        </style>
    </head>
    <body>
        <div class="chart-container">
            <div class="chart-header">
                <div class="chart-title">${title}</div>
                <div class="chart-options">
                    <select onchange="changeChartType(this.value)">
                        <option value="bar">Bar Chart</option>
                        <option value="pie">Pie Chart</option>
                    </select>
                </div>
            </div>
            <div id="chart-svg-container">
                <svg preserveAspectRatio="xMinYMin meet" viewBox="0 0 800 500"></svg>
            </div>
            <div id="tooltip" class="tooltip" style="display: none;"></div>
            <div id="legend" style="display: none;"></div>
        </div>
        <script src="https://d3js.org/d3.v7.min.js"></script>
        <script>
            let data = ${JSON.stringify(
                types.map((type, i) => ({
                    type,
                    count: counts[i],
                    color: getColorForType(language, type),
                    icon: getIconForType(language, type)
                }))
            )};
            
            let sortDescending = false;
            let currentChartType = 'bar';
            const baseWidth = 800;
            const baseHeight = 500;
            const baseMargin = { top: 40, right: 30, bottom: 100, left: 120 };
            const baseRadius = Math.min(baseWidth, baseHeight) / 3;
            
            const svg = d3.select("svg");
            const container = d3.select("#chart-svg-container");
            const tooltip = d3.select("#tooltip");
            const legend = d3.select("#legend");
            
            // Calculate dynamic dimensions based on container size
            // In your script section, modify the getDimensions function:
            function getDimensions() {
                const containerWidth = Math.min(
                    container.node().getBoundingClientRect().width,
                    1100  // Match this with your CSS max-width
                );
                const containerHeight = container.node().getBoundingClientRect().height;
                
                // Calculate scale factor while maintaining aspect ratio
                const scale = Math.min(
                    containerWidth / baseWidth, 
                    containerHeight / baseHeight,
                    1.5  // Optional: Add maximum scale factor to prevent over-enlargement
                );
                
                return {
                    width: baseWidth,
                    height: baseHeight,
                    margin: baseMargin,
                    radius: baseRadius,
                    scale: scale
                };
            }
            
            function renderBarChart() {
                const dim = getDimensions();
                svg.selectAll("*").remove();
                
                // Sort data
                data.sort((a, b) => sortDescending ? b.count - a.count : a.count - b.count);
                
                // Create main group with proper scaling
                const g = svg.append("g")
                    .attr("transform", \`scale(\${dim.scale}) translate(\${dim.margin.left},\${dim.margin.top})\`);
                
                // Calculate available space after scaling
                const availableWidth = dim.width - dim.margin.left - dim.margin.right;
                const availableHeight = dim.height - dim.margin.top - dim.margin.bottom;
                
                // Update scales
                const y = d3.scaleBand()
                    .domain(data.map(d => d.type))
                    .range([availableHeight, 0])
                    .padding(0.2);
                
                const x = d3.scaleLinear()
                    .domain([0, d3.max(data, d => d.count)])
                    .nice()
                    .range([0, availableWidth]);
                
                // Add axes
                g.append("g")
                    .attr("transform", \`translate(0,0)\`)
                    .call(d3.axisTop(x).ticks(5).tickSizeOuter(0))
                    .append("text")
                    .attr("class", "axis-label")
                    .attr("y", -25)
                    .attr("x", availableWidth / 2)
                    .attr("text-anchor", "middle")
                    .text("Number of Comments");
                
                g.append("g")
                    .call(d3.axisLeft(y).tickFormat(d => \`\${data.find(item => item.type === d).icon} \${d}\`))
                    .selectAll("text")
                    .attr("class", "axis-label")
                    .style("text-anchor", "end")
                    .attr("dx", "-0.5em");
                
                // Add bars
                g.selectAll(".bar")
                    .data(data)
                    .enter().append("rect")
                    .attr("class", "bar")
                    .attr("y", d => y(d.type))
                    .attr("x", 0)
                    .attr("height", y.bandwidth())
                    .attr("width", d => x(d.count))
                    .attr("fill", d => d.color)
                    .attr("rx", 3)
                    .attr("ry", 3)
                    .on("mouseover", function(event, d) {
                        tooltip.style("display", "block")
                            .html(\`<strong>\${d.type}</strong><br>\${d.count} comments (\${((d.count / d3.sum(data, x => x.count)) * 100).toFixed(1)}%)\`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function() {
                        tooltip.style("display", "none");
                    })
                    .on("click", function(event, d) {
                        window.vscode?.postMessage?.({
                            command: 'showComments',
                            type: d.type
                        });
                    });
                
                // Add value labels
                g.selectAll(".value-label")
                    .data(data)
                    .enter().append("text")
                    .attr("class", "axis-label")
                    .attr("y", d => y(d.type) + y.bandwidth() / 2 + 4)
                    .attr("x", d => x(d.count) + 5)
                    .text(d => d.count > 0 ? d.count : "");
                
                // Hide legend for bar chart
                legend.style("display", "none");
            }
            
            function renderPieChart() {
                const dim = getDimensions();
                svg.selectAll("*").remove();
                
                // Sort data by count
                data.sort((a, b) => b.count - a.count);
                
                // Create main group with proper scaling and centering
                const g = svg.append("g")
                    .attr("transform", \`scale(\${dim.scale}) translate(\${dim.width/2},\${dim.height/2})\`);
                
                // Create pie layout
                const pie = d3.pie()
                    .value(d => d.count)
                    .sort(null);
                
                const arc = d3.arc()
                    .innerRadius(0)
                    .outerRadius(dim.radius);
                
                const arcs = pie(data);
                
                // Draw pie slices
                g.selectAll(".pie-arc")
                    .data(arcs)
                    .enter().append("path")
                    .attr("class", "pie-arc")
                    .attr("d", arc)
                    .attr("fill", d => d.data.color)
                    .on("mouseover", function(event, d) {
                        tooltip.style("display", "block")
                            .html(\`<strong>\${d.data.type}</strong><br>\${d.data.count} comments (\${((d.data.count / d3.sum(data, x => x.count)) * 100).toFixed(1)}%)\`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                        
                        d3.select(this).attr("stroke", "white").attr("stroke-width", 2);
                    })
                    .on("mouseout", function() {
                        tooltip.style("display", "none");
                        d3.select(this).attr("stroke", null);
                    })
                    .on("click", function(event, d) {
                        window.vscode?.postMessage?.({
                            command: 'showComments',
                            type: d.data.type
                        });
                    });
                
                // Add labels to pie slices
                g.selectAll(".pie-label")
                    .data(arcs)
                    .enter().append("text")
                    .attr("class", "axis-label")
                    .attr("transform", d => \`translate(\${arc.centroid(d)})\`)
                    .attr("text-anchor", "middle")
                    .text(d => d.data.count > 0 ? d.data.count : "");
                
                // Create legend
                legend.style("display", "block")
                    .style("margin-top", "-40PX")
                    .style("max-height", \`\${dim.height * dim.scale}px\`)
                    .selectAll("*")
                    .remove();
                
                const legendItems = legend.selectAll(".legend-item")
                    .data(data)
                    .enter()
                    .append("div")
                    .attr("class", "legend-item")
                    .on("click", function(event, d) {
                        window.vscode?.postMessage?.({
                            command: 'showComments',
                            type: d.type
                        });
                    });
                
                legendItems.append("div")
                    .attr("class", "legend-color")
                    .style("background-color", d => d.color);
                
                legendItems.append("div")
                    .attr("class", "legend-text")
                    .html(d => \`\${d.icon} \${d.type} (\${d.count}, \${((d.count / d3.sum(data, x => x.count)) * 100).toFixed(1)}%)\`);
            }
            
            function changeChartType(type) {
                currentChartType = type;
                renderChart();
            }
            
            function renderChart() {
                if (currentChartType === 'pie') {
                    renderPieChart();
                } else {
                    renderBarChart();
                }
            }
            
            function getColorForType(language, type) {
                const colorMap = {
                    'java': ${JSON.stringify(javaColor)},
                    'python': ${JSON.stringify(pythonColor)},
                    'pharo': ${JSON.stringify(pharoColor)}
                };
                return colorMap[language]?.[type] || '#8884d8';
            }
            
            function getIconForType(language, type) {
                const iconMap = {
                    'java': ${JSON.stringify(javaEmoji)},
                    'python': ${JSON.stringify(pythonEmoji)},
                    'pharo': ${JSON.stringify(pharoEmoji)}
                };
                return iconMap[language]?.[type] || "⚪";
            }
            
            // Handle window resize
            let resizeTimer;
            function handleResize() {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    renderChart();
                }, 200);
            }
            
            // Initial render
            renderChart();
            
            // Set up resize observer
            const resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(container.node());
            
            // Handle messages from extension
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'updateData':
                        data = message.data;
                        renderChart();
                        break;
                }
            });
        </script>
    </body>
    </html>
`;
}
}