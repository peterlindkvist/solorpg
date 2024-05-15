import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import "./Markdown.css";
import MDEditor, { commands, selectWord } from "@uiw/react-md-editor";
import { onImagePasted } from "./markdown/editorUtils";
import * as api from "../utils/api";
import { Story } from "../types";
import * as soloapi from "../utils/api";
import { markdownToStory, storyToMarkdown } from "../utils/markdownUtils";
import { getCodeString } from "rehype-rewrite";
import mermaid from "mermaid";

type Props = {
  story: Story | undefined;
  updateStory: (story: Story) => void;
};

mermaid.initialize({ securityLevel: "loose" });

// https://github.com/uiwjs/react-md-editor?tab=readme-ov-file#support-custom-mermaid-preview
const randomid = () => parseInt(String(Math.random() * 1e15), 10).toString(36);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Code = (props: any) => {
  const demoid = useRef(`dome${randomid()}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [container, setContainer] = useState<any>(null);
  const isMermaid =
    props.className &&
    /^language-mermaid/.test(props.className.toLocaleLowerCase());
  const code = props.children
    ? getCodeString(props.node.children)
    : props.children?.[0] || "";

  useEffect(() => {
    if (container && isMermaid && demoid.current && code) {
      mermaid
        .render(demoid.current, code)
        .then(({ svg, bindFunctions }) => {
          container.innerHTML = svg;
          if (bindFunctions) {
            bindFunctions(container);
          }
        })
        .catch((error) => {
          console.log("error:", error);
        });
    }
  }, [container, isMermaid, code, demoid]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refElement = useCallback((node: any) => {
    if (node !== null) {
      setContainer(node);
    }
  }, []);

  if (isMermaid) {
    return (
      <Fragment>
        <code id={demoid.current} style={{ display: "none" }} />
        <code
          className={props.className}
          ref={refElement}
          data-name="mermaid"
        />
      </Fragment>
    );
  }
  return <code className={props.className}>{props.children}</code>;
};

function chatgptCommand(story: Story): commands.ICommand {
  return {
    name: "ChatGPT",
    keyCommand: "chatgpt",
    buttonProps: { "aria-label": "Insert ChatGPT text" },
    icon: (
      <svg width="20" height="20" viewBox="0 0 1081.86 818.92">
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
      if (!story.settings.assistant) {
        return;
      }
      const newSelectionRange = selectWord({
        text: state.text,
        selection: state.selection,
        prefix: state.command.prefix ?? "",
      });
      const state1 = api.setSelectionRange(newSelectionRange);
      const selectedText = state1.selectedText;

      let newText = selectedText;
      const imageMatch = selectedText.match(/!\[(.*)\]\(.*\)/);
      if (imageMatch) {
        const description = imageMatch[1];
        const image = await soloapi.textToImage({
          storyId: story.id,
          description,
          context: story.settings.assistant.imageContext,
        });
        newText = `![${description}](${image.url})`;
      } else {
        const text = await soloapi.textToText({
          text: selectedText,
          context: story.settings.assistant.textContext,
        });
        newText = text.text;
      }

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

export function Markdown({ story, updateStory }: Props) {
  const [markdown, setMarkdown] = useState(story?.markdown ?? "");

  const fileUpload = useCallback(
    async (file: File) => {
      if (!story) return;
      const ret = await api.fileUpload(file, story.id);
      return ret?.url;
    },
    [story]
  );

  const onSave = useCallback(() => {
    const updatedStory = markdownToStory(markdown, story?.id ?? "");
    setMarkdown(storyToMarkdown(updatedStory));
    updateStory(updatedStory);
  }, [story, updateStory, markdown]);

  useEffect(() => {
    setMarkdown(story?.markdown ?? "");
  }, [story]);

  if (!story) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      <MDEditor
        height={window.innerHeight - 200}
        value={markdown}
        commands={[
          commands.link,
          commands.image,
          commands.code,
          commands.codeBlock,
          commands.comment,
          chatgptCommand(story),
        ]}
        onChange={(value) => setMarkdown(value ?? "")}
        onPaste={async (event) => {
          await onImagePasted(event.clipboardData, setMarkdown, fileUpload);
        }}
        onDrop={async (event) => {
          await onImagePasted(event.dataTransfer, setMarkdown, fileUpload);
        }}
        previewOptions={{
          components: {
            code: Code,
          },
        }}
      />
      <button className="button" onClick={() => onSave()}>
        Save
      </button>
    </div>
  );
}
