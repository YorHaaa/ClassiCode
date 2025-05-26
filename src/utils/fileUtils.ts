import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

interface CommentInfo {
  className: string;
  content: string;       
  id: number;            
  index: [number, number]; 
  language: string;     
  level: string;         
  lineNumber: [number, number]; 
  relativePath: string;  
  type: string[];          
}

export interface CommentsData {
  [filePath: string]: CommentInfo[];
}

export async function loadCommentsFromJson(filePath: string): Promise<CommentsData> {
  try {
    console.log('Loading comments from JSON:', filePath);
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as CommentsData;
  } catch (error) {
    console.error('Failed to load comments from JSON:', error);
    return {};
  }
}

export async function updateCommentInJson(jsonPath: string, commentId: number, updates: any): Promise<void> {
  try {
      const data = JSON.parse(await fs.promises.readFile(jsonPath, 'utf-8'));
      
      // Find and update the comment
      for (const filePath in data) {
          const comments = data[filePath];
          const commentIndex = comments.findIndex((c: any) => c.id === commentId);
          
          if (commentIndex !== -1) {
              comments[commentIndex] = { ...comments[commentIndex], ...updates };
              await fs.promises.writeFile(jsonPath, JSON.stringify(data, null, 2));
              return;
          }
      }
      
      throw new Error('Comment not found in JSON');
  } catch (error) {
      vscode.window.showErrorMessage(`Failed to update comment: ${error}`);
      throw error;
  }
}

export async function updateCommentTypeInFile(document: vscode.TextDocument, lineNumber: number, newType: string[]): Promise<void> {
  const jsonPath = path.join(vscode.workspace.rootPath || '', '.vscode/commentsInfo.json');
  
  try {
      // Load existing comments
      const commentsData = JSON.parse(await fs.promises.readFile(jsonPath, 'utf-8'));
      const filePath = document.uri.fsPath;
      
      if (commentsData[filePath]) {
          // Find comment at this line
          const comment = commentsData[filePath].find((c: any) => 
              c.lineNumber[0] <= lineNumber && c.lineNumber[1] >= lineNumber
          );
          
          if (comment) {
              // Update comment type
              comment.type = newType;
              
              // Save back to JSON
              await fs.promises.writeFile(jsonPath, JSON.stringify(commentsData, null, 2));
              
              // Optional: Update the comment in the editor with decoration
              //decorateComment(editor, lineNumber, newType);
          }
      }
  } catch (error) {
      vscode.window.showErrorMessage(`Failed to update comment type: ${error}`);
  }
}

function decorateComment(editor: vscode.TextEditor, lineNumber: number, type: string) {
  const decorationType = vscode.window.createTextEditorDecorationType({
      after: {
          contentText: ` [${type.toUpperCase()}]`,
          color: new vscode.ThemeColor('commentsClassifier.typeHighlight'),
          margin: '0 0 0 16px'
      }
  });
  
  const range = new vscode.Range(
      new vscode.Position(lineNumber, 0),
      new vscode.Position(lineNumber, 0)
  );
  
  editor.setDecorations(decorationType, [range]);
  
  // Remove decoration after 2 seconds
  setTimeout(() => {
      decorationType.dispose();
  }, 2000);
}