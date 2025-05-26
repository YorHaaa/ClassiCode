import * as childProcess from 'child_process';
import * as path from 'path';

export interface CommentInfo {
    className: string;
    content: string;       
    id: number;            
    index: [number, number]; 
    language: string;     
    level: string;         
    lineNumber: [number, number]; 
    relativePath: string;  
    type: [string];
    lastCommitDate?:string;          
}
  
export interface CommentsData {
    [filePath: string]: CommentInfo[];
}

export class Comment implements CommentInfo{
    id!: number;
    language!: string;
    content!: string;
    className!: string;
    relativePath!: string;
    level!: string;
    type!: [string];
    lastCommitDate?: string;
    /*
    Use an array to store start index and end index of a comment. 
    First element is start line and second element is end line.
    */
    lineNumber!: [number, number];
    /*
    Use an array to store start index and end index of a comment. 
    First element is start index and second element is end index.
    */
    index!: [number, number];

    public constructor(
        id: number,
        language: string,
        content: string,
        className: string,
        relativePath: string,
        level: string,
        type: [string],
        lineNumber: [number, number],
        index: [number, number],
        lastCommitDate?: string  // Make optional in constructor
    ) {
        this.id = id;
        this.language = language;
        this.content = content;
        this.className = className;
        this.relativePath = relativePath;
        this.level = level;
        this.type = type;
        this.lineNumber = lineNumber;
        this.index = index;
        this.lastCommitDate = lastCommitDate || ''; // Initialize with empty string if not provided
    }

    // Add getter/setter for lastCommitDate
    public getLastCommitDate(): string {
        return this.lastCommitDate || '';
    }

    public async setLastCommitDate(filePath: string): Promise<void> {
        if (this.lastCommitDate) {return;} // Skip if already set

        try {
            const date = await this.fetchGitCommitDate(filePath, this.lineNumber[0]+1); // Fetch commit date
            this.lastCommitDate = date || '';
        } catch (error) {
            this.lastCommitDate = '';
            console.error('Failed to get commit date:', error);
        }
    }

    private fetchGitCommitDate(filePath: string, lineNumber: number): Promise<string | null> {
        return new Promise((resolve, reject) => {
            const gitDir = path.dirname(filePath);
            const command = `git blame -L ${lineNumber},${lineNumber} --date=short --porcelain "${filePath}"`;

            childProcess.exec(command, { cwd: gitDir }, (error, stdout) => {
                if (error) {
                    resolve(null);
                    return;
                }
                const match = stdout.match(/^author-time (\d+)$/m);
                resolve(match?.[1] ? new Date(parseInt(match[1], 10) * 1000).toISOString() : null);
            });
        });
    }

    public getId(): number {
        return this.id;
    }

    public setId(id: number): void {
        this.id = id;
    }

    public getLanguage(): string {
        return this.language;
    }

    public setLanguage(language: string): void {
        this.language = language;
    }

    public getContent(): string {
        return this.content;
    }

    public setConetent(conetent: string): void {
        this.content = conetent;
    }

    public getClassName(): string {
        return this.className;
    }

    public setClassName(className: string): void {
        this.className = className;
    }

    public getRelativePath(): string {
        return this.relativePath;
    }

    public setRelativePath(relativePath: string): void {
        this.relativePath = relativePath;
    }

    public getLevel(): string {
        return this.level;
    }

    public setLevel(level: string): void {
        this.level = level;
    }

    public getType(): [string] {
        return this.type;
    }

    public setType(type: [string]): void {
        this.type = type;
    }

    public getLineNumber(): Array<number> {
        return this.lineNumber;
    }

    public setLineNumber(lineNumber: [number, number]): void {
        this.lineNumber = lineNumber;
    }

    public getIndex(): Array<number> {
        return this.index;
    }

    public setIndex(index: [number, number]): void {
        this.index = index;
    }

}