import { flatten, unflatten } from "safe-flat";
import { Parser } from "expr-eval";
import { Action, Chapter, Condition, Part, State } from "../types";
import { DiceRoll } from "@dice-roller/rpg-dice-roller";

type FlattenState = Record<string, string | number>;

export function parseChapter(
  chapter: Chapter,
  state: State
): {
  parts: Part[];
  newState: State;
} {
  let newState: FlattenState = flatten(state) as FlattenState;
  const renderParts = [];
  for (const part of chapter.parts) {
    if (["image", "paragraph", "choice"].includes(part.type)) {
      renderParts.push(part);
    } else if (part.type === "navigation") {
      renderParts.push(part);
      break;
    } else if (part.type === "condition") {
      const result = evaluateCondition(part, newState);
      const codeParts = result.isTrue ? part.true : part.false;

      renderParts.push(result.renderPart);

      for (const codePart of codeParts ?? []) {
        if (codePart.type === "paragraph") {
          renderParts.push(codePart);
        } else if (codePart.type === "navigation") {
          renderParts.push(codePart);
          break;
        } else if (codePart.type === "action") {
          const { state, renderPart } = evaluateAction(codePart, newState);
          newState = state;
          renderParts.push(renderPart);
        }
      }
    } else if (part.type === "action") {
      const { state, renderPart } = evaluateAction(part, newState);
      newState = state;
      renderParts.push(renderPart);
    }
  }

  return { parts: renderParts, newState: unflatten(newState) as State };
}

export function evaluateAction(
  action: Action,
  flattenState: FlattenState
): { renderPart: Action; state: FlattenState } {
  const withMissingKeys = {
    ...Object.fromEntries(Object.keys(action.state).map((key) => [key, 0])),
    ...flattenState,
  };
  withMissingKeys;
  const texts: string[] = [];

  const newValues = Object.fromEntries(
    Object.entries(action.state).map(([key, value]) => {
      const oldValue = flattenState[key];
      const { value: newValue, rolls } = evaluateActionValue(
        key,
        value,
        withMissingKeys
      );
      if (oldValue !== newValue) {
        let text = oldValue ? `${oldValue} -` : "";
        text = `${text}${rolls ? `${rolls}` : ""}`;
        text = `${text}${oldValue || rolls ? "->" : ""}`;
        text = `${text} ${newValue}`;
        console.log("text", { oldValue, newValue });
        texts.push(`${key}: ${text}`);
      }

      // const start = oldValue ? `${oldValue} -` : "";
      // const arrow = rolls ? `${rolls}->` : "->";
      return [key, newValue];
    })
  );
  return {
    renderPart: { ...action, text: texts.join(", ") },
    state: { ...flattenState, ...newValues },
  };
}

export function evaluateCondition(
  condition: Condition,
  state: FlattenState
): { isTrue: boolean; renderPart: Condition } {
  const withState = replaceWithState(condition.condition, state);
  const noSpace = withState.replaceAll(" ", "");
  const withRolledDices = rollDices(noSpace);
  const newValue = evaluateValue(withRolledDices.value);
  const text = `${condition.condition} -> ${withRolledDices.value} -> ${newValue}`;
  return {
    isTrue: !!newValue,
    renderPart: { ...condition, text },
  };
}

function evaluateActionValue(
  key: string,
  value: string | number,
  state: FlattenState
): { value: string | number; rolls?: string } {
  const oldValue = state[key] ?? 0;
  const withoutPrefix = replacePrefix(key, value);
  const withState = replaceWithState(withoutPrefix, state);
  const noSpace = withState.replaceAll(" ", "");
  const withRolledDices = rollDices(noSpace);
  const newValue = evaluateValue(withRolledDices.value) ?? oldValue;
  return {
    value: newValue,
    ...(withRolledDices ? { rolls: withRolledDices.rolls } : {}),
  };
}

function replacePrefix(key: string, value: string | number): string {
  if (typeof value === "number") {
    return value.toString();
  } else {
    if (value.startsWith("+=")) {
      return `$${key} + ${value.slice(2)}`;
    }
    if (value.startsWith("-=")) {
      return `$${key} - (${value.slice(2)})`;
    }
    return value;
  }
}

export function replaceWithState(text: string, state: FlattenState): string {
  let ret = text;
  for (const [key, value] of Object.entries(state)) {
    ret = ret.replaceAll(`$${key}`, value.toString());
  }
  return ret;
}

function rollDices(value: string): { value: string; rolls?: string } {
  const diceMatches = Array.from(value.matchAll(/\[(.*)\]/g));
  if (diceMatches.length === 0) {
    return { value };
  }
  const ret = { value, rolls: "" };
  for (const match of diceMatches) {
    const roll = new DiceRoll(match[1]);
    const endStart = (match.index ?? 0) + match[1].length + 2;

    return {
      value:
        ret.value.substring(0, match.index) +
        roll.total.toString() +
        ret.value.substring(endStart),
      rolls: ret.rolls + roll.rolls.toString(),
    };
  }
  return ret;
}

export function updateState(action: Action, state: State): State {
  const flattenState = flatten(state) as FlattenState;

  const newValues = Object.fromEntries(
    Object.entries(action.state).map(([key, value]) => {
      const newValue = evaluateValue(value);
      return [key, newValue];
    })
  );
  return unflatten({ ...flattenState, ...newValues }) as State;
}

function evaluateValue(value: string | number): string | number | undefined {
  if (!value) return;
  try {
    const parser = Parser.parse(value.toString());
    const variables = parser.variables();
    if (variables.length === 0) {
      return parser.evaluate();
    }
    return value;
  } catch (e) {
    console.error("Error parsing value", { value });
    return value;
  }
}
