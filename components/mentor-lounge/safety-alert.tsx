import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import {
  SAFETY_ALERT_EVENT,
  type SafetyAlertEventDetail,
} from "@/hooks/use-chat-socket";

export function SafetyAlert() {
  const [alert, setAlert] = useState<SafetyAlertEventDetail | null>(null);

  useEffect(() => {
    const handleSafetyAlert = (event: Event) => {
      const detail = (event as CustomEvent<SafetyAlertEventDetail>).detail;
      if (detail?.type === "safety_alert") {
        setAlert(detail);
      }
    };

    window.addEventListener(SAFETY_ALERT_EVENT, handleSafetyAlert);
    return () => window.removeEventListener(SAFETY_ALERT_EVENT, handleSafetyAlert);
  }, []);

  if (!alert) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
      >
        <Alert variant="destructive" className="bg-destructive text-destructive-foreground border-none shadow-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Safety Alert</AlertTitle>
          <AlertDescription className="mt-1">
            <p className="mb-2">{alert.message}</p>
            {alert.resources && alert.resources.length > 0 && (
              <div className="text-xs bg-black/10 p-2 rounded mt-2">
                <p className="font-semibold mb-1">Resources:</p>
                <ul className="list-disc list-inside">
                  {alert.resources.map((res, i) => (
                    <li key={i}>{res}</li>
                  ))}
                </ul>
              </div>
            )}
          </AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 hover:bg-black/10 text-destructive-foreground"
            onClick={() => setAlert(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
}
