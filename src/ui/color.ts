// Softer color palette with reduced saturation
export enum CommentColors {
    RED = "#FF6B6B",        // Soft red (🔴)
    ORANGE = "#FFB347",     // Soft orange (🟠)
    YELLOW = "#FFD166",     // Soft yellow (🟡)
    GREEN = "#88D8B0",      // Soft green (🟢)
    BLUE = "#7FB3D5",       // Soft blue (🔵)
    PURPLE = "#B8A1D9",     // Soft purple (🟣)
    BROWN = "#C4A484",      // Soft brown (🟤)
    BLACK = "#5D5D5D",      // Soft black (⚫)
    WHITE = "#F5F5F5",      // Soft white (⚪)
    GRAY = "#C0C0C0"        // Light gray
}

export const javaColor = {
    "summary": CommentColors.BLUE,       // 🔵
    "ownership": CommentColors.GREEN,    // 🟢
    "expand": CommentColors.YELLOW,      // 🟡
    "usage": CommentColors.BROWN,       // 🟤
    "pointer": CommentColors.PURPLE,     // 🟣
    "deprecation": CommentColors.RED,    // 🔴
    "rational": CommentColors.ORANGE     // 🟠
};

export const pythonColor = {
    "usage": CommentColors.BLUE,         // 🔵
    "parameters": CommentColors.PURPLE,  // 🟣
    "development notes": CommentColors.WHITE, // ⚪
    "expand": CommentColors.YELLOW,      // 🟡
    "summary": CommentColors.BLUE        // 🔵
};

export const pharoColor = {
    "key implementation points": CommentColors.ORANGE, // 🟠
    "example": CommentColors.GREEN,      // 🟢
    "responsibilities": CommentColors.BLUE, // 🔵
    "class references": CommentColors.PURPLE, // 🟣
    "intent": CommentColors.BLUE,        // 🔵
    "key messages": CommentColors.RED,    // 🔴
    "collaborators": CommentColors.WHITE // ⚪
};

export function getColorForType(language: string, type: string): string {
    const colorMap: Record<string, any> = {
        'java': javaColor,
        'python': pythonColor,
        'pharo': pharoColor
    };
    return colorMap[language]?.[type] || CommentColors.GRAY;
}

// Emoji definitions remain the same as before
export const javaEmoji = {
    "summary": "🔵",
    "ownership": "🟢",
    "expand": "🟡",
    "usage": "🟤",
    "pointer": "🟣",
    "deprecation": "🔴",
    "rational": "🟠"
};

export const pythonEmoji = {
    "usage": "🔵",
    "parameters": "🟣",
    "development notes": "⚪",
    "expand": "🟡",
    "summary": "🔵"
};

export const pharoEmoji = {
    "key implementation points": "🟠",
    "example": "🟢",
    "responsibilities": "🔵",
    "class references": "🟣",
    "intent": "🔵",
    "key messages": "🔴",
    "collaborators": "⚪"
};

export function getIconForType(language: string, commentType: [string]): string {
    const iconMap: Record<string, any> = {
        'java': javaEmoji,
        'python': pythonEmoji,
        'pharo': pharoEmoji
    };

    let icon = "";
    commentType.forEach(element => {
        icon += iconMap[language]?.[element] || "⚪";
    });
    return icon;
}