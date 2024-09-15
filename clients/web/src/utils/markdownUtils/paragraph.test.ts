import { describe, expect, test } from "@jest/globals";
import { parseMarkdown, partsToMarkdown } from "./markdownUtils";
import { Paragraph } from "../../types";

describe("markdownUtils Paragraph", () => {
  describe("parseMarkdown", () => {
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

  describe("partsToMarkdown", () => {
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
});
