/** Line drawing in the manner of the gift's white phalaenopsis. Not a photograph. */
export default function OrchidMark() {
  return (
    <svg className="orchid" viewBox="0 0 150 210" aria-hidden="true">
      <g fill="none" stroke="#f4efe6" strokeWidth="1.15" strokeLinecap="round">
        <path d="M86 198 C 82 164, 96 138, 90 112" />
        <path d="M90 150 C 108 146, 118 158, 112 170" />
        <path d="M90 132 C 70 128, 62 140, 68 150" />
        <circle cx="112" cy="166" r="2.2" />
        <circle cx="66" cy="146" r="1.8" />
      </g>
      <g transform="translate(90 96)" fill="none" stroke="#f7f3ec" strokeWidth="1.15">
        <ellipse rx="6.5" ry="16" />
        <ellipse rx="7" ry="17" transform="rotate(58)" />
        <ellipse rx="7" ry="17" transform="rotate(-58)" />
        <ellipse rx="5.5" ry="13" transform="rotate(128)" />
        <ellipse rx="5.5" ry="13" transform="rotate(-128)" />
        <ellipse rx="4.2" ry="7" transform="rotate(18)" fill="#f3d4d8" stroke="#f6e4e6" />
        <circle r="1.7" fill="#e7b7c0" stroke="none" />
      </g>
      <g transform="translate(78 148) scale(0.62)" fill="none" stroke="#f7f3ec" strokeWidth="1.2">
        <ellipse rx="6" ry="14" transform="rotate(12)" />
        <ellipse rx="6.5" ry="15" transform="rotate(70)" />
        <ellipse rx="6.5" ry="15" transform="rotate(-48)" />
        <ellipse rx="5" ry="11" transform="rotate(150)" />
        <ellipse rx="5" ry="11" transform="rotate(-150)" />
        <circle r="1.5" fill="#f0c9cf" stroke="none" />
      </g>
    </svg>
  );
}
