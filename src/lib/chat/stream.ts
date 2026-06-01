export type ParsedSseEvent = {
  event: string | null;
  data: string;
  json: Record<string, unknown> | null;
  raw: string;
};

type ParseSseBufferResult = {
  events: ParsedSseEvent[];
  buffer: string;
};

function normalizeNewlines(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function parseRawEvent(raw: string): ParsedSseEvent | null {
  const lines = raw.split("\n");
  let event: string | null = null;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line) {
      continue;
    }
    if (line.startsWith(":")) {
      continue;
    }
    if (line.startsWith("event:")) {
      const value = line.slice(6).trim();
      event = value || null;
      continue;
    }
    if (line.startsWith("data:")) {
      let value = line.slice(5);
      if (value.startsWith(" ")) {
        value = value.slice(1);
      }
      dataLines.push(value);
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  const data = dataLines.join("\n");
  if (!data) {
    return null;
  }

  let json: Record<string, unknown> | null = null;
  if (data !== "[DONE]") {
    try {
      json = JSON.parse(data) as Record<string, unknown>;
    } catch {
      json = null;
    }
  }

  return {
    event,
    data,
    json,
    raw
  };
}

export function parseSseBuffer(buffer: string, chunkText: string): ParseSseBufferResult {
  let working = normalizeNewlines(buffer + chunkText);
  const events: ParsedSseEvent[] = [];

  let boundary = working.indexOf("\n\n");
  while (boundary >= 0) {
    const rawEvent = working.slice(0, boundary);
    working = working.slice(boundary + 2);

    const parsed = parseRawEvent(rawEvent);
    if (parsed) {
      events.push(parsed);
    }

    boundary = working.indexOf("\n\n");
  }

  return {
    events,
    buffer: working
  };
}

export async function readChatCompletionStream(
  response: Response,
  onEvent: (event: ParsedSseEvent) => void | Promise<void>,
  signal?: AbortSignal
): Promise<"done" | "aborted" | "eof"> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("stream_reader_unavailable");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    if (signal?.aborted) {
      return "aborted";
    }

    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    const chunkText = decoder.decode(value, { stream: true });
    const parsed = parseSseBuffer(buffer, chunkText);
    buffer = parsed.buffer;

    for (const event of parsed.events) {
      await onEvent(event);
      if (event.data === "[DONE]") {
        return "done";
      }
      if (signal?.aborted) {
        return "aborted";
      }
    }
  }

  const tail = decoder.decode();
  if (tail) {
    const parsedTail = parseSseBuffer(buffer, tail);
    buffer = parsedTail.buffer;
    for (const event of parsedTail.events) {
      await onEvent(event);
      if (event.data === "[DONE]") {
        return "done";
      }
    }
  }

  const finalParsed = parseSseBuffer(buffer, "\n\n");
  for (const event of finalParsed.events) {
    await onEvent(event);
    if (event.data === "[DONE]") {
      return "done";
    }
  }

  return signal?.aborted ? "aborted" : "eof";
}
