import { describe, expect, test } from "@jest/globals";
import { Action, Condition } from "../types";
import {
  evaluateAction,
  evaluateCondition,
  flatState,
  replaceWithState,
} from "./gameUtils";

describe("gameUtils", () => {
  describe("replaceWithState", () => {
    test("replaceWithState", () => {
      expect(replaceWithState("text", {})).toBe("text");
      expect(
        replaceWithState("{strength} d6", { strength: 4, agility: 3 })
      ).toBe("4 d6");
      expect(replaceWithState("{a} + {a} + {b}", { a: 2, b: 3 })).toBe(
        "2 + 2 + 3"
      );
    });
  });
  describe("evaluateCondition", () => {
    test("with dice", () => {
      const condition: Condition = {
        type: "condition",
        condition: "4+[d1] < 4",
      };
      const { isTrue, renderPart } = evaluateCondition(condition, {});
      expect(renderPart.text).toEqual("4+[d1] < 4 -> 4+1<4 -> false");
      expect(isTrue).toBe(false);
    });
    test("with variable", () => {
      const condition: Condition = {
        type: "condition",
        condition: "{strength} >= 12",
      };
      const { isTrue, renderPart } = evaluateCondition(condition, {
        strength: 14,
      });
      expect(renderPart.text).toEqual("{strength} >= 12 -> 14>=12 -> true");
      expect(isTrue).toBe(true);
    });
    test("with variable and dice", () => {
      const condition: Condition = {
        type: "condition",
        condition: "{strength} <= [2d1+20]",
      };
      const { isTrue, renderPart } = evaluateCondition(condition, {
        strength: 14,
      });
      expect(renderPart.text).toEqual(
        "{strength} <= [2d1+20] -> 14<=22 -> true"
      );
      expect(isTrue).toBe(true);
    });
  });
  describe("evaluateAction", () => {
    test("simple set action", () => {
      const action: Action = {
        type: "action",
        state: {
          rope: 1,
        },
      };
      const { state, renderPart } = evaluateAction(action, {});
      expect(state).toEqual({ rope: 1 });
      expect(renderPart.text).toEqual("rope: 1");
    });

    test("simple increase action", () => {
      const action: Action = {
        type: "action",
        state: {
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
        state: {
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
        state: {
          pancakes: "+=1",
          egg: "-=1",
          milk: "-=1",
        },
      };
      const { state, renderPart } = evaluateAction(action, { egg: 3, milk: 1 });
      expect(state).toEqual({ pancakes: 1, egg: 2, milk: 0 });
      expect(renderPart.text).toEqual("pancakes: 1, egg: 3 -> 2, milk: 1 -> 0");
    });

    test("evaluate calculation states", () => {
      const action: Action = {
        type: "action",
        state: {
          cupper: "{gold} * 100 + {silver} * 10 + {cupper}",
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

    test("evaluate with dices", () => {
      const action: Action = {
        type: "action",
        state: {
          rolld6: "[d1]",
        },
      };
      const { state, renderPart } = evaluateAction(action, {});

      expect(state.rolld6).toBe(1);
      expect(renderPart.text).toEqual("rolld6: [1]-> 1");
    });

    test("evaluate with object table", () => {
      const action: Action = {
        type: "action",
        state: {
          fruit: "{fruits.2}",
        },
      };
      const flattenState = flatState({
        fruits: {
          "1": "apple",
          "2": "banana",
        },
      });

      const { state, renderPart } = evaluateAction(action, flattenState);

      expect(state.fruit).toBe("banana");
      expect(renderPart.text).toEqual("fruit: banana");
    });

    test("evaluate with object table and dice", () => {
      const action: Action = {
        type: "action",
        state: {
          fruit: "{fruits.[d1]}",
        },
      };
      const flattenState = flatState({
        fruits: {
          "1": "apple",
          "2": "banana",
        },
      });

      const { state, renderPart } = evaluateAction(action, flattenState);

      expect(state.fruit).toBe("apple");
      expect(renderPart.text).toEqual("fruit: [1]-> apple");
    });

    test.only("evaluate with object table and variable", () => {
      const action: Action = {
        type: "action",
        state: {
          fruit: "{fruits.{rolld6}}",
        },
      };
      const flattenState = flatState({
        rolld6: "[d1]",
        fruits: {
          "1": "apple",
          "2": "banana",
        },
      });

      const { state, renderPart } = evaluateAction(action, flattenState);

      expect(state.fruit).toBe("apple");
      expect(renderPart.text).toEqual("fruit: [1]-> apple");
    });
  });
});
