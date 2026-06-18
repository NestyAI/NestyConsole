const THINK_BLOCK_PATTERN =
  /<(?:redacted_thinking|think|thinking)\b[^>]*>[\s\S]*?(?:<\/(?:redacted_thinking|think|thinking)\s*>|\[REDACTED_PII\])/gi;
const BACKTICK = "`";
const GLM_THINK_PATTERN = new RegExp(`${BACKTICK.repeat(3)}think[\\s\\S]*?${BACKTICK.repeat(3)}`, "g");
const ANSWER_BLOCK_PATTERN = /<answer\b[^>]*>([\s\S]*?)<\/answer\s*>/gi;
const ORPHAN_TAG_PATTERN = /<\/?(?:redacted_thinking|think|thinking|answer)\b[^>]*>/gi;
const TAG_REDACTION_ARTIFACT_PATTERN = /<\[REDACTED_PII\]>/gi;
const THINK_OPEN_PATTERN = new RegExp(
  `<(?:redacted_thinking|think|thinking)\\b[^>]*>|${BACKTICK.repeat(3)}think\\b`,
  "i"
);
const THINK_CLOSED_PATTERN =
  /<\/(?:redacted_thinking|think|thinking)\s*>|\[REDACTED_PII\]\s*(?:<answer\b|$)/i;

function thinkStillOpen(payload: string): boolean {
  if (!THINK_OPEN_PATTERN.test(payload)) {
    return false;
  }
  ANSWER_BLOCK_PATTERN.lastIndex = 0;
  if (ANSWER_BLOCK_PATTERN.test(payload)) {
    return false;
  }
  return !THINK_CLOSED_PATTERN.test(payload);
}

export function stripModelReasoningForDisplay(content: string, partial = false): string {
  const payload = String(content || "");
  if (!payload.trim()) {
    return payload;
  }

  if (partial && thinkStillOpen(payload)) {
    return "";
  }

  ANSWER_BLOCK_PATTERN.lastIndex = 0;
  const answers: string[] = [];
  let match: RegExpExecArray | null = ANSWER_BLOCK_PATTERN.exec(payload);
  while (match) {
    const inner = String(match[1] || "").trim();
    if (inner) {
      answers.push(inner);
    }
    match = ANSWER_BLOCK_PATTERN.exec(payload);
  }

  let result = "";
  if (answers.length > 0) {
    result = answers.join("\n\n");
  } else if (partial) {
    const openAnswer = payload.match(/<answer\b[^>]*>([\s\S]*)$/i);
    if (openAnswer) {
      const inner = openAnswer[1] || "";
      const closeMatch = inner.match(/<\/answer\s*>/i);
      result = closeMatch ? inner.slice(0, closeMatch.index) : inner;
    } else {
      result = payload.replace(THINK_BLOCK_PATTERN, "").replace(GLM_THINK_PATTERN, "").replace(ORPHAN_TAG_PATTERN, "");
    }
  } else {
    result = payload.replace(THINK_BLOCK_PATTERN, "").replace(GLM_THINK_PATTERN, "").replace(ORPHAN_TAG_PATTERN, "");
  }

  return result
    .replace(TAG_REDACTION_ARTIFACT_PATTERN, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
