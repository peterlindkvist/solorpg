import { describe, expect, test } from "@jest/globals";
import type { Condition } from "../../types";
import { parseMarkdown, partsToMarkdown } from "./markdownUtils";

describe("markdownUtils Code", () => {
  describe("parseMarkdown", () => {
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
      const codeMarkdown = "`1=1 {`\n\n textA\ntextB\n\n`}:{`\n\ntext2\n\n`}`";
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

    test("example 1", () => {
      const markdown = [];
      markdown.push("### Header");
      markdown.push("`{dice}>=0 & {dice}<=2 {`");
      markdown.push(
        " - [Om du har pekat ut en siffra mellan 0 och 2,](#chapter-108)"
      );
      markdown.push(" `}`");
      markdown.push(" `{dice}>=3 & {dice}<=9 {`");
      markdown.push(" - [Om siffran är mellan 3 och 9,](#chapter-25)");
      markdown.push(" `}`");

      const story = parseMarkdown(markdown.join("\n\n"));

      expect(story.sections).toEqual([
        {
          heading: "Header",
          id: "header",
          parts: [
            {
              type: "condition",
              condition: "{dice}>=0 & {dice}<=2",
              true: [
                {
                  target: "#chapter-108",
                  text: "Om du har pekat ut en siffra mellan 0 och 2,",
                  type: "link",
                },
              ],
              false: [],
            },
            {
              type: "condition",
              condition: "{dice}>=3 & {dice}<=9",
              true: [
                {
                  target: "#chapter-25",
                  text: "Om siffran är mellan 3 och 9,",
                  type: "link",
                },
              ],
              false: [],
            },
          ],
        },
      ]);
    });
  });

  describe("partsToMarkdown", () => {
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
  });
});
