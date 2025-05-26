import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {extractComments} from './extract_comments';
import { CommentsData, CommentInfo} from './entity/Comment';

export function getWorkspaceFolderPath():string{
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;       
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found!');
        throw Error("No workspace folder found!");
    }else{
        return workspaceFolder;
    }
}

// Get comments of all files from JSON (JSON file path: .vscode/comments.json)
export function getComments():CommentsData{
    const workspaceFolder = getWorkspaceFolderPath();
    // Define the path where the json file saved 
    const relativePath = path.join('.vscode', 'commentsInfo.json');
    const fullPath = path.join(workspaceFolder, relativePath);
     
    // Read the json file and transfer it to object
    const json_data = fs.readFileSync(fullPath, "utf-8");
    const commentsInfo = JSON.parse(json_data);

    return commentsInfo;
}

export function getLanguageByFilename(filename:string):string{
    if(filename.endsWith(".java")){
        return "java";
    }else if (filename.endsWith(".py")){
        return "python";
    }else if (filename.endsWith(".st")){
        return "pharo";
    }else{
        vscode.window.showErrorMessage("Incorrect file type");
        throw Error("Error type of file");
    }
}

// Get different part base on content of comments
export function separateCommentsByContent(
    oldComments: CommentInfo[],
    newComments: CommentInfo[]
  ): { preserved: CommentInfo[]; toReclassify: CommentInfo[] } {
    const contentToClassification = new Map<
      string, 
      { type: [string]; level: string }
    >();
  
    oldComments.forEach(comment => {
      contentToClassification.set(comment.content, {
        type: comment.type,
        level: comment.level
      });
    });
  
    const preserved: CommentInfo[] = [];
    const toReclassify: CommentInfo[] = [];
  
    newComments.forEach(newComment => {
      const existingClassification = contentToClassification.get(newComment.content);
      
      if (existingClassification) {
        preserved.push({
          ...newComment,
          type: existingClassification.type,
          level: existingClassification.level
        });
      } else {
        toReclassify.push(newComment);
      }
    });
  
    return { preserved, toReclassify };
}

// Method used to send HTPP request
export async function postData(url: string, data: any): Promise<any> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

