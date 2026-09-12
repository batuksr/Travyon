# Web fonts

Inter is used for body text. Travyon Display is the Turkish-capable Caprasimo
derivative also bundled in the mobile app. It preserves the original design
and adds `Ğ ğ İ Ş ş` using the original font's own letter and accent shapes.

Both fonts are served locally and included in the PWA's static asset cache.
Licenses are included in `OFL-Inter.txt` and `OFL-Caprasimo.txt`.

Source, authorship and build instructions: `mobile/assets/fonts/README.md` in
the repository. Running `python scripts/build-mobile-heading-font.py` at the
repository root regenerates both mobile and web copies (fonttools required).
