# Tab Death - Local Testing Guide

**For Non-Technical Users**

This guide will help you test the Tab Death Chrome extension locally on your computer.

---

## ✅ Prerequisites Completed

The following steps have already been completed:
- ✅ Dependencies installed (`npm install`)
- ✅ Critical bugs fixed
- ✅ Visual decay indicators added
- ✅ Extension built (`npm run build`)
- ✅ `dist/` folder created with all files

---

## 🚀 Loading the Extension in Chrome

### Step 1: Open Chrome Extensions Page

1. Open Google Chrome
2. Type `chrome://extensions` in the address bar and press Enter
3. You should see a page titled "Extensions"

### Step 2: Enable Developer Mode

1. Look for a toggle switch in the top-right corner labeled **"Developer mode"**
2. Click it to turn it ON
3. You should now see additional buttons appear

### Step 3: Load the Extension

1. Click the **"Load unpacked"** button (top-left area)
2. A file browser window will open
3. Navigate to the `tab-death` folder on your computer
4. Inside that folder, select the **`dist`** folder
5. Click **"Select Folder"** (or "Open" on some systems)

### Step 4: Verify Installation

You should now see "Tab Death" in your list of extensions with:
- Extension name: **Tab Death**
- Version: **0.1.0**
- Status: **Enabled** (blue toggle)

**Icon Location:**
- Look for a small puzzle piece icon in your Chrome toolbar (top-right)
- Click it to see all extensions
- Pin "Tab Death" for easy access

---

## 🧪 Testing the Extension

### Test 1: Passive Capture (Automatic)

**What this tests:** Extension captures closed tabs automatically

1. Open a new tab (any website, like `https://example.com`)
2. Close the tab normally (click the X or press Ctrl+W / Cmd+W)
3. Click the Tab Death icon in your toolbar
4. Look for the closed tab in the **"Unclaimed"** section
5. You should see the website title/URL listed

**Expected result:** ✅ Tab appears in Unclaimed list

---

### Test 2: Active Close with "Why" (Manual Capture)

**What this tests:** Intentional capture with a note

1. Open a new tab (e.g., `https://github.com`)
2. Use the keyboard shortcut:
   - **Windows/Linux:** `Ctrl + Shift + W`
   - **Mac:** `Cmd + Shift + W`
3. A small prompt window should appear asking **"Why did this matter?"**
4. Type a short note (e.g., "Check later for updates")
5. Click **"Save"** (or press Enter)

**Expected result:** ✅ Prompt appears, tab closes, note is saved

**Alternative method:**
- Right-click on the page
- Look for "Close with Tab Death…" in the context menu
- Click it

---

### Test 3: Visual Decay Indicators

**What this tests:** UI shows decay states visually

Since items naturally take days to decay, we can't test this immediately. But here's what you should see later:

| State | Visual Appearance |
|-------|-------------------|
| **Fresh (0-7 days)** | Normal border, full opacity |
| **Fading (8-21 days)** | Grayed out, 75% opacity |
| **Critical (22-30 days)** | Red border, warning "⚠️ Dies in X days" |
| **Archived (31-90 days)** | Very faded, only in search |

For now, all your items will be "Fresh" with normal styling.

---

### Test 4: Starring Items

**What this tests:** Star limit enforcement (max 5 stars)

1. Open the Tab Death popup
2. Find an item in "Unclaimed" or "Last Chance"
3. Click **"Star"** button
4. The item should move to the **"Starred"** section
5. Try starring 5 items total
6. Try to star a 6th item

**Expected result:**
- ✅ First 5 stars work
- ⚠️ 6th star should fail (or require un-starring another item)

---

### Test 5: Reopening Items

**What this tests:** Opening saved tabs again

1. Find any item in the popup
2. Click the **"Reopen"** button
3. The website should open in a new tab

**Expected result:** ✅ Tab opens, item's "touchCount" increases

---

### Test 6: Export Functionality

**What this tests:** Data export for backup

1. Click the Tab Death icon
2. Scroll to the **"Export"** section
3. Click **"Export JSON"**
4. A file download dialog should appear
5. Save the file (it will be named something like `tabdeath-items-2026-01-12.json`)
6. Open the file in a text editor

**Expected result:** ✅ JSON file contains your saved items

---

### Test 7: Search Archived Items

**What this tests:** Finding old items

This won't work immediately (no archived items yet), but here's how:

1. In the popup, scroll to **"Archive Search"**
2. Type a keyword (e.g., "github")
3. Click **"Search"**
4. Results appear below

**Expected result:** ✅ Search works (even if no results initially)

---

## 🐛 Troubleshooting

### Extension Doesn't Load
- Check that Developer mode is enabled
- Make sure you selected the `dist/` folder, not the root `tab-death/` folder
- Click the "Reload" button (circular arrow) on the extension card

### No Items Appear After Closing Tabs
- Check that the extension is enabled (toggle is blue)
- Open Chrome DevTools: Right-click extension icon → "Inspect popup"
- Look for errors in the Console tab

### Keyboard Shortcut Doesn't Work
- Go to `chrome://extensions/shortcuts`
- Find "Tab Death"
- Verify the shortcut is set correctly
- Try changing it if there's a conflict

### Context Menu Doesn't Show
- The menu only appears on web pages (not chrome:// pages)
- Try on a regular website like `https://example.com`

---

## 📊 Viewing Stored Data

Want to see what's stored in the database?

1. Open Chrome DevTools (F12)
2. Go to **"Application"** tab
3. On the left sidebar:
   - Click **"IndexedDB"** → **"tabdeath"** → **"items"**
4. You'll see all stored tab items

---

## 🧹 Clearing All Data (Reset)

If you want to start fresh:

1. Chrome DevTools → Application tab
2. IndexedDB → tabdeath → **Delete database**
3. Reload the extension

---

## 🎯 What to Look For (Quality Checks)

### UI Quality
- [ ] Popup opens quickly (< 1 second)
- [ ] Text is readable (not too small)
- [ ] Buttons are clickable
- [ ] No visual glitches

### Functionality
- [ ] Tabs are captured reliably
- [ ] "Why" prompt appears and works
- [ ] Star/unstar works
- [ ] Reopen works
- [ ] Export downloads a file

### Performance
- [ ] Extension doesn't slow down Chrome
- [ ] No lag when closing multiple tabs
- [ ] Popup doesn't freeze

---

## 📸 Taking Screenshots for Testing

If you find issues, take screenshots:

1. **Windows:** Press `Win + Shift + S`
2. **Mac:** Press `Cmd + Shift + 4`
3. Capture the popup or any errors

---

## ⚙️ Advanced: Viewing Logs

If something breaks:

1. Right-click the Tab Death icon
2. Select **"Inspect popup"**
3. Look at the **Console** tab for errors

For background script errors:
1. Go to `chrome://extensions`
2. Find Tab Death
3. Click **"Inspect views: service worker"**
4. Check the Console for errors

---

## 🔄 Rebuilding After Code Changes

If you (or someone) makes changes to the code:

```bash
# In the tab-death folder, run:
npm run build

# Then in Chrome:
# 1. Go to chrome://extensions
# 2. Click the reload button (circular arrow) on Tab Death
```

---

## ✅ Success Criteria

You'll know the extension is working correctly if:

1. ✅ Closed tabs appear in "Unclaimed" within ~1 second
2. ✅ "Why" prompt appears when using Cmd+Shift+W
3. ✅ Starred items show up in "Starred" section
4. ✅ Export downloads a valid JSON file
5. ✅ No errors in Chrome DevTools console
6. ✅ Extension doesn't crash or freeze

---

## 📞 Getting Help

If you're stuck:

1. Check `ARCHITECTURE_ANALYSIS.md` for technical details
2. Look for errors in Chrome DevTools console
3. Verify the build succeeded: check that `dist/` folder exists
4. Make sure all files from the build are present:
   - `dist/manifest.json`
   - `dist/background/index.js`
   - `dist/popup.html` and `dist/popup.js`
   - `dist/prompt.html` and `dist/prompt.js`

---

## 🎉 Next Steps After Testing

Once you've confirmed everything works:

1. **Test with real usage** for a few days
2. **Monitor for bugs** (check DevTools console daily)
3. **Gather feedback** from 2-3 other users
4. **Review the decay system** after 8-10 days (when items start fading)
5. **Prepare for Chrome Web Store** submission

---

## 🔗 Useful Chrome URLs

- Extensions page: `chrome://extensions`
- Keyboard shortcuts: `chrome://extensions/shortcuts`
- Extension errors: `chrome://extensions` → Tab Death → "Errors" button

---

**Happy Testing! 💀**

Remember: Tab Death is designed to let things die. If items disappear after 90 days, that's not a bug—it's the product working as intended.
