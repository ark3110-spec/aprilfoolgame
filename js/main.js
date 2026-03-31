import { COMMANDS } from "./data.js?v=20260331-9";
import { createGameState, advanceTurn, getCommandState } from "./game.js?v=20260331-9";
import { getGalleryItems, unlockGalleryItem } from "./gallery.js?v=20260331-9";
import { STAGES } from "./stages.js?v=20260331-9";
import { playActionSequence } from "./sequence.js?v=20260331-9";

const app = document.querySelector("#app");

const state = {
  screen: "title",
  conversationIndex: 0,
  selectedGalleryId: null,
  currentStage: STAGES[0],
  game: null,
  pendingCommandId: null,
  fightSpriteKey: "stance",
};

let victoryAnimationTimer = null;
const ASSET_VERSION = "20260331-9";

function assetUrl(src) {
  if (!src) return "";
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}v=${ASSET_VERSION}`;
}

function renderMediaSlot({ src, alt, placeholderClass, title, body }) {
  return `
    <div class="media-slot">
      <img
        class="media-image"
        src="${assetUrl(src)}"
        alt="${escapeHtml(alt)}"
        onerror="this.style.display='none';this.nextElementSibling.style.display='grid';"
      >
      <div class="placeholder-art ${placeholderClass}" style="display:none;">
        <div>
          <strong>${title}</strong>
          <p>${body}</p>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getGalleryDisplayImage(item) {
  if (item?.id === "ending-win") {
    return "assets/gallery/trueend.png";
  }
  return item?.image ?? "";
}

function renderTitle() {
  const isCleared = getGalleryItems().some(item => item.unlocked);
  app.innerHTML = `
    <main class="screen title-screen">
      <section class="panel title-card title-card-hero">
        <div class="title-copy-block">
          <span class="eyebrow">ブラウザで遊べる短編ゲーム</span>
          <h1>4月1日ネタゲーム</h1>
          <p class="lead">
            優君として瑞花を支え、5ターンで試合前の空気を整える短編ステータス管理ゲーム。
            スタートで導入会話へ、ギャラリーで開放済みイラスト一覧へ進めます。
          </p>
        </div>

        <div class="title-visual-wrap">
          <img
            class="title-main-image"
            src="${assetUrl("assets/title/title_main.png")}"
            alt="4月1日ネタゲーム タイトルメイン画像"
            onerror="this.style.display='none';this.nextElementSibling.style.display='grid';"
          >
          <div class="placeholder-art stage title-placeholder" style="display:none;">
            <div>
              <strong>タイトル画像プレースホルダー</strong>
              
            </div>
          </div>
        </div>

        <div class="title-button-row" aria-label="タイトルメニュー">
          <button class="image-button title-action-button" data-action="start-game" aria-label="スタート">
            <img
              class="image-button-asset"
              src="${assetUrl("assets/ui/button_start.png")}"
              alt="スタート"
              onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex';"
            >
            <span class="image-button-fallback primary-fallback" style="display:none;">スタート</span>
          </button>
          <button class="image-button title-action-button" data-action="open-gallery" aria-label="ギャラリー">
            <img
              class="image-button-asset"
              src="${assetUrl("assets/ui/button_gallery.png")}"
              alt="ギャラリー"
              onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex';"
            >
            <span class="image-button-fallback secondary-fallback" style="display:none;">ギャラリー</span>
          </button>
          ${isCleared ? `
          <button class="image-button title-action-button" data-action="skip-op" aria-label="OPスキップ">
            <img
              class="image-button-asset"
              src="${assetUrl("assets/ui/button_skip.png")}"
              alt="OPスキップ"
              onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex';"
            >
            <span class="image-button-fallback secondary-fallback" style="display:none;">OPスキップ</span>
          </button>
          ` : ""}
        </div>
      </section>
    </main>
  `;
}

function renderConversation() {
  const stage = state.currentStage;
  const line = stage.introLines[state.conversationIndex];
  app.innerHTML = `
    <main class="screen">
      <section class="conversation-layout">
        <div class="panel art-card">
          ${renderMediaSlot({
            src: stage.assets.intro,
            alt: `${stage.name} 導入イラスト`,
            placeholderClass: "stage",
            title: "導入イラスト プレースホルダー",
            
          })}
        </div>
        <div class="panel dialog-card">
          <p class="eyebrow">${stage.name}</p>
          <h2>導入会話</h2>
          <div class="dialog-text"><strong>${line.speaker}</strong>\n${line.text}</div>
          <div class="footer-actions">
            <span class="hint">${state.conversationIndex + 1} / ${stage.introLines.length} タップまたはクリックで進行</span>
            <div class="stack">
              <button class="back-btn" data-action="back-title">タイトルへ</button>
              <button class="secondary-btn" data-action="skip-opening">スキップ</button>
              <button class="primary-btn" data-action="next-line">次へ</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}

function renderVerticalGauge(label, value, max, className, align = "left") {
  const fillPercent = (value / max) * 100;
  return `
    <div class="vertical-gauge ${align}">
      <div class="vertical-gauge-track ${className}">
        <span style="height: ${fillPercent}%"></span>
      </div>
      <div class="vertical-gauge-meta">
        <span class="vertical-gauge-label">${label}</span>
        <span class="vertical-gauge-value">${value}/${max}</span>
      </div>
    </div>
  `;
}

function renderPopDisplay({ areaClass, title, body, src, alt }) {
  const animationClass = state.pendingCommandId ? " pop-animate" : "";

  if (src) {
    return `
      <div class="pop-display ${areaClass}">
        <span class="pop-title">${title}</span>
        <img
          class="pop-image breathe-anim${animationClass}"
          src="${assetUrl(src)}"
          alt="${escapeHtml(alt || title)}"
          onerror="this.style.display='none';this.nextElementSibling.style.display='grid';"
        >
        <div class="pop-placeholder breathe-anim ${areaClass}${animationClass}" style="display:none;">
          <strong>${title}</strong>
          <span>${body}</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="pop-display ${areaClass}">
      <span class="pop-title">${title}</span>
      <div class="pop-placeholder breathe-anim ${areaClass}${animationClass}">
        <strong>${title}</strong>
        <span>${body}</span>
      </div>
    </div>
  `;
}

function renderConversationLines(lines) {
  return lines
    .map((line) => `<div><strong>${escapeHtml(line.speaker)}</strong>: ${escapeHtml(line.text)}</div>`)
    .join("");
}

function getPendingCommand() {
  return COMMANDS.find((command) => command.id === state.pendingCommandId) ?? null;
}

function getPreviewLines(stage, pendingCommand) {
  if (pendingCommand) {
    return pendingCommand.responseLines;
  }
  return stage.uiText.gameScreen.defaultConversation;
}

function getPopBodies(stage, pendingCommand) {
  if (pendingCommand?.preview) {
    return {
      player: pendingCommand.preview.playerPop,
      rival: pendingCommand.preview.rivalPop,
    };
  }

  return {
    player: stage.uiText.gameScreen.defaultPops.player,
    rival: stage.uiText.gameScreen.defaultPops.rival,
  };
}

function getPopImageSources(stage, pendingCommand) {
  const key = pendingCommand?.id ?? "idle";
  return {
    player: stage.assets.playerPops?.[key] ?? "",
    rival: stage.assets.rivalPops?.[key] ?? "",
  };
}

function getStageLabel(stage) {
  return stage.name.split(":")[0];
}

function renderGame() {
  const stage = state.currentStage;
  const { stats, turn, maxTurn, log, flags } = state.game;
  const pendingCommand = getPendingCommand();
  const ui = stage.uiText.gameScreen;
  const previewLines = getPreviewLines(stage, pendingCommand);
  const popBodies = getPopBodies(stage, pendingCommand);
  const popImages = getPopImageSources(stage, pendingCommand);

  const commandControls = pendingCommand
    ? `
      <div class="confirm-actions">
        <button class="secondary-btn preview-action-btn preview-action-back" data-action="cancel-command">${ui.actions.back || "戻る"}</button>
        <button class="primary-btn preview-action-btn preview-action-confirm" data-action="confirm-command">${ui.actions.confirm || "決定"}</button>
      </div>
    `
    : `
      <div class="command-palette">
        ${COMMANDS.map((command) => {
          const commandState = getCommandState(command, state.game);
          
          let icon = "";
          let idClass = "";
          if (command.id === "cheer") { icon = "📣"; idClass = "cmd-cheer"; }
          else if (command.id === "love") { icon = "🫂"; idClass = "cmd-love"; }
          else if (command.id === "rest") { icon = "☕"; idClass = "cmd-rest"; }
          else if (command.id === "gift") { icon = "🎁"; idClass = "cmd-gift"; }

          return `
            <button
              class="command-tile ${idClass}"
              data-command="${command.id}"
              ${commandState.disabled ? "disabled" : ""}
              title="${escapeHtml(commandState.reason || command.description)}"
            >
              <strong><span aria-hidden="true">${icon}</span> ${command.name}</strong>
              <span>${command.description}</span>
            </button>
          `;
        }).join("")}
      </div>
    `;

  app.innerHTML = `
    <main class="screen game-screen">
      <section class="game-layout duel-layout">
        <div class="panel topbar duel-topbar">
          <div class="duel-topbar-stage">${getStageLabel(stage)}</div>
          <div class="duel-topbar-turn">ターン ${turn} / ${maxTurn}</div>
        </div>

        <section class="duel-board">
          <article class="duel-side duel-side-player panel">
            <div class="duel-side-background">
              <img
                class="duel-side-background-image"
                  src="${assetUrl(stage.assets.leftBackground ?? "")}"
                alt="優エリア背景"
                onerror="this.style.display='none';this.nextElementSibling.style.display='grid';"
              >
              <div class="duel-side-background-fallback" style="display:none;">
                <strong>優エリア背景プレースホルダー</strong>
                <span>left.png 未配置時の仮表示です。</span>
              </div>
            </div>
            <div class="side-inner">
              <aside class="side-gauges side-gauges-left">
                ${renderVerticalGauge("体力", stats.playerHealth, 5, "gauge-health", "left")}
                ${renderVerticalGauge("気力", stats.playerSpirit, 5, "gauge-spirit", "left")}
              </aside>
              <div class="side-core">
                <div class="pop-frame">
                  <div class="pop-caption">${ui.labels.playerPop}</div>
                  ${renderPopDisplay({
                    areaClass: "hero",
                    title: ui.labels.playerPop,
                    body: popBodies.player,
                    src: popImages.player,
                    alt: "優君ポップ",
                  })}
                </div>
              </div>
            </div>
          </article>

          <article class="duel-side duel-side-rival panel">
            <div class="duel-side-background">
              <img
                class="duel-side-background-image"
                  src="${assetUrl(stage.assets.rightBackground ?? "")}"
                alt="瑞花エリア背景"
                onerror="this.style.display='none';this.nextElementSibling.style.display='grid';"
              >
              <div class="duel-side-background-fallback" style="display:none;">
                <strong>瑞花エリア背景プレースホルダー</strong>
                <span>right.png 未配置時の仮表示です。</span>
              </div>
            </div>
            <div class="side-inner rival">
              <div class="side-core">
                <div class="pop-frame">
                  <div class="pop-caption">${ui.labels.rivalPop}</div>
                  ${renderPopDisplay({
                    areaClass: "rival",
                    title: ui.labels.rivalPop,
                    body: popBodies.rival,
                    src: popImages.rival,
                    alt: "瑞花ポップ",
                  })}
                </div>
              </div>
              <aside class="side-gauges side-gauges-right">
                ${renderVerticalGauge("やる気", stats.rivalMotivation, 10, "gauge-motivation", "right")}
                ${renderVerticalGauge("愛", stats.rivalLove, 10, "gauge-love", "right")}
              </aside>
            </div>
          </article>
        </section>

        <article class="panel dialogue-dock">
          <div class="dialogue-header">
            <div>
              <p class="eyebrow">${pendingCommand ? ui.labels.commandConfirm : ui.labels.commandSelect}</p>
              <h3>${ui.labels.talkBox}</h3>
            </div>
            <div class="hint">${pendingCommand ? escapeHtml(pendingCommand.name) : log}</div>
          </div>
          <div class="dialogue-body">
            ${renderConversationLines(previewLines)}
          </div>
          <div class="dialogue-actions">
            ${commandControls}
          </div>
        </article>
      </section>
    </main>
  `;
}

function renderVictoryFight() {
  const stage = state.currentStage;
  const fightSprites = stage.assets.fightSprites ?? {};
  const currentSprite = fightSprites[state.fightSpriteKey] ?? "";

  app.innerHTML = `
    <main class="screen victory-screen">
      <section class="panel victory-shell">
        <div class="victory-stage">
          <img
            class="victory-stage-image"
            src="${assetUrl(stage.assets.background)}"
            alt="${escapeHtml(stage.name)} 試合背景"
            onerror="this.style.display='none';this.nextElementSibling.style.display='grid';"
          >
          <div class="victory-stage-fallback" style="display:none;">
            <strong>試合背景プレースホルダー</strong>
            <span>試合演出用背景をここに表示します。</span>
          </div>

          <div class="victory-overlay">
            <div class="victory-fight-area">
              <div class="victory-fighter victory-fighter-rival">
                <img
                  class="victory-fighter-image"
                  src="${assetUrl(currentSprite)}"
                  alt="瑞花 試合スプライト"
                  onerror="this.style.display='none';this.nextElementSibling.style.display='grid';"
                >
                <div class="victory-fighter-fallback" style="display:none;">
                  <strong>瑞花スプライト</strong>
                  <span>fight 画像未配置時の仮表示です。</span>
                </div>
              </div>
            </div>
            <div class="victory-actions">
              <button class="primary-btn" data-action="open-victory-ending">結果を見る</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}

function renderEnding() {
  const stage = state.currentStage;
  const ending = state.game.ending;

  app.innerHTML = `
    <main class="screen">
      <section class="ending-layout">
        <div class="panel art-card">
          ${renderMediaSlot({
            src: ending.image,
            alt: `${ending.title} CG`,
            placeholderClass: "stage",
            title: `${ending.title} 用イラスト プレースホルダー`,
            body: "素材追加後はここにエンドCGや演出画像を配置します。",
          })}
        </div>
        <article class="panel ending-card">
          <p class="eyebrow">${stage.name}</p>
          <h2>${ending.title}</h2>
          <div class="ending-text">${ending.description}</div>
          <div class="footer-actions">
            <span class="hint">到達エンドに応じてギャラリーを開放します。</span>
            <div class="stack">
              <button class="secondary-btn" data-action="open-gallery">ギャラリーへ</button>
              <button class="primary-btn" data-action="back-title">タイトルへ戻る</button>
            </div>
          </div>
        </article>
      </section>
    </main>
  `;
}

function renderGallery() {
  const items = getGalleryItems();
  const list = items.map((item) => `
    <button class="gallery-item ${item.unlocked ? "" : "locked"}" data-gallery-id="${item.id}" ${item.unlocked ? "" : "disabled"}>
      <div class="gallery-thumb">
        ${item.unlocked
          ? `<img class="gallery-thumb-image" src="${assetUrl(item.image)}" alt="${escapeHtml(item.title)}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';">
             <span class="gallery-thumb-fallback">CG Placeholder</span>`
          : "LOCKED"}
      </div>
      <strong>${item.title}</strong>
      <span>${item.unlocked ? item.description : "未開放のギャラリーです。"}</span>
    </button>
  `).join("");

  app.innerHTML = `
    <main class="screen">
      <section class="panel gallery-card">
        <p class="eyebrow">仮ギャラリー</p>
        <h2>ギャラリー一覧</h2>
        
        <div class="gallery-grid">${list}</div>
        <div class="footer-actions">
          <span class="hint">未開放項目はロック表示です。</span>
          <button class="back-btn" data-action="back-title">タイトルへ戻る</button>
        </div>
      </section>
    </main>
  `;
}

function renderGalleryDetail() {
  const item = getGalleryItems().find((galleryItem) => galleryItem.id === state.selectedGalleryId);
  if (!item || !item.unlocked) {
    state.screen = "gallery";
    render();
    return;
  }

  const commentMarkup = item.comments
    .map((comment) => `<div class="dialog-text"><strong>${comment.speaker}</strong>\n${comment.text}</div>`)
    .join("");

  app.innerHTML = `
    <main class="screen">
      <section class="gallery-detail-layout">
        <div class="panel art-card">
          ${renderMediaSlot({
            src: getGalleryDisplayImage(item),
            alt: item.title,
            placeholderClass: "stage",
            title: item.title,
            body: "ここに開放済みCGの実画像が入ります。",
          })}
        </div>
        <article class="panel detail-card">
          <p class="eyebrow">ギャラリー詳細</p>
          <h2>${item.title}</h2>
          <p class="gallery-copy">${item.description}</p>
          ${commentMarkup}
          <div class="footer-actions">
            <button class="back-btn" data-action="back-gallery">一覧へ戻る</button>
          </div>
        </article>
      </section>
    </main>
  `;
}

function render() {
  clearVictoryAnimation();
  if (state.screen === "title") renderTitle();
  if (state.screen === "conversation") renderConversation();
  if (state.screen === "game") renderGame();
  if (state.screen === "victory-fight") {
    playActionSequence(app, state.currentStage.victorySequence, () => {
      state.screen = "ending";
      render();
    });
  }
  if (state.screen === "yarisugi-fight") {
    playActionSequence(app, state.currentStage.yarisugiSequence, () => {
      state.screen = "ending";
      render();
    });
  }
  if (state.screen === "ending") renderEnding();
  if (state.screen === "gallery") renderGallery();
  if (state.screen === "gallery-detail") renderGalleryDetail();
  if (state.screen === "opening-sequence") {
    playActionSequence(app, state.currentStage.opening, () => {
      startNewRun();
    });
  }
}

function clearVictoryAnimation() {
  if (victoryAnimationTimer) {
    clearTimeout(victoryAnimationTimer);
    victoryAnimationTimer = null;
  }
}

function updateVictorySprite(key) {
  state.fightSpriteKey = key;
  const stage = state.currentStage;
  const sprite = stage.assets.fightSprites?.[key] ?? "";
  const image = document.querySelector(".victory-fighter-image");
  const fallback = document.querySelector(".victory-fighter-fallback");

  if (!image || !fallback) {
    return;
  }

  image.classList.remove("fight-sprite-swap");
  void image.offsetWidth;
  image.src = assetUrl(sprite);
  image.style.display = "";
  fallback.style.display = "none";
  image.classList.add("fight-sprite-swap");
}

function startVictoryAnimation() {
  clearVictoryAnimation();

  if (state.screen !== "victory-fight") {
    return;
  }

  const sequence = state.currentStage.assets.fightSequence ?? [];
  if (!sequence.length) {
    return;
  }

  let index = 0;

  const step = () => {
    if (state.screen !== "victory-fight") {
      clearVictoryAnimation();
      return;
    }

    const frame = sequence[index];
    updateVictorySprite(frame.key);
    index = (index + 1) % sequence.length;
    victoryAnimationTimer = setTimeout(step, frame.duration);
  };

  step();
}

function startNewRun() {
  clearVictoryAnimation();
  state.currentStage = STAGES[0];
  state.game = createGameState(state.currentStage);
  state.pendingCommandId = null;
  state.conversationIndex = 0;
  state.fightSpriteKey = "stance";
  state.screen = "game";
  render();
}

function enterGame() {
  clearVictoryAnimation();
  state.game = createGameState(state.currentStage);
  state.pendingCommandId = null;
  state.screen = "game";
  render();
}

function finishGameIfNeeded() {
  if (!state.game?.finished || !state.game.ending) {
    return;
  }
  unlockGalleryItem("opening-champion", "opening-champion");
  unlockGalleryItem(state.game.ending.galleryId, state.game.ending.id);
  state.pendingCommandId = null;
  if (state.game.ending.id === "victory") {
    state.screen = "victory-fight";
  } else if (state.game.ending.id === "foul") {
    state.screen = "yarisugi-fight";
  } else {
    state.screen = "ending";
  }
  render();
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action], [data-command], [data-gallery-id]");
  if (!target) return;

  const action = target.dataset.action;
  const commandId = target.dataset.command;
  const galleryId = target.dataset.galleryId;

  if (action === "start-game") {
    state.screen = "opening-sequence";
    render();
    return;
  }

  if (action === "skip-op") {
    startNewRun();
    return;
  }

  if (action === "open-gallery") {
    clearVictoryAnimation();
    state.pendingCommandId = null;
    state.screen = "gallery";
    render();
    return;
  }

  if (action === "back-title") {
    clearVictoryAnimation();
    state.screen = "title";
    state.selectedGalleryId = null;
    state.pendingCommandId = null;
    render();
    return;
  }

  if (action === "next-line") {
    const stage = state.currentStage;
    if (state.conversationIndex < stage.introLines.length - 1) {
      state.conversationIndex += 1;
      render();
    } else {
      enterGame();
    }
    return;
  }

  if (action === "skip-opening") {
    enterGame();
    return;
  }

  if (action === "back-gallery") {
    clearVictoryAnimation();
    state.screen = "gallery";
    state.selectedGalleryId = null;
    render();
    return;
  }

  if (action === "cancel-command") {
    state.pendingCommandId = null;
    render();
    return;
  }

  if (action === "confirm-command" && state.game && state.pendingCommandId) {
    const prevStats = { ...state.game.stats };
    const commandId = state.pendingCommandId;
    
    state.game = advanceTurn(state.currentStage, state.game, commandId);
    state.pendingCommandId = null;
    finishGameIfNeeded();
    
    if (state.screen !== "ending") {
      render();
      
      // Trigger visual feedback after render
      if (commandId === "rest") {
        app.classList.add("shake-screen");
        setTimeout(() => app.classList.remove("shake-screen"), 400);
      }
      triggerFlyTexts(prevStats, state.game.stats);
    }
    return;
  }

  if (action === "open-victory-ending") {
    clearVictoryAnimation();
    state.screen = "ending";
    render();
    return;
  }

  if (commandId && state.game) {
    state.pendingCommandId = commandId;
    render();
    return;
  }

  if (galleryId) {
    state.selectedGalleryId = galleryId;
    state.screen = "gallery-detail";
    render();
  }
});

app.addEventListener("pointerup", (event) => {
  if (state.screen !== "conversation") return;
  const interactive = event.target.closest("button");
  if (interactive) return;

  const stage = state.currentStage;
  if (state.conversationIndex < stage.introLines.length - 1) {
    state.conversationIndex += 1;
    render();
  } else {
    enterGame();
  }
});

render();

function createFlyText(text, isPositive, container) {
  const el = document.createElement("div");
  el.className = `fly-text ${isPositive ? 'positive' : 'negative'}`;
  el.textContent = text;
  
  // Random slight variations in starting position
  const xOffset = Math.random() * 40 - 20;
  const yOffset = Math.random() * 20 - 10;
  el.style.left = `calc(50% + ${xOffset}px)`;
  el.style.top = `calc(50% + ${yOffset}px)`;
  
  container.appendChild(el);
  
  // Remove after animation completes (1.2s)
  setTimeout(() => {
    el.remove();
  }, 1200);
}

function triggerFlyTexts(prevStats, nextStats) {
  const playerSide = document.querySelector(".duel-side-player .side-core");
  const rivalSide = document.querySelector(".duel-side-rival .side-core");
  
  if (!playerSide || !rivalSide) return;
  
  // Create relative positioning containers
  const playerContainer = document.createElement("div");
  playerContainer.className = "fly-text-container";
  playerSide.appendChild(playerContainer);
  
  const rivalContainer = document.createElement("div");
  rivalContainer.className = "fly-text-container";
  rivalSide.appendChild(rivalContainer);
  
  const diffs = [
    { key: "playerHealth", label: "体力", container: playerContainer },
    { key: "playerSpirit", label: "気力", container: playerContainer },
    { key: "rivalLove", label: "愛", container: rivalContainer },
    { key: "rivalMotivation", label: "やる気", container: rivalContainer },
  ];
  
  diffs.forEach(({ key, label, container }, index) => {
    const diff = nextStats[key] - prevStats[key];
    if (diff !== 0) {
      const isPositive = diff > 0;
      const sign = isPositive ? "+" : "";
      setTimeout(() => {
        createFlyText(`${sign}${diff} ${label}`, isPositive, container);
      }, index * 150); // Stagger text creation slightly
    }
  });
  
  // Clean up containers
  setTimeout(() => {
    playerContainer.remove();
    rivalContainer.remove();
  }, 2000);
}
