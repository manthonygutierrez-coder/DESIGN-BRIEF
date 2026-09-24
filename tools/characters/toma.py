"""Toma Arakawa — anchor, Hoshizora High. Model sheet poses."""
from sprite import Sprite

PAL = {
    "L": "#2A1E24",
    "S": "#E2A97E", "s": "#C4865A",          # skin / shadow
    "H": "#3A2418", "h": "#6B3F24",          # hair / light
    "O": "#FF7A1A",                          # sweatband (and laces)
    "E": "#C7832B", "e": "#8E5518",          # eyes, amber / iris shade
    "W": "#F6F7F2",                          # eye light, teeth, kit white
    "K": "#F6F7F2", "k": "#CBD3DC",          # kit white / shadow
    "B": "#7EC8F0", "b": "#5AA8D6",          # kit sky / shadow
    "G": "#F2C94C",                          # the star
    "M": "#8C3B32",                          # mouth
}
REGION = {"S": "skin", "s": "skin", "H": "hair", "h": "hair", "O": "band", "E": "eye", "e": "eye", "W": "eye",
          "K": "kit", "k": "kit", "B": "panel", "b": "panel", "G": "star", "M": "mouth"}
# Lower rank gives up its pixel to the line at a boundary.
RANK = {"hair": 1, "kit": 2, "panel": 3, "skin": 4}


def eyes(s, left, right, y, big=False):
    """Anime eyes: a heavy upper lash, a highlight top-left, a dark pupil.
    Highlights sit on the same side in both eyes, so the pair is not mirrored."""
    for ex, outer in ((left, left - 1), (right, right + 3)):
        s.pxs("L", [(outer, y), (ex, y), (ex + 1, y), (ex + 2, y)])
        s.pxs("W", [(ex, y + 1)]); s.pxs("E", [(ex + 1, y + 1), (ex + 2, y + 1)])
        s.pxs("E", [(ex, y + 2), (ex + 2, y + 2)]); s.px("L", ex + 1, y + 2)
        s.pxs("E", [(ex, y + 3), (ex + 1, y + 3)]); s.px("s", ex + 2, y + 3)


def front():
    s = Sprite(44, 96)
    A = 43  # mirror axis (x -> 43 - x)

    # hair: a hedge of upward spikes, pushed up by the band
    s.ellipse("H", 21.5, 14.2, 7.8, 6.2)
    for p in ([(14, 15), (11, 9), (16.5, 11)],
              [(15.5, 12), (15, 7.8), (19, 10)],
              [(18.5, 10), (19.5, 7.5), (21.8, 9.5)]):
        s.poly("H", p)
    s.mirror_x(A, 0, 22)
    s.rows("H", [(y, 15, 16) for y in range(16, 21)] + [(21, 15, 16), (22, 16, 16)])
    s.mirror_x(A, 0, 22)
    for a, b in (((16, 9), (17, 11)), ((20, 9), (20, 10)), ((27, 9), (26, 11))):
        s.line("h", a[0], a[1], b[0], b[1])                      # light down the tallest spikes

    # face, under the band
    face = [(y, 17, 21) for y in range(15, 24)] + [(24, 17, 21), (25, 18, 21), (26, 18, 21), (27, 19, 21), (28, 20, 21)]
    s.rows("S", face)
    s.pxs("S", [(16, y) for y in range(19, 23)])                  # ear
    s.pxs("s", [(16, 20), (16, 21)])
    s.mirror_x(A, 15, 28)
    s.rows("s", [(27, 19, 24), (28, 20, 23)])

    s.rows("O", [(15, 15, 28), (16, 15, 28)])                     # the sweatband
    s.pxs("H", [(18, 17), (19, 17), (21, 17), (22, 17), (24, 17), (25, 17), (19, 18)])   # bangs below it

    s.rows("L", [(18, 16, 18), (18, 25, 27)])                     # thick brows
    eyes(s, 17, 24, 19)
    s.px("s", 21, 23)
    s.pxs("L", [(19, 25), (24, 25)]); s.span("W", 25, 20, 23); s.px("M", 22, 25)   # grin, chipped tooth
    s.span("L", 26, 20, 23)

    s.rows("S", [(29, 20, 23), (30, 20, 23), (31, 20, 23)])
    s.span("s", 29, 20, 23)

    # arms
    s.poly("S", [(14, 32), (16, 33), (15, 47), (13, 57), (10, 57), (12, 46), (12, 34)])
    s.poly("s", [(12, 36), (13, 36), (12, 46), (11, 55), (10, 55)], only=("S",))
    s.rows("S", [(57, 10, 13), (58, 10, 13), (59, 11, 13)])
    s.mirror_x(A, 30, 60)

    # singlet
    s.poly("K", [(15, 33), (17, 31), (19, 31), (19, 33), (21.9, 36), (22.1, 36), (24, 33), (24, 31), (26, 31),
                 (28, 33), (28.5, 44), (27.5, 51), (16.5, 51), (15.5, 44)])
    s.rows("S", [(32, 20, 23), (33, 20, 23), (34, 21, 22)])
    s.rows("B", [(y, 15, 16) for y in range(37, 51)])
    s.mirror_x(A, 31, 51)
    s.rows("k", [(y, 17, 17) for y in range(38, 51)] + [(y, 26, 26) for y in range(38, 51)])
    s.pxs("G", [(21, 39), (22, 39), (20, 40), (21, 40), (22, 40), (23, 40), (21, 41), (22, 41), (20, 42), (23, 42)])

    # sky shorts with a white stripe, split between the legs
    s.rect("B", 16, 51, 27, 57)
    s.rows("K", [(y, 16, 16) for y in range(51, 58)] + [(y, 27, 27) for y in range(51, 58)])
    s.rows("b", [(51, 17, 26)])
    s.rows(".", [(56, 21, 22), (57, 21, 22)])

    # legs, with daylight between them
    s.poly("S", [(16, 58), (20.5, 58), (20, 72), (19.8, 86), (17, 86), (16.5, 72)])
    s.poly("s", [(19, 60), (20.5, 58), (20, 72), (19.8, 86), (19, 86), (19.2, 72)], only=("S",))
    s.mirror_x(A, 58, 86)

    # spikes: white, laced orange
    s.poly("K", [(15, 87), (20.5, 87), (21, 94), (13, 94), (13, 90)])
    s.rows("O", [(88, 17, 19), (90, 17, 19)])
    s.span("k", 94, 13, 20)
    s.mirror_x(A, 87, 95)

    s.pxs("H", [(23, 7), (24, 7), (23, 8), (22, 8), (22, 9)])      # the cowlick
    s.pxs("O", [(14, 16), (13, 17), (14, 17), (12, 18), (13, 18)])  # band tails

    s.outline(REGION, RANK, keep=("L",))
    return s


def bust():
    """56 x 56. The face the fandom draws: grin, chipped tooth, the band."""
    s = Sprite(56, 56)
    A = 55
    # hair hedge
    s.ellipse("H", 27.5, 19, 15, 11.5)
    for p in ([(13, 26), (5, 13), (16, 17)], [(14, 17), (10, 5.5), (20, 12)], [(19, 12), (19, 3), (25, 10)],
              [(24, 10), (27.5, 3.5), (27.5, 9)]):
        s.poly("H", p)
    s.mirror_x(A, 0, 36)
    s.rows("H", [(y, 14, 17) for y in range(22, 34)] + [(34, 15, 17), (35, 16, 17), (36, 17, 17)])
    s.mirror_x(A, 0, 36)
    for a, b in (((13, 11), (16, 16)), ((19, 7), (21, 13)), ((24, 6), (25, 11)), ((33, 7), (32, 13)), ((39, 10), (37, 16))):
        s.line("h", a[0], a[1], b[0], b[1])                      # light down each spike
    # face
    s.ellipse("S", 27.5, 31, 11, 13.2)
    s.rows("S", [(y, 16, 27) for y in range(22, 33)])
    s.pxs("S", [(15, y) for y in range(28, 35)]); s.pxs("s", [(15, 30), (15, 31), (15, 32)])   # ear
    s.mirror_x(A, 20, 45)
    s.poly("s", [(17, 40), (27.5, 45.2), (38, 40), (37, 42), (27.5, 46), (18, 42)], only=("S",))   # jaw shade
    # the band, and the tails flicking out on the left
    s.rows("H", [(y, 16, 39) for y in range(17, 20)])             # no forehead above the band
    s.rows("O", [(y, 14, 41) for y in range(20, 24)])
    s.poly("O", [(14, 22), (6, 26), (8, 29), (15, 25)])
    s.poly("O", [(14, 23), (8, 31), (11, 32), (15, 25)])
    # bangs spiking down from under the band
    for p in ([(18, 24), (19.5, 29), (22, 24)], [(23, 24), (25, 30), (27, 24)], [(30, 24), (31.5, 29), (34, 24)],
              [(34, 24), (37, 28), (38, 24)]):
        s.poly("H", p)
    # brows: thick, a little raised — he is about to say something
    s.stamp(18, 26, ["LLLLL", " L   "]); s.stamp(32, 26, ["LLLLL", "   L "])
    eye = [" LLLLL ", "LWWEEEL", "LWEeeEL", "LEeLLeL", "LEeLLEL", " LEEEL ", "  sss  "]
    s.stamp(18, 28, eye); s.stamp(31, 28, eye)
    s.pxs("s", [(28, 36), (29, 37)])                              # nose
    # the grin, with the chipped front tooth
    s.stamp(22, 39, ["LLLLLLLLLLLL", " LWWWWLWWWL ", "  LMMMMMML  ", "   LLLLLL   "])
    s.px("s", 29, 40)
    # neck, shoulders, singlet
    s.rows("S", [(y, 23, 32) for y in range(45, 51)]); s.rows("s", [(45, 23, 32), (46, 24, 31)])
    s.poly("S", [(4, 55.9), (8, 50), (18, 48), (27.5, 49), (37, 48), (47, 50), (51, 55.9)])
    s.poly("K", [(12, 55.9), (15, 51), (19, 49.5), (22, 49.5), (23, 52), (27.5, 54), (32, 52), (33, 49.5), (36, 49.5),
                 (40, 51), (43, 55.9)])
    s.rows("B", [(55, 12, 14), (54, 13, 14), (55, 41, 43), (54, 41, 42)])
    s.pxs("G", [(27, 55), (28, 55)])
    s.outline(REGION, RANK, keep=("L",))
    return s


def side():
    """32 x 96, standing profile facing right."""
    s = Sprite(32, 96)
    s.ellipse("H", 14, 14.5, 7.4, 6.4)
    for p in ([(9, 15), (3, 10), (11, 11.5)], [(10, 12), (7, 7.8), (14, 10)], [(13, 10), (15, 7.6), (18, 10)],
              [(17, 10), (21, 9), (20.5, 13)]):
        s.poly("H", p)
    s.pxs("h", [(9, 11), (12, 10), (16, 10)])
    # the head in profile, drawn by hand: brow, eye, nose, grin, chin
    s.stamp(10, 15, [
        "HHHOOOOOOOOOOO",
        "HHHOOOOOOOOOOO",
        "HHHHSSSSSSHHH ",
        "HHHSSSSSSLLLH ",
        "HHHsSSSSLLLL  ",
        "HHSsSSSSWEL S ",
        "HHSsSSSSEeSSS ",
        " HSSSSSSEESSSS",
        " HHSSSSSSSSsS ",
        "  HSSSSSSLLL  ",
        "  HSSSSSSWWL  ",
        "   HSSSSSLL   ",
        "    SSSSSS    ",
        "     sssS     ",
    ])
    s.pxs("s", [(13, 21), (13, 22)])                               # the ear's shadow
    s.pxs("O", [(9, 16), (8, 17), (9, 17), (7, 18), (8, 18), (6, 19), (7, 19)])   # tails streaming back
    # neck, torso, the near arm hanging
    s.rows("S", [(y, 13, 17) for y in range(29, 33)]); s.span("s", 29, 13, 17)
    s.poly("K", [(10, 33), (13, 31.5), (18, 31.5), (20.5, 34), (20.8, 44), (19.8, 51), (10.8, 51), (9.6, 42)])
    s.rows("B", [(y, 10, 11) for y in range(36, 51)])
    s.pxs("G", [(20, 38), (20, 39)])
    s.poly("S", [(13, 32), (17, 33), (17.2, 45), (16.6, 56), (13.2, 56), (13.2, 45)])
    s.poly("s", [(13.2, 36), (14.2, 36), (14, 55), (13.2, 55)], only=("S",))
    s.rows("S", [(56, 13, 16), (57, 13, 16), (58, 14, 16)])
    s.rect("B", 10, 51, 20, 57); s.rows("K", [(y, 14, 15) for y in range(51, 58)])
    # legs, the far one a step behind
    s.poly("s", [(10.5, 58), (14, 58), (12.6, 72), (11.8, 86), (9.4, 86), (10, 72)])
    s.poly("S", [(13.5, 58), (19.5, 58), (18.2, 72), (17.2, 86), (14.2, 86), (14.6, 72)])
    s.poly("K", [(8.5, 87), (12.5, 87), (13, 94), (7, 94)])
    s.poly("K", [(13.5, 87), (18, 87), (24, 90), (24.5, 94), (13, 94)])
    s.rows("O", [(88, 16, 19), (90, 17, 20)])
    s.span("k", 94, 7, 24)
    s.pxs("H", [(16, 7), (17, 7), (15, 8), (16, 8)])               # the cowlick
    s.outline(REGION, RANK, keep=("L",))
    return s


if __name__ == "__main__":
    from sprite import render
    f = front()
    render([f], [PAL], "/private/tmp/claude-501/-Users-markkraken-CODE-PROJECTS/1333c23e-a3e8-4495-a2d6-882ea4bcfa9f/scratchpad/toma_front.png")
    print("\n".join(f.rows_text()[:40]))
