# Contributing to ReflowAI Documentation

## Why This Matters

Documentation that falls out of sync with code causes support chaos and frustrates customers. This guide ensures docs stay accurate as apps evolve.

## When to Update Docs

Update docs **immediately after**:
- A new feature is released
- A UI/workflow changes (buttons move, steps change, etc.)
- A bug fix changes how something works
- A deprecation (feature removed or renamed)

Do **not** wait for a big docs refresh cycle. Small updates are easier than a massive overhaul.

## How to Update Docs

### If you changed a feature in code:

1. **Identify which doc section is affected:**
   - FAQ.md — add a question if customers will ask about this
   - USER_GUIDE.md — update the step-by-step instructions
   - VIDEO_ROADMAP.md — note if a video needs to be recorded

2. **Update the file:**
   - Use the same tone and format as existing content (short, scannable, assume zero knowledge)
   - Be specific: "Go to Settings → Features" not "Find the settings"
   - Include screenshot descriptions if the UI changed

3. **Example:**

   **Before (old docs):**
   > 3.2 Creating a Task
   > Click "Create Task", enter a name, and click "Save".

   **After (updated docs):**
   > 3.2 Creating a Task
   >
   > 1. Go to **Tasks → Create Task**.
   > 2. Enter the **Task Name** (e.g., "Daily temperature check").
   > 3. Set the **Frequency** (daily, weekly, etc.).
   > 4. Click **Save**. The task is created and scheduled immediately.

4. **Commit to git with a clear message:**
   ```
   git commit -m "docs: update task creation workflow (UI moved to separate screen)"
   ```

## Review Process

1. **Self-review:** Read the updated section aloud. Does it make sense to someone new?
2. **Product team review:** Have the feature owner or PM review the docs before merging.
3. **Support team review:** Have someone from support (if applicable) check if it answers customer questions.

## Versioning

Docs are versioned alongside app releases:
- When you tag a release (e.g., `v2.1.0`), also tag the docs commit with the same version
- This way, customers using an older app version can read docs for that version

## Questions?

- **"Should I update the FAQ or USER_GUIDE?"** → FAQ for quick answers (1-2 sentences), USER_GUIDE for step-by-step (use both when it's a major task)
- **"Do I need to record a video?"** → Check VIDEO_ROADMAP.md. Only high-impact workflows get videos.
- **"Who reviews my doc changes?"** → Product owner for accuracy, support team for clarity

---

*Last updated: May 2026*
