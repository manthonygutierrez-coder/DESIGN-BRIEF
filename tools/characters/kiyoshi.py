"""Kiyoshi Mori — third leg, Kurohama → Hoshizora. Model sheet poses."""
from sprite import Sprite

PAL = {
    "L": "#2A1E24",
    "S": "#F1D2BC", "s": "#D4AE95",          # skin / shadow
    "H": "#14161C", "h": "#2E3A55",          # hair / cool light
    "N": "#1B2A4A", "n": "#111B31",          # Kurohama jacket / shadow
    "P": "#F6F7F2",                          # piping, laces
    "A": "#3FB8AF",                          # the wave
    "E": "#8A94A6", "e": "#5E6678",          # eyes, grey / iris shade
    "W": "#F6F7F2",                          # eye light
    "D": "#6E4A3A",                          # beauty mark
    "B": "#7EC8F0", "b": "#5AA8D6",          # Hoshizora shorts / shadow
    "K": "#F6F7F2",                          # shorts stripe
    "X": "#0E1117",                          # black Kurohama spikes
    "M": "#8C3B32",
}
# Outline groups: piping, zip and the wave are part of the jacket, so no
# line is drawn around them — they are details on it, not separate things.
REGION = {"S": "skin", "s": "skin", "D": "skin", "H": "hair", "h": "hair", "N": "jacket", "n": "jacket",
          "P": "jacket", "A": "jacket", "E": "eye", "e": "eye", "W": "eye", "B": "shorts", "b": "shorts", "K": "shorts",
          "X": "shoe", "M": "mouth"}
RANK = {"hair": 1, "jacket": 2, "shorts": 3, "shoe": 3, "skin": 4}


def front():
    s = Sprite(44, 96)
    A = 43

    # neat cap of straight hair, falling to the jaw at the sides
    s.ellipse("H", 21.5, 11, 7.4, 7.7)                            # one more pixel of volume: 93 px, canon
    s.rows("H", [(y, 14, 16) for y in range(12, 24)])
    s.mirror_x(A, 0, 24)

    # face
    face = [(y, 17, 21) for y in range(11, 21)] + [(21, 17, 21), (22, 18, 21), (23, 18, 21), (24, 19, 21), (25, 20, 21)]
    s.rows("S", face)
    s.pxs("S", [(16, y) for y in range(15, 19)]); s.pxs("s", [(16, 16), (16, 17)])
    s.mirror_x(A, 11, 25)
    s.rows("s", [(24, 19, 24), (25, 20, 23)])

    # the fringe: parted high on his right, sweeping down over his left eye
    s.poly("H", [(17, 8), (22, 8.5), (27.5, 12), (28.4, 21.5), (26, 21.5), (24.5, 17.5), (21.5, 12.5), (18.5, 11)])
    s.line("h", 20, 9, 26, 15)                                     # a cool sheen along the sweep

    # the visible eye: narrow, calm, grey; a sliver of the other under the fringe
    s.span("L", 16, 16, 19)
    s.pxs("W", [(17, 17)]); s.px("L", 18, 17); s.px("E", 19, 17)
    s.span("L", 18, 18, 19)
    s.px("E", 23, 18)                                              # a sliver under the fringe
    s.px("D", 19, 19)                                              # the beauty mark
    s.span("L", 15, 16, 18)                                        # a level brow
    s.px("s", 21, 20)
    s.span("L", 22, 20, 22)                                        # a straight mouth

    # high zipped collar, piping at the top edge
    s.rows("N", [(26, 18, 25), (27, 17, 26), (28, 17, 26)])
    s.span("P", 26, 18, 25)
    s.rows("S", [(26, 20, 23)])                                    # throat above the zip
    s.span("P", 26, 18, 19); s.span("P", 26, 24, 25)

    # the jacket: sleeves to the wrist, piping down the sleeve, zip down the middle
    s.poly("N", [(15, 29), (21.9, 28), (22.1, 28), (29, 29), (30, 34), (28.8, 55), (15.2, 55), (14, 34)])
    s.poly("N", [(14, 30), (16, 30), (14.5, 44), (13.2, 57), (10.2, 57), (11.5, 44), (12.4, 32)])
    s.poly("n", [(12.2, 34), (13, 34), (12.2, 46), (11.4, 56), (10.4, 56)], only=("N",))
    s.line("P", 14, 31, 12, 56)                                    # the sleeve stripe
    s.rows("S", [(57, 10, 13), (58, 10, 13), (59, 11, 13)])        # hand
    s.mirror_x(A, 28, 60)
    s.line("P", 22, 29, 22, 54)                                    # zip
    s.rows("n", [(y, 16, 16) for y in range(34, 54)] + [(y, 27, 27) for y in range(34, 54)])
    s.rows("n", [(54, 16, 27), (55, 16, 27)])                      # ribbed hem
    s.pxs("A", [(24, 33), (25, 32), (26, 33), (27, 32), (25, 34), (26, 34)])   # the wave

    # Hoshizora shorts under a Kurohama jacket: two schools on one body
    s.rect("B", 16, 56, 27, 61)
    s.rows("K", [(y, 16, 16) for y in range(56, 62)] + [(y, 27, 27) for y in range(56, 62)])
    s.rows(".", [(60, 21, 22), (61, 21, 22)])

    # long legs
    s.poly("S", [(16, 62), (20.5, 62), (20, 75), (19.8, 87), (17, 87), (16.6, 75)])
    s.poly("s", [(19, 64), (20.5, 62), (20, 75), (19.8, 87), (19, 87), (19.2, 75)], only=("S",))
    s.mirror_x(A, 62, 87)

    # black Kurohama spikes, white laces
    s.poly("X", [(15, 88), (20.5, 88), (21, 94), (13, 94), (13, 91)])
    s.rows("P", [(89, 17, 19), (91, 17, 19)])
    s.mirror_x(A, 88, 95)

    s.outline(REGION, RANK, keep=("L",))
    return s


def bust():
    """56 x 56. Calm, one grey eye, the fringe over the other, the collar zipped."""
    s = Sprite(56, 56)
    A = 55
    # sleek straight hair, cut to the jaw at the sides
    s.ellipse("H", 27.5, 22, 14.5, 15.5)
    s.rows("H", [(y, 12, 16) for y in range(22, 42)] + [(42, 13, 16), (43, 14, 16)])
    s.mirror_x(A, 0, 44)
    # face
    s.ellipse("S", 27.5, 31, 10.4, 13)
    s.rows("S", [(y, 17, 27) for y in range(21, 33)])
    s.pxs("S", [(16, y) for y in range(28, 34)]); s.pxs("s", [(16, 29), (16, 30), (16, 31)])
    s.mirror_x(A, 18, 45)
    s.poly("s", [(18, 39), (27.5, 44.4), (37, 39), (36, 41), (27.5, 45), (19, 41)], only=("S",))
    # the fringe: parted high on his right, sweeping across and down over his left eye
    s.poly("H", [(17, 16), (23, 14.5), (31, 17), (38.6, 24), (39.2, 38.5), (35.5, 38.5), (33, 31), (28.5, 24.5),
                 (23, 21), (18.5, 21.5)])
    for a, b in (((22, 16), (30, 19)), ((30, 20), (35, 26)), ((35, 27), (37, 35))):
        s.line("h", a[0], a[1], b[0], b[1])                      # a cool sheen along the sweep
    s.span("L", 25, 18, 24)                                        # a level brow
    s.stamp(17, 27, [" LLLLLLL", "LWWEEeEL", " LEeLLeL", "  LEEEL ", "   sss  "])   # the narrow grey eye
    s.stamp(31, 29, ["LE", " e"])                                  # a sliver of the other, under the fringe
    s.px("D", 24, 33)                                              # beauty mark, under his right eye
    s.pxs("s", [(28, 36), (28, 37)])
    s.span("L", 39, 25, 30)                                        # a straight mouth
    s.px("s", 27, 40)
    # high collar, zipped to the chin; piping; raglan stripes; the wave
    s.rows("N", [(y, 19, 27) for y in range(43, 49)]); s.span("P", 43, 19, 27)
    s.poly("N", [(2, 55.9), (6, 50), (17, 47.5), (27.5, 48.5), (38, 47.5), (49, 50), (53, 55.9)])
    s.line("P", 18, 49, 9, 55)
    s.mirror_x(A, 43, 55)
    s.line("P", 27, 44, 27, 55)                                    # the zip
    s.rect("P", 27, 45, 28, 46)                                    # its pull
    s.rows("n", [(y, 20, 21) for y in range(44, 49)] + [(y, 34, 35) for y in range(44, 49)])
    s.stamp(36, 51, [" A A", "AAAA"])                              # the wave, over his heart
    s.outline(REGION, RANK, keep=("L",))
    return s


def side():
    """32 x 96, standing profile facing right."""
    s = Sprite(32, 96)
    s.ellipse("H", 13.5, 11, 7.2, 7.7)
    s.rows("H", [(y, 7, 11) for y in range(11, 24)])              # hair falling straight at the back
    # the head in profile, the fringe hanging forward over the eye
    s.stamp(10, 11, [
        "HHHHHHHHHHH ",
        "HHHHHHHHHHHH",
        "HHSSSSSHHHHH",
        "HHSSSSSSHHHH",
        "HHSSSSSSSHHH",
        "HSSSSSSLLHH ",
        "HSsSSSSWLeH ",
        "HSsSSSSSSSH ",
        "HSSSSSSDSSSS",
        "HHSSSSSSSSSS",
        " HSSSSSSSsS ",
        " HSSSSSSLLL ",
        "  HSSSSSSS  ",
        "   HSSSSSS  ",
        "    sssss   ",
    ])
    # collar and jacket
    s.rows("N", [(y, 12, 17) for y in range(26, 29)]); s.span("P", 26, 12, 17)
    s.poly("N", [(9.5, 30), (12, 28.5), (18, 28.5), (21, 31), (21.2, 44), (20.4, 55), (10.4, 55), (9.2, 42)])
    s.poly("N", [(12, 30), (17, 30), (17, 45), (16.4, 57), (12.6, 57), (12.6, 45)])     # the near sleeve
    s.poly("n", [(12.6, 34), (13.6, 34), (13.4, 56), (12.6, 56)], only=("N",))
    s.line("P", 16, 31, 16, 56)                                    # sleeve stripe
    s.pxs("A", [(19, 33), (20, 32), (20, 34)])                     # the wave, just in view
    s.rows("n", [(54, 10, 20), (55, 10, 20)])
    s.rows("S", [(57, 12, 16), (58, 12, 16), (59, 13, 16)])
    s.rect("B", 10, 56, 20, 61); s.rows("K", [(y, 14, 15) for y in range(56, 62)])
    s.poly("s", [(10.5, 62), (14, 62), (12.6, 75), (11.8, 87), (9.4, 87), (10, 75)])
    s.poly("S", [(13.5, 62), (19.5, 62), (18.2, 75), (17.2, 87), (14.2, 87), (14.6, 75)])
    s.poly("X", [(8.5, 88), (12.5, 88), (13, 94), (7, 94)])
    s.poly("X", [(13.5, 88), (18, 88), (24, 91), (24.5, 94), (13, 94)])
    s.rows("P", [(89, 16, 19), (91, 17, 20)])
    s.outline(REGION, RANK, keep=("L",))
    return s


if __name__ == "__main__":
    from sprite import render
    import toma
    render([toma.front(), front()], [toma.PAL, PAL],
           "/private/tmp/claude-501/-Users-markkraken-CODE-PROJECTS/1333c23e-a3e8-4495-a2d6-882ea4bcfa9f/scratchpad/pair_front.png")
    print("drawn")
