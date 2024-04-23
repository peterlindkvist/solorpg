import markdownit, { Token } from "markdown-it";
import anchor from "markdown-it-anchor";
import json5 from "json5";
import balanced from "balanced-match";
import { Chapter, Code, Image, Part, State, Story } from "../types";

// default mode
const md = markdownit({
  linkify: true,
}).use(anchor);

function parseImage(image: Token): Image {
  const url = image.attrs?.find(([key]) => key === "src")?.[1];
  return {
    type: "image",
    text: image.content,
    url,
    markdown: `![${image.content}](${url ?? ""})`,
  };
}

function parseCode(token: Token, code: Token): Part | undefined {
  const conditionMatch = code.content.match(/^([^#{?]*)\?/);
  if (!conditionMatch) {
    return parseCodePart(code.content);
  } else {
    const condition = conditionMatch[0].replace(/\s*\?$/, "");
    const noCondition = code.content.replace(conditionMatch[0], "").trim();
    const balance = balanced("{", "}", noCondition);
    let truePart: Part | undefined = undefined;
    let falsePart: Part | undefined = undefined;
    if (!balance) {
      const parts = noCondition.split(":");
      truePart = parseCodePart(parts[0]);
      falsePart = parseCodePart(parts[1]);
    } else if (balance.start === 0) {
      truePart = parseCodePart(`{${balance.body}}`);
      falsePart = parseCodePart(
        noCondition.slice(balance.end + 1).replace(/^\s*:/, "")
      );
    } else {
      truePart = parseCodePart(
        noCondition.slice(0, balance.start - 1).replace(/\s*:/, "")
      );
      falsePart = parseCodePart(`{${balance.body}}`);
    }

    return {
      type: "code",
      condition,
      true: truePart,
      false: falsePart,
      markdown: code.content,
    };
  }
}

function parseCodePart(content: string): Part | undefined {
  if (content === undefined || content === "") {
    return undefined;
  }
  const trimmed = content.trim();
  if (trimmed.startsWith("#")) {
    return {
      type: "navigation",
      target: trimmed.slice(1),
    };
  } else if (trimmed.startsWith("{")) {
    return {
      type: "action",
      event: json5.parse(trimmed),
    };
  } else {
    return {
      type: "paragraph",
      text: content,
      markdown: content,
    };
  }
}

export function parseMarkdown(markdown: string): Chapter[] {
  const tokens = md.parse(markdown, {});
  // console.dir(tokens, { depth: 100 });

  const chapters: Array<Chapter> = [];
  let chapter: Chapter = { voice: "", parts: [] };
  let inHeading = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;

    if (token.type === "heading_open") {
      inHeading = true;
      chapter = { voice: "", parts: [] };
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
        const codePart = parseCode(token, code);
        if (codePart) {
          chapter.parts.push(codePart);
        }
      } else if (image) {
        chapter.parts.push(parseImage(image));
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
          chapter.voice = `${chapter.voice}${"\n"}${text}`;
          chapter.parts.push({
            type: "choice",
            text,
            target,
            key,
            markdown: token.content,
          });
        }
      } else {
        if (inHeading) {
          chapter.heading = token.content;
          chapter.id = encodeURIComponent(
            token.content.toLowerCase().replace(/ /g, "-")
          );
        } else {
          const text =
            chapter.text === undefined
              ? token.content
              : `${chapter.text}\n\n${token.content}`;
          chapter.voice = `${chapter.voice}${"\n"}${token.content}`;
          chapter.text = text;
          chapter.parts.push({
            type: "paragraph",
            text: token.content,
            markdown: token.content,
          });
        }
      }
    }
    if (token.type === "fence") {
      try {
        chapter.state = json5.parse(token.content);
      } catch (e) {
        console.error(token.content, e);
        const error = e instanceof Error ? e : new Error("Parse error");
        chapter.state = { error: error.message };
      }
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
  // for (const chapter of chapters) {
  //   if (chapter.parts.filter((part) => part.type === "image"){
  //     images.push(chapter.image);
  //   }
  // }
  return images;
}

export function renderMarkdown(markdown: string): string {
  return md.render(markdown);
}

export function markdownToStory(markdown: string, storyName: string): Story {
  const chapters = parseMarkdown(markdown);
  const state: State = chapters[0]?.state ?? {};
  const story: Story = {
    id: storyName ?? "",
    title: state.title ?? chapters[0]?.heading ?? "",
    markdown: markdown,
    chapters,
    images: findImages(chapters),
    state,
  };
  return story;
}

export function storyToMarkdown(story: Story): string {
  return story.chapters.map((chapter) => chapterToMarkdown(chapter)).join("\n");
}

function chapterToMarkdown(chapter: Chapter): string {
  let ret = "";
  ret = ret + `## ${chapter.heading}\n`;
  if (chapter.state) {
    ret =
      ret + "```\n" + JSON.stringify(chapter.state, undefined, 2) + "\n```\n\n";
  }
  ret =
    ret +
    chapter.parts
      .map((part) => {
        switch (part.type) {
          case "paragraph":
            return `${part.text}\n\n`;
          case "image":
            return `![${part.text}](${part.url})\n\n`;
          case "choice":
            return `- [${part.text}](#${part.target})\n`;
          case "action":
            return "`" + JSON.stringify(part.event) + "`\n\n";
          case "code":
            return "`" + codeToMarkdown(part) + "`\n\n";
          case "navigation":
            return `#${part.target}\n`;
        }
      })
      .join("");
  return ret;
}

function codeToMarkdown(code: Code): string {
  console.log("codeToMarkdown", code);
  let ret = "";
  ret = ret + `${code.condition} ?`;
  if (code.true) {
    ret = `${ret} ${codePartToMarkdown(code.true)}`;
  }
  if (code.false) {
    ret = `${ret} : ${codePartToMarkdown(code.false)}`;
  }
  return `${ret}`;
}

function codePartToMarkdown(event: Part): string {
  switch (event.type) {
    case "paragraph":
      return `${event.text}`;
    case "navigation":
      return `#${event.target}`;
    case "action":
      return JSON.stringify(event.event);
    default:
      return "";
  }
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
