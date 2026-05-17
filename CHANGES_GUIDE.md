# VidyaSagar v3 — Fix Guide 🔧

## Files in this ZIP — क्या replace करें

| File | Action |
|---|---|
| `app.js` | Replace `js/app.js` completely |
| `typing.js` | Replace `js/typing.js` completely |
| `style_additions.css` | `<head>` में `style.css` के AFTER add करें |
| `typing_tab_html.txt` | Instructions नीचे |
| `ghibli_html.txt` | Instructions नीचे |

---

## Step 1 — style_additions.css add करें

`index.html` में `<link rel="stylesheet" href="css/style.css">` के AFTER:

```html
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/style_additions.css">  ← ADD THIS
```

Or इसे `css/` folder में copy करें।

---

## Step 2 — Typing Tab HTML replace करें

`index.html` में `id="screen-typing"` वाला पूरा div ढूंढें:

```html
<div class="tab-screen" id="screen-typing">
  ... (पुराना content)
</div>
```

इसे `typing_tab_html.txt` के content से replace करें।

---

## Step 3 — Ghibli Animation replace करें

`index.html` में `id="signup-panel"` वाला पूरा div ढूंढें:

```html
<div id="signup-panel" class="hidden">
  ...पुराना content...
</div>
```

इसे `ghibli_html.txt` के content से replace करें।

---

## Step 4 — JS files replace करें

```
vidyasagar_v3/js/app.js    ← replace with app.js (this folder)
vidyasagar_v3/js/typing.js ← replace with typing.js (this folder)
```

---

## Fixes Summary — क्या-क्या ठीक हुआ

### 🐛 Bug Fixes
1. **Sub-screen overlap** — Deactivate account अब typing screen के ऊपर नहीं खुलेगा। Sub-screens अब `position:fixed` हैं।
2. **Tab navigation bug** — किसी भी tab पर click करने पर सभी open sub-screens automatically close होंगे।
3. **Theme/Font no feedback** — अब theme या font change करने पर green toast दिखेगा ✅
4. **Light theme incomplete** — 60+ CSS selectors fix हुए — कोई भी element dark नहीं रहेगा।

### 🎨 Design Improvements
5. **More colors** — Hero gradient, nav icons glow, state chips, stat numbers — सब vibrant colors।
6. **Buttons visibility** — Dark mode में सभी buttons clearly visible।
7. **Typing Tab redesigned** — AR Typing Platform style grid cards।
8. **Search bar** — Exam name से search करें।
9. **Better passage cards** — Number, difficulty, estimated time दिखाई देगा।
10. **Ghibli animation improved** — Better boy SVG, proper walking legs, briefcase opens with papers flying out।

---

## Supabase SQL (typing passages table)

```sql
CREATE TABLE typing_passages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id     TEXT NOT NULL,
  language    TEXT NOT NULL DEFAULT 'english',
  title       TEXT,
  content     TEXT NOT NULL,
  word_count  INTEGER,
  difficulty  TEXT DEFAULT 'medium',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON typing_passages(exam_id, language, is_active);
ALTER TABLE typing_passages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON typing_passages FOR SELECT USING (is_active = TRUE);
```

## Exam IDs Reference (Supabase में passages add करते समय)

| Exam ID | Exam Name |
|---|---|
| ssc-chsl | SSC CHSL |
| ssc-cgl | SSC CGL |
| rrb-ntpc | RRB NTPC |
| cpct | MP CPCT |
| cisf-hc | CISF Head Constable |
| crpf-hc | CRPF Head Constable |
| bsf-hc | BSF Head Constable |
| army-clerk | Army Clerk |
| delhi-police | Delhi Police HC |
| ahc | Allahabad HC |
| sc-jca | Supreme Court JCA |
| upsssc-jr | UPSSSC Junior Asst |
| dsssb | DSSSB LDC |
| aai | AAI Junior Asst |

Full list: js/typing.js की EXAMS array देखें।
