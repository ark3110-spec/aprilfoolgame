import { COMMAND_TEXTS, STAGE_TEXTS } from "./texts.js?v=20260331-9";

export const STORAGE_KEYS = {
  gallery: "boxing-game-gallery",
  endings: "boxing-game-endings",
};

export const COMMANDS = [
  {
    id: "cheer",
    name: COMMAND_TEXTS.cheer.name,
    description: COMMAND_TEXTS.cheer.description,
    effect: {
      playerHealth: -1,
      playerSpirit: 0,
      rivalLove: 0,
      rivalMotivation: 2,
    },
    usageCheck: () => ({ ok: true }),
    responseLines: COMMAND_TEXTS.cheer.responses,
  },
  {
    id: "love",
    name: COMMAND_TEXTS.love.name,
    description: COMMAND_TEXTS.love.description,
    effect: {
      playerHealth: 0,
      playerSpirit: -1,
      rivalLove: 3,
      rivalMotivation: 0,
    },
    usageCheck: () => ({ ok: true }),
    responseLines: COMMAND_TEXTS.love.responses,
  },
  {
    id: "rest",
    name: COMMAND_TEXTS.rest.name,
    description: COMMAND_TEXTS.rest.description,
    effect: {
      playerHealth: 2,
      playerSpirit: 2,
      rivalLove: -3,
      rivalMotivation: -3,
    },
    usageCheck: () => ({ ok: true }),
    responseLines: COMMAND_TEXTS.rest.responses,
  },
  {
    id: "gift",
    name: COMMAND_TEXTS.gift.name,
    description: COMMAND_TEXTS.gift.description,
    effect: {
      playerHealth: 0,
      playerSpirit: 0,
      rivalLove: 4,
      rivalMotivation: 4,
    },
    usageCheck: ({ gameState }) => {
      if (gameState.flags.giftUsed) {
        return { ok: false, reason: COMMAND_TEXTS.gift.errors.used };
      }
      if (gameState.stats.playerSpirit < 2) {
        return { ok: false, reason: COMMAND_TEXTS.gift.errors.spirit };
      }
      return { ok: true };
    },
    responseLines: COMMAND_TEXTS.gift.responses,
  },
];

const stage1GalleryText = STAGE_TEXTS.stage1.gallery;

export const GALLERY_BASE_ITEMS = [
  {
    id: "opening-champion",
    stageId: "stage1",
    endingId: "opening-champion",
    title: stage1GalleryText["opening-champion"].title,
    description: stage1GalleryText["opening-champion"].description,
    image: "assets/gallery/OP_1.png",
    comments: stage1GalleryText["opening-champion"].comments,
  },
  {
    id: "ending-win",
    stageId: "stage1",
    endingId: "victory",
    title: stage1GalleryText["ending-win"].title,
    description: stage1GalleryText["ending-win"].description,
    image: "assets/gallery/trueend.png",
    comments: stage1GalleryText["ending-win"].comments,
  },
  {
    id: "ending-care",
    stageId: "stage1",
    endingId: "care",
    title: stage1GalleryText["ending-care"].title,
    description: stage1GalleryText["ending-care"].description,
    image: "assets/gallery/kanbyou.png",
    comments: stage1GalleryText["ending-care"].comments,
  },
  {
    id: "ending-boycott",
    stageId: "stage1",
    endingId: "boycott",
    title: stage1GalleryText["ending-boycott"].title,
    description: stage1GalleryText["ending-boycott"].description,
    image: "assets/gallery/boikot.png",
    comments: stage1GalleryText["ending-boycott"].comments,
  },
  {
    id: "ending-obsession",
    stageId: "stage1",
    endingId: "obsession",
    title: stage1GalleryText["ending-obsession"].title,
    description: stage1GalleryText["ending-obsession"].description,
    image: "assets/gallery/sukisuki.png",
    comments: stage1GalleryText["ending-obsession"].comments,
  },
  {
    id: "ending-foul",
    stageId: "stage1",
    endingId: "foul",
    title: stage1GalleryText["ending-foul"].title,
    description: stage1GalleryText["ending-foul"].description,
    image: "assets/gallery/yarisugi.png",
    comments: stage1GalleryText["ending-foul"].comments,
  },
];
