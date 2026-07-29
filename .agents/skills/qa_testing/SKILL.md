---
name: qa_testing
description: Frequently used QA testing flow to execute an end-to-end verification of new UI features or backend logic by spawning a browser subagent and evaluating outcomes.
---

# QA Testing Skill

Use this skill when you need to rigorously verify features in the application just like a real QA Tester would. 

## When to trigger
- The user requests "test it as a qa tester".
- You've completed a major feature implementation (like the "Connections Tab" or "Automated Daily Posting") and need to ensure it works end-to-end.
- The user reports a bug and you need to reproduce it interactively.

## Execution Steps

1. **Start the Application**: Ensure the application is running locally. Use `manage_task` or `run_command` (in background) to start the frontend and backend servers.
2. **Determine Target Port**: Typically, `localhost:5173` (Vite) or `localhost:3000` (Create React App).
3. **Spawn Browser Subagent**: Use the `browser_subagent` tool with a specific `Task`.
    - Provide a robust prompt asking the subagent to click through the new feature.
    - Ask the subagent to take screenshots of the success state or note any visual discrepancies (e.g., overlapping text, missing buttons, network errors in console).
    - Ensure you give the subagent explicit success/failure conditions.
4. **Evaluate Results**: Review the final response and media (screenshots/videos) provided by the browser subagent.
5. **Iterate and Fix**: If the subagent found a bug or rough edge (e.g., "rough and weird looking around edges"), fix the code immediately without asking for permission, and run the test again until perfect.
