import * as vscode from 'vscode';
import {javaColor, pythonColor, pharoColor} from "./color";
import {CommentsData} from '../entity/Comment';

let activeDecorations: vscode.TextEditorDecorationType[] = [];

export async function highlight(commentsInfo: CommentsData, editor: vscode.TextEditor) {
    clearHighlights(editor);

    const current_file_path = editor.document.uri.fsPath;

    if (current_file_path.endsWith(".java") || current_file_path.endsWith(".py") || current_file_path.endsWith(".st")) {
        const comments = commentsInfo[current_file_path] || [];

        comments.forEach(comment => {
            const language = comment.language?.toLowerCase();
            const commentTypes = comment.type.map(t => t.toLowerCase()); // type is now an array
            let color = "rgba(100, 149, 237, 0.5)";

            const positionRange = new vscode.Range(
                new vscode.Position(comment.lineNumber[0], comment.index[0]),
                new vscode.Position(comment.lineNumber[1], comment.index[1])
            );

            // Determine the most specific color — you can pick the first matching or combine if needed
            commentTypes.forEach(type => {
                let tagColor = 'rgba(248, 178, 0, 0.83)';
                switch (language) {
                    case "java":
                        tagColor = javaColor[type as keyof typeof javaColor] || tagColor;
                        break;
                    case "python":
                        tagColor = pythonColor[type as keyof typeof pythonColor] || tagColor;
                        break;
                    case "pharo":
                        tagColor = pharoColor[type as keyof typeof pharoColor] || tagColor;
                        break;
                }
            
                const decorationType = vscode.window.createTextEditorDecorationType({
                    before: {
                        contentText: `${type} `,
                        color: tagColor,
                        fontStyle: 'italic'
                    }
                });
            
                activeDecorations.push(decorationType);
                editor.setDecorations(decorationType, [positionRange]);
            });
        });
    }
}

export function clearHighlights(editor: vscode.TextEditor) {
    for (const deco of activeDecorations) {
        editor.setDecorations(deco, []); 
        deco.dispose(); 
    }
    activeDecorations = [];
}
