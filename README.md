# PageMark

**Turn handwritten notes on any paper into Obsidian-ready Markdown.**

Take a photo of your notes. PageMark finds the page, reads your handwriting, turns the symbols you drew into tasks, flashcards, links, and more, and gives you a `.md` file to drop into your Obsidian vault.

It's like a Rocketbook, but no special notebook is needed: any paper works.

---

## What it does

- **Finds the page automatically:** crops, straightens, and cleans up the photo.
- **Optional crop brackets:** draw ⌜ ⌝ ⌞ ⌟ around just the part you want scanned (a dot in the top-left one marks "up").
- **Files notes by course or topic:** write a short code in a box in the top-right corner, like `[BIO101]` or `[TODO]`, and PageMark adds the right tags and folder.
- **Turns symbols into Markdown:** see the key below.
- **Learns your handwriting:** upload photos of how *you* draw each symbol, and PageMark uses them as examples when reading your pages.
- **Lets you review before exporting:** photo and editable Markdown side by side, with words it wasn't sure about highlighted.
- **Exports** a single `.md` file, a `.zip` of several pages, or a `Flashcards.md` file.

---

## Symbol key

Draw the symbol at the **start of the line**, a little bigger than your writing. A line with no symbol is plain text. Underlined or bigger text becomes a heading.

| Draw | Means | Becomes |
|---|---|---|
| ● filled circle | Bullet | `- text` |
| □ empty square | Task (write the date on the line) | `- [ ] text 📅 YYYY-MM-DD` |
| ☑ checked square | Done task | `- [x] text` |
| ▲ triangle | Flashcard (`front :: back`) | `front::back` under `## Flashcards` |
| ? in a circle | Question to ask or look up | `- [ ] ❓ text #question` |
| ★ star | Important | `> [!important] text` |
| " quote marks | Direct quote (+ page number) | `> "text" (p. N)` |
| → arrow | Link to another topic | `→ [[Topic]]` |
| ~ wavy line | Your own idea | `> [!idea] text` |
| ◇ diamond | Date or event | `- 📅 YYYY-MM-DD text` |

Tasks use the [Tasks plugin](https://github.com/obsidian-tasks-group/obsidian-tasks) format, and flashcards use the [Spaced Repetition plugin](https://github.com/st3v3nmw/obsidian-spaced-repetition) format. Both plugins are optional; the Markdown reads fine without them.

You can change the symbols, add your own, and set up your own filing codes in **Settings**.

---

## You need your own Gemini API key

PageMark uses Google's Gemini model to read handwriting. **Each person uses their own key**, so you pay for (or use the free tier of) your own scans. The key is never stored in this code.

1. Go to [Google AI Studio](https://aistudio.google.com/) and sign in.
2. Click **Get API key → Create API key**, then copy it.

Gemini has a free tier, which is plenty for personal note scanning.

---

## Setup

### Option A: Run it in Google AI Studio (easiest, no install)

1. Open this project in [Google AI Studio](https://aistudio.google.com/) → **Build** (import or remix it from this repo).
2. Open **Settings → Secrets** and add a secret named `GEMINI_API_KEY` with your key as the value.
3. Run the app. AI Studio injects your key on the server, so it's never exposed in the browser.

### Option B: Run it on your own computer

You need [Node.js](https://nodejs.org/) 18 or newer.

```bash
git clone https://github.com/YOUR-USERNAME/pagemark.git
cd pagemark
npm install
```

Create a file named `.env` in the project folder containing:

```
GEMINI_API_KEY=paste-your-key-here
```

Then start it:

```bash
npm run dev
```

Open the address it prints (usually `http://localhost:3000` or `http://localhost:5173`). If the commands differ, check the `scripts` section of `package.json`.

> **Never commit your `.env` file.** Make sure `.env` is listed in `.gitignore` before you push anything.

---

## Tips for better scans

- Good light, no strong shadows, and the whole page in the frame.
- Dark pen on light paper works best.
- Keep your symbols consistent. Uploading 2–3 example photos of each one in Settings helps a lot.
- If it misreads something, fix it in the review screen before exporting.

---

## Privacy

Your page photos are sent to Google's Gemini API to be read, and are subject to [Google's Gemini API terms](https://ai.google.dev/gemini-api/terms). Settings and example images are stored locally in your browser.

---

## License

MIT. Free to use, copy, and change; no warranty. See `LICENSE`.
