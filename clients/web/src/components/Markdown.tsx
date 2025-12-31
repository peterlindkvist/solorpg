import { useCallback, useEffect, useState } from "react";
import "./Markdown.css";
import MDEditor, {
  commands,
  getExtraCommands,
  selectWord,
} from "@uiw/react-md-editor";
import json5 from "json5";
import mermaid from "mermaid";
import type { Page, Story } from "../types";
import * as api from "../utils/api";
import * as soloapi from "../utils/api";
import {
  parseMarkdown,
  storyToMarkdown,
  storyToMermaid,
} from "../utils/markdownUtils/markdownUtils";
import { onImagePasted } from "./markdown/editorUtils";

type Props = {
  storyId: string;
  story: Story;
  updateStory: (story: Story) => void;
  setPage: (page: Page) => void;
};

mermaid.initialize({ securityLevel: "loose", maxTextSize: 90000 });

function chatgptCommand({ story, storyId }: Props): commands.ICommand {
  return {
    name: "ChatGPT",
    keyCommand: "chatgpt",
    buttonProps: { "aria-label": "Insert ChatGPT text" },

    icon: (
      <svg width="15" height="15" viewBox="0 0 1081.86 818.92">
        <path
          fill="currentColor"
          d="M832.28,347.74c15.43-46.33,10.12-97.06-14.56-139.19c-37.11-64.63-111.73-97.87-184.59-82.23
    c-32.41-36.52-78.99-57.29-127.81-56.98c-74.5-0.18-140.58,47.78-163.5,118.67c-47.85,9.8-89.15,39.76-113.32,82.21
    c-37.4,64.45-28.88,145.68,21.08,200.97c-15.43,46.33-10.12,97.06,14.56,139.19c37.11,64.63,111.73,97.87,184.59,82.23
    c32.41,36.52,78.99,57.29,127.81,56.98c74.54,0.19,140.65-47.8,163.55-118.74c47.85-9.8,89.15-39.76,113.32-82.21
    C890.77,484.19,882.23,403,832.28,347.74L832.28,347.74z M576.6,705.11c-29.82,0.04-58.7-10.4-81.6-29.5
    c1.03-0.56,2.84-1.56,4.02-2.28l135.44-78.24c6.92-3.94,11.18-11.31,11.13-19.27V384.87l57.25,33.06c0.61,0.3,1.03,0.89,1.11,1.57
    v158.14C703.87,647.95,646.92,704.95,576.6,705.11z M302.7,588.13c-14.94-25.81-20.32-56.05-15.21-85.43
    c1.01,0.6,2.76,1.68,4.02,2.4l135.44,78.24c6.87,4.02,15.38,4.02,22.25,0l165.36-95.48v66.11c0.04,0.69-0.27,1.34-0.82,1.76
    l-136.92,79.05C415.86,669.9,337.96,649.03,302.7,588.13L302.7,588.13z M267.07,292.44c14.87-25.84,38.36-45.63,66.35-55.89
    c0,1.17-0.07,3.23-0.07,4.67v156.47c-0.05,7.96,4.2,15.32,11.12,19.26l165.36,95.47l-57.25,33.05c-0.57,0.38-1.3,0.44-1.93,0.18
    l-136.93-79.12C252.86,431.27,231.99,353.41,267.07,292.44z M737.43,401.9l-165.37-95.48l57.25-33.04c0.57-0.38,1.3-0.44,1.93-0.17
    l136.93,79.05c60.98,35.22,81.86,113.21,46.64,174.18c-14.9,25.8-38.37,45.57-66.34,55.87V421.16
    C748.54,413.21,744.32,405.85,737.43,401.9z M794.41,316.14c-1.01-0.62-2.76-1.68-4.02-2.4L654.94,235.5
    c-6.87-4.01-15.37-4.01-22.25,0l-165.36,95.48v-66.11c-0.04-0.69,0.27-1.34,0.82-1.76l136.92-78.99
    c61-35.17,138.96-14.24,174.13,46.76C794.06,256.66,799.44,286.82,794.41,316.14L794.41,316.14z M436.2,433.98l-57.26-33.06
    c-0.61-0.3-1.03-0.89-1.11-1.57V241.22c0.05-70.41,57.16-127.46,127.58-127.41c29.78,0.02,58.61,10.46,81.49,29.51
    c-1.03,0.56-2.83,1.56-4.02,2.28l-135.44,78.24c-6.92,3.93-11.18,11.3-11.13,19.26L436.2,433.98z M467.3,366.93l73.65-42.54
    l73.65,42.51v85.05l-73.65,42.51l-73.65-42.51L467.3,366.93z"
        />
      </svg>
    ),
    execute: async (state, api) => {
      const newSelectionRange = selectWord({
        text: state.text,
        selection: state.selection,
        prefix: state.command.prefix ?? "",
      });
      const state1 = api.setSelectionRange(newSelectionRange);
      const selectedText = state1.selectedText;

      if (!story.settings.state?.assistant) {
        api.replaceSelection(
          `To be able to use assistant, please enable it in the story settings. \n ${selectedText}`
        );
        return;
      }

      let newText = selectedText;
      const imageMatch = selectedText.match(/!\[(.*)\]\(.*\)/);
      if (imageMatch) {
        const text = imageMatch[1];
        const image = await soloapi.textToImage({
          storyId,
          description: text,
          context: story.settings.state?.assistant.imageContext,
        });
        const description = `<!--- ${image.text} -->`;
        newText = `![${text}](${image.url})${description}`;
      } else {
        const text = await soloapi.textToText({
          text: selectedText,
          context: story.settings.state?.assistant.textContext,
        });
        newText = text.text;
      }

      api.setSelectionRange({
        start: state1.selection.start,
        end: state1.selection.end,
      });
      api.replaceSelection(newText);
      const selectionStart = state1.selection.start;
      const selectionEnd = selectionStart + newText.length;
      api.setSelectionRange({
        start: selectionStart,
        end: selectionEnd,
      });
    },
  };
}

function startGameCommand({ setPage }: Props): commands.ICommand {
  return {
    name: "start game",
    keyCommand: "startGame",
    buttonProps: { "aria-label": "Start Game" },
    icon: (
      <svg
        width="13"
        height="13"
        xmlns="http://www.w3.org/2000/svg"
        fill-rule="evenodd"
        clip-rule="evenodd"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M23 12l-22 12v-24l22 12zm-21 10.315l18.912-10.315-18.912-10.315v20.63z" />
      </svg>
    ),
    execute: async () => {
      const folder = window.location.pathname.split("/").at(1);
      console.log(folder, window.location.pathname.split("/"));
      setPage("game");
    },
  };
}

function saveCommand(onSave: () => void): commands.ICommand {
  return {
    name: "save game",
    keyCommand: "saveGame",
    shortcuts: "ctrlcmd+s",
    buttonProps: { "aria-label": "Save Game (ctrl + s)" },
    icon: (
      <svg
        width="13px"
        height="13px"
        viewBox="0 0 24 24"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        aria-labelledby="saveIconTitle"
        stroke="currentColor"
        stroke-width="1"
        stroke-linecap="square"
        stroke-linejoin="miter"
        fill="none"
        color="currentColor"
      >
        <title id="saveIconTitle">Save</title>{" "}
        <path d="M17.2928932,3.29289322 L21,7 L21,20 C21,20.5522847 20.5522847,21 20,21 L4,21 C3.44771525,21 3,20.5522847 3,20 L3,4 C3,3.44771525 3.44771525,3 4,3 L16.5857864,3 C16.8510029,3 17.1053568,3.10535684 17.2928932,3.29289322 Z" />{" "}
        <rect width="10" height="8" x="7" y="13" />{" "}
        <rect width="8" height="5" x="8" y="3" />{" "}
      </svg>
    ),
    execute: async () => {
      onSave();
    },
  };
}

function revertCommand(onRevert: () => void): commands.ICommand {
  return {
    name: "revert before save",
    keyCommand: "revert",
    buttonProps: { "aria-label": "Revert" },
    icon: (
      <svg
        width="13px"
        height="13px"
        viewBox="0 0 50 50"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M25 38c-5.1 0-9.7-3-11.8-7.6l1.8-.8c1.8 3.9 5.7 6.4 10 6.4 6.1 0 11-4.9 11-11s-4.9-11-11-11c-4.6 0-8.5 2.8-10.1 7.3l-1.9-.7c1.9-5.2 6.6-8.6 12-8.6 7.2 0 13 5.8 13 13s-5.8 13-13 13z" />
        <path d="M20 22h-8v-8h2v6h6z" />
      </svg>
    ),
    execute: async () => {
      onRevert();
    },
  };
}

function conditionCommand(): commands.ICommand {
  return {
    name: "save game",
    keyCommand: "saveGame",
    shortcuts: "ctrlcmd+s",
    buttonProps: { "aria-label": "Save Game (ctrl + s)" },
    icon: <>⎇</>,
    execute: async (state, api) => {
      const newSelectionRange = selectWord({
        text: state.text,
        selection: state.selection,
        prefix: state.command.prefix ?? "",
      });
      const state1 = api.setSelectionRange(newSelectionRange);
      const selectedText = state1.selectedText;

      if (selectedText.split("\n\n").length === 2) {
        const [first, second] = selectedText.split("\n\n");
        api.replaceSelection(
          "` condition {`\n\n" +
            first +
            "\n\n`}:{`\n\n" +
            second +
            "\n\n`}`\n\n"
        );
      } else {
        api.replaceSelection("` condition {`\n\n" + selectedText + "\n`}`\n\n");
      }

      const start = state1.selection.start + 2;

      api.setSelectionRange({
        start,
        end: start + "condition".length,
      });
    },
  };
}

function actionCommand(): commands.ICommand {
  return {
    name: "save game",
    keyCommand: "saveGame",
    shortcuts: "ctrlcmd+s",
    buttonProps: { "aria-label": "Save Game (ctrl + s)" },
    icon: <>⭐</>,
    execute: async (state, api) => {
      const newSelectionRange = selectWord({
        text: state.text,
        selection: state.selection,
        prefix: state.command.prefix ?? "",
      });
      const state1 = api.setSelectionRange(newSelectionRange);
      const selectedText = state1.selectedText;

      let actionText: string;
      let startText = "```\n";
      try {
        const json = json5.parse(selectedText);
        actionText = JSON.stringify(json, null, 2);
        startText = "```json\n";
      } catch (e) {
        actionText = selectedText ? selectedText : "{\n\n}";
      }

      api.replaceSelection(startText + actionText + "\n```\n\n");

      const start = state1.selection.start + startText.length;

      api.setSelectionRange({
        start,
        end: start + actionText.length,
      });
    },
  };
}

function toggleMermaidCommand(
  showMermaid: boolean,
  setShowMermaid: (showMermaid: boolean) => void
): commands.ICommand {
  return {
    name: "start game",
    keyCommand: "startGame",
    buttonProps: { "aria-label": "Start Game" },
    icon: (
      <svg
        fill="currentColor"
        height="13px"
        width="13px"
        version="1.1"
        id="Capa_1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 60 60"
      >
        <path
          d="M53,41V29H31V19h7V3H22v16h7v10H7v12H0v16h16V41H9V31h20v10h-7v16h16V41h-7V31h20v10h-7v16h16V41H53z M24,5h12v12H24V5z
      M14,55H2V43h12V55z M36,55H24V43h12V55z M58,55H46V43h12V55z"
        />
      </svg>
    ),
    execute: async () => {
      setShowMermaid(!showMermaid);
    },
  };
}

export function Markdown(props: Props) {
  const { storyId, story, updateStory } = props;
  const [markdown, setMarkdown] = useState(story?.markdown ?? "");
  const [markdownPreSave, setMarkdownPreSave] = useState("");
  const [showMermaid, setShowMermaid] = useState(false);
  const [container, setContainer] = useState<HTMLDivElement>();

  const fileUpload = useCallback(
    async (file: File) => {
      if (!storyId) return;
      const ret = await api.fileUpload(file, storyId);
      return ret?.url;
    },
    [storyId]
  );

  const onSave = useCallback(() => {
    setMarkdownPreSave(markdown);
    const updatedStory = parseMarkdown(markdown);
    setMarkdown(storyToMarkdown(updatedStory));
    updateStory(updatedStory);
  }, [updateStory, markdown]);

  const onRevert = useCallback(() => {
    setMarkdown(markdownPreSave);
  }, [markdownPreSave]);

  const onRenderMermaid = useCallback(async () => {
    const source = storyToMermaid(props.story);
    const { svg, bindFunctions } = await mermaid.render(
      `mermaid-chart`,
      source
    );
    if (container) {
      container.innerHTML = svg;
      bindFunctions?.(container);
    }
  }, [props.story, container]);

  useEffect(() => {
    setMarkdown(story?.markdown ?? "");
  }, [story]);

  const refElement = useCallback((node: HTMLDivElement) => {
    if (node !== null) {
      setContainer(node);
    }
  }, []);

  useEffect(() => {
    if (showMermaid) {
      onRenderMermaid();
    }
  }, [showMermaid, props.story]);

  if (!story) {
    return <div>Loading...</div>;
  }

  const height = window.innerHeight - 100;

  return (
    <div>
      <div
        className={"mermaid-overlay"}
        style={showMermaid ? { display: "block" } : { display: "none" }}
      >
        <div
          className={"mermaid-overlay-close"}
          onClick={() => setShowMermaid(false)}
        >
          🗙
        </div>
        <div id="mermaid-chart" style={{ display: "none" }}></div>
        <div ref={refElement}></div>
      </div>
      <MDEditor
        height={height}
        value={markdown}
        commands={[
          commands.link,
          commands.image,
          actionCommand(),
          conditionCommand(),
          commands.comment,
          chatgptCommand(props),
          saveCommand(onSave),
          revertCommand(onRevert),
          startGameCommand(props),
        ]}
        extraCommands={[
          toggleMermaidCommand(showMermaid, setShowMermaid),
          ...getExtraCommands(),
        ]}
        onChange={(value) => setMarkdown(value ?? "")}
        onPaste={async (event) => {
          await onImagePasted(event.clipboardData, setMarkdown, fileUpload);
        }}
        onDrop={async (event) => {
          await onImagePasted(event.dataTransfer, setMarkdown, fileUpload);
        }}
      />
    </div>
  );
}
