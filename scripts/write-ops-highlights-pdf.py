#!/usr/bin/env python3
"""Write docs/OPS_HIGHLIGHTS.pdf (no third-party PDF library)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "OPS_HIGHLIGHTS.pdf"

PAGE_W, PAGE_H = 612, 792  # US Letter
MARGIN_L, MARGIN_R = 48, 48
MARGIN_T, MARGIN_B = 52, 48
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R
AMBER = (0.72, 0.38, 0.08)
INK = (0.12, 0.12, 0.12)
MUTED = (0.38, 0.38, 0.38)
RULE = (0.82, 0.82, 0.82)
HEAD_BG = (0.10, 0.12, 0.14)


def pdf_str(s: str) -> str:
    out = []
    for ch in s:
        o = ord(ch)
        if ch == "\\":
            out.append("\\\\")
        elif ch == "(":
            out.append("\\(")
        elif ch == ")":
            out.append("\\)")
        elif ch == "•":
            out.append("\\267")
        elif ch == "·":
            out.append("\\267")
        elif ch in "–—−":
            out.append("-")
        elif ch == "≥":
            out.append(">=")
        elif ch == "≤":
            out.append("<=")
        elif ch == "°":
            out.append("\\260")
        elif o < 128:
            out.append(ch)
        else:
            out.append("?")
    return "".join(out)


def wrap(text: str, width: float, size: float, bold: bool = False) -> list[str]:
    # Helvetica average width ~0.5 em; bold ~0.54
    em = 0.54 if bold else 0.50
    max_chars = max(12, int(width / (size * em)))
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = w if not cur else cur + " " + w
        if len(trial) <= max_chars:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


class Doc:
    def __init__(self):
        self.pages: list[list[str]] = [[]]
        self.y = PAGE_H - MARGIN_T
        self.ops: list[str] = []

    def _ops(self) -> list[str]:
        return self.pages[-1]

    def new_page(self):
        self.pages.append([])
        self.y = PAGE_H - MARGIN_T
        self._header()

    def need(self, h: float):
        if self.y - h < MARGIN_B:
            self.new_page()

    def rgb(self, c):
        self._ops().append(f"{c[0]:.3f} {c[1]:.3f} {c[2]:.3f} rg")

    def RG(self, c):
        self._ops().append(f"{c[0]:.3f} {c[1]:.3f} {c[2]:.3f} RG")

    def rect(self, x, y, w, h, fill=None, stroke=None, lw=0.6):
        if fill:
            self.rgb(fill)
        if stroke:
            self.RG(stroke)
            self._ops().append(f"{lw} w")
        cmd = "B" if fill and stroke else ("f" if fill else "S")
        self._ops().append(f"{x:.2f} {y:.2f} {w:.2f} {h:.2f} re {cmd}")

    def text(self, s, x, y, size=10, bold=False, color=INK):
        font = "F2" if bold else "F1"
        self._ops().append("BT")
        self._ops().append(f"/{font} {size} Tf")
        self._ops().append(f"{color[0]:.3f} {color[1]:.3f} {color[2]:.3f} rg")
        self._ops().append(f"1 0 0 1 {x:.2f} {y:.2f} Tm")
        self._ops().append(f"({pdf_str(s)}) Tj")
        self._ops().append("ET")

    def _header(self):
        self.rect(0, PAGE_H - 36, PAGE_W, 36, fill=HEAD_BG)
        self.text("GearUp  ·  ops highlights", 48, PAGE_H - 24, size=11, bold=True, color=(0.96, 0.96, 0.94))
        self.text("unofficial  ·  ATIS / METAR / TAF", PAGE_W - 48 - 168, PAGE_H - 24, size=9, color=(0.72, 0.74, 0.76))
        self.y = PAGE_H - 36 - 28

    def para(self, s, size=10, color=INK, bold=False, leading=None, gap=6):
        leading = leading or size + 3
        lines = wrap(s, CONTENT_W, size, bold)
        self.need(leading * len(lines) + gap)
        for line in lines:
            self.text(line, MARGIN_L, self.y, size=size, bold=bold, color=color)
            self.y -= leading
        self.y -= gap

    def h2(self, s):
        self.need(28)
        self.y -= 4
        self.rect(MARGIN_L, self.y - 2, 3.2, 14, fill=AMBER)
        self.text(s, MARGIN_L + 10, self.y, size=12, bold=True)
        self.y -= 20

    def rule_row(self, mark, example, skip=None):
        mark_lines = wrap(mark, CONTENT_W - 12, 10)
        ex_lines = wrap("Example  " + example, CONTENT_W - 12, 9)
        skip_lines = wrap("Not marked  " + skip, CONTENT_W - 12, 9) if skip else []
        h = 14 * len(mark_lines) + 12 * len(ex_lines) + 12 * len(skip_lines) + 14
        self.need(h)
        for line in mark_lines:
            self.text("•  " + line, MARGIN_L, self.y, size=10, bold=True)
            self.y -= 13
        for line in ex_lines:
            self.text(line, MARGIN_L + 14, self.y, size=9, color=MUTED)
            self.y -= 12
        for line in skip_lines:
            self.text(line, MARGIN_L + 14, self.y, size=9, color=MUTED)
            self.y -= 12
        self.y -= 8
        self.RG(RULE)
        self._ops().append("0.4 w")
        self._ops().append(f"{MARGIN_L:.2f} {self.y + 10:.2f} m {MARGIN_L + CONTENT_W:.2f} {self.y + 10:.2f} l S")

    def footer(self, i, n):
        ops = self.pages[i]
        ops.append("BT")
        ops.append("/F1 8 Tf")
        ops.append("0.45 0.45 0.45 rg")
        ops.append(f"1 0 0 1 {MARGIN_L:.2f} 28 Tm")
        ops.append(f"({pdf_str('Not a minima, dispatch, or legal weather source. Thresholds in docs/CALCULATIONS.md section 7.')}) Tj")
        ops.append("ET")
        ops.append("BT")
        ops.append("/F1 8 Tf")
        ops.append("0.45 0.45 0.45 rg")
        label = f"{i + 1} / {n}"
        ops.append(f"1 0 0 1 {PAGE_W - MARGIN_R - 28:.2f} 28 Tm")
        ops.append(f"({pdf_str(label)}) Tj")
        ops.append("ET")


def build() -> bytes:
    d = Doc()
    d._header()
    d.para(
        "Bold amber marks (.hl-ops) on the ATIS body, METAR, TAF, and every extra card on the TAF tab (SIGMET, G-AIRMET, PIREPs, NAS delay, SNOWTAM). "
        "They are a scan aid only. They do not change official minima, "
        "and they are not a substitute for the chart or the ATIS itself.",
        size=10,
        color=MUTED,
    )

    d.h2("Wind")
    d.rule_row(
        "Tailwind ≥ 9 kt (rounded), using the greater of mean and gust. Fully variable wind with no direction is treated as a pure tail.",
        "LANDING RWY 06  ·  WIND 240 DEG, 9 KT",
        "WIND 240 DEG, 8 KT on RWY 06",
    )
    d.rule_row(
        "Crosswind > 20 kt (rounded), same speed (mean or gust).",
        "LANDING RWY 06  ·  WIND 150 DEG, 21 KT",
        "WIND 150 DEG, 20 KT",
    )
    d.rule_row(
        "Strong wind on any heading, including on the nose: mean ≥ 30 kt or gust ≥ 35 kt. Whole group. Spoken GUSTS / MAX as well.",
        "24032G45KT    WIND 240 DEG, 32 KT    GUSTS 40    MAX 40",
        "24029KT on RWY 24 (headwind)    GUSTS 18    MAX 18",
    )
    d.rule_row(
        "TAF-tab SIGMET, G-AIRMET, PIREPs, NAS delay, and SNOWTAM use the same scanner. Unit-only strong wind (no direction) counts. Isolated TS, EMBD, SFC WND, MT OBSC, named TC, PIREP TB, MOD TO SEV.",
        "SFC WIND 50KT    SFC WND    TS    TC BIPARJOY    /TB SEV    MOD TO SEV",
        "MOV NE 25KT    a bare taxiway TC",
    )
    d.rule_row(
        "Gusty coded group when gust minus mean > 10 kt (gust digits only, unless the whole group already qualifies above).",
        "24012G24KT (the G24)",
        "spread of 10 kt or less, unless mean/gust already strong",
    )
    d.rule_row(
        "VRB sector bound more than 90° from the paired runway heading.",
        "variable sector that includes a tail or strong cross on that runway",
        "a bound still within 90° of the runway",
    )

    d.h2("Altimeter / QNH")
    d.rule_row(
        "QNH below 990 hPa, or altimeter below 29.23 inHg.",
        "Q0987    QNH 987 HPA    A2912    ALTIMETER 29.12",
        "Q0990    Q1013    QNH 1003HPA    A2992",
    )

    d.h2("Runway braking")
    d.rule_row(
        "Braking action POOR, NIL, UNRELIABLE, MEDIUM TO POOR, or LESS THAN POOR.",
        "BRAKING ACTION POOR    BA NIL    POOR BRAKING ACTION",
        "BRAKING ACTION GOOD    BA GOOD    FAIR / MEDIUM alone",
    )

    d.h2("Blowing sand and dust")
    d.rule_row(
        "Blowing (and drifting) sand or dust. Duststorm / sandstorm already counted.",
        "BLSA    BLDU    BLOWING SAND    BLOWING DUST    DS    SS",
        "plain SA or DU without BL/DR    moderate rain RA",
    )

    d.h2("Arrival minima (DA, MDA, OCH)")
    d.rule_row(
        "Decision / descent / obstacle-clearance heights on the arrival ATIS: DA, DH, MDA, MDH, OCA, OCH plus a height. Spoken Decision Altitude/Height, Minimum Descent Altitude/Height, Obstacle Clearance Altitude/Height.",
        "DA 250 FT    MDA 450 FT    OCH 186    DECISION HEIGHT 200 FT",
        "density altitude DA1,800    runway type LDA",
    )
    d.rule_row(
        "Minima changed or withdrawn: RAISED, INCREASED, AMENDED, REDUCED, NOT AUTHORIZED / NA. CAT II/III not authorized.",
        "DA 250 FT RAISED TO 350    APPROACH MINIMUMS RAISED TO 400 FEET    ILS MINIMA NOT AUTHORIZED",
        "an unchanged published DA with no height and no change phrase",
    )

    d.h2("Weather, vis, ceiling, temperature")
    d.rule_row(
        "Present-weather group if it is heavy (+), contains TS, or contains hail GR / small hail GS. Whole token.",
        "+TSRAGR    TSRA    SHGR    +RA",
        "RA    -RA    BR",
    )
    d.rule_row(
        "Ceiling BKN / OVC / VV below 400 ft. VV/// counts. Spoken CEILING / CIG / CLOUD BASE. SCT/FEW are not ceiling.",
        "BKN003    OVC002CB    VV///    CEILING 300 FT",
        "BKN004    SCT003    CEILING 400 FT",
    )
    d.rule_row(
        "Prevailing vis and RVR below 550 m (CAT I RVR floor). M0550 (less than 550) counts.",
        "0400    R27L/0500    R27L/M0550    VIS 500 M    1/4SM",
        "0550    R27L/0550    0800    1/2SM",
    )
    d.rule_row(
        "Temperature ≤ 10°C, or heat > 35°C. METAR TT/Td and TAF TX/TN are always Celsius. US D-ATIS (K*, PANC, PHNL, TJSJ) speaks Fahrenheit: mark only above 95°F.",
        "36/18    TX36/2706Z    TN08/2622Z    TEMPERATURE 38    TEMPERATURE 96 at KMIA",
        "35/18    TX31    TEMPERATURE 32    TEMPERATURE 88 at KMIA",
    )
    d.rule_row(
        "Fog-risk dewpoint: |T − Td| ≤ 2°C and the lightest wind in the copy is below 5 kt.",
        "dewpoint digits next to a near-calm wind",
        "the same spread with 5 kt or more",
    )
    d.rule_row(
        "Other hazards already in the scanner: TS, CB, TCU, WS / LLWS, FZRA/FZDZ, SN/BLSN/DRSN, icing, turbulence, VA, hail, SNOWTAM / ice / slush wording, LIFR/IFR, birds, CLOSED / CLSD / INOP / OTS.",
        "WS    CB    FZRA    BLSN    BIRDS    RWY 24L CLOSED",
        "ordinary FEW/SCT clouds    NSW",
    )
    d.rule_row(
        "Runway condition code digits 0–5 in a 6/6/6 group (6 is dry and stays unmarked).",
        "3/3/2",
        "6/6/6",
    )
    d.rule_row(
        "ATIS ident letter; in-use runway numbers from the arrival/departure extract.",
        "ATIS K    RWY 06",
        "a runway number that is not in use in that copy",
    )

    d.para(
        "Rebuild the same way in js/hl.js. Do not invent a second set of thresholds. "
        "A sitting on GearUp is not a chart amendment.",
        size=9,
        color=MUTED,
    )

    n = len(d.pages)
    for i in range(n):
        d.footer(i, n)

    objects = []
    objects.append("<< /Type /Catalog /Pages 2 0 R >>")
    kids = " ".join(f"{3 + i} 0 R" for i in range(n))
    objects.append(f"<< /Type /Pages /Kids [{kids}] /Count {n} >>")

    for i, ops in enumerate(d.pages):
        content_obj_num = 3 + n + i
        objects.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] "
            f"/Contents {content_obj_num} 0 R /Resources << /Font << "
            f"/F1 {3 + 2 * n} 0 R /F2 {4 + 2 * n} 0 R >> >> >>"
        )
    for ops in d.pages:
        stream = "\n".join(ops).encode("latin-1")
        objects.append(f"<< /Length {len(stream)} >>\nstream\n".encode("latin-1") + stream + b"\nendstream")

    objects.append(
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
    )
    objects.append(
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
    )

    # Rebuild objects list as bytes
    chunks: list[bytes] = []
    for obj in objects:
        if isinstance(obj, bytes):
            chunks.append(obj)
        else:
            chunks.append(obj.encode("latin-1"))

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, body in enumerate(chunks, start=1):
        offsets.append(len(out))
        out.extend(f"{i} 0 obj\n".encode("ascii"))
        out.extend(body)
        if not body.endswith(b"\n"):
            out.extend(b"\n")
        out.extend(b"endobj\n")
    xref_pos = len(out)
    out.extend(f"xref\n0 {len(chunks) + 1}\n".encode("ascii"))
    out.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    out.extend(
        f"trailer\n<< /Size {len(chunks) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("ascii")
    )
    return bytes(out)


def main():
    data = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(data)
    print(f"wrote {OUT} ({len(data)} bytes)")


if __name__ == "__main__":
    main()
