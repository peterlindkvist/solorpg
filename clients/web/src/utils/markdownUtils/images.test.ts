import { describe, expect, test } from "@jest/globals";
import { parseMarkdown, partsToMarkdown } from "./markdownUtils";
import { Image } from "../../types";

describe("markdownUtils Images", () => {
  describe("parseMarkdown", () => {
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
  describe("partsToMarkdown", () => {
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
});
