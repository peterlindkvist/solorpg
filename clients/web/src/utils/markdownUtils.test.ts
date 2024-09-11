import { describe, expect, test } from "@jest/globals";
import { parseMarkdown, partsToMarkdown } from "./markdownUtils";
import {
  Action,
  Link,
  Condition,
  Image,
  Navigation,
  Paragraph,
} from "../types";

describe("markdownUtils", () => {
  describe("parseMarkdown", () => {
    describe("Introduction", () => {
      test("simple introduction", () => {
        const markdown = "# Header\n\n test\n\n ### Subheader";
        const story = parseMarkdown(markdown);
        expect(story.title).toEqual("Header");
        expect(story.description).toEqual([
          { type: "paragraph", text: "test" },
        ]);
        expect(story.sections).toEqual([
          {
            heading: "Subheader",
            id: "subheader",
            parts: [],
          },
        ]);
      });
      test("introduction with settings", () => {
        const markdown =
          '# Header\n\n test\n\n ```\n{\n"a": 2\n}\n``` \n\n ## Subheader';
        const story = parseMarkdown(markdown);
        expect(story.title).toEqual("Header");
        expect(story.description).toEqual([
          { type: "paragraph", text: "test" },
        ]);
        expect(story.settings).toEqual({ type: "action", state: { a: 2 } });
        expect(story.sections).toEqual([
          {
            heading: "Subheader",
            id: "subheader",
            parts: [
              {
                type: "header",
                text: "Subheader",
              },
            ],
          },
        ]);
      });
    });

    describe("Header", () => {
      test("empty", () => {
        const markdown = "### Header";
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [],
          },
        ]);
      });
    });
    describe("Paragraph", () => {
      test("normal text", () => {
        const markdown = `### Header\ntextA\n\ntextB1 textB2\ntestC1 testC2`;
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "paragraph",
                text: "textA",
              },
              {
                type: "paragraph",
                text: "textB1 textB2\ntestC1 testC2",
              },
            ],
          },
        ]);
      });
      test("blockquote text", () => {
        const markdown = `### Header\n>text`;
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "paragraph",
                text: "text",
                variant: "blockquote",
              },
            ],
          },
        ]);
      });

      test("citation text", () => {
        const markdown = `### Header\n\n - text`;
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "paragraph",
                text: "text",
                variant: "citation",
              },
            ],
          },
        ]);
      });
    });
    describe("Image", () => {
      test("image", () => {
        const markdown = `### Header\n![imagetext](url)`;
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "image",
                text: "imagetext",
                url: "url",
              },
            ],
          },
        ]);
      });
      test("image with comment", () => {
        const markdown = `### Header\n![imagetext](url)<!--- great image -->`;
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "image",
                text: "imagetext",
                url: "url",
                description: "great image",
              },
            ],
          },
        ]);
      });
      test("2 images", () => {
        const markdown = `### Header\n![imagetext](url)<!--- great image -->![imagetext2](url2)`;
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "image",
                text: "imagetext",
                url: "url",
                description: "great image",
              },
              {
                type: "image",
                text: "imagetext2",
                url: "url2",
              },
            ],
          },
        ]);
      });
    });

    describe("Action", () => {
      test("Error", () => {
        const codeMarker = "```";
        const markdown = `### Header\n${codeMarker}\n{faulty}}\n${codeMarker}`;
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "action",
                markdown: `{faulty}}\n`,
                state: {},
                error: "JSON5: invalid character '}' at 1:8",
              },
            ],
          },
        ]);
      });
      test("JSON", () => {
        const codeMarker = "```";
        const markdown = `### Header\n${codeMarker}\n{"test": 1}\n${codeMarker}`;
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "action",
                state: { test: 1 },
              },
            ],
          },
        ]);
      });
      test("JSON", () => {
        const codeMarker = "```";
        const markdown = `### Header\n${codeMarker}json\n{"test": 1}\n${codeMarker}`;
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "action",
                state: { test: 1 },
              },
            ],
          },
        ]);
      });
      test("JSON5", () => {
        const codeMarker = "```";
        const markdown = `### Header\n${codeMarker}\n{test: 1, // comment \n}\n${codeMarker}`;
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "action",
                state: { test: 1 },
              },
            ],
          },
        ]);
      });
      test("With dice", () => {
        const codeMarker = "```";
        const markdown = `### Header\n${codeMarker}\n {"rollVarableD10": "[{strength}d10]"\n}\n${codeMarker}`;
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "action",
                state: { rollVarableD10: "[{strength}d10]" },
              },
            ],
          },
        ]);
      });
    });
    describe("Code", () => {
      test("navigation", () => {
        const markdown = "### Header\n `->[text](target)`";
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "navigation",
                text: "text",
                target: "target",
              },
            ],
          },
        ]);
      });
      test("condition one text", () => {
        const codeMarkdown = "`1=1 {`\n\n text\n\n `}`";
        const markdown = `### Header\n ${codeMarkdown}`;
        const story = parseMarkdown(markdown);

        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "condition",
                condition: "1=1",
                true: [{ type: "paragraph", text: "text" }],
                false: [],
              },
            ],
          },
        ]);
      });
      test("condition else text", () => {
        const codeMarkdown =
          "`1=1 {`\n\n textA\ntextB\n\n`}:{`\n\ntext2\n\n`}`";
        const markdown = `### Header\n ${codeMarkdown}`;
        const story = parseMarkdown(markdown);

        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "condition",
                condition: "1=1",
                true: [{ type: "paragraph", text: "textA\ntextB" }],
                false: [{ type: "paragraph", text: "text2" }],
              },
            ],
          },
        ]);
      });
      test("condition state", () => {
        const markdown = "### Header\n `1<2 {`\n ```\n{a:1}\n```\n`}`";
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "condition",
                condition: "1<2",
                true: [
                  {
                    type: "action",
                    state: { a: 1 },
                  },
                ],
                false: [],
              },
            ],
          },
        ]);
      });

      test("condition state", () => {
        const markdown = "### Header\n `1=1{`\n text2\n ```\n{a:1}\n```\n`}`";
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "condition",
                condition: "1=1",
                true: [
                  { type: "paragraph", text: "text2" },
                  {
                    type: "action",
                    state: { a: 1 },
                  },
                ],
                false: [],
              },
            ],
          },
        ]);
      });

      test("condition missing end", () => {
        const markdown = "### Header\n `1=1{`\n text1\n\ntext2\n\n";
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "condition",
                condition: "1=1",
                true: [],
                false: [],
              },
              { type: "paragraph", text: "text1" },
              { type: "paragraph", text: "text2" },
            ],
          },
        ]);
      });

      test("condition new condition", () => {
        const markdown = "### Header\n `1=1{`\n text1\n\n`2=2{`\n\n`}`";
        const story = parseMarkdown(markdown);

        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "condition",
                condition: "1=1",
                true: [],
                false: [],
              },
              { type: "paragraph", text: "text1" },
              {
                type: "condition",
                condition: "2=2",
                true: [],
                false: [],
              },
            ],
          },
        ]);
      });

      test("condition close end", () => {
        const markdown = "### Header\n `1=1{`\n text1\n\ntext2\n`}`\n\ntext3";
        const story = parseMarkdown(markdown);

        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "condition",
                condition: "1=1",
                true: [
                  { type: "paragraph", text: "text1" },
                  { type: "paragraph", text: "text2" },
                ],
                false: [],
              },
              { type: "paragraph", text: "text3" },
            ],
          },
        ]);
      });

      test("condition close after end", () => {
        const markdown = "### Header\n `1=1{`\n text1\n\n`}`\ntext3";
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "condition",
                condition: "1=1",
                true: [{ type: "paragraph", text: "text1" }],
                false: [],
              },
              { type: "paragraph", text: "text3" },
            ],
          },
        ]);
      });

      test("condition with else", () => {
        let markdown = "### Header\n\n";
        markdown += " `[d20] <= {agility} {`\n\n";
        markdown += "You take a graceful jump over the fence\n\n";
        markdown += "`}: {`\n\n";
        markdown +=
          "You stumple on the sharp rezorfence but manage to get over.\n\n";
        markdown += "`}`";
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "condition",
                condition: "[d20] <= {agility}",
                true: [
                  {
                    type: "paragraph",
                    text: "You take a graceful jump over the fence",
                  },
                ],
                false: [
                  {
                    type: "paragraph",
                    text: "You stumple on the sharp rezorfence but manage to get over.",
                  },
                ],
              },
            ],
          },
        ]);
      });
    });
    describe("Comments", () => {
      test("simple comment", () => {
        const markdown = "### Header\n\n test\n\n<!-- one comment -->\n\n";
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "paragraph",
                text: "test",
              },
              {
                type: "comment",
                text: "one comment",
              },
            ],
          },
        ]);
      });
      test("mermaid comment", () => {
        const markdown =
          "### Header\n\n test\n\n<!-- This chart is autogenerated -->\n\n";
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "paragraph",
                text: "test",
              },
            ],
          },
        ]);
      });
    });
    describe("Links", () => {
      test("simple links", () => {
        const markdown = "### Header\n\n [text](#url)\n\n";
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "link",
                text: "text",
                target: "#url",
              },
            ],
          },
        ]);
      });
      test("link list", () => {
        const markdown = "### Header\n\n - [text](#url)\n- [text2](#url2)";
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "link",
                text: "text",
                target: "#url",
              },
              {
                type: "link",
                text: "text2",
                target: "#url2",
              },
            ],
          },
        ]);
      });
      test("links close to text", () => {
        // Do not support links or images in paragraph
        const markdown = "### Header\n\n [text](#url)\ntext2";
        const story = parseMarkdown(markdown);
        expect(story.sections).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "link",
                text: "text",
                target: "#url",
              },
              { type: "paragraph", text: "text2" },
            ],
          },
        ]);
      });
    });
  });
  describe("partsToMarkdown", () => {
    describe("paragraph", () => {
      test("normal", () => {
        const part: Paragraph = {
          type: "paragraph",
          text: "text",
        };

        const markdown = partsToMarkdown([part]);
        expect(markdown).toEqual("text\n\n");
      });
      test("blockquote", () => {
        const part: Paragraph = {
          type: "paragraph",
          text: "text",
          variant: "blockquote",
        };

        const markdown = partsToMarkdown([part]);
        expect(markdown).toEqual("> text\n\n");
      });
      test("citations", () => {
        const part: Paragraph = {
          type: "paragraph",
          text: "text",
          variant: "citation",
        };

        const markdown = partsToMarkdown([part]);
        expect(markdown).toEqual("- text\n\n");
      });
    });
    describe("image", () => {
      test("simple", () => {
        const part: Image = {
          type: "image",
          text: "text",
          url: "url",
        };

        const markdown = partsToMarkdown([part]);
        expect(markdown).toEqual("![text](url)\n\n");
      });
    });
    describe("navigation", () => {
      test("simple", () => {
        const part: Navigation = {
          type: "navigation",
          text: "text",
          target: "url",
        };

        const markdown = partsToMarkdown([part]);
        expect(markdown).toEqual("`->[text](url)`\n\n");
      });
    });
    describe("action", () => {
      test("simple", () => {
        const part: Action = {
          type: "action",
          state: { test: 1, test2: "A" },
        };

        const markdown = partsToMarkdown([part]);
        const toEqual =
          "```json\n" + JSON.stringify(part.state, undefined, 2) + "\n```\n\n";
        expect(markdown).toEqual(toEqual);
      });
    });

    describe("condition", () => {
      test("text", () => {
        const part: Condition = {
          type: "condition",
          condition: "[d6]<4",
          true: [
            {
              type: "paragraph",
              text: "text",
            },
          ],
          false: [],
        };
        const toEqual = "`[d6]<4 {`\n\ntext\n\n`}`\n\n";
        const markdown = partsToMarkdown([part]);

        expect(markdown).toEqual(toEqual);
      });
      test("with else", () => {
        const part: Condition = {
          type: "condition",
          condition: "[d6]<4",
          true: [
            {
              type: "paragraph",
              text: "text1",
            },
          ],
          false: [
            {
              type: "paragraph",
              text: "text2",
            },
          ],
        };
        const toEqual = "`[d6]<4 {`\n\ntext1\n\n`}:{`\n\ntext2\n\n`}`\n\n";
        const markdown = partsToMarkdown([part]);

        expect(markdown).toEqual(toEqual);
      });
      test("with action", () => {
        const state = { roll: "[d6]" };
        const part: Condition = {
          type: "condition",
          condition: "[d6]<4",
          true: [
            {
              type: "action",
              state,
            },
          ],
          false: [],
        };
        const toEqual =
          "`[d6]<4 {`\n\n" +
          "```json\n" +
          JSON.stringify(state, undefined, 2) +
          "\n```\n\n`}`\n\n";
        const markdown = partsToMarkdown([part]);
        expect(markdown).toEqual(toEqual);
      });
    });

    describe("Links", () => {
      test("simple link", () => {
        const part: Link = {
          type: "link",
          target: "#url",
          text: "text",
        };
        const toEqual = "- [text](#url)\n\n";
        const markdown = partsToMarkdown([part]);

        expect(markdown).toEqual(toEqual);
      });

      test("link list", () => {
        const part: Link = {
          type: "link",
          target: "#url",
          text: "text",
        };
        const part2: Link = {
          type: "link",
          target: "#url2",
          text: "text2",
        };
        const toEqual = "- [text](#url)\n- [text2](#url2)\n\n";
        const markdown = partsToMarkdown([part, part2]);

        expect(markdown).toEqual(toEqual);
      });
    });
  });
});
