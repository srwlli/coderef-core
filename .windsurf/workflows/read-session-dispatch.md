---
description: Read session dispatch, accept work, and complete task with reporting
---

# /read-session-dispatch

Use this workflow to read your assigned dispatch from the daily session, accept the work, and complete it with proper reporting.

## Prerequisites

- You have joined a daily session (`/join-daily-session`)
- A dispatch has been assigned to your domain

## Steps

1. **Read your dispatch**

   ```bash
   node C:/Users/willh/Desktop/CODEREF/ASSISTANT/SKILLS/SHARED/read-session-dispatch-workflow/read-session-dispatch-workflow.js read \
     --sessionId daily-agent-session-YYYY-MM-DD \
     --domain {YOUR_DOMAIN}
   ```

2. **Accept the dispatch**

   ```bash
   node C:/Users/willh/Desktop/CODEREF/ASSISTANT/SKILLS/SHARED/read-session-dispatch-workflow/read-session-dispatch-workflow.js accept \
     --sessionId daily-agent-session-YYYY-MM-DD \
     --domain {YOUR_DOMAIN}
   ```

3. **Do your work**
   - Execute the task per acceptance criteria
   - Generate a report documenting findings/results

4. **Save your report**

   ```bash
   node C:/Users/willh/Desktop/CODEREF/ASSISTANT/SKILLS/SHARED/read-session-dispatch-workflow/read-session-dispatch-workflow.js save-report \
     --sessionId daily-agent-session-YYYY-MM-DD \
     --domain {YOUR_DOMAIN} \
     --reportFile ./my-report.md
   ```

5. **Complete the dispatch**

   ```bash
   node C:/Users/willh/Desktop/CODEREF/ASSISTANT/SKILLS/SHARED/read-session-dispatch-workflow/read-session-dispatch-workflow.js complete \
     --sessionId daily-agent-session-YYYY-MM-DD \
     --domain {YOUR_DOMAIN} \
     --summary "Brief summary of completion"
   ```

## See Also

- Full skill documentation: `C:\Users\willh\Desktop\CODEREF\ASSISTANT\SKILLS\SESSION\read-session-dispatch\SKILL.md`
- Dispatch format examples: `C:\Users\willh\Desktop\CODEREF\ASSISTANT\EXAMPLES\OUTPUTS\SESSIONS\dispatch-report.md`