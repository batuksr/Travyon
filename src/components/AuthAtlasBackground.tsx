// Decorative atlas engraving, deliberately simplified rather than a navigable map.
export default function AuthAtlasBackground() {
  return (
    <div className="auth-atlas-background" aria-hidden="true">
      <svg viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" fill="none" focusable="false">
        <g className="auth-atlas-grid">
          <ellipse cx="410" cy="390" rx="520" ry="330" />
          <ellipse cx="410" cy="390" rx="345" ry="330" />
          <ellipse cx="410" cy="390" rx="155" ry="330" />
          <path d="M-110 390H930M-55 245Q410 140 875 245M-55 535Q410 640 875 535M75 140Q410 65 745 140M75 640Q410 715 745 640M410 60V720" />
        </g>
        <g className="auth-atlas-land">
          <path d="m-25 226 39-34 47-8 19-24 50 8 27-29 45 4 19 20 45-5 28 25-14 26-39 13-20 36-34 17-14 31-35 12-5 31 25 20 11 28 27 12 14 24-24 11-29-18-19-32-31-12-25-44-34-14-15-41-35-18Z" />
          <path d="m157 393 30-12 35 19 36 5 37 35-4 39-23 22-9 40-25 26-11 44-25 24-16-13 6-40-18-37 4-32-18-33 5-37Z" />
          <path d="m245 120 34-24 48 6 14 22-24 46-31 14-26-23Z" />
          <path d="m395 230 5-27 23-10 9-33 19-12 15 14-7 39 21 8 16-15 36 13 13-20 41-5 32-23 38 14 41-9 35 22 43-1 44 25 27 36-28 19-30-9-15 26-37 9-16 29-24-3-6 39-18 22-18-29-9-35-22-8-7 25-21 21-20-28-23-7-20-36-29 5-15-21-25 8-12-17-29 10Z" />
          <path d="m379 301 39-12 36 11 17 23 31 7 9 38-23 32-12 47-30 34-23-11-8-34-28-17-7-35-21-24Z" />
          <path d="m510 452 9-20 8 7-2 35-12 14-8-10ZM650 448l25 8 19 21 29 3 15 16-11 8-30-14-22-4-30-23ZM661 533l37-17 29 6 13-18 18 17 6 36 23 20-14 28-29 3-31-16-30 5-28-20Z" />
        </g>
        <g className="auth-atlas-routes">
          <path d="M-40 470C30 60 640 10 758 320" />
          <path d="M68 310C-25 690 580 820 846 494" />
          <circle cx="68" cy="310" r="4" />
          <circle cx="758" cy="320" r="4" />
        </g>
        <circle className="auth-atlas-traveler auth-atlas-traveler--north" r="3" />
        <circle className="auth-atlas-traveler auth-atlas-traveler--south" r="3" />
        <g className="auth-atlas-notations">
          <text x="46" y="230" transform="rotate(-90 46 230)">48° 51′ N</text>
          <text x="635" y="101">028° 58′ E</text>
          <text x="614" y="702">41° 00′ N</text>
          <path d="M64 178h16m-8-8v16M739 418h16m-8-8v16M114 652h16m-8-8v16" />
        </g>
        <g className="auth-atlas-postmark" transform="translate(746 145) rotate(16)">
          <circle r="57" /><circle r="48" strokeDasharray="2 5" />
          <path d="M-22 0h44M0-22v44M-16-16l32 32m-32 0 32-32M0-15 5 0 0 15-5 0Z" />
          <path d="M-140-15q15-8 30 0t30 0M-140 0q15-8 30 0t30 0M-140 15q15-8 30 0t30 0" />
        </g>
        <g className="auth-atlas-postmark auth-atlas-postmark--lower" transform="translate(757 646) rotate(-18)">
          <rect x="-55" y="-32" width="110" height="64" rx="7" />
          <rect x="-49" y="-26" width="98" height="52" rx="3" strokeDasharray="3 4" />
          <path d="m-20 0 38-13-13 38-7-18-18-7 38-13M-35-13h7m-7 9h5" />
        </g>
      </svg>
    </div>
  );
}
