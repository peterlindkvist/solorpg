import "./ButtonPart.css";
import { Link, Navigation } from "../../types";

type Props = {
  part: Link | Navigation;
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
        {part.type === "link" ? part.text : ">"}
        {part.target.startsWith("http") && " 🡕"}
      </button>
    </div>
  );
}
