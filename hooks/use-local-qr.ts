"use client";

import { useEffect, useState } from "react";
import { telemetry } from "@/lib/telemetry";

export function useLocalQrCode(value: string) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrError, setQrError] = useState<string>("");

  useEffect(() => {
    let active = true;

    async function buildQr() {
      if (!value) {
        if (active) {
          setQrDataUrl("");
          setQrError("");
        }
        return;
      }

      try {
        const qr = await import("qrcode");
        const toDataURL =
          typeof qr.toDataURL === "function"
            ? qr.toDataURL
            : typeof qr.default?.toDataURL === "function"
              ? qr.default.toDataURL
              : null;

        if (!toDataURL) {
          throw new Error("qrcode.toDataURL is unavailable in module namespace");
        }

        const dataUrl = await toDataURL(value, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 256,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        });
        if (!active) return;
        setQrDataUrl(dataUrl);
        setQrError("");
      } catch (error) {
        if (!active) return;
        setQrDataUrl("");
        setQrError("qr_generation_failed");
        telemetry.warn("Local QR generation failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    void buildQr();

    return () => {
      active = false;
    };
  }, [value]);

  return { qrDataUrl, qrError };
}
