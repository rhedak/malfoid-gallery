# Submitting a guest work to the gallery

The gallery at the repository root shows images of Draconia Malfoid. Other people can submit their own Draconia (genderbent Draco Malfoy) images here, as a pull request only. Guest works are shown in the gallery with a rose frame and a **Guest** badge. They are never posted to social media.

## The rules

1. **Your own work, with proper credit.** You made the image, or you have the rights to submit it. Name yourself as the artist. Your name or handle is shown on the work.
2. **Declare how it was made.** Set `ai_generated` to `true` or `false`. If it is AI-generated, name the model or tool you used in `model`. You do not need to share your prompt.
3. **Name a license.** Say in `license` what you allow: for example "Display only, credit to <artist>" or "CC BY 4.0". The gallery is non-commercial. If the AI tool has its own terms, you are responsible for following them.
4. **Confirm the rights.** Set `rights_confirmed: true`. This confirms rule 1 and 3.
5. **Wholesome (SFW), and about Draconia.** The image must be safe for work and show Draconia Malfoid, or be clearly made for this character.
6. **One image per entry.** Each work has its own entry file.

Anything that breaks these rules will not be merged. The maintainer may decline a work or remove it later.

## How to submit

You can host the image in one of two ways. Use exactly one of them in the entry:

- **In the repository:** put the image in `guest/images/` as a JPG, PNG or WebP file, named after the entry id (for example `guest/images/2026-11-my-work.jpg`), and set `image:` to its path. The image stays in the repository, and the site can make thumbnails.
- **On your own host:** set `image_url:` to a direct https link to the image file. The site shows it from your host, with no copy and no thumbnail. The check confirms the link returns an image. The link must stay online; if it breaks or the image changes, the entry will be removed. Keep a copy of the file in case you need to re-host it.

1. Create `guest/entries/<id>.yaml`, with the same id as the file name:

```yaml
id: "2026-11-my-work"
title: "My work's title"
artist: "Your name or handle"
artist_url: "https://your-site-or-profile.example"   # optional
created: 2026-11-09                                     # date you submit
ai_generated: true
model: "Name and version of the tool, e.g. Model X 2.1"  # required when ai_generated is true
license: "Display only, credit to Your name or handle"
rights_confirmed: true
source: "https://link-to-the-original-post"             # optional
note: "Anything the viewer should know, one sentence."  # optional
tags: [example, tag]                                    # optional
image: "guest/images/2026-11-my-work.jpg"       # or: image_url: "https://your-host.example/work.jpg"
```

3. Open a pull request with the template: https://github.com/rhedak/malfoid-gallery/compare?expand=1&template=guest-gallery.md

## What happens next

- A check runs on the pull request. It fails if a required field is missing, the image is not found, the external link does not return an image, or `ai_generated` is true without a model.
- The maintainer reviews the image, the credit and the license.
- When the pull request is merged into `main`, the site is rebuilt and published automatically.

To remove your work later, ask in the pull request or by email (rhedak@proton.me). Merged images stay in the git history, so a removal request may need a follow-up to clean the history too.
