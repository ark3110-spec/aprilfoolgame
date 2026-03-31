import { COMMANDS } from "./data.js?v=20260331-9";

const STAT_LIMITS = {
  playerHealth: { min: 0, max: 5 },
  playerSpirit: { min: 0, max: 5 },
  rivalLove: { min: 0, max: 10 },
  rivalMotivation: { min: 0, max: 10 },
};

const FALLBACK_UI_TEXT = {
  initialLog: "準備完了。瑞花を支えながら、5ターンを乗り切ろう。",
  commandRejected: {
    finished: "ゲームは終了しています。",
    forcedRest: "次のターンは強制休憩。休む（塩対応）のみ選択できます。",
  },
  turnMessages: {
    immediateEnding: "{ending} に突入した。",
    finalEnding: "5ターン終了。{ending} になった。",
    forcedRestNotice: "優君の気力が限界だ。次のターンは強制的に休むしかない。",
  },
};

function clampStat(key, value) {
  const { min, max } = STAT_LIMITS[key];
  return Math.max(min, Math.min(max, value));
}

function formatScriptLines(lines) {
  return lines.map(({ speaker, text }) => `${speaker}: ${text}`).join("\n");
}

function fillTemplate(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

function getUiText(stageOrState) {
  return stageOrState.uiText ?? stageOrState.stageUiText ?? FALLBACK_UI_TEXT;
}

export function createGameState(stage) {
  return {
    stageId: stage.id,
    turn: 1,
    maxTurn: stage.turnLimit,
    stats: { ...stage.initialStats },
    flags: {
      giftUsed: false,
      forcedRestNextTurn: false,
    },
    finished: false,
    ending: null,
    log: getUiText(stage).initialLog,
    lastAction: null,
    stageUiText: getUiText(stage),
  };
}

export function getCommandState(command, gameState) {
  const uiText = getUiText(gameState);

  if (gameState.finished) {
    return { disabled: true, reason: uiText.commandRejected.finished };
  }

  if (gameState.flags.forcedRestNextTurn && command.id !== "rest") {
    return { disabled: true, reason: uiText.commandRejected.forcedRest };
  }

  const check = command.usageCheck({ gameState });
  if (!check.ok) {
    return { disabled: true, reason: check.reason };
  }

  return { disabled: false, reason: "" };
}

function applyCommand(gameState, command) {
  const nextStats = { ...gameState.stats };
  for (const [key, delta] of Object.entries(command.effect)) {
    nextStats[key] = clampStat(key, nextStats[key] + delta);
  }

  const giftUsed = gameState.flags.giftUsed || command.id === "gift";

  return {
    ...gameState,
    stats: nextStats,
    flags: {
      ...gameState.flags,
      giftUsed,
      forcedRestNextTurn: false,
    },
    lastAction: command.id,
    log: formatScriptLines(command.responseLines),
  };
}

function getImmediateEnding(stage, stats) {
  if (stats.playerHealth <= 0) {
    return stage.endings.care;
  }

  if (stats.rivalLove <= 0 && stats.rivalMotivation <= 0) {
    return stage.endings.boycott;
  }

  return null;
}

function getFinalEnding(stage, stats) {
  if (stats.rivalLove >= 8 && stats.rivalMotivation === 0) {
    return stage.endings.obsession;
  }

  if (stats.rivalLove === 0 && stats.rivalMotivation >= 4) {
    return stage.endings.foul;
  }

  if (
    stats.rivalLove >= 6 &&
    stats.rivalMotivation >= 6 &&
    stats.playerHealth >= 1 &&
    stats.playerSpirit >= 1
  ) {
    return stage.endings.victory;
  }

  return stage.endings.victory;
}

export function advanceTurn(stage, currentState, commandId) {
  const command = COMMANDS.find((item) => item.id === commandId);
  if (!command) {
    return currentState;
  }

  const commandState = getCommandState(command, currentState);
  if (commandState.disabled) {
    return {
      ...currentState,
      log: commandState.reason,
    };
  }

  const uiText = getUiText(stage);
  let nextState = applyCommand(currentState, command);
  const immediateEnding = getImmediateEnding(stage, nextState.stats);
  if (immediateEnding) {
    return {
      ...nextState,
      finished: true,
      ending: immediateEnding,
      log: `${nextState.log}\n${fillTemplate(uiText.turnMessages.immediateEnding, { ending: immediateEnding.title })}`,
    };
  }

  const shouldForceRest = nextState.turn < nextState.maxTurn && nextState.stats.playerSpirit <= 0;
  const nextTurn = nextState.turn + 1;

  if (nextState.turn >= nextState.maxTurn) {
    const finalEnding = getFinalEnding(stage, nextState.stats);
    return {
      ...nextState,
      finished: true,
      ending: finalEnding,
      log: `${nextState.log}\n${fillTemplate(uiText.turnMessages.finalEnding, { ending: finalEnding.title })}`,
    };
  }

  return {
    ...nextState,
    turn: nextTurn,
    flags: {
      ...nextState.flags,
      forcedRestNextTurn: shouldForceRest,
    },
    log: shouldForceRest
      ? `${nextState.log}\n${uiText.turnMessages.forcedRestNotice}`
      : nextState.log,
    stageUiText: uiText,
  };
}
