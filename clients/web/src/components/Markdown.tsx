import { useCallback, useEffect, useState } from "react";
import "./Markdown.css";
import MDEditor from "@uiw/react-md-editor";
import { onImagePasted } from "./markdown/editorUtils";
import * as api from "../utils/api";
import { Story } from "../types";

type Props = {
  story: Story | undefined;
  updateMarkdown: (markdown: string) => void;
};

export function Markdown({ story, updateMarkdown }: Props) {
  const [markdown, setMarkdown] = useState(story?.markdown ?? "");

  const fileUpload = useCallback(
    async (file: File) => {
      if (!story) return;
      const ret = await api.fileUpload(file, story.id);
      return ret?.url;
    },
    [story]
  );

  useEffect(() => {
    setMarkdown(story?.markdown ?? "");
  }, [story]);

  return (
    <div>
      <MDEditor
        height={700}
        value={markdown}
        onChange={(value) => setMarkdown(value ?? "")}
        onPaste={async (event) => {
          await onImagePasted(event.clipboardData, setMarkdown, fileUpload);
        }}
        onDrop={async (event) => {
          await onImagePasted(event.dataTransfer, setMarkdown, fileUpload);
        }}
      />
      <button className="button" onClick={() => updateMarkdown(markdown)}>
        Save
      </button>
    </div>
  );
}
