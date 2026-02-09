# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into your Horizon learning platform. The integration includes client-side event tracking using the `instrumentation-client.ts` approach (recommended for Next.js 15.3+), automatic exception capture, user identification on login/signup, and a reverse proxy setup via Next.js rewrites to improve tracking reliability.

## Integration Summary

### Files Created
- `instrumentation-client.ts` - PostHog client-side initialization with exception capture and debug mode
- `posthog-setup-report.md` - This report

### Files Modified
- `.env.local` - Added `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` environment variables
- `next.config.ts` - Added PostHog reverse proxy rewrites for `/ingest/*` routes
- `context/AuthContext.tsx` - Added PostHog identify on login, capture events for login/logout/signup

### Event Tracking Added

| Event Name | Description | File Path |
|------------|-------------|-----------|
| `user_signed_up` | User completed registration form | `context/AuthContext.tsx` |
| `user_signed_in` | User successfully logged in | `context/AuthContext.tsx` |
| `user_logged_out` | User logged out (with PostHog reset) | `context/AuthContext.tsx` |
| `onboarding_resume_uploaded` | User uploaded resume during onboarding | `app/(auth)/onboarding/page.tsx` |
| `onboarding_resume_skipped` | User skipped resume upload step | `app/(auth)/onboarding/page.tsx` |
| `onboarding_form_submitted` | User submitted preferences form | `app/(auth)/onboarding/form/page.tsx` |
| `onboarding_path_selected` | User selected a learning path | `app/(auth)/onboarding/paths/page.tsx` |
| `onboarding_completed` | User completed full onboarding flow | `app/(auth)/onboarding/finalize/page.tsx` |
| `conversation_started` | User started new mentor conversation | `components/mentor-lounge/create-conversation-modal.tsx` |
| `message_sent` | User sent message in conversation | `components/mentor-lounge/message-composer.tsx` |
| `analysis_requested` | User requested intelligence analysis | `app/(studio)/chat/page.tsx` |
| `plan_created` | User created a learning plan | `app/(studio)/chat/page.tsx` |
| `plan_started` | User started working on a plan | `app/(studio)/plans/page.tsx` |
| `task_completed` | User completed a task in their plan | `components/plans/task-list.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- **Analytics basics**: [https://us.posthog.com/project/303530/dashboard/1191420](https://us.posthog.com/project/303530/dashboard/1191420)

### Insights
- **Onboarding Funnel**: [https://us.posthog.com/project/303530/insights/eKsK2mK9](https://us.posthog.com/project/303530/insights/eKsK2mK9)
- **Daily Active Users**: [https://us.posthog.com/project/303530/insights/tSVh2lVV](https://us.posthog.com/project/303530/insights/tSVh2lVV)
- **Messages Sent Over Time**: [https://us.posthog.com/project/303530/insights/qca8Lktx](https://us.posthog.com/project/303530/insights/qca8Lktx)
- **Task Completion Rate**: [https://us.posthog.com/project/303530/insights/kFPewCR3](https://us.posthog.com/project/303530/insights/kFPewCR3)
- **Plan Creation & Starts**: [https://us.posthog.com/project/303530/insights/NQj5ovM1](https://us.posthog.com/project/303530/insights/NQj5ovM1)

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

## Configuration Details

### Environment Variables
```
NEXT_PUBLIC_POSTHOG_KEY=phc_jl1pIzH3oBPIClxEvyfcuIMocUDb04ZyiwMtaRp9HmO
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Reverse Proxy
The integration uses Next.js rewrites to proxy PostHog requests through your domain, improving tracking reliability by avoiding ad blockers:
- `/ingest/static/*` → `https://us-assets.i.posthog.com/static/*`
- `/ingest/*` → `https://us.i.posthog.com/*`
