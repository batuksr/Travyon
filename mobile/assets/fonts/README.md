# Bundled fonts

Body text uses Inter. Headings use **Travyon Display**, a local derivative of
Caprasimo with Turkish character support. Both are bundled for offline use.

The original Caprasimo 1.001 file lacks `Ğ ğ İ Ş ş`. The derivative adds these
five characters by combining its existing `G g I S s` outlines with its own
breve, dot and cedilla accents. Original outlines, widths and hinting are
preserved; no system-font fallback is needed for Turkish letters.

Original source: https://github.com/google/fonts/tree/main/ofl/caprasimo

`Caprasimo-Regular.ttf` is retained as build input, not registered as an app font.
`TravyonDisplay-Regular.ttf` is the app asset. Both are covered by the included
`OFL-Caprasimo.txt`; original authorship and license metadata are retained.
Inter's license is in `OFL-Inter.txt`.

To regenerate from the repository root (Python and `fonttools==4.65.0` required):

```sh
python scripts/build-mobile-heading-font.py
python scripts/build-mobile-heading-font.py --check
```

Validation checks Turkish coverage, unchanged original outlines/hinting and
metrics, accent components, vertical bounds and the derivative's family name.
The same build also updates and validates `web/public/fonts/TravyonDisplay-Regular.ttf`
so both apps use identical heading outlines.
After changing the asset, fully stop and rerun Flutter; hot reload is not enough.
