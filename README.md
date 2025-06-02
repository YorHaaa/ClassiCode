# 🧠 Code Comment Classifier VSCode Extension

This VSCode extension helps developers **understand and organize code comments** by automatically classifying them into meaningful types using an LLM (Large Language Model). It's especially useful for large codebases where navigating and interpreting comments quickly becomes a challenge.

> ⚠️ **Note for user study participants**: The classification backend is **disabled** for this version. All comments have been **pre-classified**—you don’t need to run any classification commands.



## ✔️How to Start

1. Click the following  button to create an online environment using github codespace

   <a href="https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=YorHaaa/ClassiCode" target="_blank" rel="noopener noreferrer">
     <img src="https://github.com/codespaces/badge.svg" alt="Open in GitHub Codespaces">
   </a>

2. Choose a **4 cores 16GB machine** and create a codespace cloud server for you own.

   ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/20250602174459222.png)

3. Wait for all libraries in the environment to be loaded successfully and **press F5** on your keyboard to start extensions debugging mode. (**Ignore all notifications that appear in vscode, no need to install any other extensions appear in the vscode**)

   ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/20250602175130606.png)

   > If you see an alert like this, click `continue`
   > ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/image-20250602211739345.png)

4. Then you will see a new editor pop up in vscode, which is used to select the project to which this plugin should be applied. **All subsequent operations in this experiment are completed on this editor.** 

   At this point, the plugin has been successfully run, and you can see the clone repository button in the explorer option in the side bar. 

   Through this button, we can **clone the project prepared for this experiment locally and apply our plugin**.

   ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/20250602175429829.png)

5. After clicking the `clone repository` button, you might be asked to log in to your GitHub account

   ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/20250602180606845.png)

6. After logging in, you need to click the `clone repository` again, copy this link into the input box

    https://github.com/YorHaaa/Userstudy-repo.git

   ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/20250602180907348.png)

   Don't change anything, just click `Select as Repository Destination`

   ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/image-20250602181056185.png)

7. Open the cloned repository

   ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/20250602181146827.png)

   Then you will see that the plug-in has been successfully applied to the project required for this experiment. 

   ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/20250602181742347.png)

------

## ✨ Features

**In the side bar**, you cloud see following features:

- 📁 **Comment Explorer Panel**: View a tree-structured list of all comments in the project.

- 🎨 **Comment Classification**: Comments are labeled into **different types**, each with a unique color.

  1. Classify all comments in this project

     ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/image-20250602182235011.png)

  2. If you change some comments in a file, you cloud use second button to update types of new comments.

     ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/image-20250602182418937.png)

  3. Use the third button to update all new comments in this project (**Unmodified comments will not be reclassified**)

     ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/20250602182706091.png)

- 🖍️ **Manual Editing**: Click a pencil icon or right-click in the code to manually update a comment's type.

  ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/20250602182801402.png)

- 👁️ **Highlighting**: Toggle comment type highlights.

  ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/20250602183016418.png)

- 🔍 **Filtering**: View only comments of a specific type within a file.

  ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/image-20250602213532415.png)

- 📌 **Quick Navigation**: Click a comment in the panel to jump directly to its location in the code.

  ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/image-20250602183128534.png)

- 📊 **Visualizations**:
  - **Per-file chart**: See comment type distribution in the current file.

    ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/20250602183221762.png)

  - **Project-wide chart**: Understand how comment types are spread across your entire project.

    ![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/image-20250602183202263.png)



**In the file editor**, you can manually change the comment type by right-clicking on the comment

![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/image-20250602183522442.png)

![](https://raw.githubusercontent.com/YorHaaa/BolgDemo/master/image-20250602183643775.png)

------

## 🧩 Comment Types

Each comment is tagged with one or more of the following types for java:

| Type            | Description                                     |
| --------------- | ----------------------------------------------- |
| **Summary**     | Provides a quick overview or high-level idea    |
| **Ownership**   | Indicates authorship or maintenance info        |
| **Expand**      | Gives deeper or background explanation          |
| **Usage**       | Explains how to use a function, parameter, etc. |
| **Pointer**     | Refers to related locations in the codebase     |
| **Deprecation** | Marks outdated or obsolete code sections        |
| **Rational**    | Explains the reasoning behind a decision        |



You may find that multiple tags or information types can be applied to a paragraph within a comment



If you want to know more about the details of classification types, you can refer to this paper.

````latex
@article{rani2021,
  title={How to identify class comment types? A multi-language approach for class comment classification},
  author={Rani, Pooja and Panichella, Sebastiano and Leuenberger, Manuel and Di Sorbo, Andrea and Nierstrasz, Oscar},
  journal={Journal of systems and software},
  volume={181},
  pages={111047},
  year={2021},
  publisher={Elsevier}
}
````

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

## 🚀 Ready to Start?

Once you're familiar with the interface and how everything works, you’re all set to begin the **user study**. No setup or configuration is required—just explore, observe, and interact with the pre-classified comments as needed!