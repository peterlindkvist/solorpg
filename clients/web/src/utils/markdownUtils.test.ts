import { describe, expect, test } from "@jest/globals";
import { parseMarkdown, partsToMarkdown } from "./markdownUtils";
import { Action, Condition, Image, Navigation, Paragraph } from "../types";

describe("markdownUtils", () => {
  describe("parseMarkdown", () => {
    describe("Header", () => {
      test("empty", () => {
        const markdown = "# Header";
        const chapters = parseMarkdown(markdown);
        expect(chapters).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [],
          },
        ]);
      });
    });
    describe("Paragraph", () => {
      test("paragraph", () => {
        const markdown = `# Header\ntext`;
        const chapters = parseMarkdown(markdown);
        expect(chapters).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "paragraph",
                text: "text",
              },
            ],
          },
        ]);
      });
    });
    describe("Image", () => {
      test("image", () => {
        const markdown = `# Header\n![imagetext](url)`;
        const chapters = parseMarkdown(markdown);
        expect(chapters).toEqual([
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
    });
    describe("Action", () => {
      test("Error", () => {
        const codeMarker = "```";
        const markdown = `# Header\n${codeMarker}\n{faulty}}\n${codeMarker}`;
        const chapters = parseMarkdown(markdown);
        expect(chapters).toEqual([
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
        const markdown = `# Header\n${codeMarker}\n{"test": 1}\n${codeMarker}`;
        const chapters = parseMarkdown(markdown);
        expect(chapters).toEqual([
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
        const markdown = `# Header\n${codeMarker}json\n{"test": 1}\n${codeMarker}`;
        const chapters = parseMarkdown(markdown);
        expect(chapters).toEqual([
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
        const markdown = `# Header\n${codeMarker}\n{test: 1, // comment \n}\n${codeMarker}`;
        const chapters = parseMarkdown(markdown);
        expect(chapters).toEqual([
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
    });
    describe("Code", () => {
      test("navigation", () => {
        const markdown = "# Header\n `->[text](target)`";
        const chapters = parseMarkdown(markdown);
        expect(chapters).toEqual([
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
        const codeMarkdown = "`1=1 {`\n text\n `}`";
        const markdown = `# Header\n ${codeMarkdown}`;
        const chapters = parseMarkdown(markdown);
        expect(chapters).toEqual([
          {
            heading: "Header",
            id: "header",
            parts: [
              {
                type: "condition",
                condition: "1=1",
                true: [{ type: "paragraph", text: "text" }],
              },
            ],
          },
        ]);
      });
      test("condition state", () => {
        const markdown = "# Header\n `1<2 {`\n ```\n{a:1}\n```\n`}`";
        const chapters = parseMarkdown(markdown);
        expect(chapters).toEqual([
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
              },
            ],
          },
        ]);
      });

      test("condition state", () => {
        const markdown = "# Header\n `1=1{`\n text2\n ```\n{a:1}\n```\n`}`";
        const chapters = parseMarkdown(markdown);
        expect(chapters).toEqual([
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
              },
            ],
          },
        ]);
      });
    });
  });
  describe.only("partsToMarkdown", () => {
    describe("paragraph", () => {
      test("simple", () => {
        const part: Paragraph = {
          type: "paragraph",
          text: "text",
        };

        const markdown = partsToMarkdown([part]);
        expect(markdown).toEqual("text\n\n");
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
        };
        const toEqual = "`[d6]<4 {`\n\ntext\n\n`}`\n\n";
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
  });
});
