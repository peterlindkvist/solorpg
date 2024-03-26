import "./ImagePart.css";
import { Image } from "../../types";

type Props = {
  part: Image;
};

export function ImagePart({ part }: Props) {
  return <img src={part.url} alt={part.text} className="image-part" />;
}
