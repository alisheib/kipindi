# Email signatures — hosted here, not embedded

We host staff email-signature images on the 50pick domain and reference them by URL.
This is a deliberate workaround, and it is worth knowing why before someone "simplifies"
it by pasting an image back into the webmail editor.

## Why we host them

Netpoa's webmail stores a signature in a single database field. Pasting an image into the
editor embeds it as a **base64 data URI**, which balloons the HTML — a ~50 KB PNG becomes
~70 KB of text, and even the logo alone came to 8.4 KB. The field silently truncates or
rejects it: the signature looks correct in the editor and **disappears on refresh**, with no
error shown. That is the symptom to recognise (Ali hit it 2026-07-20).

Hosting the image turns the whole signature into ~300 bytes of HTML, which fits any
provider's limit and survives a save.

## Where they live

```
public/brand/email-signature.png        →  https://www.50pick.tz/brand/email-signature.png
```

Anything under `public/` is served straight from the domain, so adding a file and pushing is
all that is required. Name new ones `email-signature-<firstname>.png`.

## The snippet

Paste via the webmail's **source view** (the `<>` toolbar button) — NOT into the rich-text
area, or the editor may re-embed it as base64 and reintroduce the original problem.

```html
<a href="https://www.50pick.tz" style="text-decoration:none">
<img src="https://www.50pick.tz/brand/email-signature.png"
     alt="Ali Sheib — Head of Research &amp; Development, 50pick · ali.sheib@50pick.tz · +255 744 419 111"
     width="570" style="display:block;max-width:100%;height:auto;border:0" />
</a>
```

## Rules for a new signature

1. **Put the contact details in the `alt` text.** Outlook and Gmail block remote images by
   default, so for a meaningful share of recipients the image never renders. The alt text is
   the signature for those people — it must carry the name, role, email and phone, not say
   "signature".
2. **`width` in the attribute, `max-width:100%` in the style.** Older Outlook ignores CSS
   width; mobile clients need the fluid cap. Both are required.
3. **`display:block`** — otherwise clients add a stray baseline gap under the image.
4. **Export at 2× and set `width` to the intended size** (the current one is 1140 px wide,
   displayed at 570) so it stays sharp on retina screens.
5. Keep the file **under ~80 KB**. It is downloaded on every open.

## Trade-off, stated plainly

A hosted image will not render for recipients who block remote images, whereas base64 would
have. We accept that because base64 does not persist at all here — and because the `alt`
text covers the blocked case. If a signature ever needs to be readable with images off, build
it as **HTML text with a small hosted logo**, rather than one flat image.
