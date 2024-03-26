import "./ButtonPart.css";
import { Choice, Navigation } from "../../types";

type Props = {
  part: Choice | Navigation;
  onClick: (target: string) => void;
};

export function ButtonPart({ part, onClick }: Props) {
  return (
    <div>
      <button
        className="game-button"
        key={part.target}
        onClick={() => onClick(part.target)}
      >
        {part.type === "choice" ? part.text : ">"}
      </button>
    </div>
  );
}
