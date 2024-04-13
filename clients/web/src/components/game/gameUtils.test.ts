import { describe, expect, test } from "@jest/globals";
import { Action } from "../../types";
import { evaluateAction } from "./gameUtils";

describe("gameUtils", () => {
  describe("evaluateAction", () => {
    test("simple set action", () => {
      const action: Action = {
        type: "action",
        event: {
          rope: 1,
        },
      };
      const { state, renderPart } = evaluateAction(action, {});
      expect(state).toEqual({ rope: 1 });
      expect(renderPart.text).toEqual("rope: 0 -> 1");
    });

    test("simple increase action", () => {
      const action: Action = {
        type: "action",
        event: {
          rope: "+=2",
        },
      };
      const { state, renderPart } = evaluateAction(action, { rope: 1 });
      expect(state).toEqual({ rope: 3 });
      expect(renderPart.text).toEqual("rope: 1 -> 3");
    });

    test("simple decrease action", () => {
      const action: Action = {
        type: "action",
        event: {
          rope: "-=3",
        },
      };
      const { state, renderPart } = evaluateAction(action, { rope: 6 });
      expect(state).toEqual({ rope: 3 });
      expect(renderPart.text).toEqual("rope: 6 -> 3");
    });

    test("multiple states action", () => {
      const action: Action = {
        type: "action",
        event: {
          pancakes: "+=1",
          egg: "-=1",
          milk: "-=1",
        },
      };
      const { state, renderPart } = evaluateAction(action, { egg: 3, milk: 1 });
      expect(state).toEqual({ pancakes: 1, egg: 2, milk: 0 });
      expect(renderPart.text).toEqual(
        "pancakes: 0 -> 1, egg: 3 -> 2, milk: 1 -> 0"
      );
    });

    test("evaluate states", () => {
      const action: Action = {
        type: "action",
        event: {
          cupper: "gold * 100 + silver * 10 + cupper",
          gold: 0,
          silver: 0,
        },
      };
      const { state, renderPart } = evaluateAction(action, {
        gold: 3,
        silver: 14,
        cupper: 4,
      });
      expect(state).toEqual({ cupper: 444, gold: 0, silver: 0 });
      expect(renderPart.text).toEqual(
        "cupper: 4 -> 444, gold: 3 -> 0, silver: 14 -> 0"
      );
    });
  });
});
