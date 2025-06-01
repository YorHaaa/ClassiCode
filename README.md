# 🧠 Code Comment Classifier VSCode Extension

This VSCode extension helps developers **understand and organize code comments** by automatically classifying them into meaningful types using an LLM (Large Language Model). It's especially useful for large codebases where navigating and interpreting comments quickly becomes a challenge.

> ⚠️ **Note for user study participants**: The classification backend is **disabled** for this version. All comments have been **pre-classified**—you don’t need to run any classification commands.



## ✔️How to Start

1. Click the following  button to create an online environment using github codespace

   <a href="https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=YorHaaa/ClassiCode" target="_blank" rel="noopener noreferrer">
     <img src="https://github.com/codespaces/badge.svg" alt="Open in GitHub Codespaces">
   </a>

2. Choose a **4 cores 16GB machine** and create codespace

   ![Image](https://github.com/user-attachments/assets/6b3f3162-e8da-432c-ae65-ebfc0c2d4d99)

3. Wait for all libraries in the environment to be created successfully and **press F5** on your keyboard to start extensions debugging mode.

   ![Image](https://github.com/user-attachments/assets/20939d09-d72d-4922-bb3f-2d144539c14c)

4. Then, a new tab will pop up in the browser. Select a project to debug our plugin. Click the Explorer button on the side bar, and then clone our user study repository https://github.com/YorHaaa/Userstudy-repo.git

   ![Image](https://github.com/user-attachments/assets/d7783dd5-502b-4ce5-96fa-c11d462383b5)

5. Don't change anything just press the button `Select as Repository Destination`

   ![Image](https://github.com/user-attachments/assets/f618b6db-cc14-48d7-af43-9e600a70759c)

6. After that open the repository and you could see the plugin is running successfully

   ![Image](https://github.com/user-attachments/assets/dca2e5bd-6c5d-441d-a5e4-366f33670ea8)

   ![Image](https://github.com/user-attachments/assets/0f082986-6bd3-429a-946b-97018ad3408e)

------

## ✨ Features

- 📁 **Comment Explorer Panel**: View a tree-structured list of all comments in the project.
- 🎨 **Comment Classification**: Comments are labeled into **7 meaningful types**, each with a unique color.
- 🖍️ **Manual Editing**: Click a pencil icon or right-click in the code to manually update a comment's type.
- 👁️ **Inline Highlighting**: Toggle comment type highlights directly in the code editor.
- 🔍 **Filtering**: View only comments of a specific type within a file.
- 📌 **Quick Navigation**: Click a comment in the panel to jump directly to its location in the code.
- 📊 **Visualizations**:
  - **Per-file chart**: See comment type distribution in the current file.
  - **Project-wide chart**: Understand how comment types are spread across your entire codebase.

------

## 🧩 Comment Types

Each comment is tagged with one or more of the following types:

| Type            | Description                                     |
| --------------- | ----------------------------------------------- |
| **Summary**     | Provides a quick overview or high-level idea    |
| **Ownership**   | Indicates authorship or maintenance info        |
| **Expand**      | Gives deeper or background explanation          |
| **Usage**       | Explains how to use a function, parameter, etc. |
| **Pointer**     | Refers to related locations in the codebase     |
| **Deprecation** | Marks outdated or obsolete code sections        |
| **Rational**    | Explains the reasoning behind a decision        |



You may find multiple tags applied to a single paragraph of comments.

------

## 🧪 How to Use (User Study Mode)

1. **Clone the repo** and open it in a browser-based VS Code IDE.
2. The left panel will show a tree view labeled with comment classifications.
3. You **do not need to run** any classification commands—everything is pre-set.
4. Feel free to explore:
   - **Expand** folders to view comment annotations.
   - **Hover** over entries to see metadata (line, type, timestamp).
   - **Click** to jump to the corresponding code location.
   - **Toggle** visibility and filtering options to customize your view.
   - **Try** the visualization tools to get a better sense of comment distribution.

------

## 📈 Visualization Examples

- **Visualize Current File**: Displays a chart of comment types in the last active file.
- **Visualize All Files**: Provides a bar or pie chart showing comment distribution across all files.

Hovering over bars or slices reveals the exact count and percentage.

------

## 🚀 Ready to Start?

Once you're familiar with the interface and how everything works, you’re all set to begin the **user study**. No setup or configuration is required—just explore, observe, and interact with the pre-classified comments as needed!