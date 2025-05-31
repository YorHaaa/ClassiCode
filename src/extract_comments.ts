import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Comment } from './entity/Comment';
import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';
import Python from 'tree-sitter-python';

const LANG_PARSERS = {
    java: Java,
    python: Python,
};

function createParser(languageId: string) {
    const parser = new Parser();
    parser.setLanguage(LANG_PARSERS[languageId as keyof typeof LANG_PARSERS]);
    return parser;
}

enum CommentLevel {
    Class = 'class',
    Method = 'method',
    Inline = 'inline',
    Module = 'module'
}

const QUERIES: Record<string, string> = {
    java: `
      (line_comment) @comment
      (block_comment) @doc_comment
    `,
    python: `
  (comment) @comment
  (module . (expression_statement (string) @docstring))
  (function_definition
    body: (block . (expression_statement (string) @docstring))
  )
  (class_definition
    body: (block . (expression_statement (string) @docstring))
  )
`
};

function findNearestParentOfTypes(node: Parser.SyntaxNode, types: string[]): Parser.SyntaxNode | null {
    let current: Parser.SyntaxNode | null = node;
    while (current) {
        if (types.includes(current.type)) {
            return current;
        }
        current = current.parent;
    }
    return null;
}

function determineCommentLevel(node: Parser.SyntaxNode, tree: Parser.Tree, language: string): CommentLevel {
    if (language === 'java') {
        if (node.type === 'block_comment') {
            const parent = findNearestParentOfTypes(node, [
                'class_declaration',
                'method_declaration'
            ]);

            if (parent?.type === 'method_declaration') {
                return CommentLevel.Method;
            }
            if (parent?.type === 'class_declaration') {
                return CommentLevel.Class;
            }

            // if next sibling node is class or method ,then this comment is class/method level
            if (node.nextSibling?.type === 'class_declaration') {
                return CommentLevel.Class;
            }
            if (node.nextSibling?.type === 'method_declaration') {
                return CommentLevel.Method;
            }
        }

    } else if (language === 'python') {
        // 处理文档字符串
        if (node.type === 'string') {
            // 检查是否被捕获为特定类型的docstring
            const isMethodDoc = node.parent?.parent?.parent?.type === 'function_definition';
            const isClassDoc = node.parent?.parent?.parent?.type === 'class_definition';
            
            if (isMethodDoc) {return CommentLevel.Method;}
            if (isClassDoc) {return CommentLevel.Class;}

            // 1. 检查是否在类或方法内部
            const defParent = findNearestParentOfTypes(node, [
                'class_definition',
                'function_definition'
            ]);
            
            if (defParent) {
                return defParent.type === 'class_definition' 
                    ? CommentLevel.Class 
                    : CommentLevel.Method;
            }

            // 2. 检查模块级注释（文件开头的连续注释）
            let prevNode = node.previousSibling;
            while (prevNode?.type === 'comment') {
                prevNode = prevNode.previousSibling;
            }
            if (!prevNode) {return CommentLevel.Module;}
        }
    }
    return CommentLevel.Inline;
}

function findNearestClass(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
    let currentNode = node.parent;
    while (currentNode) {
        if (currentNode.type === 'class_declaration') {
            return currentNode;
        }
        currentNode = currentNode.parent;
    }
    return null;
}

function buildLineOffsets(content: string): number[] {
    const lineOffsets: number[] = [0];
    let currentOffset = 0;
    for (const char of content) {
        if (char === '\n') {
            currentOffset += 1;
            lineOffsets.push(currentOffset);
        } else {
            currentOffset += 1;
        }
    }
    return lineOffsets;
}

function globalToPosition(globalIndex: number, lineOffsets: number[]) {
    let line = lineOffsets.findIndex((offset, idx) =>
        offset <= globalIndex &&
        (idx === lineOffsets.length - 1 || lineOffsets[idx + 1] > globalIndex)
    );
    if (line === -1) { line = 0; }
    return globalIndex - lineOffsets[line];
}

function extractClassName(classNode: Parser.SyntaxNode, language: string): string {
    if (language === 'java') {
        const nameNode = classNode.childForFieldName('name');
        return nameNode?.text || '';
    } else if (language === 'python') {
        const nameNode = classNode.childForFieldName('name');
        return nameNode?.text || '';
    }
    return '';
}

// 清除注释标记符号
function cleanCommentMarkers(text: string, language: string): string {
    if (language === 'java') {
        let lines = text.split('\n');
        
        // 处理块注释 /* */ 或 /** */
        if (text.trim().startsWith('/*')) {
            // 移除第一行的 /* 或 /**
            if (lines.length > 0) {
                lines[0] = lines[0].replace(/^\s*\/\*+\s*/, '');
            }
            // 移除最后一行的 */
            if (lines.length > 0) {
                lines[lines.length - 1] = lines[lines.length - 1].replace(/\s*\*+\/\s*$/, '');
            }
            // 移除中间行的前导 * 
            lines = lines.map(line => line.replace(/^\s*\*\s?/, ''));
        } else {
            // 处理行注释 //
            lines = lines.map(line => line.replace(/^\s*\/\/\s?/, ''));
        }
        
        return lines.join('\n').trim();
    } else if (language === 'python') {
        let lines = text.split('\n');
        
        // 处理文档字符串
        if (text.trim().startsWith('"""') || text.trim().startsWith("'''")) {
            // 移除开始和结束的三引号
            let cleaned = text.replace(/^['"`]{3}\s*/, '').replace(/\s*['"`]{3}$/, '');
            return cleaned.trim();
        } else {
            // 处理 # 注释
            lines = lines.map(line => line.replace(/^\s*#\s?/, ''));
            return lines.join('\n').trim();
        }
    } else if (language === 'pharo') {
        // 清除 " " 标记
        return text.replace(/^"\s*/, '').replace(/\s*"$/, '').trim();
    }
    return text.trim();
}

// 判断是否为HTML标签行（只包含单个HTML标签）
function isHtmlTagLine(line: string): boolean {
    const trimmed = line.trim();
    // 匹配单独的HTML标签，如 <p>, <pre>, <code>, </p>, </pre> 等
    return /^<\/?[a-zA-Z][^>]*>$/.test(trimmed);
}

// 根据不同语言的规则分段
function splitIntoParagraphs(cleanedText: string, language: string): string[] {
    const lines = cleanedText.split('\n');
    const paragraphs: string[] = [];
    let currentParagraph: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        
        if (language === 'java') {
            // Java: 空行或只包含HTML标签的行作为分段依据
            if (trimmedLine === '' || isHtmlTagLine(trimmedLine)) {
                // 遇到分段符，保存当前段落
                if (currentParagraph.length > 0) {
                    const paragraph = currentParagraph.join('\n').trim();
                    paragraphs.push(paragraph);
                    currentParagraph = [];
                }
                // HTML标签行不作为独立段落，只作为分隔符
            } else {
                currentParagraph.push(line);
            }
        } else if (language === 'python' || language === 'pharo') {
            // Python/Pharo: 空行作为分段依据
            if (trimmedLine === '') {
                if (currentParagraph.length > 0) {
                    paragraphs.push(currentParagraph.join('\n').trim());
                    currentParagraph = [];
                }
            } else {
                currentParagraph.push(line);
            }
        }
    }

    // 添加最后一个段落
    if (currentParagraph.length > 0) {
        const paragraph = currentParagraph.join('\n').trim();
        paragraphs.push(paragraph);
    }

    
    // 过滤空段落
    const result = paragraphs.filter(p => p.length > 0);
    return result;
}

// 计算段落在原始注释中的位置
function calculateParagraphPosition(
    originalComment: string,
    paragraph: string,
    originalStartLine: number,
    originalStartIndex: number,
    fileContent: string,
    originalEndLine: number
): { lineNumber: [number, number], indexes: [number, number] } {
    
    const lines = fileContent.split('\n');
    const commentLines = originalComment.split('\n');
    
    // 清理注释，用于匹配
    const cleanedComment = cleanCommentMarkers(originalComment, 'java'); // 假设是Java，后面会传入正确的语言
    const cleanedCommentLines = cleanedComment.split('\n');
    const paragraphLines = paragraph.split('\n');
    
    // 在清理后的注释中找到段落的位置
    let paragraphStartLineInComment = -1;
    let paragraphEndLineInComment = -1;
    
    // 查找段落在清理后注释中的起始位置
    for (let i = 0; i < cleanedCommentLines.length; i++) {
        if (cleanedCommentLines[i].trim() === '') continue;
        
        // 检查是否匹配段落的第一行
        const firstParagraphLine = paragraphLines[0].trim();
        if (firstParagraphLine && cleanedCommentLines[i].includes(firstParagraphLine)) {
            // 验证后续行是否也匹配
            let allMatch = true;
            for (let j = 1; j < paragraphLines.length && i + j < cleanedCommentLines.length; j++) {
                const paragraphLine = paragraphLines[j].trim();
                const commentLine = cleanedCommentLines[i + j].trim();
                if (paragraphLine && !commentLine.includes(paragraphLine)) {
                    allMatch = false;
                    break;
                }
            }
            
            if (allMatch) {
                paragraphStartLineInComment = i;
                paragraphEndLineInComment = i + paragraphLines.length - 1;
                break;
            }
        }
    }
    
    // 如果没找到精确匹配，使用第一行匹配
    if (paragraphStartLineInComment === -1) {
        const firstLine = paragraphLines[0].trim();
        if (firstLine) {
            for (let i = 0; i < cleanedCommentLines.length; i++) {
                if (cleanedCommentLines[i].includes(firstLine)) {
                    paragraphStartLineInComment = i;
                    paragraphEndLineInComment = Math.min(i + paragraphLines.length - 1, cleanedCommentLines.length - 1);
                    break;
                }
            }
        }
    }
    
    // 如果还是没找到，使用默认值
    if (paragraphStartLineInComment === -1) {
        paragraphStartLineInComment = 0;
        paragraphEndLineInComment = paragraphLines.length - 1;
    }
    
    // 计算在原文件中的实际行号
    const actualStartLine = originalStartLine + paragraphStartLineInComment;
    const actualEndLine = Math.min(originalStartLine + paragraphEndLineInComment, originalEndLine);
    
    // 计算字符索引 - 简化版本，使用相对位置
    let startCharIndex = originalStartIndex;
    let endCharIndex = originalStartIndex + paragraph.length;
    
    // 尝试更精确的字符位置计算
    if (actualStartLine < lines.length && actualStartLine >= 0) {
        const lineContent = lines[actualStartLine];
        const firstParagraphLine = paragraphLines[0].trim();
        if (firstParagraphLine) {
            const index = lineContent.indexOf(firstParagraphLine);
            if (index >= 0) {
                startCharIndex = index;
            }
        }
    }
    
    if (actualEndLine < lines.length && actualEndLine >= 0) {
        const lineContent = lines[actualEndLine];
        const lastParagraphLine = paragraphLines[paragraphLines.length - 1].trim();
        if (lastParagraphLine) {
            const index = lineContent.indexOf(lastParagraphLine);
            if (index >= 0) {
                endCharIndex = index + lastParagraphLine.length;
            }
        }
    }
    
    return {
        lineNumber: [Math.max(0, actualStartLine), Math.max(0, actualEndLine)],
        indexes: [Math.max(0, startCharIndex), Math.max(0, endCharIndex)]
    };
}

function processJavaOrPython(fileContent: string, language: string): Comment[] {
    try {
        const parser = createParser(language);
    parser.setTimeoutMicros(5000000);
    const tree = parser.parse(fileContent);
    const query = new Parser.Query(
        parser.getLanguage(),
        QUERIES[language as keyof typeof QUERIES]
    );
    const lineOffsets = buildLineOffsets(fileContent);

    const comments: Comment[] = [];
    const captures = query.captures(tree.rootNode);

    captures.forEach(({ node }, index) => {
        const originalStartPos = globalToPosition(node.startIndex, lineOffsets);
        const originalEndPos = globalToPosition(node.endIndex - 1, lineOffsets);
        const classNode = findNearestClass(node);
        const className = classNode ? extractClassName(classNode, language) : '';
        const level = determineCommentLevel(node, tree, language);
        const originalLineNumber: [number, number] = [node.startPosition.row, node.endPosition.row];
        const type: [string] = [''];
        const path = '';
        
        // 清除注释标记并分段
        const nodeText = fileContent.slice(node.startIndex, node.endIndex);
        const cleanedText = cleanCommentMarkers(nodeText, language);
        const paragraphs = splitIntoParagraphs(cleanedText, language);

        
        // 为每个段落创建Comment对象
        paragraphs.forEach((paragraph, paragraphIndex) => {
            const position = calculateParagraphPosition(
                nodeText,
                paragraph,
                originalLineNumber[0],
                originalStartPos,
                fileContent,
                originalLineNumber[1]
            );

            
            comments.push(new Comment(
                0, // id will be set later
                language,
                paragraph,
                className,
                path,
                level,
                type,
                position.lineNumber,
                position.indexes
            ));
        });
    });

    return comments;
    } catch (error) {
        // 安全处理 unknown 类型的错误
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        console.error(`Tree-sitter解析错误: ${errorMessage}`);
        throw error; // 抛出错误以便上层捕获并回退
    }
}

// Different Regular Expressions of Different Languages to match comments
export function extractComments(fileContent: string, language: string): Comment[] {
    // 跳过过大文件
    const MAX_FILE_SIZE = 1024 * 1024; // 1MB
    if (fileContent.length > MAX_FILE_SIZE) {
        console.warn(`跳过过大文件 (${fileContent.length} 字符)`);
        return fallbackToRegexComments(fileContent, language);
    }

    try {
        if (language === 'java' || language === 'python') {
            return processJavaOrPython(fileContent, language);
        } else if (language === 'pharo') {
            return fallbackToRegexComments(fileContent, language);
        }
        return [];
    } catch (error) {
        // 安全处理 unknown 类型的错误
        const errorMessage = error instanceof Error ? error.message : '未知解析错误';
        console.error(`Tree-sitter解析失败，使用正则回退: ${errorMessage}`);
        return fallbackToRegexComments(fileContent, language);
    }
}

function fallbackToRegexComments(fileContent: string, language: string): Comment[] {
    try {
        const comments: Comment[] = [];
        const lines = fileContent.split('\n');
        const lineStartOffsets: number[] = [0];
        let currentOffset = 0;
        
        // 计算每行起始偏移量
        for (let i = 0; i < lines.length; i++) {
            currentOffset += lines[i].length + 1; // +1 for newline
            lineStartOffsets.push(currentOffset);
        }

        let regex: RegExp | null = null;

        if (language === 'java') {
            // Java: 匹配单行注释和多行注释
            regex = /(\/\*[\s\S]*?\*\/|\/\/.*)/g;
        } else if (language === 'python') {
            // Python: 匹配单行注释和多行字符串(作为文档字符串)
            regex = /(#.*|'''[\s\S]*?'''|"""[\s\S]*?""")/g;
        } else if (language === 'pharo') {
            // Pharo: 匹配双引号注释
            regex = /"[^"]*"/g;
        }

        if (!regex) return comments;

        let match: RegExpExecArray | null;
        while ((match = regex.exec(fileContent)) !== null) {
            const fullMatch = match[0];
            const startIndex = match.index;
            const endIndex = regex.lastIndex - 1; // inclusive end

            // 计算行号
            const startLine = fileContent.substring(0, startIndex).split('\n').length - 1;
            const endLine = fileContent.substring(0, endIndex).split('\n').length - 1;
            
            // 计算行内偏移
            const startLineOffset = startIndex - lineStartOffsets[startLine];
            const endLineOffset = endIndex - lineStartOffsets[endLine];
            
            // 清除注释标记
            const cleanedText = cleanCommentMarkers(fullMatch, language);
            const paragraphs = splitIntoParagraphs(cleanedText, language);
            
            // 为每个段落创建Comment对象
            paragraphs.forEach(paragraph => {
                comments.push(new Comment(
                    0,
                    language,
                    paragraph,
                    "", // className - 正则方法无法获取
                    "", // path - 会在后续设置
                    CommentLevel.Inline, // level - 正则方法无法精确判断
                    [""], // type
                    [startLine, endLine],
                    [startLineOffset, endLineOffset]
                ));
            });
        }

        return comments;
    } catch (error) {
        // 安全处理 unknown 类型的错误
        const errorMessage = error instanceof Error ? error.message : '正则解析错误';
        console.error(`正则回退方法失败: ${errorMessage}`);
        return []; // 返回空数组避免崩溃
    }
}

function readFileContent(filePath: string): string {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    
    content = content.replace(/\r\n?/g, '\n');
    
    return content;
}

// Get the root path of currernt project
function getWorkspaceRoot(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        return workspaceFolders[0].uri.fsPath;
    }
    return undefined;
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    try {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            const fullPath = path.join(dirPath, file);
            try {
                if (fs.statSync(fullPath).isDirectory()) {
                    getAllFiles(fullPath, arrayOfFiles);
                } else {
                    arrayOfFiles.push(fullPath);
                }
            } catch (e) {
                console.warn(`Skip path which cannot read: ${fullPath}`);
            }
        });
        return arrayOfFiles;
    } catch (e) {
        console.error(`Cannot read dictionary: ${dirPath}`, e);
        return arrayOfFiles;
    }
}

export async function processFile() {
    const workspaceRoot = getWorkspaceRoot();
    if (workspaceRoot) {
        const allFiles = getAllFiles(workspaceRoot);

        let comments: { [key: string]: any } = {};
        let id = 0;

        for (const filePath of allFiles) {
            try {
                const relativePath = filePath.replace(workspaceRoot, '');

                const content = readFileContent(filePath);
                if (!content) { continue; }

                let lang = getLanguageByExtension(filePath);
                if (!lang) { continue; }

                const currerentFileComments = extractComments(content, lang);

                await Promise.all(currerentFileComments.map(async (comment: Comment) => {
                    comment.setId(id++);
                    comment.setRelativePath(relativePath);
                    await comment.setLastCommitDate(filePath);
                }));

                comments[filePath] = currerentFileComments;
            } catch (e) {
                console.error(`Process file error: ${filePath}`, e);
            }
        }

        return comments;
    } else {
        vscode.window.showErrorMessage('No workspace folder is open.');
        return {};
    }
}

function getLanguageByExtension(filePath: string): string | null {
    const extensionMap: { [key: string]: string } = {
        ".py": "python",
        ".java": "java",
        ".st": "pharo"
    };
    return extensionMap[path.extname(filePath)] || null;
}