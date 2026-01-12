# How to Merge the Fixes into Main

I can't push directly to `main` (it's protected), but merging is super easy!

---

## Option 1: One-Click Merge (Easiest - 30 seconds)

### Step 1: Open the Pull Request
Click this link:
**https://github.com/nickheise/tab-death/compare/main...claude/analyze-project-architecture-YmWj8?expand=1**

### Step 2: Create the PR
1. You'll see a comparison of all changes
2. Click the green **"Create pull request"** button
3. Title is pre-filled: "Critical bug fixes and UX improvements"
4. Click **"Create pull request"** again

### Step 3: Merge It
1. Scroll down
2. Click the green **"Merge pull request"** button
3. Click **"Confirm merge"**

**Done!** ✅

---

## Option 2: Direct Merge via GitHub Web (If PR doesn't work)

If the PR link doesn't work:

1. Go to: https://github.com/nickheise/tab-death
2. Click the "Branches" dropdown (next to "main")
3. Select **"claude/analyze-project-architecture-YmWj8"**
4. Click the **"Contribute"** button
5. Click **"Open pull request"**
6. Click **"Create pull request"**
7. Click **"Merge pull request"**

---

## After Merging

### Download the Fixed Code

1. Go to https://github.com/nickheise/tab-death
2. Make sure you're on the **main** branch (should say "main" in the dropdown)
3. Click the green **"Code"** button
4. Click **"Download ZIP"**
5. Extract it

### Build & Test

```bash
cd /path/to/extracted/tab-death
npm install
npm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` folder
5. Test it!

---

## What You're Merging

- ✅ 2 critical bug fixes (extension was broken without these)
- ✅ Visual decay indicators (red borders, fading, warnings)
- ✅ Better prompt UX (1-second delay before auto-close)
- ✅ Comprehensive documentation (2 new guides)
- ✅ 9 files changed, 1,936 additions, 155 deletions

**Full details in `ARCHITECTURE_ANALYSIS.md` after you merge.**

---

**Any questions? Let me know!**
