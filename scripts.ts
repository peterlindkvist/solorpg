import "dotenv/config";
import * as imageController from "./server/services/assetsService";
import * as markdownParser from "./clients/web/src/utils/markdown";
import fs from "fs";

async function fetchImagesBauer() {
  const context = "'fantasy dark forest'";
  const renderType = "john bauer style";
  const descriptions = [
    "cave with a entrance, its a torch on the wall",
    "three bears attacks with claws",
    "nice and cosy cabin in the woods",
  ];
  await imageController.fetchImages(context, renderType, descriptions);
}

async function fetchImagesDjungel() {
  const context = "djungel med höga träd och klätterväxter";
  const renderType = "john bauer style";
  const descriptions = [
    "En gigantisk kameleont med en lång tunga som sticks ut mot dig",
    "apor beväpnade med yxor och spjut som attackerar en enasm äventyrare som försvarar sig med en stor machete",
    "Ett tempel i djuneln med en stor skattkista och en massa ormar runt omkring",
  ];
  await imageController.fetchImages(context, renderType, descriptions);
}

async function fetchImages() {
  const context = "Stenåldern in norden med snö och is";
  const renderType = "photorealistic";
  const descriptions = [
    "en grottmänniska som tittar mot dig med arga ögon. Han har ett spjut med en flintaspets i handen",
    "grottmänniskan attackerar dig med spjutet",
    "en grotta med en massa grottmänniskor som sitter och äter runt en eld",
  ];
  await imageController.fetchImages(context, renderType, descriptions);
}

function parseMarkdown() {
  const content = fs.readFileSync("./assets/grotta/story.md", "utf8");
  const sections = markdownParser.parseMarkdown(content);
  const images = markdownParser.findImages(sections);
  const imageState = sections.find((section) => section.state)?.state?.images;
  const imageDescriptions = images
    .map((image) => image?.text)
    .filter(Boolean) as string[];
  console.log(imageState, imageDescriptions);
  // imageController.fetchImages(
  //   imageState.context,
  //   imageState.renderType,
  //   imageDescriptions
  // );
}

// parseFlowChart();
// fetchImages();

parseMarkdown();
