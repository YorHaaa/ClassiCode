import * as vscode from 'vscode';
import * as path from 'path';
import { getIconForType } from '../ui/color';

export class CommentNode extends vscode.TreeItem {
    private tooltipContent: string;
    private language: string;

    constructor(private comment: any) {
      const icon = getIconForType(comment.language, comment.type);
      let abbreviation = "";
      for(let i=0; i<comment.type.length;i++){
        abbreviation += (comment.type[i].substring(0, 3).toUpperCase());
        if(i<comment.type.length-1){
          abbreviation += "|";
        }
      }
      const contentPreview = comment.content.substring(0, 50) + (comment.content.length > 50 ? '...' : '');
      const label = `${icon} ${abbreviation}: ${contentPreview}`;

      super(label, vscode.TreeItemCollapsibleState.None);

      this.command = {
        command: 'extension.openComment',
        title: 'Open Comment',
        arguments: [this.comment] // Pass the comment object here
      };
      this.contextValue = 'commentItem.manualType';
      // Initialize with basic tooltip
      this.tooltipContent = this.getBasicTooltip();
      this.tooltip = this.tooltipContent;
      this.language = comment.language;
      this.contextValue = 'commentItem';
  }

  public getComment(): any {
      return this.comment;
  }

  public getLangugae(): string{
    return this.language;
  }
  
  public updateCommentType(newType: string[]): void {
    const icon = getIconForType(this.comment.language, this.comment.type);
      let abbreviation = "";
      for(let i=0; i<this.comment.type.length;i++){
        abbreviation += (this.comment.type[i].substring(0, 3).toUpperCase());
        if(i<this.comment.type.length-1){
          abbreviation += "|";
        }
      }
    const contentPreview = this.comment.content.substring(0, 50) + (this.comment.content.length > 50 ? '...' : '');
    const label = `${icon} ${abbreviation}: ${contentPreview}`;

    this.comment.type = newType;
    this.label = label;
    this.tooltip = this.getBasicTooltip(); // Refresh tooltip
  }

  private getBasicTooltip(): string {
    const lastModified = this.comment.lastCommitDate 
      ? `\n\nLast modified: ${new Date(this.comment.lastCommitDate).toLocaleString()}` 
      : '\n\nLast modified: Unknown';

    const formattedDate = this.comment.lastCommitDate 
      ? `\n(${this.formatDate(this.comment.lastCommitDate)})` 
      : '';

    return `
        [${this.comment.type.join().toUpperCase()}] 
        Location: ${path.basename(this.comment.relativePath)}
        Lines: ${this.comment.lineNumber[0]+1}-${this.comment.lineNumber[1]+1}
        ${this.comment.content}
        ${lastModified}
        ${formattedDate}
    `;
}

  private formatDate(dateString: string): string {
      const date = new Date(dateString);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > 365) {
            return `${Math.floor(diffDays / 365)}y ago`;
      } else if (diffDays > 30) {
          return `${Math.floor(diffDays / 30)}m ago`;
      } else if (diffDays > 0) {
          return `${diffDays}d ago`;
      }
      return 'Today';
  }
}

export class FileNode extends vscode.TreeItem {
    public readonly isDirectory: boolean;
  
    constructor(
      public readonly filePath: string,
      public hasComments: boolean,
      isDirectory: boolean,
      collapsibleState: vscode.TreeItemCollapsibleState
    ) {
      super(path.basename(filePath), collapsibleState);
      
      this.isDirectory = isDirectory;
      this.description = path.dirname(filePath);
      this.contextValue = this.getContextValue();
    }
  
    private getContextValue(): string {
      return this.isDirectory 
        ? 'directoryNode' 
        : this.hasComments 
          ? 'fileWithComments' 
          : 'fileWithoutComments';
    }
  }
  
  export class EmptyCommentNode extends vscode.TreeItem {
    constructor(filePath: string) {
      super("There's no valid classified comments in this file", 
        vscode.TreeItemCollapsibleState.None
      );
      
      this.iconPath = new vscode.ThemeIcon('info');
      this.tooltip = `File: ${filePath}`;
      this.contextValue = 'emptyComment';
    }
  }