import Cookies from "js-cookie";

export type RealtimeTranscriptionEvent =
  | { type: "ready"; sample_rate_hz: number }
  | { type: "started"; sample_rate_hz: number; language_code: string }
  | {
      type: "transcript";
      transcript: string;
      is_final: boolean;
      stability?: number;
      confidence?: number;
    }
  | { type: "complete"; audio_seconds: number; elapsed_seconds: number }
  | { type: "error"; error: string }
  | { type: "closed"; code: number; reason: string };

export type RealtimeTranscriptionSession = {
  stop: () => Promise<void>;
  cancel: () => Promise<void>;
};

const SAMPLE_RATE = 16000;
const SOCKET_STARTUP_TIMEOUT_MS = 5000;
const TOKEN_WAIT_TIMEOUT_MS = 2500;

export function getWebSocketBase() {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "") ?? null;
  }

  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  const apiHost = apiBase ? new URL(apiBase, window.location.origin).host : null;
  const host = process.env.NEXT_PUBLIC_WS_HOST ?? apiHost ?? window.location.host;
  return `${protocol}//${host}`;
}

export async function startRealtimeTranscription({
  onEvent,
  languageCode = "en-US",
}: {
  onEvent: (event: RealtimeTranscriptionEvent) => void;
  languageCode?: string;
}): Promise<RealtimeTranscriptionSession> {
  if (!("mediaDevices" in navigator) || !window.AudioContext) {
    throw new Error("Voice input is not supported in this browser.");
  }

  const base = getWebSocketBase();
  if (!base) throw new Error("WebSocket endpoint unavailable.");

  const token = await waitForAccessToken();
  if (!token) {
    throw new Error("Missing authentication token. Sign in again before testing realtime voice.");
  }

  const socket = new WebSocket(
    `${base}/ws/audio/transcription/stream/?token=${encodeURIComponent(token)}`,
  );
  socket.binaryType = "arraybuffer";

  let stopped = false;
  let ready = false;
  let started = false;
  let startupSettled = false;
  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;

  const cleanup = async () => {
    stopped = true;
    processor?.disconnect();
    source?.disconnect();
    stream?.getTracks().forEach((track) => track.stop());
    await audioContext?.close().catch(() => undefined);
  };

  const sendChunk = (chunk: ArrayBuffer) => {
    if (stopped || !started) return;
    if (socket.readyState === WebSocket.OPEN) socket.send(chunk);
  };

  const handleMessage = (message: MessageEvent) => {
    try {
      const event = JSON.parse(String(message.data)) as RealtimeTranscriptionEvent;
      onEvent(event);
      if (event.type === "ready") {
        ready = true;
      } else if (event.type === "started") {
        started = true;
      } else if (event.type === "error") {
        void cleanup().finally(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.close(1011, "transcription error");
          }
        });
      }
      if (stopped && event.type === "complete") {
        socket.close(1000, "done");
      }
    } catch {
      onEvent({ type: "error", error: "Invalid transcription socket message." });
    }
  };

  socket.onmessage = handleMessage;

  socket.onerror = () => {
    if (!startupSettled) return;
    onEvent({ type: "error", error: "Realtime transcription socket failed." });
  };

  socket.onclose = (event) => {
    if (!startupSettled || !ready) return;
    if (stopped) return;
    void cleanup();
    onEvent({ type: "closed", code: event.code, reason: event.reason });
  };

  await waitForSocketReady(socket, () => ready);
  startupSettled = true;

  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new AudioContext();
  source = audioContext.createMediaStreamSource(stream);
  processor = audioContext.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (event) => {
    if (stopped || !audioContext) return;
    const input = event.inputBuffer.getChannelData(0);
    const pcm = encodePcm16(input, audioContext.sampleRate, SAMPLE_RATE);
    if (pcm.byteLength > 0) sendChunk(pcm);
    event.outputBuffer.getChannelData(0).fill(0);
  };

  socket.send(
    JSON.stringify({
      type: "start",
      sample_rate_hz: SAMPLE_RATE,
      language_code: languageCode,
    }),
  );

  source.connect(processor);
  processor.connect(audioContext.destination);

  return {
    stop: async () => {
      await cleanup();
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "stop" }));
      } else {
        socket.close();
      }
    },
    cancel: async () => {
      await cleanup();
      socket.close(1000, "cancelled");
    },
  };
}

async function waitForAccessToken(timeoutMs = TOKEN_WAIT_TIMEOUT_MS): Promise<string | null> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const token =
      Cookies.get("accessToken") ||
      window.localStorage.getItem("accessToken") ||
      Cookies.get("token") ||
      null;

    if (token) return token;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }

  return null;
}

function waitForSocketReady(socket: WebSocket, isReady: () => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      teardown();
      socket.close();
      reject(new Error("Realtime voice socket did not become ready. Check that the backend is running."));
    }, SOCKET_STARTUP_TIMEOUT_MS);

    const previousMessage = socket.onmessage;
    const previousClose = socket.onclose;
    const previousError = socket.onerror;

    const teardown = () => {
      window.clearTimeout(timeout);
      socket.onmessage = previousMessage;
      socket.onclose = previousClose;
      socket.onerror = previousError;
    };

    socket.onmessage = (message) => {
      previousMessage?.call(socket, message);
      if (isReady()) {
        teardown();
        resolve();
      }
    };

    socket.onclose = (event) => {
      teardown();
      reject(new Error(formatStartupCloseError(event)));
    };

    socket.onerror = () => {
      teardown();
      reject(new Error("Realtime voice socket failed before startup. Check backend logs and sign-in state."));
    };
  });
}

function formatStartupCloseError(event: CloseEvent) {
  if (event.code === 4001 || event.code === 1006) {
    return "Realtime voice socket was rejected before startup. Refresh the app, make sure you are signed in, and confirm the backend was restarted.";
  }
  return event.reason || `Realtime voice socket closed before startup (${event.code}).`;
}

function encodePcm16(samples: Float32Array, sourceRate: number, targetRate: number): ArrayBuffer {
  const downsampled = sourceRate === targetRate ? samples : downsampleAudio(samples, sourceRate, targetRate);
  const buffer = new ArrayBuffer(downsampled.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < downsampled.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, downsampled[i] ?? 0));
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  return buffer;
}

function downsampleAudio(samples: Float32Array, sourceRate: number, targetRate: number): Float32Array {
  const ratio = sourceRate / targetRate;
  const length = Math.floor(samples.length / ratio);
  const result = new Float32Array(length);

  for (let i = 0; i < length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), samples.length);
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += samples[j] ?? 0;
    result[i] = sum / Math.max(1, end - start);
  }

  return result;
}
