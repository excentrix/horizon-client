import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "development",
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "0.1"),
  
  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Connect to Sentry only if not disabled
  enabled: process.env.NEXT_PUBLIC_SENTRY_DISABLED !== 'true',
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  
  // Replay configuration for session recording
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Filter out unwanted errors
  beforeSend(event, hint) {
    // Don't send errors from development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    
    // Filter out specific errors
    const error = hint.originalException;
    if (error && typeof error === 'string') {
      // Skip common browser extension errors
      if (error.includes('chrome-extension://') || error.includes('moz-extension://')) {
        return null;
      }
    }
    
    return event;
  },
});
