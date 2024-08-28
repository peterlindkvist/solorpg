import "./ParagraphPart.css";
import { Paragraph } from "../../types";

type Props = {
  part: Paragraph;
};

export function ParagraphPart({ part }: Props) {
  if (part.variant === "blockquote") {
    return (
      <blockquote className="game-paragraph-blockquote">{part.text}</blockquote>
    );
  } else if (part.variant === "citation") {
    return <p className="game-paragraph">― {part.text}</p>;
  }
  return <p className="game-paragraph">{part.text}</p>;
}
