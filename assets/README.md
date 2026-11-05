# Panel images

Put your own panel images here, for example `logo.png` or `banner.png`.
Supported formats: PNG, JPG, GIF, WEBP (the dashboard upload also takes SVG and converts it to PNG)

The bot looks for the file named in the config in this folder first and then in
`default/`, which holds the MSK logo. So `"file": "logo.png"` shows the MSK logo
until you put your own `logo.png` here. Images you add here are ignored by git,
and the update routine (`npm run update` or the dashboard's Update button) sets a
replaced `logo.png` aside and puts it back, so your images never block an update.

Configure them in `config/config.jsonc`:
```json
  "panel": {
    "logo": {
      "enabled": true,
      "file": "logo.png"
    },
    "banner": {
      "enabled": true,
      "file": "banner.png"
    }
  },
```

Without access to this folder (a hosted bot), upload the images in the web
dashboard under Configuration, section "Ticket Panel". They are stored here as
`custom-logo-<hash>.<ext>` and `custom-banner-<hash>.<ext>`, and the config is
updated for you. Reset to default deletes them again.

The other images in this folder (`msk-ticket-bot-banner.png`, `bot-hosting-*.png`)
belong to the documentation.
