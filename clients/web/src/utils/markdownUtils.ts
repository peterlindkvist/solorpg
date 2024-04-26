import markdownit, { Token } from "markdown-it";
import anchor from "markdown-it-anchor";
import json5 from "json5";
import {
  Action,
  Chapter,
  Condition,
  Image,
  Paragraph,
  Part,
  Settings,
  State,
  Story,
} from "../types";

// default mode
const md = markdownit({
  linkify: true,
}).use(anchor);

type CodeData = { active: boolean; parts: Part[]; token?: Token };

function parseImage(image: Token): Image {
  const url = image.attrs?.find(([key]) => key === "src")?.[1];
  return {
    type: "image",
    text: image.content,
    url,
  };
}

function parseNavigation(code: Token): Part | undefined {
  const navigationMatch = code.content.match(/^->\s?\[([^\]]*)\]\(([^)]*)\)/);
  if (navigationMatch) {
    return {
      type: "navigation",
      text: navigationMatch[1],
      target: navigationMatch[2],
    };
  }
}

function parseActionPart(content: string): Action {
  try {
    const state = json5.parse(content);
    return {
      type: "action",
      state,
    };
  } catch (e) {
    const error = e instanceof Error ? e : new Error("unknown error");
    return {
      type: "action",
      markdown: content,
      state: {},
      error: error.message,
    };
  }
}

function parseCode(codeData: CodeData): Condition {
  let error: string | undefined;

  const condition = codeData.token?.children
    ?.at(0)
    ?.content.replace(/\s*\{\s*?$/, "");

  if (!condition) {
    error = "Could not parse condition";
  }
  const childrenParts = [];
  for (const children of codeData.token?.children ?? []) {
    switch (children.type) {
      case "text": {
        const part: Paragraph = { type: "paragraph", text: children.content };
        childrenParts.push(part);
        break;
      }
    }
  }

  const allParts = [...childrenParts, ...codeData.parts];

  if (allParts.length === 0) {
    error = "No parts found in code block";
  }

  return {
    type: "condition",
    condition: condition ?? "",
    true: allParts,
    ...(error ? { error, markdown: codeData.token?.content } : {}),
  };
}

export function parseMarkdown(markdown: string): Chapter[] {
  const tokens = md.parse(markdown, {});

  const chapters: Array<Chapter> = [];
  let chapter: Chapter = { parts: [] };
  let inHeading = false;
  let isFirstAction = true;
  const inCode: { active: boolean; parts: Part[]; token?: Token } = {
    active: false,
    parts: [],
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    let part: Part | undefined;

    if (!token) continue;

    if (token.type === "heading_open") {
      inHeading = true;
      chapter = { parts: [] };
    }
    if (token.type === "heading_close") {
      inHeading = false;
      chapters.push(chapter);
    }
    if (token.type === "inline") {
      const image = token.children?.find((token) => token.type === "image");
      const link = token.children?.find((token) => token.type === "link_open");
      const code = token.children?.find(
        (token) => token.type === "code_inline"
      );

      if (code) {
        const navigation = parseNavigation(code);
        if (navigation) {
          part = navigation;
        } else {
          const isStart = token.children?.at(0)?.content.endsWith("{");
          const isEnd = token.children?.at(-1)?.content.endsWith("}");
          if (isStart) {
            inCode.active = true;
            inCode.parts = [];
            inCode.token = token;
          }
          if (isEnd) {
            inCode.active = false;
            part = parseCode(inCode);
          }
        }
      } else if (image) {
        part = parseImage(image);
      } else if (link && token.children) {
        const text = token.children
          .filter((token) => token.type === "text")
          .map((token) => token.content)
          .join("");
        const linkOpenIndex =
          token.children.findIndex((token) => token.type === "link_open") ?? 0;
        const key = token.children[linkOpenIndex + 1]?.content.toLowerCase();
        const target = link.attrs
          ?.find(([key]) => key === "href")?.[1]
          ?.replace("#", "");
        if (text && target) {
          part = {
            type: "choice",
            text,
            target,
            key,
            markdown: token.content,
          };
        }
      } else {
        if (inHeading) {
          chapter.heading = token.content;
          chapter.id = encodeURIComponent(
            token.content.toLowerCase().replace(/ /g, "-")
          );
        } else {
          part = {
            type: "paragraph",
            text: token.content,
          };
        }
      }
    }
    if (token.type === "fence") {
      part = parseActionPart(token.content);
      if (isFirstAction) {
        isFirstAction = false;
        const { title, author, theme, voiceUrl, assistant, ...state } =
          part.state as State & Settings;
        part.state = state;

        chapter.settings = { title, author, theme, voiceUrl, assistant };
      }
    }

    if (part) {
      inCode.active ? inCode.parts.push(part) : chapter.parts.push(part);
    }
  }

  return chapters;
}

export function findImages(chapters: Chapter[]): Image[] {
  const images: Array<Image> = chapters.flatMap((chapter) => {
    const imageParts = chapter.parts.filter(
      (part) => part.type === "image"
    ) as Array<Image>;

    return imageParts;
  });

  return images;
}

export function renderMarkdown(markdown: string): string {
  return md.render(markdown);
}

export function markdownToStory(markdown: string, storyName: string): Story {
  const chapters = parseMarkdown(markdown);
  console.log("markdownToStory", chapters.at(0)?.settings);
  const story: Story = {
    id: storyName ?? "",
    title: chapters[0]?.heading ?? "",
    markdown: markdown,
    chapters,
    images: findImages(chapters),
    state: {},
    settings: chapters.at(0)?.settings ?? {},
  };
  return story;
}

export function storyToMarkdown(story: Story): string {
  return story.chapters.map((chapter) => chapterToMarkdown(chapter)).join("\n");
}

function chapterToMarkdown(chapter: Chapter): string {
  let ret = "";
  ret = ret + `## ${chapter.heading}\n`;
  ret = ret + partsToMarkdown(chapter.parts, chapter.settings);

  return ret;
}

export function partsToMarkdown(parts: Part[], settings?: Settings): string {
  return parts
    .map((part) => {
      switch (part.type) {
        case "paragraph":
          return `${part.text}\n\n`;
        case "image":
          return `![${part.text}](${part.url})\n\n`;
        case "choice":
          return `- [${part.text}](#${part.target})\n`;
        case "condition":
          return conditionToMarkdown(part) + "\n\n";
        case "navigation":
          return `\`->[${part.text}](${part.target})\`\n\n`;
        case "action":
          return (
            "```json\n" +
            (part.markdown
              ? part.markdown + part.error
              : JSON.stringify({ ...settings, ...part.state }, undefined, 2)) +
            "\n```\n\n"
          );
      }
    })
    .join("");
}

function conditionToMarkdown(code: Condition): string {
  let ret = "";
  ret = ret + "`" + code.condition + " {`\n\n";
  if (code.true) {
    ret = `${ret}${partsToMarkdown(code.true)}`;
  }
  if (code.false) {
    ret = ret + "`}:{`\n\n" + partsToMarkdown(code.false);
  }
  return ret + "`}`";
}

export function storyToMermaid(story: Story): string {
  let ret = "flowchart TD\n";
  for (const chapter of story.chapters) {
    ret = `${ret}    ${chapter.id}["${chapter.heading}"]\n`;
    for (const part of chapter.parts) {
      if (part.type === "choice") {
        ret = `${ret}    ${chapter.id} -->|${part.text}| ${part.target}\n`;
      }
    }
  }
  return ret;
}
