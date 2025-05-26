import * as vscode from 'vscode';
import { highlight, clearHighlights } from './ui/highlight';
import { processFile, extractComments } from './extract_comments';
import * as fs from 'fs';
import * as path from 'path';
import { FileTreeProvider } from './entity/FileTreeProvider';
import { updateCommentInJson, updateCommentTypeInFile } from './utils/fileUtils';
import { getComments, separateCommentsByContent, postData, getLanguageByFilename } from './utils';
import { CommentsData, CommentInfo } from './entity/Comment';
import { CommentNode } from './entity/CommentNode';

let commentsInfo: CommentsData = {};
// Store the listener of hightlight method
let editorChangeListener: vscode.Disposable | undefined;
let highlightActive: boolean = true;
const highlightActiveContextKey = 'commentClassifierHighlightActive';

export function getCommentTypes(language: string): { label: string, value: string }[] {
    let commentTypes: Record<string, string>;

    switch (language.toLowerCase()) {
        case 'java':
            commentTypes = {
                "summary": "symbol-class",
                "ownership": "symbol-field",
                "expand": "symbol-constant",
                "usage": "symbol-variable",
                "pointer": "symbol-key",
                "deprecation": "warning",
                "rational": "symbol-enum"
            };
            break;
        case 'python':
            commentTypes = {
                "usage": "symbol-variable",
                "parameters": "symbol-key",
                "developmentNotes": "info",
                "expand": "symbol-constant",
                "summary": "symbol-class"
            };
            break;
        case 'pharo':
            commentTypes = {
                "key implementation points": "symbol-enum",
                "example": "symbol-field",
                "responsibilities": "symbol-class",
                "class references": "symbol-key",
                "intent": "symbol-class",
                "key messages": "warning",
                "collaborators": "info"
            };
            break;
        default:
            return [];
    }
    
    // Convert to the desired format
    return Object.entries(commentTypes).map(([value, icon]) => ({
        label: `$(${icon}) ${value.charAt(0).toUpperCase() + value.slice(1)}`,
        value: value.toLowerCase()
    }));
}

export function activate(context: vscode.ExtensionContext) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found!');
        return;
    }

    const relativePath = path.join('.vscode', 'commentsInfo.json');
    const fullPath = path.join(workspaceFolder, relativePath);
    if(fs.existsSync(fullPath)){
        commentsInfo = getComments();
    }
    const fileTreeProvider = new FileTreeProvider(fullPath);

    vscode.window.registerTreeDataProvider('codeCommentExplorer', fileTreeProvider);

    context.subscriptions.push(
        vscode.commands.registerCommand('commentClassifier.refreshList', () => {
            fileTreeProvider.refresh();
        })
    );

    // Register the Refresh Command
    const refreshButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    refreshButton.text = '$(refresh)'; // Only icon
    refreshButton.command = 'commentClassifier.refreshList';
    refreshButton.tooltip = 'Refresh the comment list';
    refreshButton.show();

    // Create a status bar item for filtering
    const filterButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    filterButton.text = '$(filter)'; // Only icon
    filterButton.command = 'commentClassifier.showFilterOptions';
    filterButton.tooltip = 'Filter comments by type';
    filterButton.show();

    // Create a status bar item for sorting
    const sortButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98);
    sortButton.text = '$(list-ordered)'; // Only icon
    sortButton.command = 'commentClassifier.showSortOptions';
    sortButton.tooltip = 'Sort comments';
    sortButton.show();

// Create a status bar item for toggling highlight comments
const highlightButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 97);
let isHighlighted = false; // Track the state of the button

const updateHighlightButton = () => {
    if (isHighlighted) {
        highlightButton.text = '$(eye-closed) Remove Highlight'; // Icon for removing highlight
        highlightButton.tooltip = 'Remove highlight from comments in the current file';
        highlightButton.command = 'commentClassifier.clearHighlight';
    } else {
        highlightButton.text = '$(eye) Highlight Comments'; // Icon for highlighting comments
        highlightButton.tooltip = 'Highlight comments in the current file';
        highlightButton.command = 'commentClassifier.highlight';
    }
};

// Initialize the button
updateHighlightButton();
highlightButton.show();


    // Register filter and sort commands
    context.subscriptions.push(
        vscode.commands.registerCommand('commentClassifier.showFilterOptions', async () => {
            const filterOptions = ['All','summary', 'ownership', 'expand', 'usage','pointer','deprecation'
                ,'rational','parameters','development notes','key implementation points','example','responsibilities',
                'class references','intent','key messages','collaborators'
            ];//17个
            const selectedFilter = await vscode.window.showQuickPick(filterOptions, {
                placeHolder: 'Select a filter',
            });

            if (selectedFilter) {
                fileTreeProvider.setFilter(selectedFilter === 'All' ? null : selectedFilter);
                filterButton.text = `$(filter) Filter: ${selectedFilter}`;
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('commentClassifier.showSortOptions', async () => {
            const sortOptions = ['None', 'lineNumber','commit timestamp'];
            const selectedSort = await vscode.window.showQuickPick(sortOptions, {
                placeHolder: 'Select a sort option',
            });

            if (selectedSort) {
                fileTreeProvider.setSortBy(selectedSort === 'None' ? null : selectedSort);
                sortButton.text = `$(list-ordered) Sort: ${selectedSort}`;
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.openComment', async (comment) => {
            try {
                console.log('Opening comment:', comment.relativePath);
                const fullPath = path.join(workspaceFolder, comment.relativePath);
                const document = await vscode.workspace.openTextDocument(fullPath);
                const editor = await vscode.window.showTextDocument(document);

                const lineStart = comment.lineNumber[0];
                const lineEnd = comment.lineNumber[1];

                const range = new vscode.Range(
                    new vscode.Position(lineStart, 0),
                    new vscode.Position(lineEnd, 0)
                );
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

                // Set selection highlight
                editor.selection = new vscode.Selection(
                    new vscode.Position(lineStart, 0),
                    new vscode.Position(lineEnd, 0)
                );
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to open comment: ${error}`);
            }
        })
    );

    vscode.workspace.onDidOpenTextDocument((document) => {
        const filePath = document.uri.fsPath;
        if (fileTreeProvider.hasCommentsForFile(filePath)) {
            fileTreeProvider.refresh(); // Refresh the tree view
        }
    });

    const executeClassify = vscode.commands.registerCommand('commentClassifier.classifyAllFiles', async () => {
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "🔍 Classifying all comments...",
                cancellable: false
            },
            async (progress) => {
                try {
                    progress.report({ message: "Extracting comments from files..." });
                    const comments = await processFile();
    
                    progress.report({ message: "Sending data to backend for classification..." });
                    const url = 'http://127.0.0.1:5000/executeClassifyOfAllFiles';
                    const result = await postData(url, comments);
    
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    if (!workspaceFolder) {
                        vscode.window.showErrorMessage('❌ No workspace folder found!');
                        return;
                    }
    
                    progress.report({ message: "Saving classification results..." });
    
                    const relativePath = path.join('.vscode', 'commentsInfo.json');
                    const fullPath = path.join(workspaceFolder, relativePath);
                    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    
                    await fs.promises.writeFile(fullPath, JSON.stringify(result), 'utf-8');
    
                    commentsInfo = getComments();
    
                    vscode.window.showInformationMessage(`✅ Classification completed and saved to: ${fullPath}`);
                } catch (error) {
                    console.error('Classification failed:', error);
                    vscode.window.showErrorMessage('❌ Failed to classify comments. Please check if backend is running.');
                }
            }
        );
    });

    const executeClassifyOfCurrentFile = vscode.commands.registerCommand('commentClassifier.classifyCurrentFile', async () => {
        const filePath = vscode.window.activeTextEditor?.document.uri?.fsPath;
    
        if (!filePath) {
            vscode.window.showErrorMessage("❌ Execution failed — No active editor");
            return;
        }
    
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "🔍 Classifying current file...",
                cancellable: false
            },
            async (progress) => {
                try {
                    progress.report({ message: "Extracting comments..." });
    
                    const language = getLanguageByFilename(filePath);
                    const previousComments = commentsInfo[filePath];
                    const currentComments: CommentInfo[] = await extractComments(fs.readFileSync(filePath, 'utf-8'), language);
    
                    const { preserved, toReclassify } = separateCommentsByContent(previousComments, currentComments);
    
                    const url = 'http://127.0.0.1:5000/executeClassifyOfSingleFile';
    
                    progress.report({ message: "Sending data to backend..." });
                    const result = await postData(url, toReclassify);
                    const reclassifiedComments: CommentInfo[] = result;
    
                    const commentsOfCurrentFile = [...preserved, ...reclassifiedComments];
                    commentsInfo[filePath] = commentsOfCurrentFile;
    
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    if (!workspaceFolder) {
                        vscode.window.showErrorMessage('❌ No workspace folder found!');
                        return;
                    }
    
                    progress.report({ message: "Saving result..." });
                    const relativePath = path.join('.vscode', 'commentsInfo.json');
                    const fullPath = path.join(workspaceFolder, relativePath);
    
                    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
                    await fs.promises.writeFile(fullPath, JSON.stringify(commentsInfo), 'utf-8');
    
                    vscode.window.showInformationMessage(`✅ Classification of current file completed and saved to: ${fullPath}`);
                } catch (error) {
                    console.error('Classification failed:', error);
                    vscode.window.showErrorMessage('❌ Failed to classify current file. Please check backend.');
                }
            }
        );
    });

    const UpdateClassifyOfAllFiles = vscode.commands.registerCommand('commentClassifier.updateClassifyOfAllFiles', async () => {
        const filePath = vscode.window.activeTextEditor?.document.uri?.fsPath;
    
        if (!filePath) {
            vscode.window.showErrorMessage("❌ Execution failed — No active editor");
            return;
        }
    
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "🔍 Classifying current file...",
                cancellable: false
            },
            async (progress) => {
                try {
                    progress.report({ message: "Extracting comments..." });
    
                    const language = getLanguageByFilename(filePath);
                    const previousComments = commentsInfo[filePath];
                    const currentComments: CommentInfo[] = await extractComments(fs.readFileSync(filePath, 'utf-8'), language);
    
                    const { preserved, toReclassify } = separateCommentsByContent(previousComments, currentComments);
    
                    const url = 'http://127.0.0.1:5000/executeClassifyOfSingleFile';
    
                    progress.report({ message: "Sending data to backend..." });
                    const result = await postData(url, toReclassify);
                    const reclassifiedComments: CommentInfo[] = result;
    
                    const commentsOfCurrentFile = [...preserved, ...reclassifiedComments];
                    commentsInfo[filePath] = commentsOfCurrentFile;
    
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    if (!workspaceFolder) {
                        vscode.window.showErrorMessage('❌ No workspace folder found!');
                        return;
                    }
    
                    progress.report({ message: "Saving result..." });
                    const relativePath = path.join('.vscode', 'commentsInfo.json');
                    const fullPath = path.join(workspaceFolder, relativePath);
    
                    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
                    await fs.promises.writeFile(fullPath, JSON.stringify(commentsInfo), 'utf-8');
    
                    vscode.window.showInformationMessage(`✅ Classification of current file completed and saved to: ${fullPath}`);
                } catch (error) {
                    console.error('Classification failed:', error);
                    vscode.window.showErrorMessage('❌ Failed to classify current file. Please check backend.');
                }
            }
        );
    });

    const highlightComments = vscode.commands.registerCommand('commentClassifier.highlight', async () => {
        //If object commentsInfo is null, then read it from json file.
        if (Object.keys(commentsInfo).length === 0) {
            commentsInfo = getComments();
        }

        let activeEditor = vscode.window.activeTextEditor;

        // Highlight the current editor
        if (activeEditor) {
            highlight(commentsInfo, activeEditor);
        }

        
        if (editorChangeListener) {
            editorChangeListener.dispose();
        }

        /*
        Listen for editor switching events. 
        When the event is triggered, re-highlight the comments of the file in the current window
        */
        editorChangeListener = vscode.window.onDidChangeActiveTextEditor(editor => {
            activeEditor = editor;
            if (editor) {
                highlight(commentsInfo, editor);
            }
        }, null, context.subscriptions);
        isHighlighted = true;
        vscode.commands.executeCommand('setContext', highlightActiveContextKey, true);
        updateHighlightButton();
    });

    const clearhighlightComments = vscode.commands.registerCommand('commentClassifier.clearHighlight', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            clearHighlights(editor);
        }

        // Cancel event listener
        if (editorChangeListener) {
            editorChangeListener.dispose();
            editorChangeListener = undefined;
        }
        isHighlighted = false;
        vscode.commands.executeCommand('setContext', highlightActiveContextKey, false);
        updateHighlightButton();
    });


    // Register the Show Chart Command
    context.subscriptions.push(
        vscode.commands.registerCommand('commentVisualization.showChart', (isOneFile: boolean = false) => {
            fileTreeProvider.showChart(isOneFile);
        })
    );

    // Register the Refresh Visualization Command
    context.subscriptions.push(
        vscode.commands.registerCommand('commentVisualization.refresh', () => {
            fileTreeProvider.refresh();
        })
    );

    // Register the Select File for Visualization Command
    context.subscriptions.push(
        vscode.commands.registerCommand('commentVisualization.selectFile', async () => {
            const files = await vscode.workspace.findFiles('**/*.{java,py,st}');
            const fileItems = files.map(file => ({
                label: path.basename(file.fsPath),
                description: file.fsPath,
            }));

            const selectedFile = await vscode.window.showQuickPick(fileItems, {
                placeHolder: 'Select a file to visualize comments',
            });

            if (selectedFile) {
                fileTreeProvider.setSelectedFile(selectedFile.description);
            }
        })
    );

    // Add a status bar item for selecting a file
    const selectFileButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 97);
    selectFileButton.text = '$(file) Select File';
    selectFileButton.command = 'commentVisualization.selectFile';
    selectFileButton.tooltip = 'Select a file to visualize comments';
    selectFileButton.show();
    context.subscriptions.push(selectFileButton);
    context.subscriptions.push(highlightComments);
    context.subscriptions.push(executeClassify);
    context.subscriptions.push(executeClassifyOfCurrentFile);
    context.subscriptions.push(refreshButton);
    context.subscriptions.push(filterButton);
    context.subscriptions.push(sortButton);

    // Register the manual type setting command
context.subscriptions.push(
    vscode.commands.registerCommand('commentClassifier.setTypeManually', async (node: CommentNode) => {
        let existingTypes: string[] = node.getComment().type;

        const commentTypes = getCommentTypes(node.getLangugae());

        const items = commentTypes.map(type => ({
            label: type.label,
            description: type.value,
            picked: existingTypes.includes(type.value) 
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select comment types',
            canPickMany: true
        });

        if (selected) {
            const selectedValues = selected.map(item => item.description!);
            
            // Update the comment type
            node.updateCommentType(selectedValues);
            
            // Save to JSON
            const jsonPath = path.join(vscode.workspace.rootPath || '', '.vscode/commentsInfo.json');
            await updateCommentInJson(jsonPath, node.getComment().id, { type: selectedValues });
            
            vscode.window.showInformationMessage(`Comment type updated to ${selectedValues}`);
                    // In your extension activation
            const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
            if (filePath && fileTreeProvider.hasCommentsForFile(filePath)) {
                fileTreeProvider.refresh(); // Refresh the tree view
            }
        }

        commentsInfo = getComments();
    })
);

context.subscriptions.push(
    vscode.commands.registerCommand('commentClassifier.changeTypeAtCursor', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const document = editor.document;
        const position = editor.selection.active;
        const line = document.lineAt(position.line);

        let existingTypes: string[] = [];

        if (commentsInfo[document.uri.fsPath]){
            commentsInfo[document.uri.fsPath].forEach(comment =>{
                if(comment.lineNumber[0]<= position.line && comment.lineNumber[1] >= position.line){
                    existingTypes = comment.type;
                }
            });
        }

        let lang: string = '';
        if (editor.document.fileName.endsWith("java")) {
            lang = 'java';
        } else if (editor.document.fileName.endsWith("python")) {
            lang = 'python';
        } else if (editor.document.fileName.endsWith("st")) {
            lang = 'pharo';
        }
        const commentTypes = getCommentTypes(lang);

        const items = commentTypes.map(type => ({
            label: type.label,
            description: type.value,
            picked: existingTypes.includes(type.value) 
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select comment types',
            canPickMany: true
        });

        if (selected) {
            const selectedValues = selected.map(item => item.description!);
            
            await updateCommentTypeInFile(document, position.line, selectedValues);
            
            vscode.commands.executeCommand('commentClassifier.refreshList');
        }

        commentsInfo = getComments();
    })
);

function isCommentLine(text: string, languageId: string): boolean {
    const trimmed = text.trim();
    switch (languageId) {
        case 'java':
            return trimmed.startsWith('//') || trimmed.startsWith('/*');
        case 'python':
            return trimmed.startsWith('#') || trimmed.startsWith('"""');
        case 'pharo':
            return trimmed.startsWith('"') && trimmed.endsWith('"');
        default:
            return false;
    }
}

}

export function deactivate() { }