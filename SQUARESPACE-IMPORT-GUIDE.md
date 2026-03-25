# Squarespace Import Guide — Transition Properties

## Files Created
- `squarespace-import.xml` — Import this into Squarespace (WordPress XML format)
- `squarespace-custom.css` — Paste this into Squarespace's CSS editor to apply branding

---

## Step 1: Import the Pages

1. Log in to your Squarespace account
2. Go to **Settings → Advanced → Import / Export**
3. Click **Import** and select **WordPress**
4. Upload `squarespace-import.xml`
5. Squarespace will create 3 pages: **Home**, **About**, **Commercial**

---

## Step 2: Apply Custom CSS (Branding)

1. Go to **Design → Custom CSS**
2. Open `squarespace-custom.css` and copy the entire contents
3. Paste it into the Custom CSS editor
4. Click **Save**

This restores your brand colors (orange/amber/cream), fonts (Playfair Display + DM Sans), cards, forms, hero sections, and buttons.

---

## Step 3: Set Up Navigation

1. Go to **Pages** in the left sidebar
2. Drag **Home**, **About**, and **Commercial** into your main navigation
3. Set **Home** as your homepage (click the gear icon → check "Set as Homepage")

---

## Step 4: Set Up Forms

Squarespace's import doesn't wire up form submissions automatically. For each form on the site:

1. In the page editor, find the form block
2. Click **Edit** → **Storage** tab
3. Connect to **Email** (your inbox) or **Google Sheets**
4. Set the notification email to your preferred address

---

## Step 5: Recommended Squarespace Template

Choose a template that supports full-width sections and custom code blocks:
- **Comet** — clean, modern, good for real estate
- **Clay** — minimal, works well with custom CSS
- **Forma** — business-focused layout

Any template works since the custom CSS handles most styling.

---

## Notes

- **Forms** are included as HTML in the import. Squarespace may convert them to its native form blocks — that's fine and preferred.
- **Logo**: Add your logo via **Design → Logo & Title**
- **Favicon**: Add via **Design → Browser Icon**
- **Footer**: Customize via the page editor footer area
- The site uses Google Fonts (DM Sans + Playfair Display), already included in the CSS via `@import`
