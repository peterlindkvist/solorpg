import { Story, Image } from "../types";
import "./Images.css";
import * as api from "../utils/api";
import { useState } from "react";

type Props = {
  story: Story;
  updateStory: (story: Story) => void;
};

export function Images({ story, updateStory }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  function fetchImage(image: Image) {
    setIsLoading(true);
    const options = {
      storyId: story.id,
      description: image.text,
      context: story?.state?.images?.context,
      renderType: story?.state?.images?.renderType,
    };
    api.textToImage(options).then(({ url }) => {
      console.log(image);
      image.url = url;
      updateStory(story);
      setIsLoading(false);
    });
  }

  if (!story?.images) {
    return null;
  }

  return (
    <div className="images">
      {story.images.map((image) => (
        <div key={image.text}>
          <div className="image">
            {image.url && <img src={image.url} alt={image.text} />}
          </div>
          <button onClick={() => fetchImage(image)} disabled={isLoading}>
            🗘
          </button>
          <p>{image.text}</p>
        </div>
      ))}
    </div>
  );
}
