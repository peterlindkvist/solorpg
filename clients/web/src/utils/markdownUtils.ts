import markdownit from "markdown-it";
import anchor from "markdown-it-anchor";
import json5 from "json5";
import {
  Action,
  Section,
  Link,
  Condition,
  Image,
  Navigation,
  Part,
  Story,
  Paragraph,
} from "../types";

// default mode
const md = markdownit({
  linkify: true,
}).use(anchor);

const mermaidComment = "<!-- This chart is autogenerated -->";

type CodeData = {
  active: boolean;
  trueParts: Part[];
  falseParts: Part[];
  token?: SimpleToken;
  isTruePart: boolean;
};

function parseImage(
  token: SimpleToken,
  description?: string
): Image | undefined {
  return {
    type: "image",
    text: token.content,
    url: token.attrs?.src ?? "",
    ...(description ? { description } : undefined),
  };
}

function parseNavigation(code: SimpleToken): Part | undefined {
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
  const noErrorMessages = content.replace(/\nJSON5:.*/g, "");
  try {
    const state = json5.parse(noErrorMessages);
    return {
      type: "action",
      state,
    };
  } catch (e) {
    const error = e instanceof Error ? e : new Error("unknown error");
    return {
      type: "action",
      markdown: noErrorMessages,
      state: {},
      error: error.message,
    };
  }
}

function parseCode(codeData: CodeData): Condition {
  let error: string | undefined;

  const condition = codeData.token?.content.replace(/\s*\{\s*?$/, "");

  if (!condition) {
    error = "Could not parse condition";
  }

  return {
    type: "condition",
    condition: condition ?? "",
    true: codeData.trueParts,
    false: codeData.falseParts,
    ...(error ? { error, markdown: codeData.token?.content } : {}),
  };
}

type SimpleToken = {
  type: string;
  tag?: string;
  content: string;
  info?: string;
  attrs?: Record<string, string>;
  parentType?: string;
  container: string[];
  children?: SimpleToken[];
};

function markdownToSimpleTokens(markdown: string): SimpleToken[] {
  const allTokens = md.parse(markdown, {});
  const ret: SimpleToken[] = [];

  const tokens = allTokens.filter((token) =>
    [
      "heading_open",
      "heading_close",
      "inline",
      "fence",
      "blockquote_open",
      "blockquote_close",
      "code_inline",
      "image",
      "text",
      "link_open",
      "link_close",
      "list_item_open",
      "list_item_close",
    ].includes(token.type)
  );

  for (const token of tokens) {
    const { type, tag, content, info, children } = token;
    const tokenChildren: SimpleToken[] = [];

    const simpleToken = {
      type,
      tag,
      content,
      info,
      children: [],
      container: [],
    };
    for (const child of children ?? []) {
      tokenChildren.push({
        type: child.type,
        tag: child.tag,
        content: child.content,
        attrs: child.attrs?.reduce(
          (acc, [key, value]) => ({ ...acc, [key]: value }),
          {} as Record<string, string>
        ),
        info: child.info,
        parentType: type,
        container: [],
      });
    }
    ret.push(simpleToken);
    ret.push(...tokenChildren);
  }

  const container: string[] = [];
  let tag: string | undefined;

  for (const token of ret) {
    if (token.type.endsWith("_open")) {
      container.push(token.type);
      tag = token.tag;
    }

    token.container = [...container];
    token.tag = tag;

    if (token.type.endsWith("_close")) {
      container.pop();
      tag = undefined;
    }
  }

  return ret;
}

function isComment(text?: string): boolean {
  return text?.startsWith("<!---") ?? false;
}

function parseComment(text: string): string {
  return text
    .replace(/^<!-{1,3}/, "")
    .replace(/-->$/, "")
    .trim();
}

export function parseMarkdown(markdown: string): Story {
  const tokens = markdownToSimpleTokens(markdown);

  const sections: Array<Section> = [];
  let section: Section = { parts: [] };
  let inChapterIntro = false;
  let inLink: Link | undefined;
  let inParagraph: Paragraph | undefined;
  let storyName = "";

  const storyDescription: Part[] = [];

  const inCode: CodeData = {
    active: false,
    isTruePart: true,
    trueParts: [],
    falseParts: [],
  };

  let skipNext = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const nextToken = tokens[i + 1];
    let part: Part | undefined;

    if (!token) {
      continue;
    }
    if (skipNext) {
      skipNext = false;
      continue;
    }

    if (token.type === "heading_open") {
      inChapterIntro = token.tag === "h1";
      section = { parts: [] };
    }
    if (token.type === "heading_close") {
      if (!inChapterIntro) {
        sections.push(section);
      }
    }

    if (token.type === "link_open") {
      inLink = {
        type: "link",
        text: "",
        target: token.attrs?.["href"] ?? "",
      };
    }
    if (token.type === "link_close") {
      part = inLink;
      inLink = undefined;
    }

    if (token.type === "text") {
      if (token.container.includes("heading_open")) {
        if (token.tag === "h1") {
          storyName = token.content;
        } else {
          const heading = token.content.replace(/<!---.*-->/, "").trim();
          section.heading = heading;
          section.id = encodeURIComponent(
            heading.toLowerCase().replace(/ /g, "-")
          );
          if (token.tag === "h2") {
            part = {
              type: "header",
              text: heading,
            };
          }
        }
      } else if (inLink) {
        inLink.text = token.content;
      } else {
        if (inParagraph) {
          inParagraph.text += token.content;
        } else {
          const inBlockQuote = token.container.includes("blockquote_open");
          const inBulletList = token.container.includes("list_item_open");
          inParagraph = {
            type: "paragraph",
            text: token.content,
            ...(inBlockQuote || inBulletList
              ? {
                  variant: inBlockQuote ? "blockquote" : "citation",
                }
              : {}),
          };
        }
      }
    } else if (token.type === "image") {
      let description: string | undefined;
      if (isComment(nextToken?.content)) {
        skipNext = true;
        description = parseComment(nextToken?.content);
      }
      part = parseImage(token, description);
    } else if (token.type === "softbreak") {
      if (inParagraph && nextToken?.type === "text") {
        inParagraph.text += "\n";
      }
    } else if (token.type === "fence" && token.info !== "mermaid") {
      part = parseActionPart(token.content);
    } else if (token.type === "code_inline") {
      const navigation = parseNavigation(token);
      if (navigation) {
        part = navigation;
      } else {
        const isMiddle = token.content === "}:{";
        const isStart = isMiddle ? false : token.content.endsWith("{");
        const isEnd = isMiddle ? false : token.content.endsWith("}");
        const remainingTokens = tokens.slice(i + 1);

        const nextCode = remainingTokens.find(
          (rt) => rt.type === "code_inline"
        );
        const nextCodeIsStart =
          (nextCode?.content.endsWith("{") && nextCode?.content !== "}:{") ??
          false;

        // console.log("****code", {
        //   isStart,
        //   isMiddle,
        //   isEnd,
        //   inCode,
        //   nextCode,
        //   nextCodeIsStart,
        //   token,
        // });
        if (isStart) {
          inCode.active = true;
          inCode.isTruePart = true;
          inCode.trueParts = [];
          inCode.falseParts = [];
          inCode.token = token;
        }
        if (isMiddle) {
          inCode.isTruePart = false;
        }
        if (isEnd || !nextCode || nextCodeIsStart) {
          inCode.active = false;
          part = parseCode(inCode);
        }
      }
    }

    if (inParagraph && !nextToken) {
      part = inParagraph;
      inParagraph = undefined;
    }

    if (inParagraph && !["text", "softbreak"].includes(nextToken.type)) {
      part = inParagraph;
      inParagraph = undefined;
    }

    if (part) {
      if (inChapterIntro) {
        storyDescription.push(part);
      } else {
        if (inCode.active) {
          inCode.isTruePart
            ? inCode.trueParts.push(part)
            : inCode.falseParts.push(part);
        } else {
          section.parts.push(part);
        }
      }
    }
  }

  const settings = (storyDescription.find(
    (part) => part.type === "action"
  ) as Action) ?? {
    type: "action",
    state: { author: "" },
  };

  return {
    title: storyName ?? "",
    description: storyDescription.filter((part) => part.type !== "action"),
    markdown: markdown,
    sections,
    images: findImages(sections),
    state: {},
    settings,
  };
}

export function findImages(sections: Section[]): Image[] {
  const images: Array<Image> = sections.flatMap((section) => {
    const imageParts = section.parts.filter(
      (part) => part.type === "image"
    ) as Array<Image>;

    return imageParts;
  });

  return images;
}

export function renderMarkdown(markdown: string): string {
  return md.render(markdown);
}

export function storyToMarkdown(story: Story): string {
  const mermaid = storyToMermaid(story);
  const intro = introToMarkdown(story);
  const sections = story.sections
    .map((section) => sectionToMarkdown(section))
    .join("\n");
  return `${intro}\n\n${sections}\n\n${mermaidComment}\n\`\`\`mermaid\n${mermaid}\n\`\`\``;
}

export function introToMarkdown(story: Story): string {
  const title = `# ${story.title || "???????"}\n\n`;
  const settings = actionToMarkdown(story.settings);
  const description = story.description
    ? partsToMarkdown(story.description)
    : "";
  return `${title}${description}${settings}`;
}

export function sectionToMarkdown(section: Section): string {
  let ret = "";
  const visibleHeading = section.parts.find((p) => p.type === "header");
  const headerSize = visibleHeading ? "##" : "###";
  ret = ret + `${headerSize} ${section.heading} <!--- #${section.id} -->\n\n`;
  ret = ret + partsToMarkdown(section.parts);

  return ret;
}

export function partsToMarkdown(parts: Part[]): string {
  return parts
    .map((part, i) => {
      switch (part.type) {
        case "paragraph":
          if (part.variant === "blockquote") {
            return `> ${part.text}\n\n`;
          } else if (part.variant === "citation") {
            return `- ${part.text}\n\n`;
          }
          return `${part.text}\n\n`;
        case "comment":
          return `<!--- ${part.text} -->\n\n`;
        case "image": {
          const description = part.description
            ? `<!--- ${part.description} -->\n`
            : "";
          return `${description}![${part.text}](${part.url})\n\n`;
        }
        case "link": {
          const nextPart = parts.at(i + 1);
          const postNewlines = nextPart?.type === "link" ? "\n" : "\n\n";
          return `- [${part.text}](${part.target})${postNewlines}`;
        }
        case "condition":
          return conditionToMarkdown(part) + "\n\n";
        case "navigation":
          return `\`->[${part.text}](${part.target})\`\n\n`;
        case "action": {
          return actionToMarkdown(part) + "\n\n";
        }
      }
    })
    .join("");
}

function actionToMarkdown(action: Action): string {
  return (
    "```json\n" +
    (action.markdown
      ? action.markdown + action.error
      : JSON.stringify(action.state, undefined, 2)) +
    "\n```"
  );
}

function conditionToMarkdown(code: Condition): string {
  let ret = "";
  ret = ret + "`" + code.condition + " {`\n\n";
  if (code.true.length > 0) {
    ret = `${ret}${partsToMarkdown(code.true)}`;
  }
  if (code.false.length > 0) {
    ret = ret + "`}:{`\n\n" + partsToMarkdown(code.false);
  }
  return ret + "`}`";
}

export function storyToMermaid(story: Story): string {
  let ret = "flowchart TD\n";
  for (const section of story.sections) {
    const hasAction = section.parts.find((part) => part.type === "action");
    const hasCondition = section.parts.find(
      (part) => part.type === "condition"
    );
    const icons = `${hasAction ? " ⭐" : ""} ${hasCondition ? " ⎇" : ""}`;

    ret = `${ret}    ${section.id}["${section.heading}${icons}"]\n`;
    ret = `${ret}    click ${section.id} "#${section.id}"\n`;
    for (const part of section.parts) {
      if (part.type === "link") {
        const target = part.target.replace(/^#/, "");
        ret = `${ret}    ${section.id} -->|"${part.text}"| ${target}\n`;
      }
      if (part.type === "condition") {
        const navigationPart = part.true?.find((part) =>
          ["navigation", "link"].includes(part.type)
        ) as Navigation | Link | undefined;
        if (navigationPart) {
          const target = navigationPart.target.replace(/^#/, "");
          ret = `${ret}    ${section.id} -.->|"${part.condition}"| ${target}\n`;
        }
      }
    }
  }
  return ret;
}
