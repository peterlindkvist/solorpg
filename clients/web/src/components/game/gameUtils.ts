import { flatten, unflatten } from "flat";
import { Parser } from "expr-eval";
import { Action, Chapter, Part, State } from "../../types";

type FlattenState = Record<string, string | number>;

export function parseChapter(
  chapter: Chapter,
  state: State
): {
  parts: Part[];
  newState: State;
} {
  let newState: FlattenState = flatten(state);
  const renderParts = [];
  for (const part of chapter.parts) {
    if (["image", "paragraph", "choice"].includes(part.type)) {
      renderParts.push(part);
    } else if (part.type === "navigation") {
      renderParts.push(part);
      break;
    } else if (part.type === "code") {
      const parser = Parser.parse(part.condition);
      const result = parser.evaluate(newState);
      const codePart = result ? part.true : part.false;
      if (!codePart) {
        continue;
      } else if (codePart.type === "paragraph") {
        renderParts.push(codePart);
      } else if (codePart.type === "navigation") {
        renderParts.push(codePart);
        break;
      } else if (codePart.type === "action") {
        newState = evaluateAction(codePart, newState);
      }
    } else if (part.type === "action") {
      newState = evaluateAction(part, newState);
    }
  }

  return { parts: renderParts, newState: unflatten(newState) };
}

function evaluateAction(
  action: Action,
  flattenState: FlattenState
): FlattenState {
  const withMissingKeys = {
    ...Object.fromEntries(Object.keys(action.event).map((key) => [key, 0])),
    ...flattenState,
  };

  const newValues = Object.fromEntries(
    Object.entries(action.event).map(([key, value]) => {
      const newValue = evaluateValue(key, value, withMissingKeys) ?? 0;
      return [key, newValue];
    })
  );
  return { ...flattenState, ...newValues };
}

export function updateState(action: Action, state: State): State {
  const flattenState: Record<string, string | number> = flatten(state);
  const withMissingKeys = {
    ...Object.fromEntries(Object.keys(action.event).map((key) => [key, 0])),
    ...flattenState,
  };

  console.log("updateState", action, flattenState);
  const newValues = Object.fromEntries(
    Object.entries(action.event).map(([key, value]) => {
      const newValue = evaluateValue(key, value, withMissingKeys);
      return [key, newValue];
    })
  );
  return unflatten({ ...flattenState, ...newValues });
}

function evaluateValue(
  key: string,
  value: string | number,
  flattenState: Record<string, string | number>
): number | undefined {
  // const existingNumber = typeof existingValue === "number" ? existingValue : Number.parseFloat(existingValue);
  if (typeof value === "number") {
    return value;
  }
  if (value.startsWith("+=")) {
    value = `${key} + ${value.slice(2)}`;
  }
  if (value.startsWith("-=")) {
    value = `${key} - ${value.slice(2)}`;
  }

  const parser = Parser.parse(value);
  return parser.evaluate(flattenState);
}
