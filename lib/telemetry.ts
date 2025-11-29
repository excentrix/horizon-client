import { toast } from "sonner";

type LogLevel = "info" | "warn" | "error";

const formatMessage = (message: unknown) => {
  if (typeof message === "string") {
    return message;
  }
  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
};

export const telemetry = {
  log(level: LogLevel, message: unknown, meta?: Record<string, unknown>) {
    const formatted = formatMessage(message);
    const payload = meta ? `${formatted} ${JSON.stringify(meta)}` : formatted;

    if (level === "error") {
      console.error(payload);
    } else if (level === "warn") {
      console.warn(payload);
    } else {
      console.info(payload);
    }
  },
  info(message: unknown, meta?: Record<string, unknown>) {
    this.log("info", message, meta);
  },
  warn(message: unknown, meta?: Record<string, unknown>) {
    this.log("warn", message, meta);
  },
  error(message: unknown, meta?: Record<string, unknown>) {
    this.log("error", message, meta);
  },
  toast(message: string, description?: string) {
    toast(message, description ? { description } : undefined);
    this.info(message, description ? { description } : undefined);
  },
  toastError(message: string, description?: string) {
    toast.error(message, description ? { description } : undefined);
    this.error(message, description ? { description } : undefined);
  },
  toastSuccess(message: string, description?: string) {
    toast.success(message, description ? { description } : undefined);
    this.info(message, description ? { description } : undefined);
  },
  toastInfo(message: string, description?: string) {
    toast.info(message, description ? { description } : undefined);
    this.info(message, description ? { description } : undefined);
  },
};
