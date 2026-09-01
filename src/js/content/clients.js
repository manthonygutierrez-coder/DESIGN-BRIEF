"use strict";
/* One client per brief, keyed by the brief's project name.
 *
 *   who/role/co  the person who writes to you, and where they work
 *   dom          their domain; the browser resolves http://<dom>/ to their site
 *   frame        which chrome renders them (see FRAMES in sites.js)
 *   theme        their colours, type pairing and mark style — this is what
 *                stops two clients on the same frame looking like each other
 *   greet        how they open the brief email
 *   voice        how they sign off — used to close the brief email
 *   wrap         what they write back once you have delivered the files
 *   site         their whole site: tagline, nav, and a block list per page
 *   refs         seeds for the faux image search; also the reference attachments
 *
 * site.nav entries are [label, path]. Every path must exist in site.pages, and
 * every page is a list of typed blocks — see BLOCKS in sites.js for the shapes.
 */

const CLIENTS = {

  /* ── SLOW PRESS ─────────────────────────────────────────── */
  "SLOW PRESS": {
    who: "Dov Marrow", role: "Third-generation owner", co: "Marrow & Co.",
    dom: "marrowandco.com", frame: "press",
    theme: {
      bg: "#FBF6EA", panel: "#F2E8D2", ink: "#241A10", dim: "#7A6A4E", line: "#D9C9A8",
      brand: "#C2452C", brand2: "#241A10", link: "#9A3520", onBrand: "#FBF6EA",
      head: "'Instrument Serif', Georgia, serif",
      body: "Georgia, 'Times New Roman', serif",
      mark: "press", markText: "M", markFace: "Georgia, serif",
    },
    greet: "Mr. Marrow writing.",
    voice: "We still set by hand. Thanks for taking this on.",
    wrap: "Files came through and printed proof-sized on the first try, which does not happen. I pulled one on the windmill to see it in ink and it held. Send the invoice when you get to it — we pay on receipt, not on terms.",
    site: {
      tagline: "Letterpress printing since 1961",
      est: "Est. 1961 · 14 Cudworth Lane",
      foot: "This page last updated by hand.",
      nav: [["Home", "/"], ["The Shop", "/shop"], ["Papers & Inks", "/papers"], ["Order a Job", "/order"], ["Visit", "/visit"]],
      pages: {
        "/": [
          { t: "lede", p: "Every job on this site was set by hand and pulled on a Heidelberg windmill that has been in the same corner of the same room since 1961. We do not simulate the impression. We make it." },
          { t: "prose", h: "What we take on", p: "Stationery, invitations, small runs of literary work, business cards heavy enough to hold a door. If it fits the press and it is worth doing slowly, bring it in." },
          { t: "stats", items: [
            { n: "1961", l: "Same press, same corner" },
            { n: "2–3 wk", l: "Honest turnaround" },
            { n: "600", l: "Drawers of metal and wood type" },
            { n: "2", l: "People who can run the windmill" },
          ] },
          { t: "prose", h: "Turnaround", p: "Two to three weeks, honestly stated. We would rather quote long and deliver early than the reverse. December is worse and we will tell you so before you commit." },
          { t: "gallery", h: "Recent work", caps: ["Windmill press, 1961", "Wood type drawer", "Impression detail", "Ink slab"] },
        ],
        "/shop": [
          { t: "prose", h: "The room", p: "One floor, north light, and a concrete slab poured thick enough to take the machines. Nothing has been moved since my grandfather set it out, largely because nothing can be." },
          { t: "spec", h: "What we run", rows: [
            ["Platen press", "Heidelberg windmill, 10 × 15 in, 1961"],
            ["Proof press", "Vandercook No. 4, 1948"],
            ["Maximum sheet", "254 × 381 mm"],
            ["Minimum run", "50 sheets — below that the make-ready costs more than the job"],
            ["Type held", "Metal 6–72 pt, wood 3–20 line"],
            ["Impression depth", "Set per stock, 0.15–0.4 mm typical"],
          ] },
          { t: "prose", h: "Photopolymer", p: "We make plates from digital artwork when the job needs a face we do not hold in metal. It is not a compromise we hide — it is on the invoice, itemised." },
          { t: "gallery", h: "The floor", caps: ["Windmill, feeder side", "Vandercook bed", "Furniture and quoins", "Composing stone"] },
        ],
        "/papers": [
          { t: "swatches", h: "Stock we keep", sub: "Held in the rack, no lead time. Anything else is four to six weeks from the mill.", items: [
            { n: "Somerset Soft White", m: "300 gsm · cotton rag", c: "#F6F1E4" },
            { n: "Crane Lettra Pearl", m: "600 gsm · double thick", c: "#EFE9DA" },
            { n: "Gmund Urban Concrete", m: "300 gsm", c: "#BFBCB4" },
            { n: "Zerkall Book Wove", m: "145 gsm · deckled two sides", c: "#EDE3CB" },
            { n: "Colorplan Ebony", m: "540 gsm", c: "#232120" },
            { n: "Chipboard, unbleached", m: "1.5 mm", c: "#B49A72" },
          ] },
          { t: "table", h: "Standing inks", sub: "Mixed on the slab from base pigment. Pantone matches are eyeballed against a chip, then adjusted on press.",
            cols: ["Ink", "Base", "Behaviour on rag", "Cost"],
            rows: [
              ["Marrow Red", "Rubine + warm base", "Sits up, slight sheen", "Standing"],
              ["Bible Black", "Carbon", "Drinks in, dries matte", "Standing"],
              ["Oxide Green", "Chrome oxide", "Opaque, slow drying", "Standing"],
              ["Metallic silver", "Bronze powder", "Needs 48 hr before trim", "+£40 per run"],
              ["Any Pantone", "Mixed to order", "Two-day lead", "+£65 mix charge"],
            ] },
          { t: "notice", h: "On two inks", p: "Every extra colour is another pass through the press and another chance to be out of register by half a millimetre. Two inks is not a limitation we impose. It is the number at which the work stays good." },
        ],
        "/order": [
          { t: "steps", h: "How a job runs", items: [
            { h: "1 · You bring it in", p: "Artwork, or a description, or a napkin. We will tell you within a day whether the press can do it." },
            { h: "2 · We quote long", p: "A written quote with the stock, the ink count and the trim size on it. It does not move unless you move something." },
            { h: "3 · Make-ready", p: "The slow part. Locking up, packing the platen, pulling proofs until the impression is even across the sheet." },
            { h: "4 · The run", p: "Fast, once it starts. You are welcome to stand behind the press and watch, and most people should." },
          ] },
          { t: "pricing", h: "Rough figures", sub: "Real quotes are written, not calculated. These are what people usually spend.", tiers: [
            { name: "Cards", price: "from £190", note: "100 cards, one ink", feats: ["600 gsm Lettra", "Single-sided", "Square trim", "Two proofs included"] },
            { name: "Invitations", price: "from £420", pick: "Most asked for", note: "75 sets, two inks", feats: ["Card, envelope, insert", "Two-colour registration", "Blind deboss available", "Envelope lining extra"] },
            { name: "Literary run", price: "quoted", note: "Chapbooks and pamphlets", feats: ["Up to 400 copies", "Hand-sewn or saddle", "Slipcase on request", "Twelve weeks, typically"] },
          ] },
          { t: "faq", h: "Asked often", items: [
            { q: "Can you match a file from a screen?", a: "No. A screen is lit from behind and paper is not. We will match a printed sample, or a Pantone chip, and we will show you a proof before the run." },
            { q: "Do you do rush work?", a: "Occasionally, at half again the price, and only if the make-ready is simple. We will not rush a two-colour job." },
            { q: "Why is the second hundred so much cheaper?", a: "Because the make-ready is most of the cost and it only happens once." },
          ] },
        ],
        "/visit": [
          { t: "prose", h: "Come and stand in it", p: "The shop is open to anyone who wants to see a press run. There is no gallery, no shop counter and nowhere to sit, but you can watch, and nobody will hurry you out." },
          { t: "spec", h: "Practical", rows: [
            ["Address", "14 Cudworth Lane, entrance at the rear"],
            ["Open", "Tue–Fri, 9:00–17:00. Saturday by arrangement"],
            ["Closed", "Two weeks in August, the whole of Christmas"],
            ["Parking", "Two spaces in the yard, both usually full of paper"],
            ["Access", "Ground floor throughout. One 40 mm lip at the door"],
            ["Telephone", "Answered when nobody is on the press, so try twice"],
          ] },
          { t: "contact", h: "Write to us", lines: ["Marrow & Co.", "14 Cudworth Lane"] },
        ],
      },
      gallery: ["Windmill press, 1961", "Wood type drawer", "Impression detail", "Ink slab"],
    },
    refs: ["letterpress impression", "wood type specimen", "ink rollers", "deckled paper edge"],
  },

  /* ── TOTAL EXHAUST ──────────────────────────────────────── */
  "TOTAL EXHAUST": {
    who: "Priya Raghunathan", role: "Interim Communications Director", co: "Metropolitan Transit Authority",
    dom: "ride-mta.gov", frame: "board",
    theme: {
      bg: "#12171B", panel: "#1B2228", ink: "#EDF2F5", dim: "#8C9AA5", line: "#2C363E",
      brand: "#FFC83D", brand2: "#3E8FD0", link: "#7FC4FF", onBrand: "#12171B",
      head: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      body: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      mono: "'VT323', 'Courier New', monospace",
      mark: "chevron", markFace: "Arial, sans-serif",
    },
    greet: "Thank you for returning my call.",
    voice: "We have a lot of trust to earn back. Plain is fine. Plain is good.",
    wrap: "Received, and circulated to the board ahead of Thursday. Two members who have opposed every rebrand since 2016 had nothing to say about this one, which I am counting as the win. Our finance team pays on thirty days and I have asked them, personally, to make it fourteen.",
    site: {
      tagline: "Buses, light rail, and regional service",
      clock: "SERVICE RUNNING · 04:41",
      foot: "A public authority. All figures published quarterly.",
      nav: [["Plan a Trip", "/"], ["Schedules", "/schedules"], ["Fares", "/fares"], ["Accessibility", "/access"], ["The Register", "/register"]],
      pages: {
        "/": [
          { t: "notice", h: "Service notice", p: "Following the findings of the independent procurement review, the Authority has published every contract awarded since 2019. The register is open and searchable.", stamp: "Posted 06:00, updated hourly" },
          { t: "table", h: "Next departures — Central Interchange", sub: "Real-time where available. Scheduled times shown in grey.",
            cols: ["Route", "Destination", "Due", "Platform", "Status"],
            rows: [
              ["7", "Ashfield via Kilnmore", "2 min", "B", "On time"],
              ["7", "Ashfield via Kilnmore", "14 min", "B", "On time"],
              ["R2", "Northgate — light rail", "4 min", "1", "On time"],
              ["31", "Docks Loop", "6 min", "D", "Short-formed"],
              ["R2", "Northgate — light rail", "11 min", "1", "On time"],
              ["88", "Regional — Vellinge", "23 min", "F", "Scheduled"],
            ] },
          { t: "stats", h: "Where the network stands", items: [
            { n: "940", l: "Stops in the network" },
            { n: "812", l: "With real-time arrivals" },
            { n: "94.1%", l: "Services within 5 minutes" },
            { n: "0", l: "Vehicles not step-free" },
          ], note: "Updated at the end of each operating month. Prior months remain available." },
          { t: "prose", h: "Plan a trip", p: "Enter an origin and destination for the next four departures on any route. If a stop is not showing real-time arrivals it is because the beacon there is broken, not because the bus is not coming." },
        ],
        "/schedules": [
          { t: "prose", h: "Timetables", p: "Every route publishes a full weekday, Saturday and Sunday table. Printed copies are held at all three interchanges and posted free on request." },
          { t: "table", h: "Route 7 — weekday, southbound", sub: "First 04:41, last 00:52. Every 12 minutes at peak, every 20 off-peak.",
            cols: ["Kilnmore Gate", "Waterhead", "Central", "Ashfield"],
            rows: [
              ["04:41", "04:53", "05:06", "05:19"],
              ["05:01", "05:13", "05:26", "05:39"],
              ["05:13", "05:25", "05:38", "05:51"],
              ["05:25", "05:37", "05:50", "06:03"],
              ["…", "…", "…", "…"],
              ["00:14", "00:26", "00:39", "00:52"],
            ] },
          { t: "spec", h: "Service pattern", rows: [
            ["Peak frequency", "Every 12 min, 06:30–09:30 and 15:30–18:30"],
            ["Off-peak", "Every 20 min"],
            ["Night service", "Routes 7, R2 and 31 only, hourly"],
            ["Sunday", "Every 30 min on all core routes"],
            ["Replacement bus", "Announced no later than 14 days ahead"],
          ] },
          { t: "downloads", h: "Printable", items: [
            { kind: "PDF", name: "Full network map, 2024 revision", size: "4.2 MB" },
            { kind: "PDF", name: "Route 7 pocket timetable", size: "180 KB" },
            { kind: "CSV", name: "All stops and coordinates", size: "890 KB" },
            { kind: "ZIP", name: "GTFS feed, updated nightly", size: "11.4 MB" },
          ] },
        ],
        "/fares": [
          { t: "table", h: "Single fares", sub: "Capped daily. You are never charged more than the day ticket price, whatever you tap.",
            cols: ["Ticket", "Adult", "Child 5–15", "Concession"],
            rows: [
              ["Single, any bus", "£2.00", "£1.00", "Free"],
              ["Single, light rail", "£2.40", "£1.20", "Free"],
              ["Day cap", "£5.20", "£2.60", "Free"],
              ["Weekly cap", "£23.00", "£11.50", "Free"],
              ["Regional add-on", "£1.80", "£0.90", "£0.90"],
            ] },
          { t: "notice", h: "No fare has risen this year", p: "Fares were frozen in March pending the review. The Authority has committed to publishing the full cost basis before any future change, and to a minimum of eight weeks' notice." },
          { t: "faq", h: "Fares, asked often", items: [
            { q: "What happens if I forget to tap out?", a: "You are charged the day cap, not a penalty. We do not profit from a mistake at a gate." },
            { q: "Is there a paper ticket?", a: "Yes, from every machine and every driver, at the same price as a card tap. It will not be withdrawn." },
            { q: "Why is the light rail dearer?", a: "It costs more to run per passenger kilometre. The figure is in the annual accounts, page 41." },
          ] },
        ],
        "/access": [
          { t: "prose", h: "Step-free throughout", p: "Every vehicle in the active fleet is step-free. Tactile paving and audio announcements are in place at all rail platforms, and at 812 of 940 bus stops." },
          { t: "spec", h: "What you can expect", rows: [
            ["Ramps", "Fitted to every bus, deployed by the driver on request"],
            ["Wheelchair space", "Two per light rail car, one per bus, priority enforced"],
            ["Audio announcements", "Every stop, every vehicle, no exceptions"],
            ["Visual announcements", "All light rail. 71% of buses, rest by end of year"],
            ["Assistance dogs", "Carried free on all services"],
            ["Staff assistance", "Available at all three interchanges, 05:00–00:30"],
          ] },
          { t: "notice", h: "128 stops still to do", p: "We are naming the number rather than the percentage because the percentage sounds better than it is. The remaining stops are listed by name in the register, with the month each is scheduled." },
        ],
        "/register": [
          { t: "prose", h: "The contract register", p: "Every contract awarded since 2019, with the supplier, the value, the tender route and whether it was competed. Nothing is redacted except individual names." },
          { t: "table", h: "Recent awards",
            cols: ["Date", "Supplier", "Purpose", "Value", "Competed"],
            rows: [
              ["11 Mar", "Harbrough Signage Ltd", "Interchange wayfinding, phase 1", "£412,000", "Yes — 4 bids"],
              ["02 Mar", "Vellinge Coachworks", "Fleet refurbishment, 18 units", "£2,140,000", "Yes — 3 bids"],
              ["19 Feb", "Ostrander Systems", "Real-time beacon replacement", "£680,500", "Yes — 6 bids"],
              ["04 Feb", "Kilnmore Glazing", "Shelter glass, emergency", "£31,200", "No — urgency"],
              ["22 Jan", "Independent review panel", "Procurement audit", "£96,000", "Yes — 2 bids"],
            ] },
          { t: "feed", h: "What the review found", items: [
            { d: "Finding 1", h: "Three contracts let without competition, 2019–2022", p: "Total value £4.1m. All three suppliers have since been removed from the approved list." },
            { d: "Finding 2", h: "No published register existed", p: "This page is the remedy. It is updated within one business day of any award." },
            { d: "Finding 3", h: "Board oversight was nominal", p: "Two non-executive members with procurement experience have been appointed. Meeting minutes are published in full." },
          ], note: "The full 214-page report is available unedited on request and in the reference library at Central." },
        ],
      },
      gallery: ["Platform signage", "Timetable board", "Fleet livery", "Concourse wayfinding"],
    },
    refs: ["platform signage", "timetable board", "train livery", "transit pictogram"],
  },

  /* ── NIGHT MENU ─────────────────────────────────────────── */
  "NIGHT MENU": {
    who: "Junior Alvarez", role: "Owner", co: "The Blue Hour Diner",
    dom: "bluehourdiner.com", frame: "neon",
    theme: {
      bg: "#140B1C", panel: "#20122C", ink: "#F6E6FF", dim: "#A98BC0", line: "#3A2450",
      brand: "#FF4FA3", brand2: "#3FE8FF", link: "#3FE8FF", onBrand: "#140B1C",
      head: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      body: "'Helvetica Neue', Arial, sans-serif",
      mono: "'VT323', monospace",
      mark: "disc", markText: "BH", markFace: "Arial, sans-serif",
    },
    greet: "Hey — Junior, from the diner.",
    voice: "Come by after two some night and you'll understand the brief.",
    wrap: "Got it all, opened it on the office machine which is older than half my staff, and it still opened. Printed the menu at actual size and taped it to the pass to see how it reads at 3am under the heat lamps. It reads. Invoice whenever — cash or a cheque, whatever's easier for you, and breakfast is on the house forever.",
    site: {
      tagline: "Open 24 hours. Same grill since 1974.",
      strap: "1120 Verrick Ave · No reservations · Never closed",
      foot: "We have not locked the front door since the Ford administration.",
      nav: [["Menu", "/"], ["After Midnight", "/latenight"], ["Hours & Find Us", "/hours"], ["The Counter", "/counter"], ["Jobs", "/jobs"]],
      pages: {
        "/": [
          { t: "lede", p: "Breakfast is served at every hour, including the ones that do not feel like breakfast. Nothing on this menu has changed price twice in one year." },
          { t: "table", h: "All day", sub: "Eggs any way. If you know a way we don't, tell the cook and he'll try it once.",
            cols: ["", "", ""],
            rows: [
              ["Two eggs, any style", "Toast, potatoes, choice of meat", "$9.50"],
              ["The Blue Plate", "Three eggs, chop, gravy, biscuit", "$13.00"],
              ["Short stack", "Three cakes, real butter", "$7.25"],
              ["Corned beef hash", "Made here, not from a can", "$11.50"],
              ["Patty melt", "Rye, grilled onion, swiss", "$12.00"],
              ["Chili, cup / bowl", "Since 1974, unchanged", "$4.50 / $7.00"],
              ["Coffee", "Bottomless, always", "$2.25"],
            ] },
          { t: "prose", h: "The room changes at two", p: "Different crowd, same eggs. Nobody rushes anybody out and nobody asks what you are doing awake." },
          { t: "gallery", h: "The place", caps: ["Neon at 3am", "The counter", "Window booth", "Short-order line"] },
        ],
        "/latenight": [
          { t: "notice", h: "The night menu is shorter on purpose", p: "One cook, one grill, and the delivery does not come until six. Everything below can be made by one person without leaving the line.", stamp: "Served 00:00 – 05:00" },
          { t: "table", h: "After midnight",
            cols: ["", "", ""],
            rows: [
              ["Eggs and potatoes", "That's it. That's the plate.", "$7.00"],
              ["Grilled cheese, chili on the side", "The one people order twice", "$9.00"],
              ["Cakes, two", "No blueberries after midnight, sorry", "$5.50"],
              ["Toast and coffee", "Sit as long as you want", "$3.75"],
              ["Whatever's left of the pie", "Ask. There's usually one slice", "$4.00"],
            ] },
          { t: "spec", h: "House rules, after two", rows: [
            ["Time limit", "None. There has never been one."],
            ["Minimum order", "None. Coffee counts."],
            ["Music", "Off between 2 and 5. People are talking or they are not."],
            ["Lights", "Half the fluorescents. It is deliberate."],
            ["Cash", "Preferred but not required. The card machine is slow."],
          ] },
        ],
        "/hours": [
          { t: "stats", h: "Hours", items: [
            { n: "24", l: "Hours a day" },
            { n: "365", l: "Days a year" },
            { n: "1974", l: "Same grill" },
            { n: "0", l: "Times we have closed" },
          ] },
          { t: "spec", h: "Finding us", rows: [
            ["Address", "1120 Verrick Ave, corner of Fourth"],
            ["Look for", "The sign. You cannot miss the sign."],
            ["Parking", "Lot behind, eleven spaces, free"],
            ["Bus", "Route 31 stops outside, all night"],
            ["Access", "Ramp at the side door, always unlocked"],
            ["Restroom", "Two, both single, both clean. We check hourly."],
          ] },
          { t: "prose", h: "Holidays", p: "We are open on all of them. Thanksgiving is the busiest shift of the year and has been since before I took over." },
        ],
        "/counter": [
          { t: "prose", h: "Fourteen stools, six booths", p: "The stools are better and everyone knows it. If you sit at the counter you get your food faster because it travels eighteen inches instead of thirty feet." },
          { t: "spec", h: "The counter, precisely", rows: [
            ["Length", "31 feet of laminate, original"],
            ["Stools", "14, chrome, replaced twice, same pattern"],
            ["Booths", "6, vinyl, four of them repaired"],
            ["Seat 7", "Wobbles. Has wobbled since 1991. Regulars fight for it."],
            ["Pass height", "Low enough that you can watch the grill"],
            ["Coffee stations", "Two, so nobody waits"],
          ] },
          { t: "feed", h: "Things that have happened at the counter", items: [
            { d: "1974", h: "My father opens with $4,000 borrowed from his brother", p: "The brother was paid back in 1979 and ate here free until he died." },
            { d: "1988", h: "The fire", p: "Kitchen only. We served coffee and toast from the counter for nine days and never locked the door." },
            { d: "2003", h: "Blackout", p: "Gas grill, so we cooked. Candles on every table. Best night of business we have ever had." },
            { d: "2019", h: "I take over", p: "Changed nothing except the coffee supplier, and I heard about that for a year." },
          ] },
        ],
        "/jobs": [
          { t: "prose", h: "We hire people who want the night", p: "Overnight is not a punishment shift here and it is not paid like one. It is the shift people ask for and stay on." },
          { t: "table", h: "Open now",
            cols: ["Role", "Shift", "Pay", "Notes"],
            rows: [
              ["Short-order cook", "22:00 – 06:00", "$24/hr + meals", "Must be able to run the line alone"],
              ["Server", "22:00 – 06:00", "$16/hr + tips", "Tips pooled, split evenly, no exceptions"],
              ["Dish", "18:00 – 02:00", "$18/hr + meals", "Will train"],
            ] },
          { t: "notice", h: "How we do it", p: "Tips are pooled and split evenly including the kitchen. Schedules are posted three weeks out. If you need a shift covered, ask the group and it gets covered — I have never had to make somebody come in." },
        ],
      },
      gallery: ["Neon at 3am", "The counter", "Window booth", "Short-order line"],
    },
    refs: ["neon diner sign", "chrome counter", "empty street at 3am", "diner booth"],
  },

  /* ── GLASSHOUSE ─────────────────────────────────────────── */
  "GLASSHOUSE": {
    who: "Wren Okafor", role: "Founder", co: "Glasshouse Labs",
    dom: "glasshouse.io", frame: "saas",
    theme: {
      bg: "#FBFDFB", panel: "#EEF5EC", ink: "#16241A", dim: "#5E7060", line: "#D2E2CE",
      brand: "#3E8A54", brand2: "#1E3A28", link: "#2C6B41", onBrand: "#FFFFFF",
      head: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      body: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      mark: "grid", markFace: "Arial, sans-serif",
    },
    greet: "Wren here, founder, sole employee, chief killer of ferns.",
    voice: "I have killed four ferns while writing this brief. No pressure.",
    wrap: "Everything opened, everything is in the repo, and I have had the alert states up on a second monitor for two days without wanting to close the tab — which is the only test I actually trust. The fern is alive. I am not attributing that entirely to you but I am not ruling it out. Invoice whenever; we pay same-week.",
    site: {
      tagline: "Know before it wilts",
      navCta: "Sign in",
      foot: "Made by four people in a converted potting shed.",
      hero: {
        h: "Six sensors. One answer.",
        p: "Soil moisture, light, air and leaf temperature, humidity and EC — resolved into a single state you can read from across the room. Fine, or not fine.",
        cta: "Start free trial", cta2: "Read the docs",
        foot: "No card required. The hub ships within two days.",
      },
      nav: [["Product", "/"], ["Sensors", "/sensors"], ["Pricing", "/pricing"], ["Docs", "/docs"], ["Support", "/support"]],
      pages: {
        "/": [
          { t: "prose", h: "Built for people who forget", p: "Glasshouse assumes you are busy and slightly guilty. It tells you what needs doing today and stays quiet otherwise. There is no streak counter and there is never going to be one." },
          { t: "stats", items: [
            { n: "6", l: "Sensors per probe" },
            { n: "30 days", l: "Held locally, offline" },
            { n: "2 sec", l: "To answer the only question" },
            { n: "18 mo", l: "Battery, typical" },
          ] },
          { t: "steps", h: "How it actually works", items: [
            { h: "Push the probe in", p: "Anywhere in the root zone, to the mark. It finds the hub on its own." },
            { h: "Leave it two days", p: "It learns what normal looks like for that specific pot in that specific window before it says anything." },
            { h: "It tells you once", p: "One notification, in the morning, only when there is something to do. Nothing at all is the most common outcome." },
          ] },
          { t: "prose", h: "Works offline", p: "The hub keeps thirty days of readings locally. Lose your connection and nothing is lost but the graphs." },
        ],
        "/sensors": [
          { t: "spec", h: "Probe v3 — what it measures", rows: [
            ["Soil moisture", "Capacitive, 0–100% VWC, ±3%"],
            ["Soil temperature", "−10 to 60 °C, ±0.4 °C"],
            ["Leaf temperature", "Infrared, contactless, ±0.6 °C"],
            ["Light", "PAR, 0–2500 µmol/m²/s"],
            ["Humidity", "0–100% RH, ±2%"],
            ["Electrical conductivity", "0–10 dS/m — this is the one nobody understands and it matters most"],
          ] },
          { t: "spec", h: "Hardware", rows: [
            ["Probe length", "170 mm, 12 mm diameter"],
            ["Body", "Glass-filled nylon, IP67"],
            ["Power", "One AA lithium, 18 months typical"],
            ["Radio", "Sub-GHz to hub, 400 m line of sight"],
            ["Hub", "Ethernet or wifi, 30-day local store"],
            ["Probes per hub", "Up to 32"],
          ] },
          { t: "products", h: "What you can buy", items: [
            { name: "Starter — hub + 1 probe", meta: "Everything needed for one plant that matters", price: "£129", tag: "In stock" },
            { name: "Probe, additional", meta: "Pairs itself, no configuration", price: "£54", tag: "In stock" },
            { name: "Greenhouse pack — hub + 8", meta: "For a run of benches", price: "£389", tag: "Ships in 5 days" },
          ], note: "Prices include VAT. We do not run sales, so there is nothing to wait for." },
        ],
        "/pricing": [
          { t: "pricing", h: "The software", sub: "The hardware is bought once. This is the part with a monthly number on it.", tiers: [
            { name: "Free", price: "£0", note: "Up to 2 probes", feats: ["Live readings", "One alert rule", "7 days of history", "Offline hub store"] },
            { name: "Home", price: "£4 / month", pick: "What most people are on", note: "Up to 8 probes", feats: ["Unlimited alert rules", "Two years of history", "Export as CSV", "Two people on one account"] },
            { name: "Grower", price: "£19 / month", note: "Unlimited probes", feats: ["Everything in Home", "Zones and bench grouping", "API access", "Phone support, actual phone"] },
          ], note: "If you cancel, the hub keeps working and keeps its 30 days. We do not brick hardware you own." },
          { t: "faq", h: "The awkward questions", items: [
            { q: "What happens to my data if you go under?", a: "The hub is documented and speaks MQTT. There is a signed escrow agreement to open-source the firmware. Details on the docs page under 'If we die'." },
            { q: "Is there an annual discount?", a: "Two months free. That is the whole offer and it does not expire." },
            { q: "Do you sell any of this to anybody?", a: "No. Your soil is not interesting enough to sell and we would not do it if it were." },
          ] },
        ],
        "/docs": [
          { t: "prose", h: "Documentation", p: "Written by the people who built it, which is why it is blunt about what does not work yet." },
          { t: "table", h: "API — the useful endpoints",
            cols: ["Method", "Path", "Returns"],
            rows: [
              ["GET", "/v1/probes", "Every probe, with last reading and battery"],
              ["GET", "/v1/probes/:id/history", "Up to two years, paginated, CSV or JSON"],
              ["GET", "/v1/state", "The single fine / not-fine answer per zone"],
              ["POST", "/v1/rules", "Create an alert rule"],
              ["GET", "/v1/hub/health", "Local, works with no internet at all"],
            ] },
          { t: "downloads", h: "Files", items: [
            { kind: "PDF", name: "Probe v3 installation guide", size: "1.1 MB" },
            { kind: "PDF", name: "EC for people who have never measured it", size: "640 KB" },
            { kind: "JSON", name: "OpenAPI specification", size: "88 KB" },
            { kind: "ZIP", name: "Firmware 3.4.1 and source", size: "6.8 MB" },
          ] },
        ],
        "/support": [
          { t: "prose", h: "Support", p: "Four people answer support and three of them wrote the firmware. There is no tier one." },
          { t: "spec", h: "What to expect", rows: [
            ["Email", "Answered within one working day, usually four hours"],
            ["Phone", "Grower plan only, and it rings on a real desk"],
            ["Replacements", "Dead probe inside two years, we post a new one first"],
            ["Status page", "status.glasshouse.io — outages posted within 5 minutes"],
            ["Known issues", "Listed publicly, including the ones that embarrass us"],
          ] },
          { t: "feed", h: "Recent changes", items: [
            { d: "3.4.1", h: "Fixed: EC drift after firmware update", p: "Affected 118 probes shipped in the second week of March. All affected owners were emailed before we posted this." },
            { d: "3.4.0", h: "Leaf temperature is out of beta", p: "Eleven months of readings across 900 probes. The maths is on the docs page." },
            { d: "3.3.2", h: "Quiet hours", p: "No notification will fire between 22:00 and 07:00 unless the reading is genuinely urgent. Should have been there from the start." },
          ] },
        ],
      },
      gallery: ["Hub and probe", "Greenhouse install", "Soil probe detail", "Dashboard on a phone"],
    },
    refs: ["soil moisture sensor", "greenhouse grow light", "wilting fern", "seedling tray"],
  },

  /* ── THE LEDGER ─────────────────────────────────────────── */
  "THE LEDGER": {
    who: "Halvard Sten", role: "Member Secretary", co: "Fairwater Cooperative Bank",
    dom: "fairwater.coop", frame: "civic",
    theme: {
      bg: "#FCFBF7", panel: "#F0EDE2", ink: "#221D14", dim: "#6E6552", line: "#D6CFBC",
      brand: "#1B4B3A", brand2: "#B08A3E", link: "#1B4B3A", onBrand: "#FCFBF7",
      head: "Georgia, 'Times New Roman', serif",
      body: "Georgia, 'Times New Roman', serif",
      mark: "crest", markText: "F", markFace: "Georgia, serif",
    },
    greet: "Dear colleague,",
    voice: "Nine hundred members will read whatever you design. Most of them twice.",
    wrap: "The files arrived and I have opened every one, including the two I did not understand, which the technology committee assures me is my failing rather than yours. It goes to the membership on the first of the month. Please invoice in the ordinary way; we settle within ten days and the payment will appear on the open ledger like everything else, so you will be able to see it.",
    site: {
      tagline: "Owned by the people who bank here",
      crestNote: "Founded 1913 · Member-owned",
      foot: "Published under open licence",
      side: [
        { h: "Notices", p: "All documents on this site are published in full and remain available. Nothing is removed after a vote." },
        { h: "Next meeting", p: "Quarterly general meeting, the 14th, 18:30, in the banking hall. Any member may speak." },
      ],
      nav: [["Membership", "/"], ["The Open Ledger", "/ledger"], ["Lending", "/lending"], ["Votes", "/votes"], ["Annual Report", "/report"]],
      pages: {
        "/": [
          { t: "prose", h: "One member, one vote", p: "Holdings do not buy influence here. A member with forty pounds on deposit votes exactly as heavily as a member with forty thousand." },
          { t: "stats", items: [
            { n: "902", l: "Members" },
            { n: "£31.4m", l: "On deposit" },
            { n: "61%", l: "Lent within eleven miles" },
            { n: "1913", l: "Founded" },
          ] },
          { t: "table", h: "Becoming a member",
            cols: ["", "Requirement"],
            rows: [
              ["Minimum share", "£40, refundable in full on leaving"],
              ["Eligibility", "Live, work or study within the county"],
              ["Approval", "By the membership committee, monthly"],
              ["Vote", "One, from the day the share is paid"],
              ["Dividend", "Declared annually. 1.9% last year"],
            ] },
          { t: "prose", h: "What we are not", p: "We are not a challenger bank and we are not a charity. We are a bank with 902 owners, all of whom can read the loan book, and that is the only unusual thing about us." },
        ],
        "/ledger": [
          { t: "notice", h: "Every loan, within one business day", p: "The sum, the term and the purpose. Names are withheld. Nothing else is." },
          { t: "table", h: "The open ledger — this month",
            cols: ["Ref", "Purpose", "Sum", "Term", "Rate"],
            rows: [
              ["L-4471", "Bakery — second oven", "£18,000", "5 yr", "6.1%"],
              ["L-4470", "Roof repair, residential", "£9,400", "3 yr", "5.8%"],
              ["L-4469", "Boat refit, inshore fishing", "£46,000", "8 yr", "6.4%"],
              ["L-4468", "Van, plumbing business", "£21,500", "5 yr", "6.1%"],
              ["L-4467", "Nursery — extension", "£112,000", "12 yr", "5.9%"],
              ["L-4466", "Debt consolidation, member", "£7,200", "4 yr", "7.2%"],
            ], note: "The full ledger back to 2011 is searchable. Four loans in that period were written off; all four remain listed." },
          { t: "spec", h: "What is withheld, and why", rows: [
            ["Borrower name", "Withheld. A loan is not a public act."],
            ["Street address", "Withheld. The town is shown."],
            ["Sum", "Published exactly, never banded."],
            ["Purpose", "Published in the borrower's own words, edited only for length."],
            ["Default", "Published. It is the number that matters most and it is the one banks hide."],
          ] },
        ],
        "/lending": [
          { t: "prose", h: "Who we lend to", p: "Members, and businesses within eleven miles of this building. We decline about a third of applications and we tell every declined applicant why, in writing, in a paragraph a person wrote." },
          { t: "table", h: "Current rates", sub: "Set by the board quarterly and published before they take effect.",
            cols: ["Product", "Rate", "Maximum", "Term"],
            rows: [
              ["Personal", "5.8% – 7.4%", "£25,000", "1–7 yr"],
              ["Business", "5.9% – 6.8%", "£250,000", "1–15 yr"],
              ["Home improvement", "5.6%", "£40,000", "1–10 yr"],
              ["Bridging, member", "8.9%", "£60,000", "Up to 12 mo"],
            ] },
          { t: "steps", h: "How a decision is made", items: [
            { h: "You apply on paper or in person", p: "There is no instant decision and we will not pretend there is one." },
            { h: "A person reads it", p: "The same three people read every application. They have names and you can ask for them." },
            { h: "The committee meets fortnightly", p: "Anything over £50,000 goes to the full board." },
            { h: "You get a reason", p: "Approved or declined, in writing, in plain sentences." },
          ] },
        ],
        "/votes": [
          { t: "feed", h: "Recent member votes", items: [
            { d: "March", h: "Motion 14 — publish default rates by loan purpose", p: "Carried, 611 to 84. Implemented the following month." },
            { d: "March", h: "Motion 15 — raise the minimum share to £75", p: "Defeated, 190 to 508. The share stays at £40." },
            { d: "December", h: "Motion 12 — divest from two fossil-linked funds", p: "Carried, 704 to 51. Completed in February at a realised loss of £14,200, which is disclosed in the report." },
            { d: "September", h: "Motion 9 — Saturday opening", p: "Defeated, 302 to 388. Raised again for the autumn meeting by petition." },
          ] },
          { t: "spec", h: "How voting works", rows: [
            ["Who votes", "Every member, one vote, from the day their share is paid"],
            ["How", "Post, in person, or the member portal"],
            ["Notice", "Twenty-eight days, with the full motion text"],
            ["Quorum", "10% of the membership"],
            ["Petition", "Any 25 members may put a motion on the paper"],
            ["Results", "Published with the exact counts, never as percentages alone"],
          ] },
        ],
        "/report": [
          { t: "prose", h: "Where the money went", p: "Sixty-one percent of lending in the last cycle went to businesses within eleven miles of this building. The remainder is itemised by mile band in the report, because a member asked for it and it was a reasonable thing to ask." },
          { t: "table", h: "Summary, year ended March",
            cols: ["", "This year", "Last year"],
            rows: [
              ["Members", "902", "871"],
              ["Deposits", "£31.4m", "£29.8m"],
              ["Lending advanced", "£8.9m", "£7.6m"],
              ["Written off", "£41,000", "£28,500"],
              ["Operating surplus", "£412,000", "£389,000"],
              ["Dividend declared", "1.9%", "1.8%"],
              ["Highest salary : lowest", "4.1 : 1", "4.3 : 1"],
            ] },
          { t: "downloads", h: "Documents", items: [
            { kind: "PDF", name: "Annual report and accounts", size: "3.4 MB" },
            { kind: "PDF", name: "Lending by mile band", size: "220 KB" },
            { kind: "CSV", name: "Open ledger, complete, 2011–present", size: "1.9 MB" },
            { kind: "PDF", name: "Rules of the society, as amended", size: "780 KB" },
          ] },
        ],
      },
      gallery: ["The lobby", "Ledger, 1974", "Member meeting", "Branch counter"],
    },
    refs: ["ledger book", "credit union lobby", "member meeting", "bank passbook"],
  },

  /* ── REPEATER ───────────────────────────────────────────── */
  "REPEATER": {
    who: "Marcus Dell", role: "Founder, and the drummer who got tired of scrubbing",
    co: "Repeater Audio", dom: "repeater.audio", frame: "terminal",
    theme: {
      bg: "#131316", panel: "#1C1C21", ink: "#E6E3DC", dim: "#8E8A80", line: "#31313A",
      brand: "#E8B44C", brand2: "#7FD8C4", link: "#7FD8C4", onBrand: "#131316",
      head: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      body: "'Courier New', Courier, monospace",
      mono: "'Courier New', Courier, monospace",
      mark: "wave", markFace: "Arial, sans-serif",
    },
    greet: "Marcus. Straight to it:",
    voice: "If it takes two gestures to loop a bar, it has failed.",
    wrap: "All in, all opened. I set the loop points on the hardest four seconds I own and ran it for forty minutes without once thinking about the interface, which is the only compliment I know how to give. Send the invoice — I pay the day it lands because I have been the person waiting on one.",
    site: {
      tagline: "Loop the hard four seconds",
      foot: "Built by one person who needed it. Now maintained by three.",
      nav: [["Download", "/"], ["How it works", "/how"], ["For teachers", "/teachers"], ["Changelog", "/changelog"]],
      pages: {
        "/": [
          { t: "lede", p: "Set two points. Play the passage three hundred times. Repeater exists to make attempt 301 as frictionless as attempt 2." },
          { t: "downloads", h: "Get it", sub: "One file. No installer, no account, no launcher.", items: [
            { kind: "MAC", name: "Repeater 2.4 — Apple silicon", size: "14 MB" },
            { kind: "MAC", name: "Repeater 2.4 — Intel", size: "16 MB" },
            { kind: "WIN", name: "Repeater 2.4 — Windows 10+", size: "12 MB" },
            { kind: "SRC", name: "Source, MIT licensed", size: "2.1 MB" },
          ], note: "£29 once, or free if you are a student and say so in one sentence. There is no trial because the free version is the whole thing on an honour system." },
          { t: "stats", items: [
            { n: "12 ms", l: "Input to visible feedback" },
            { n: "1", l: "Gesture to set a loop" },
            { n: "0", l: "Accounts required" },
            { n: "14 MB", l: "The entire application" },
          ] },
          { t: "prose", h: "Gets out of the way", p: "As you get faster, the controls recede. By the time you have the passage, the interface is nearly gone." },
        ],
        "/how": [
          { t: "steps", h: "The whole product is repetition", items: [
            { h: "Drop two markers", p: "Click once for in, once for out, anywhere on the waveform. Or hit the key twice while playing — that is the way people actually use it." },
            { h: "It loops seamlessly", p: "No gap, no click, no fade. The join is sample-accurate and it stays that way at any tempo." },
            { h: "Slow it without wrecking it", p: "Down to 40% with pitch held. Guitarists notice the artefacts first, so we tuned it against guitarists." },
            { h: "It counts for you", p: "Attempt number, in the corner, small. Nobody asked for it. Everybody uses it." },
          ] },
          { t: "spec", h: "Technical", rows: [
            ["Latency", "12 ms input to visible feedback, measured not estimated"],
            ["Loop join", "Sample-accurate, zero-crossing snapped"],
            ["Time stretch", "40%–200%, formant preserved"],
            ["Pitch shift", "±12 semitones, independent of tempo"],
            ["Formats", "WAV, AIFF, FLAC, MP3, M4A"],
            ["Audio driver", "CoreAudio, ASIO, WASAPI exclusive"],
            ["Footswitch", "Any MIDI or HID pedal, mappable"],
          ] },
          { t: "gallery", h: "In use", caps: ["Loop selector", "Practice session", "Waveform detail", "On a music stand"] },
        ],
        "/teachers": [
          { t: "prose", h: "For teachers", p: "Send a student a file with the loop points already in it. They open it and land on the bar you meant, not the bar they guessed." },
          { t: "pricing", h: "Studio licences", tiers: [
            { name: "One teacher", price: "£29", note: "Same as everyone", feats: ["All features", "Perpetual", "Shareable loop files", "No seat check"] },
            { name: "Studio, 10 seats", price: "£190", pick: "Most schools", note: "£19 each", feats: ["Ten machines", "One invoice", "Named contact for support", "Perpetual"] },
            { name: "Institution", price: "£640", note: "Unlimited within one site", feats: ["Site-wide", "Offline activation", "Purchase order accepted", "Perpetual"] },
          ], note: "Perpetual means perpetual. There is no version we can switch off." },
          { t: "faq", h: "Asked by teachers", items: [
            { q: "Can students use it without paying?", a: "Yes. Say you are a student, in one sentence, and I send a key. I have never checked and I am not going to start." },
            { q: "Does it work with a footswitch?", a: "Any MIDI or HID pedal. Mapping takes about four seconds and it is remembered per device." },
            { q: "Will it phone home?", a: "It checks for an update once a week and you can turn that off in the first screen you see." },
          ] },
        ],
        "/changelog": [
          { t: "feed", h: "Changelog", items: [
            { d: "2.4", h: "Loop points survive a file reload", p: "Stored alongside the audio, not in a database. Move the file to another machine and the points move with it." },
            { d: "2.3", h: "Attempt counter", p: "Small, in the corner. I added it as a joke and then could not remove it." },
            { d: "2.2", h: "Latency down from 19 ms to 12 ms", p: "Rewrote the draw path. The measurement rig and the numbers are in the repo, because 'feels faster' is not a claim." },
            { d: "2.1", h: "Removed the toolbar", p: "Six people wrote in about it. Four have since said the app is better without it. I am counting that as won." },
            { d: "2.0", h: "One-gesture looping", p: "The whole reason for the rewrite. If it takes two gestures, it has failed." },
          ] },
        ],
      },
      gallery: ["Loop selector", "Practice session", "Waveform detail", "On a music stand"],
    },
    refs: ["practice pad", "waveform loop", "metronome", "sheet music close up"],
  },

  /* ── QUARRY ─────────────────────────────────────────────── */
  "QUARRY": {
    who: "Sofie Lindqvist", role: "Art Director", co: "Ninth Bell Games",
    dom: "ninthbell.games", frame: "studio",
    theme: {
      bg: "#1A1A18", panel: "#242320", ink: "#E8E4DC", dim: "#95908A", line: "#38362F",
      brand: "#A6602F", brand2: "#C9C4BA", link: "#D0894F", onBrand: "#1A1A18",
      head: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      body: "'Helvetica Neue', Arial, sans-serif",
      mark: "horizon", markFace: "Arial, sans-serif",
    },
    greet: "Hi — Sofie, art direction.",
    voice: "Dangerous at fifty metres, pitiable at two. That's the whole note.",
    wrap: "Everything imported clean, LODs included, and the silhouette holds at 32 pixels which I checked before I checked anything else. Two people on the environment team have already asked who made it. Invoice through the usual portal — it is slow, it is not us, and if it takes more than thirty days tell me and I will go and stand next to somebody's desk.",
    site: {
      tagline: "We make games about places people left",
      foot: "Eleven people, four countries, one very long changelog.",
      nav: [["Games", "/"], ["Studio", "/studio"], ["Press", "/press"], ["Careers", "/careers"]],
      pages: {
        "/": [
          { t: "prose", h: "Currently building", p: "An open-world game set in a marble quarry abandoned mid-shift in 1981. The machines are still where they stopped." },
          { t: "spec", h: "Quarry — the facts we will state", rows: [
            ["Setting", "A working marble quarry, abandoned mid-shift, autumn 1981"],
            ["Playable area", "One valley. 4.1 km end to end. No loading between any of it"],
            ["Combat", "None"],
            ["Fail state", "None. You can get lost and cold. That is the whole of it"],
            ["Platforms", "PC first. Consoles when it runs properly, not before"],
            ["Date", "Not announced, and we will not be pressured into announcing one"],
          ] },
          { t: "gallery", h: "From the build", caps: ["Quarry face", "Cutting machine", "Abandoned shift", "Marble dust"] },
          { t: "prose", h: "Previously", p: "Two smaller games about the same idea from different angles. Both still sold, both still patched, neither delisted." },
        ],
        "/studio": [
          { t: "prose", h: "How we work", p: "Small team, long timelines, no crunch policy we actually keep. Eleven people, four countries, one very long changelog." },
          { t: "spec", h: "The policy, in full", rows: [
            ["Working week", "35 hours. Overtime is a scheduling failure, logged as one"],
            ["Crunch", "None since founding. The two times we came close are written up internally"],
            ["Hours", "Set by each person. Four hours of overlap is the only requirement"],
            ["Pay", "Banded and published internally. Everyone can see every band"],
            ["Credit", "Everyone who worked on it is in the credits, including contractors and leavers"],
            ["Ownership", "Employee-owned, 100%. No publisher, no external investor"],
          ] },
          { t: "people", h: "Who is here", items: [
            { n: "Sofie Lindqvist", r: "Art Director", p: "Ten years in film previs before this. Still draws every prop before anyone models it." },
            { n: "Petter Aune", r: "Technical Director", p: "Wrote the streaming system that lets the valley have no loading screens." },
            { n: "Ines Carrera", r: "Environment Lead", p: "Spent three weeks in an actual quarry in Carrara and came back with 900 photographs." },
            { n: "Nine others", r: "Design, audio, animation, production", p: "Listed in full on the careers page, with what each of them actually does." },
          ] },
        ],
        "/press": [
          { t: "prose", h: "Press", p: "Assets, fact sheets and a build for review are available on request. We answer every email, slowly." },
          { t: "downloads", h: "Press kit", items: [
            { kind: "ZIP", name: "Screenshots, 4K, uncompressed", size: "184 MB" },
            { kind: "PDF", name: "Fact sheet — Quarry", size: "410 KB" },
            { kind: "ZIP", name: "Logos, mark and wordmark, SVG and PNG", size: "2.2 MB" },
            { kind: "MP4", name: "Announcement, 90 sec, no music bed", size: "68 MB" },
          ], note: "Everything here is cleared for use without asking. If you need something that is not here, ask and we will make it." },
          { t: "spec", h: "Terms we ask for", rows: [
            ["Embargo", "We do not use them. Publish when you like"],
            ["Review builds", "Given to anyone who asks, including outlets we have never heard of"],
            ["Coverage rights", "Monetise anything. No claims, ever"],
            ["Corrections", "If we told you something wrong we will say so publicly, on this page"],
          ] },
        ],
        "/careers": [
          { t: "prose", h: "Hiring", p: "Rarely, and slowly. We post the band, the location rules and the whole process before you apply, because being kept guessing is the worst part of looking for work." },
          { t: "table", h: "Open now",
            cols: ["Role", "Band", "Location", "Closes"],
            rows: [
              ["Environment Artist (Props)", "€52,000 – €61,000", "Anywhere ±3h of CET", "Open until filled"],
              ["Audio Designer, contract", "€480 / day", "Anywhere", "14 June"],
            ] },
          { t: "steps", h: "The process, all of it", items: [
            { h: "1 · You send work", p: "No cover letter. Four images or one link. We look at all of them." },
            { h: "2 · One conversation, one hour", p: "Two of us, no panel, no whiteboard." },
            { h: "3 · A paid exercise", p: "Two days at your day rate. You keep the work and we do not ship it." },
            { h: "4 · An answer within a week", p: "With a reason. Every time, including the noes." },
          ] },
        ],
      },
      gallery: ["Quarry face", "Cutting machine", "Abandoned shift", "Marble dust"],
    },
    refs: ["marble quarry", "rusted machinery", "stone cutting saw", "industrial decay"],
  },

  /* ── SOFT SERVICE ───────────────────────────────────────── */
  "SOFT SERVICE": {
    who: "Camille Duforet", role: "Creative Lead", co: "Soft Service",
    dom: "softservice.furniture", frame: "shop",
    theme: {
      bg: "#FAF6EF", panel: "#EFE7D9", ink: "#33291F", dim: "#8A7B67", line: "#DED2BE",
      brand: "#B8763F", brand2: "#3A3227", link: "#8E5628", onBrand: "#FAF6EF",
      head: "'Instrument Serif', Georgia, serif",
      body: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      mark: "slab", markText: "SS", markFace: "Georgia, serif",
    },
    greet: "Bonjour — Camille, from Soft Service.",
    voice: "Nobody will sit on it before they buy it. That is the entire problem.",
    wrap: "Files received and rendered overnight on the farm. The bouclé holds up at 400% which is where every previous attempt fell apart, and the room set no longer looks like a room nobody lives in. Our finance runs on thirty days from invoice date — send it today and it clears at the start of next month.",
    site: {
      tagline: "Furniture you will only ever meet online",
      cart: "Basket (0)",
      strap: "Free swatches · 90-night trial · We collect it ourselves if it is wrong",
      foot: "No showroom, on purpose.",
      nav: [["Sofas", "/"], ["Fabrics", "/fabrics"], ["The Showroom", "/showroom"], ["Returns", "/returns"], ["Contact", "/contact"]],
      pages: {
        "/": [
          { t: "products", h: "The range", sub: "Four frames. Fourteen fabrics. That is deliberately the whole catalogue.", items: [
            { name: "Meridienne, 2 seat", meta: "168 × 92 × 78 cm · beech frame", price: "£1,290", tag: "6 week lead" },
            { name: "Meridienne, 3 seat", meta: "212 × 92 × 78 cm · beech frame", price: "£1,640", tag: "6 week lead" },
            { name: "Petit, 2 seat", meta: "152 × 84 × 74 cm · for narrow rooms", price: "£1,090", tag: "In stock" },
            { name: "Corner, left or right", meta: "268 × 168 × 78 cm · ships in two pieces", price: "£2,340", tag: "9 week lead" },
          ], note: "Delivery to a room of your choosing is included, including up stairs. We do not charge for the thing that is hardest for us." },
          { t: "stats", items: [
            { n: "14", l: "Fabrics, all free as swatches" },
            { n: "90", l: "Nights to change your mind" },
            { n: "0", l: "Showrooms" },
            { n: "8 yr", l: "Frame guarantee" },
          ] },
          { t: "prose", h: "No showroom, on purpose", p: "We put the showroom budget into the frame and the fabric. What you save is roughly the cost of a room on a high street you would not have visited." },
        ],
        "/fabrics": [
          { t: "swatches", h: "Fourteen fabrics", sub: "Order any of them as a swatch, free, before you commit. Most people order four and keep the one they did not expect.", items: [
            { n: "Bouclé, Oat", m: "68% wool · 42,000 rubs", c: "#DDD0B6" },
            { n: "Bouclé, Ash", m: "68% wool · 42,000 rubs", c: "#B9B5AC" },
            { n: "Linen, Chalk", m: "100% flax · 28,000 rubs", c: "#EDE7DA" },
            { n: "Linen, Slate", m: "100% flax · 28,000 rubs", c: "#6E747A" },
            { n: "Velvet, Fig", m: "Cotton blend · 50,000 rubs", c: "#5B3A46" },
            { n: "Velvet, Moss", m: "Cotton blend · 50,000 rubs", c: "#4F5A3C" },
            { n: "Wool, Rust", m: "Recycled · 60,000 rubs", c: "#A0562F" },
            { n: "Cord, Sand", m: "Cotton cord · 35,000 rubs", c: "#C7A87C" },
          ] },
          { t: "spec", h: "What the numbers mean", rows: [
            ["Martindale rubs", "Abrasion resistance. Above 25,000 is fine for a sofa. Above 40,000 is fine for a sofa with a dog"],
            ["Pilling", "4 or better on all fourteen. Bouclé pills least, which surprises people"],
            ["Light fastness", "5+ on the blue wool scale. Fig and Moss will still shift a little in a south window"],
            ["Cleaning", "Water-based code W on everything. No fabric here needs a specialist"],
            ["Replacement covers", "Available for every fabric, for eight years, at 40% of the sofa price"],
          ] },
          { t: "notice", h: "Swatches are free and we mean free", p: "Order fourteen if you want. No postage, no card, no account. People who order four and take a week to decide return their sofa less than half as often as people who order none." },
        ],
        "/showroom": [
          { t: "prose", h: "The showroom is this page", p: "Photographed in a real flat, at the ceiling height a real flat has, with the light a real window makes at four in the afternoon in March." },
          { t: "gallery", h: "In rooms", caps: ["Bouclé, oat", "Frame detail", "Room set", "Fabric library"] },
          { t: "spec", h: "Meridienne, 3 seat — every dimension", rows: [
            ["Overall", "212 W × 92 D × 78 H cm"],
            ["Seat height", "44 cm — the number people forget to check"],
            ["Seat depth", "58 cm usable"],
            ["Arm height", "62 cm"],
            ["Leg height", "16 cm — a robot vacuum clears it"],
            ["Weight", "48 kg"],
            ["Access needed", "Doorway 76 cm minimum. Legs unscrew for 4 cm more"],
          ], note: "If your doorway is tighter than 76 cm, tell us before you order and we will tell you honestly whether it will go in." },
        ],
        "/returns": [
          { t: "prose", h: "Ninety nights", p: "Sit on it for three months. If it is wrong, we collect it ourselves and you pay nothing. Our own drivers, not a courier, because a courier would damage it and then we would argue about who pays." },
          { t: "steps", h: "If it is wrong", items: [
            { h: "Tell us, by any means", p: "Email, phone, or the form. No reason required and we will not ask for one twice." },
            { h: "We book a collection", p: "Within seven days, in a two-hour window, from the room it is in." },
            { h: "Refund on collection", p: "Not on inspection. The moment it is on the van, the money goes back." },
            { h: "It goes to a second home", p: "Returned sofas are recovered and sold at 45% off on the outlet page. Nothing is destroyed." },
          ] },
          { t: "faq", h: "Returns, asked often", items: [
            { q: "What if I damaged it?", a: "Ordinary living is not damage. A burn, a tear or a pet is — tell us and we will still take it, we will just quote a fair deduction and show you how we got there." },
            { q: "Does the trial restart if I change fabric?", a: "Yes. Ninety nights from whatever arrives last." },
            { q: "How many people return?", a: "6.8% last year. It was 11.4% before free swatches. That is the entire argument for free swatches." },
          ] },
        ],
        "/contact": [
          { t: "contact", h: "Talk to a person", lines: ["Soft Service", "Unit 4, Rope Walk", "Monday to Friday, 09:00–17:30"],
            note: "Calls are answered by four people who have all built one of these. Nobody here reads from a script and there is no queue." },
          { t: "spec", h: "Where things are made", rows: [
            ["Frames", "Beech, kiln-dried, made 40 km from the workshop"],
            ["Foam", "CertiPUR, cut and wrapped in-house"],
            ["Fabrics", "Nine mills, all named on the product page"],
            ["Assembly", "One workshop, 22 people, one shift"],
            ["Delivery", "Own vans and own drivers within the mainland"],
          ] },
        ],
      },
      gallery: ["Bouclé, oat", "Frame detail", "Room set", "Fabric library"],
    },
    refs: ["boucle fabric", "sofa studio shot", "upholstery detail", "linen weave"],
  },

  /* ── CARRIER ────────────────────────────────────────────── */
  "CARRIER": {
    who: "Tobias Reyner", role: "Director", co: "Cold Orbit Pictures",
    dom: "coldorbit.film", frame: "studio",
    theme: {
      bg: "#0A0F14", panel: "#121A22", ink: "#CBDCE8", dim: "#7489A0", line: "#1F2C38",
      brand: "#4E7C9B", brand2: "#C2703A", link: "#7FB4D6", onBrand: "#0A0F14",
      head: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      body: "'Helvetica Neue', Arial, sans-serif",
      mono: "'Courier New', monospace",
      mark: "orbit", markFace: "Arial, sans-serif",
    },
    greet: "Tobias Reyner, Cold Orbit.",
    voice: "One shot, six minutes, no dialogue. The ship has to explain itself.",
    wrap: "The build is in and it survives the one thing I was afraid of, which is holding a single unbroken frame for six minutes with nothing cutting away to hide it. Every surface reads as a thing that does something. Invoice to production; we pay on delivery, not on release, because release dates are a lie and delivery is a fact.",
    site: {
      tagline: "Hard science fiction, shot long",
      foot: "Three shorts, two of them shot entirely in-camera.",
      nav: [["Films", "/"], ["In Production", "/production"], ["House Rules", "/rules"], ["Contact", "/contact"]],
      pages: {
        "/": [
          { t: "prose", h: "What we make", p: "Long takes about machinery, in space, with no score. Three shorts so far, two of them shot entirely in-camera. The festival list is available on request and is shorter than we would like." },
          { t: "table", h: "Films",
            cols: ["Year", "Title", "Length", "Notes"],
            rows: [
              ["2019", "Deadweight", "11 min", "One take. Shot on a gimbal rig we built"],
              ["2021", "Trim", "17 min", "Two takes joined at a black frame. Nobody has found the join"],
              ["2023", "Hold", "8 min", "In-camera, no post at all. Our best-liked and our worst-selling"],
              ["—", "Carrier", "6 min", "In production. One shot"],
            ] },
          { t: "gallery", h: "Stills", caps: ["Hauler, dorsal", "Docking clamp", "Previz frame", "Hull wear pass"] },
        ],
        "/production": [
          { t: "notice", h: "Carrier", p: "A six-minute single take in which a cargo hauler docks with nothing. No score, no dialogue, no cuts.", stamp: "Principal photography, autumn" },
          { t: "spec", h: "The shot", rows: [
            ["Length", "6 minutes 04 seconds, one take"],
            ["Cuts", "Zero"],
            ["Dialogue", "None"],
            ["Score", "None. Diegetic hull noise only"],
            ["Camera", "Single move, 340 m of virtual track"],
            ["Frame rate", "24. It has been argued about and it is settled"],
            ["Aspect", "2.39:1, hard-matted in camera"],
          ] },
          { t: "steps", h: "Where it is", items: [
            { h: "Blockout — complete", p: "Grey model, full move, timed to the second. It already reads without a single texture on it." },
            { h: "Asset build — in progress", p: "Exterior hull and dock module. Every mechanism modelled, including the ones the camera never reaches." },
            { h: "Shading — starts when the model locks", p: "Wear and decals last, so the wear tells the truth about the geometry underneath it." },
            { h: "Render — nine weeks", p: "On thirty machines. There is no version of this that is fast." },
          ] },
        ],
        "/rules": [
          { t: "prose", h: "House rules", p: "Every mechanism on screen must work. If we cannot explain what a surface does, it does not go on the model." },
          { t: "spec", h: "The rules, as written on the wall", rows: [
            ["1", "Every surface justifies itself mechanically or it is removed"],
            ["2", "No red glowing anything"],
            ["3", "Nothing moves faster than its mass allows"],
            ["4", "Scale reads against a human at 200 metres or it is not built"],
            ["5", "No sound in vacuum. This has cost us two festival slots"],
            ["6", "If a cut would fix it, the shot is wrong, not the cut"],
          ] },
          { t: "faq", h: "Asked by people who want to work with us", items: [
            { q: "Do you use previs?", a: "Constantly. The blockout is the film. If it does not work grey, no amount of shading will save it." },
            { q: "Why no score?", a: "Because a score tells the audience how to feel and the hull already does that if we built it properly." },
            { q: "Are the rules negotiable?", a: "Rule 2 has been challenged four times. It has survived four times." },
          ] },
        ],
        "/contact": [
          { t: "contact", h: "Contact", lines: ["Cold Orbit Pictures", "Stage 3, Verrick Works"],
            note: "We answer every email, and we answer slowly, and we say so in advance so nobody has to wonder." },
          { t: "downloads", h: "For festivals and press", items: [
            { kind: "PDF", name: "Carrier — one sheet", size: "890 KB" },
            { kind: "ZIP", name: "Stills, 4K, no watermark", size: "212 MB" },
            { kind: "PDF", name: "Technical notes — the single take", size: "1.4 MB" },
          ] },
        ],
      },
      gallery: ["Hauler, dorsal", "Docking clamp", "Previz frame", "Hull wear pass"],
    },
    refs: ["cargo spacecraft", "docking clamp", "industrial spacecraft hull", "orbital station"],
  },

  /* ── FIELD GUIDE TO NOTHING ─────────────────────────────── */
  "FIELD GUIDE TO NOTHING": {
    who: "Edith Mbeki", role: "Publisher", co: "Vacant Lot Press",
    dom: "vacantlotpress.org", frame: "press",
    theme: {
      bg: "#F7F5EE", panel: "#E9E7DA", ink: "#22261C", dim: "#6B7060", line: "#CFD2C0",
      brand: "#4E6B34", brand2: "#8A5A2A", link: "#3E5828", onBrand: "#F7F5EE",
      head: "Georgia, 'Times New Roman', serif",
      body: "Georgia, 'Times New Roman', serif",
      mark: "stack", markFace: "Georgia, serif",
    },
    greet: "Dear you —",
    voice: "A botanist will check every plate. Please make her job dull.",
    wrap: "The plates arrived and Dr. Achterberg has been through all forty-two with a hand lens and a bad mood, which is her working method, and found nothing to correct. That has never happened. Invoice us — we are two people and a bank account, so it is paid the week it arrives or I have forgotten, and you should chase me.",
    site: {
      tagline: "Books about overlooked ground",
      est: "Two editors · One room · Eleven titles",
      foot: "We publish what larger houses find too specific.",
      nav: [["Catalogue", "/"], ["Forthcoming", "/forthcoming"], ["On Accuracy", "/accuracy"], ["Stockists", "/stockists"]],
      pages: {
        "/": [
          { t: "lede", p: "Eleven titles about ground nobody photographs: rail margins, demolition sites, the strip between a fence and a road." },
          { t: "products", h: "In print", items: [
            { name: "A Field Guide to Nothing", meta: "Forthcoming · 42 plates · 208 pp", price: "£24.00", tag: "Pre-order" },
            { name: "Ruderal", meta: "2022 · 164 pp · third printing", price: "£18.00", tag: "In stock" },
            { name: "The Margin and the Rail", meta: "2021 · 132 pp · with maps", price: "£16.00", tag: "In stock" },
            { name: "Ground, Disturbed", meta: "2019 · 96 pp · out of print", price: "—", tag: "Reprinting" },
          ], note: "Every title stays in print for as long as we exist. 'Out of print' here means 'between printings' and we will tell you the month." },
          { t: "prose", h: "About the press", p: "Two editors, one room, eleven titles. We publish what larger houses find too specific." },
        ],
        "/forthcoming": [
          { t: "notice", h: "A Field Guide to Nothing", p: "Forty-two species that colonise demolition sites, rail margins and the ground where buildings used to be. Illustrated throughout, two spot colours plus black.", stamp: "October · £24 · 208 pp" },
          { t: "spec", h: "The book itself", rows: [
            ["Extent", "208 pages"],
            ["Trim", "180 × 240 mm, portrait"],
            ["Plates", "42 full-page, plus 20 spot marks"],
            ["Colour", "Two spot colours plus black throughout"],
            ["Paper", "Munken Print Cream 115 gsm"],
            ["Binding", "Section-sewn, flat-opening. It has to lie open in a field"],
            ["Cover", "Cloth over board, blocked in one colour"],
          ] },
          { t: "table", h: "A sample of the forty-two",
            cols: ["Plate", "Species", "Where it colonises", "Status"],
            rows: [
              ["4", "Buddleja davidii", "Mortar joints, chimney stacks", "Drawn"],
              ["11", "Senecio squalidus", "Rail ballast", "Drawn"],
              ["14", "Chamaenerion angustifolium", "Burnt and cleared ground", "Drawn"],
              ["22", "Epilobium ciliatum", "Cracked concrete, gutters", "In progress"],
              ["31", "Conyza canadensis", "Car parks, kerb margins", "Awaiting specimen"],
            ] },
        ],
        "/accuracy": [
          { t: "prose", h: "On accuracy", p: "Every plate in every guide is checked against herbarium specimens before it goes to press. We have been wrong twice and corrected both in the next printing." },
          { t: "feed", h: "Corrections, all of them", items: [
            { d: "2022", h: "Ruderal, plate 9", p: "Leaf margin drawn entire; it is serrate. Corrected in the second printing. The reader who wrote in is thanked by name in it." },
            { d: "2021", h: "The Margin and the Rail, p. 88", p: "A grid reference transposed by one digit, placing a site in the sea. Corrected, and the map redrawn." },
          ], note: "This page is permanent. Corrections are not quietly folded into a reprint and forgotten." },
          { t: "steps", h: "How a plate gets made", items: [
            { h: "A specimen is found", p: "Living, in the ground it actually grows in, photographed in place before anything is picked." },
            { h: "It is drawn from life and from the sheet", p: "Habit from the living plant, detail from the pressed herbarium sheet. Both are cited on the plate." },
            { h: "A botanist checks it", p: "Dr. Achterberg, with a hand lens, against the sheet. She has rejected eleven plates so far." },
            { h: "It is separated for two spot colours", p: "By hand. Which is why the book costs £24 and not £14." },
          ] },
        ],
        "/stockists": [
          { t: "prose", h: "Where to buy", p: "From us directly, or from any of the shops below, which get the same margin as a chain and are paid in thirty days rather than ninety." },
          { t: "table", h: "Stockists",
            cols: ["Shop", "Town", "Holds"],
            rows: [
              ["Aldworth Books", "Kilnmore", "All titles"],
              ["The Rope Walk", "Waterhead", "All titles"],
              ["Vellinge Natural History", "Vellinge", "Guides only"],
              ["Museum of the Ground", "Northgate", "Guides only"],
            ] },
          { t: "spec", h: "For the trade", rows: [
            ["Discount", "40%, firm sale or sale or return, your choice"],
            ["Minimum order", "Three copies. There is no reason to make it higher"],
            ["Payment", "We pay carriage. You pay in 30 days"],
            ["Returns", "Accepted for two years, in any condition we sent them"],
          ] },
        ],
      },
      gallery: ["Plate 14: Buddleja", "Demolition site", "Herbarium sheet", "Proof spread"],
    },
    refs: ["botanical illustration plate", "urban weed", "ruderal plant", "herbarium specimen"],
  },

  /* ── THE LONG QUIET ─────────────────────────────────────── */
  "THE LONG QUIET": {
    who: "Ivar Solheim", role: "Musician", co: "Longform Records",
    dom: "longform.rec", frame: "shop",
    theme: {
      bg: "#EEF2F5", panel: "#DDE6EC", ink: "#2B3A45", dim: "#6F8593", line: "#C3D2DC",
      brand: "#3E5F78", brand2: "#8B6F4E", link: "#345268", onBrand: "#EEF2F5",
      head: "'Instrument Serif', Georgia, serif",
      body: "Georgia, 'Times New Roman', serif",
      mark: "horizon", markFace: "Georgia, serif",
    },
    greet: "Ivar. Writing from the house, actually.",
    voice: "It was a choice, that winter. Please do not make it look like a punishment.",
    wrap: "It arrived and it is right. I have had the master image up on the wall for two days and the nine crops all still work, which I did not believe was possible when I wrote the brief. Nobody has asked me whether I was alright, which is the exact result I wanted. Invoice the label; four records a year means we are small but we are not slow about paying.",
    site: {
      tagline: "Records made slowly",
      cart: "Basket (0)",
      strap: "Four records a year · Everything stays in print · Mastered for vinyl first",
      foot: "Posted in a box that will actually survive the journey.",
      nav: [["Releases", "/"], ["The Label", "/label"], ["Shop", "/shop"], ["Mailing List", "/list"]],
      pages: {
        "/": [
          { t: "notice", h: "New — The Long Quiet", p: "Nine tracks recorded across one winter in a house with no other people in it. Mixed the following spring, once it was survivable to listen back.", stamp: "LF-012 · Out in October" },
          { t: "products", h: "Releases", items: [
            { name: "The Long Quiet", meta: "LF-012 · 2×LP, gatefold · 74 min", price: "£28", tag: "Pre-order" },
            { name: "Sound of the Ice Going", meta: "LF-009 · LP · 41 min", price: "£22", tag: "In stock" },
            { name: "Vellinge Tapes", meta: "LF-007 · LP + booklet", price: "£24", tag: "Repressing" },
            { name: "Winter Count", meta: "LF-004 · LP · third pressing", price: "£22", tag: "In stock" },
          ], note: "Digital is included free with every physical order, sent the moment you order rather than on release day." },
          { t: "spec", h: "The Long Quiet — pressing details", rows: [
            ["Format", "2×LP, 45 rpm, 180 g"],
            ["Sleeve", "Gatefold, uncoated board, no lamination"],
            ["Runtime", "74 minutes across four sides"],
            ["Mastered by", "Cut for vinyl first, then folded down for digital"],
            ["Pressing", "1,200. There will be a second if it sells out"],
            ["Artwork", "One continuous image across the gatefold, cropped nine ways for the tracks"],
          ] },
        ],
        "/label": [
          { t: "prose", h: "The label", p: "We put out four records a year. Everything is mastered for vinyl first and everything stays in print." },
          { t: "stats", items: [
            { n: "4", l: "Records a year" },
            { n: "12", l: "Releases so far" },
            { n: "0", l: "Deleted from the catalogue" },
            { n: "50/50", l: "Split with the artist, after costs" },
          ] },
          { t: "spec", h: "What an artist gets", rows: [
            ["Split", "50/50 after recouped manufacturing. No other deductions"],
            ["Rights", "Artist keeps the masters. Always. It is in every contract"],
            ["Term", "Licence for five years, renewable by the artist alone"],
            ["Accounting", "Twice a year, itemised, with the manufacturing invoices attached"],
            ["Art direction", "The artist's, or someone the artist chooses. Never ours by default"],
          ] },
        ],
        "/shop": [
          { t: "prose", h: "Direct from us", p: "Posted in a box that will actually survive the journey — a proper record mailer with corner protection, not a padded envelope with a prayer." },
          { t: "table", h: "Postage",
            cols: ["Destination", "1 record", "2–4", "Time"],
            rows: [
              ["Domestic", "£4.50", "£6.00", "2–4 days"],
              ["Europe", "£11.00", "£16.00", "5–12 days"],
              ["Rest of world", "£19.00", "£27.00", "10–28 days"],
              ["Digital only", "Free", "Free", "Immediate"],
            ] },
          { t: "faq", h: "Asked often", items: [
            { q: "What if it arrives warped or seam-split?", a: "We send another and you keep the first. We do not ask for a photograph and we do not ask you to post it back." },
            { q: "Will this be repressed?", a: "If it sells out, yes. Nothing here has ever been made deliberately scarce." },
            { q: "Do you do test pressings?", a: "Ten per release. Five to the artist, three to us, two sold at cost to the mailing list by ballot." },
          ] },
        ],
        "/list": [
          { t: "prose", h: "The mailing list", p: "One email per release. Four a year. It has never been more than four a year and it never will be." },
          { t: "spec", h: "What you get", rows: [
            ["Frequency", "Four times a year, on release"],
            ["Early access", "48 hours before public, on limited pressings"],
            ["Test pressings", "Ballot, at cost, two per release"],
            ["Unsubscribe", "One click, and the address is deleted rather than suppressed"],
            ["Sharing", "Never, with anyone, for any amount of money"],
          ] },
        ],
      },
      gallery: ["Cover study", "The house", "Tape reel", "Gatefold proof"],
    },
    refs: ["winter field", "frozen lake at dusk", "single light in darkness", "snow texture"],
  },

  /* ── MARGIN NOTES ───────────────────────────────────────── */
  "MARGIN NOTES": {
    who: "Dr. Rosalind Feld", role: "Commissioning Editor", co: "Aldworth Academic",
    dom: "aldworth.press", frame: "civic",
    theme: {
      bg: "#FDFCF9", panel: "#F1EEE6", ink: "#1F1C16", dim: "#6A6559", line: "#D5D0C2",
      brand: "#5C2C2C", brand2: "#A08A4E", link: "#5C2C2C", onBrand: "#FDFCF9",
      head: "'Instrument Serif', Georgia, serif",
      body: "Georgia, 'Times New Roman', serif",
      mark: "counter", markFace: "Georgia, serif",
    },
    greet: "Dr. Feld, commissioning.",
    voice: "Nine hundred pages. Give the drifting reader a reason to continue.",
    wrap: "The marginalia arrived complete and I have read the book again with them in place, which took a week and was the first time I have enjoyed it. The author, who is not an easy man, wrote to say they were the only good decision the press has made. Invoice via the finance office; they are slow and I will make a nuisance of myself on your behalf.",
    site: {
      tagline: "Scholarly publishing since 1908",
      crestNote: "Founded 1908 · Independent",
      foot: "Our backlist is not held hostage behind a platform.",
      side: [
        { h: "Rights", p: "Translation and territorial rights handled in-house. We answer within ten working days." },
        { h: "Standing orders", p: "Consortium pricing available to any library group of four or more." },
      ],
      nav: [["Catalogue", "/"], ["For Authors", "/authors"], ["Library Sales", "/libraries"], ["The Press", "/press"]],
      pages: {
        "/": [
          { t: "notice", h: "Autumn list", p: "A nine-hundred-page legal history of enclosure, the first full treatment in forty years, and almost certainly the last.", stamp: "November · £95 cloth · £34 paper" },
          { t: "table", h: "Forthcoming",
            cols: ["Title", "Field", "Extent", "Price"],
            rows: [
              ["Common Ground: Enclosure in Law, 1235–1914", "Legal history", "904 pp", "£95 / £34"],
              ["The Assize of Bread", "Economic history", "312 pp", "£70 / £26"],
              ["Marginalia and the Reading Self", "Book history", "268 pp", "£65 / £24"],
              ["A Grammar of the Court Roll", "Palaeography", "196 pp", "£58 / £22"],
            ] },
          { t: "prose", h: "What we publish", p: "Legal, economic and book history, at length, for readers who will use the index. We have never published a trade title and we are not going to start." },
        ],
        "/authors": [
          { t: "prose", h: "For authors", p: "We copy-edit properly, we index properly, and we keep books in print for the life of the scholarship." },
          { t: "steps", h: "From typescript to shelf", items: [
            { h: "Proposal read by a person, in three weeks", p: "Not a form. A reader's report of at least a page, whether we take it or not." },
            { h: "Peer review, two readers, named to you if they agree", p: "Anonymous to the world, not to you, unless a reader asks otherwise." },
            { h: "Copy-editing by a human being", p: "Line by line. Fourteen months from delivery to publication is our average and we will tell you if we are slipping." },
            { h: "Indexed by a professional indexer", p: "Paid by us, not by you. An index made by software is not an index." },
          ] },
          { t: "spec", h: "Terms", rows: [
            ["Royalty", "10% of net receipts, cloth and paper alike"],
            ["Advance", "None. We are honest that we cannot afford one"],
            ["Rights", "Author retains copyright. We take a licence"],
            ["Open access", "Chapter deposit permitted at once. Full text after 24 months"],
            ["In print", "For the life of the scholarship, which we mean literally"],
            ["Author copies", "Twelve, and more at cost, for as long as it is in print"],
          ] },
        ],
        "/libraries": [
          { t: "prose", h: "Library sales", p: "Standing orders and consortium pricing available. Our backlist is not held hostage behind a platform." },
          { t: "table", h: "Institutional pricing",
            cols: ["", "Single title", "Standing order", "Consortium, 4+"],
            rows: [
              ["Cloth", "£95", "£72", "£64"],
              ["Digital, perpetual", "£95", "£72", "£58"],
              ["Digital, annual", "Not sold", "Not sold", "Not sold"],
              ["Backlist bundle", "—", "£1,840", "£1,410"],
            ], note: "We do not sell annual digital licences. A library that buys a book should own the book." },
          { t: "spec", h: "Digital terms", rows: [
            ["Format", "PDF and EPUB, no encryption of any kind"],
            ["Concurrency", "Unlimited. A book does not run out"],
            ["Interlibrary loan", "Permitted, without asking us"],
            ["Preservation", "Deposited with two dark archives at our expense"],
            ["Price rises", "Announced twelve months ahead, published on this page"],
          ] },
        ],
        "/press": [
          { t: "prose", h: "The press", p: "Independent since 1908, which in practice means nine people, a warehouse we share, and a list nobody else would take on." },
          { t: "stats", items: [
            { n: "1908", l: "Founded" },
            { n: "9", l: "Staff" },
            { n: "2,140", l: "Titles in print" },
            { n: "0", l: "Titles ever pulped" },
          ] },
          { t: "feed", h: "Notes", items: [
            { d: "This year", h: "Backlist digitisation complete", p: "Every title since 1908 is now available as an unencrypted PDF at the same price as the printed book." },
            { d: "Last year", h: "We turned down an acquisition", p: "Twice. The second offer was better and it was refused faster." },
            { d: "2019", h: "Reprint threshold lowered to eleven copies", p: "Short-run digital means a book stays in print at a demand that used to mean deletion." },
            { d: "1908", h: "Founded to print one book", p: "A concordance nobody else would set. It is still in print and it still sells nine copies a year." },
          ] },
        ],
      },
      gallery: ["Marginalia study", "Reading room", "Annotated proof", "Spine detail"],
    },
    refs: ["marginalia", "law library shelves", "annotated manuscript page", "book spine detail"],
  },

  /* ── THE UNDERSTUDY ─────────────────────────────────────── */
  "THE UNDERSTUDY": {
    who: "Nia Broussard", role: "Production Designer", co: "Paper Lantern Animation",
    dom: "paperlantern.studio", frame: "studio",
    theme: {
      bg: "#FAF4EC", panel: "#EFE3D4", ink: "#2C1F18", dim: "#84695A", line: "#DCC9B4",
      brand: "#B03A44", brand2: "#E8C77A", link: "#8E2C36", onBrand: "#FAF4EC",
      head: "'Instrument Serif', Georgia, serif",
      body: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      mark: "crest", markText: "P", markFace: "Georgia, serif",
    },
    greet: "Nia here — production design.",
    voice: "Built to be overlooked — then impossible to look away from. Both. At once.",
    wrap: "The sheets are in and I have had them up in the corridor where forty people walk past them every morning. Three of them stopped. That is the test and it passed. The turnaround holds at 8% of frame height, which I measured before I let myself be pleased. Invoice production — we pay in fourteen days, and if we do not, tell me directly.",
    site: {
      tagline: "Hand-built animation",
      foot: "A converted print works with bad heating and very good light.",
      nav: [["Work", "/"], ["Process", "/process"], ["The Studio", "/studio"], ["Contact", "/contact"]],
      pages: {
        "/": [
          { t: "prose", h: "In production", p: "A feature about a stage double who waits eleven years to go on, and what she does with the waiting." },
          { t: "gallery", h: "From the film", caps: ["Character study", "Stage wings", "Colour script", "Turnaround sheet"] },
          { t: "table", h: "Previously",
            cols: ["Year", "Title", "Length", "Made for"],
            rows: [
              ["2023", "The Wire and the Weight", "14 min", "Broadcast, commissioned"],
              ["2021", "Half a Bell", "9 min", "Self-funded"],
              ["2019", "Understudies", "6 min", "The short this feature grew out of"],
            ] },
        ],
        "/process": [
          { t: "prose", h: "Paper first", p: "Designs are drawn on paper before anything is scanned. Forty people will draw this character; she has to survive all forty hands." },
          { t: "steps", h: "How a character gets built", items: [
            { h: "Silhouette, at thumb size", p: "Before a face, before a costume. If it does not read at 8% of frame height it does not go further." },
            { h: "Turnaround, eight views", p: "Drawn by hand, then cleaned. Every animator works from the same eight." },
            { h: "Expression sheet, twenty-four", p: "Including the four nobody will use, because they define the edges of what she can do." },
            { h: "Tested by three animators who have not seen the notes", p: "If they draw three different people, the sheet is wrong, not the animators." },
          ] },
          { t: "spec", h: "Studio standards", rows: [
            ["Paper", "Drawn at A4, 12 field, peg-registered"],
            ["Line", "Scanned at 1200 dpi, cleaned but not smoothed"],
            ["Frame rate", "Animated on twos, on ones for anything that has weight"],
            ["Colour", "Scripted per sequence before a single frame is coloured"],
            ["Model sheets", "One per character, printed and pinned. Not a file on a server"],
          ] },
        ],
        "/studio": [
          { t: "prose", h: "The studio", p: "A converted print works with bad heating and very good light. Nineteen people, one enormous table." },
          { t: "stats", items: [
            { n: "19", l: "People" },
            { n: "1", l: "Table" },
            { n: "40", l: "Hands on the feature at peak" },
            { n: "11 m", l: "Of north-facing window" },
          ] },
          { t: "people", h: "Department heads", items: [
            { n: "Nia Broussard", r: "Production Design", p: "Draws every character before anybody else is allowed to." },
            { n: "Tomas Wend", r: "Animation Director", p: "Twenty years on twos. Will fight you about ones." },
            { n: "Ayo Sanderson", r: "Colour", p: "Writes the colour script for a sequence before storyboards are locked, which everyone says is backwards." },
          ] },
        ],
        "/contact": [
          { t: "contact", h: "Get in touch", lines: ["Paper Lantern Animation", "The Old Print Works, Rope Walk"],
            note: "We take on two outside jobs a year, chosen badly and on instinct, and we say no to everything else politely and quickly." },
        ],
      },
      gallery: ["Character study", "Stage wings", "Colour script", "Turnaround sheet"],
    },
    refs: ["theatre wings backstage", "character turnaround sheet", "stage curtain", "understudy waiting"],
  },

  /* ── SALVAGE CREW ───────────────────────────────────────── */
  "SALVAGE CREW": {
    who: "Kit Ferreira", role: "Creative Director", co: "Deadlight Interactive",
    dom: "deadlight.games", frame: "terminal",
    theme: {
      bg: "#101315", panel: "#181C1F", ink: "#D8DEE2", dim: "#7C878E", line: "#282E33",
      brand: "#D96B2B", brand2: "#5FB8C4", link: "#5FB8C4", onBrand: "#101315",
      head: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      body: "'Courier New', Courier, monospace",
      mono: "'Courier New', Courier, monospace",
      mark: "grid", markFace: "Arial, sans-serif",
    },
    greet: "Kit, creative direction. Short version:",
    voice: "Four players, one dark corridor, thirty frames a second. Difference is the job.",
    wrap: "Delivered, imported, and playtested the same night with four people who had not seen the designs. All four could name who was who inside two seconds in a corridor lit by one failing lamp. That has never happened with a cast of four. Invoice us — thirty days on paper, usually about nine in practice.",
    site: {
      tagline: "Co-op games about shared consequences",
      foot: "We publish what breaks.",
      nav: [["Games", "/"], ["Devlog", "/devlog"], ["Accessibility", "/access"], ["Press Kit", "/press"]],
      pages: {
        "/": [
          { t: "lede", p: "Four players, one oxygen supply, a derelict hauler and a schedule. Everything you spend, you spend together." },
          { t: "spec", h: "Salvage Crew", rows: [
            ["Players", "Four, online or same-couch, no solo mode"],
            ["Session", "35–50 minutes per run"],
            ["Oxygen", "One shared pool. There is no personal reserve and there never will be"],
            ["Death", "Permanent within a run. The other three keep going, harder"],
            ["Voice", "Proximity-based, degrades with hull distance"],
            ["Platforms", "PC, and consoles at launch rather than a year after"],
          ] },
          { t: "stats", items: [
            { n: "4", l: "Players, always" },
            { n: "1", l: "Oxygen supply" },
            { n: "30 fps", l: "The floor we design to, not the ceiling" },
            { n: "0", l: "Mechanics that depend on colour alone" },
          ] },
          { t: "gallery", h: "From the build", caps: ["Crew silhouettes", "Corridor lighting", "Oxygen gauge", "Suit detail"] },
        ],
        "/devlog": [
          { t: "prose", h: "We publish what breaks", p: "Twice-monthly, unedited, including the parts where the design was wrong for six weeks." },
          { t: "feed", h: "Recent entries", items: [
            { d: "#48", h: "The oxygen pool was wrong for six weeks", p: "We gave each player a small personal reserve to reduce frustration. It removed the entire game. Reverted, and the frustration turned out to be the point." },
            { d: "#47", h: "Proximity voice, second attempt", p: "First version degraded by raw distance and felt broken. Now it degrades by hull path length, so a wall matters. Much better, much more expensive." },
            { d: "#46", h: "Silhouette pass", p: "Four crew, one skeleton, distinguishable at 5% opacity black on black. Comparison sheet in the post. Two of them still are not there." },
            { d: "#45", h: "We cut the map", p: "Players stopped looking at the corridor. Removing it made the game frightening again and made three systems unnecessary." },
          ] },
        ],
        "/access": [
          { t: "notice", h: "No mechanic may depend on colour alone", p: "This has been true since our first build and it is not negotiable. Where colour carries meaning it is doubled by shape, position or sound, every time.", stamp: "Policy, not a feature" },
          { t: "spec", h: "In the build today", rows: [
            ["Colour", "Never load-bearing. Doubled by shape and audio throughout"],
            ["Subtitles", "On by default, resizable, with speaker names and direction"],
            ["Audio cues", "Every visual alarm has a distinct sound with its own frequency band"],
            ["Remapping", "Every input, including held versus tapped"],
            ["Motion", "Camera shake, head bob and vignette all independently disableable"],
            ["Text", "Minimum 24 px at 1080p. No text over moving imagery"],
            ["Timing", "No quick-time events anywhere in the game"],
          ] },
          { t: "prose", h: "What we have not done yet", p: "Full screen-reader support in menus is not finished. It is scheduled for the next milestone and it is late. We would rather say that than leave it off the list." },
        ],
        "/press": [
          { t: "downloads", h: "Press kit", items: [
            { kind: "ZIP", name: "Screenshots, 4K, no HUD and with HUD", size: "146 MB" },
            { kind: "PDF", name: "Fact sheet", size: "320 KB" },
            { kind: "ZIP", name: "Logos and crew art, SVG and PNG", size: "8.4 MB" },
            { kind: "MP4", name: "Gameplay, 4 min, unedited single run", size: "94 MB" },
          ], note: "Review keys to anyone who asks, including streamers with eleven followers. No embargo, no conditions, no takedowns." },
          { t: "contact", h: "Ask us anything", lines: ["Deadlight Interactive"],
            note: "Kit answers press mail personally, badly, and within two days." },
        ],
      },
      gallery: ["Crew silhouettes", "Corridor lighting", "Oxygen gauge", "Suit detail"],
    },
    refs: ["salvage suit", "dark spacecraft corridor", "oxygen gauge", "industrial helmet"],
  },

  /* ── THE GOOD NEIGHBOUR ─────────────────────────────────── */
  "THE GOOD NEIGHBOUR": {
    who: "Margit Halloran", role: "Showrunner", co: "Tallgrass Children's",
    dom: "tallgrass.tv", frame: "studio",
    theme: {
      bg: "#FFF8E9", panel: "#FBEBCB", ink: "#3A2413", dim: "#8A6C48", line: "#E8D3AC",
      brand: "#E87B34", brand2: "#4E7C4A", link: "#B85A1E", onBrand: "#FFF8E9",
      head: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      body: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      mark: "disc", markText: "TG", markFace: "Arial, sans-serif",
    },
    greet: "Margit Halloran, Tallgrass. Hello!",
    voice: "A five-year-old should see a friend. Their parent should see the worry.",
    wrap: "We tested it the way we test everything, which is on eleven actual children in an actual room. Nine went straight to it. One asked if it was sad, which is exactly the layer we wanted underneath and exactly the layer a five-year-old should only half-notice. Invoice us; we are commissioned and funded, so it will be paid on time for once.",
    site: {
      tagline: "Television for small people",
      foot: "Nineteen years, and we still test every episode on actual children.",
      nav: [["Shows", "/"], ["For Parents", "/parents"], ["How We Make It", "/making"], ["About Us", "/about"]],
      pages: {
        "/": [
          { t: "notice", h: "New series — The Good Neighbour", p: "A creature eleven feet tall moves in next door and spends the entire first season trying very hard not to break anything.", stamp: "26 episodes · 11 minutes each" },
          { t: "gallery", h: "From the show", caps: ["Scale chart", "Cottage doorway", "Expression sheet", "Colour key"] },
          { t: "table", h: "Our shows",
            cols: ["Series", "Ages", "Episodes", "Status"],
            rows: [
              ["The Good Neighbour", "3–6", "26 × 11 min", "In production"],
              ["Bramble Lane", "4–7", "52 × 11 min", "Four series, complete"],
              ["Small Hours", "2–4", "40 × 7 min", "Complete"],
              ["The Quiet Field", "5–8", "26 × 11 min", "Complete"],
            ] },
        ],
        "/parents": [
          { t: "prose", h: "For parents", p: "No jump scares, no sudden volume, no cliffhangers before bedtime. Episodes run eleven minutes and end where they say they will." },
          { t: "spec", h: "What we guarantee", rows: [
            ["Volume", "Loudness normalised across every episode. No sudden peaks, ever"],
            ["Jump scares", "None. Not a single one in nineteen years"],
            ["Cliffhangers", "Never. Every episode resolves before the credits"],
            ["Length", "Eleven minutes, so it can be one episode and then bed"],
            ["Advertising", "None on our own player, ever"],
            ["Flashing", "Nothing above 3 Hz. Independently tested per episode"],
          ] },
          { t: "faq", h: "What parents ask", items: [
            { q: "Is it frightening?", a: "The creature is enormous and that is the point. It is never threatening, it is never angry, and it is frightened more often than the children are." },
            { q: "Is there a difficult episode?", a: "Episode 19 is about something breaking and not being fixable. There is a note for parents on the episode page, in advance, not after." },
            { q: "Can we watch out of order?", a: "Yes. Every episode stands alone by design, because that is how children actually watch." },
          ] },
        ],
        "/making": [
          { t: "steps", h: "How an episode is made", items: [
            { h: "Written by someone who has read it to a child", p: "Out loud. If it does not hold for eleven minutes read aloud, it does not go to board." },
            { h: "Boarded and animatic'd", p: "Timed to the second. Eleven minutes means eleven minutes." },
            { h: "Tested on actual children", p: "Eleven of them, in a room, with a person watching their faces rather than a questionnaire." },
            { h: "Recut, usually", p: "About a third of episodes lose a scene at this stage. Nobody argues about it any more." },
          ] },
          { t: "prose", h: "Two audiences at once", p: "A five-year-old should see a friend. Their parent, sitting on the arm of the sofa half-watching, should see the worry underneath. Neither should have to explain it to the other." },
        ],
        "/about": [
          { t: "prose", h: "About us", p: "We have made children's television for nineteen years and we still test every episode on actual children before it airs." },
          { t: "stats", items: [
            { n: "19", l: "Years" },
            { n: "144", l: "Episodes made" },
            { n: "11", l: "Children in every test screening" },
            { n: "0", l: "Jump scares" },
          ] },
          { t: "contact", h: "Contact", lines: ["Tallgrass Children's", "Studio 2, The Maltings"] },
        ],
      },
      gallery: ["Scale chart", "Cottage doorway", "Expression sheet", "Colour key"],
    },
    refs: ["large gentle creature", "cottage doorway", "children's book illustration", "oversized character"],
  },

  /* ── COLD OPEN ──────────────────────────────────────────── */
  "COLD OPEN": {
    who: "Aurélie Bonnet", role: "Series Producer", co: "Northlight Documentary",
    dom: "northlight.doc", frame: "saas",
    theme: {
      bg: "#F5F7F9", panel: "#E6ECF1", ink: "#1C2730", dim: "#5F7180", line: "#CBD7E0",
      brand: "#2E5F7E", brand2: "#C4553A", link: "#2E5F7E", onBrand: "#FFFFFF",
      head: "'Instrument Serif', Georgia, serif",
      body: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      mark: "wave", markFace: "Arial, sans-serif",
    },
    greet: "Aurélie Bonnet, series producer.",
    voice: "Sixteen seconds before anybody speaks. Earn the dread with paper.",
    wrap: "The sequence came in and we ran it muted for the commissioner, which is how they always watch things and which nobody ever designs for. It worked muted. It worked better muted. Sixteen seconds and nobody in the room spoke over it. Invoice the production company — we pay on receipt because I have never understood why anyone does otherwise.",
    site: {
      tagline: "Documentary, long form",
      navCta: "Watch",
      foot: "Founded 2011. Fourteen series.",
      hero: {
        h: "Forecast",
        p: "Six parts on weather prediction before satellites — the ships, the balloons, the men who drew isobars by hand and were sometimes catastrophically wrong.",
        cta: "Watch the trailer", cta2: "Press pack",
        foot: "Six parts, 58 minutes each. Broadcast in the autumn.",
      },
      nav: [["Series", "/"], ["In Development", "/development"], ["The Company", "/company"], ["Contact", "/contact"]],
      pages: {
        "/": [
          { t: "table", h: "Series",
            cols: ["Year", "Title", "Parts", "Subject"],
            rows: [
              ["—", "Forecast", "6 × 58 min", "Weather prediction before satellites"],
              ["2023", "The Cable", "4 × 58 min", "The first undersea telegraph"],
              ["2021", "Standing Room", "6 × 48 min", "The last decade of the music hall"],
              ["2019", "Deadweight", "3 × 58 min", "Shipbreaking"],
            ] },
          { t: "prose", h: "How we work", p: "Archive first, interviews last. If the material cannot carry a sequence without a talking head explaining it, the sequence is not ready." },
          { t: "gallery", h: "From Forecast", caps: ["Isobar chart, 1953", "Weather ship", "Balloon launch", "Log book"] },
        ],
        "/development": [
          { t: "prose", h: "In development", p: "Two further series, one on undersea cable, one on the last decade of analogue broadcast." },
          { t: "spec", h: "Forecast — the cold open", rows: [
            ["Length", "16 seconds before the first word"],
            ["Material", "Barometric charts, ship logs, hand-drawn isobars. All real, all archive"],
            ["3D", "None. Everything must feel printed"],
            ["Sound", "Works muted. Commissioners watch muted"],
            ["Type", "Appears once and stays. No animated captions"],
            ["Grade", "Paper white, not screen white. It should look photographed"],
          ] },
          { t: "feed", h: "Where the archive came from", items: [
            { d: "Met Office", h: "1,400 hand-drawn synoptic charts, 1861–1961", p: "Digitised at 600 dpi by us, at our cost, and given back to them as a condition of access." },
            { d: "Trinity House", h: "Nineteen weather ship log books", p: "Including the one from the ship that was lost, which is the spine of episode four." },
            { d: "Private", h: "Family photographs, eleven households", p: "Traced through a newspaper appeal. Every family has seen the episode before broadcast." },
          ] },
        ],
        "/company": [
          { t: "prose", h: "The company", p: "Founded 2011. Fourteen series, three of them commissioned before a frame was shot." },
          { t: "stats", items: [
            { n: "2011", l: "Founded" },
            { n: "14", l: "Series delivered" },
            { n: "58 min", l: "Our only running time" },
            { n: "3", l: "Commissioned before shooting" },
          ] },
          { t: "spec", h: "How we make them", rows: [
            ["Running time", "58 minutes. We have never made a 48"],
            ["Archive", "Cleared in perpetuity, worldwide, before a cut is locked"],
            ["Contributors", "See their sequence before broadcast. Always"],
            ["Reconstruction", "Never. If we do not have the material we do not tell that part"],
            ["Narration", "Sparingly, and never over something the picture already says"],
          ] },
        ],
        "/contact": [
          { t: "contact", h: "Contact", lines: ["Northlight Documentary", "Third floor, Verrick Works"],
            note: "Commissioning enquiries and archive requests both come to the same address and get read by the same two people." },
        ],
      },
      gallery: ["Isobar chart, 1953", "Weather ship", "Balloon launch", "Log book"],
    },
    refs: ["hand drawn isobar chart", "weather ship log", "weather balloon launch", "barometer"],
  },

  /* ── HANDOFF ────────────────────────────────────────────── */
  "HANDOFF": {
    who: "Devon Achebe", role: "Head of Brand", co: "Clearing House",
    dom: "clearinghouse.co", frame: "saas",
    theme: {
      bg: "#FFFFFF", panel: "#F1F4F7", ink: "#111820", ok: "#2E7D5B", dim: "#5C6B7A", line: "#DCE3EA",
      brand: "#1E4FD8", brand2: "#0D1B2E", link: "#1E4FD8", onBrand: "#FFFFFF",
      head: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      body: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      mono: "'Courier New', monospace",
      mark: "stack", markFace: "Arial, sans-serif",
    },
    greet: "Devon, brand side. Warning: this brief is dull on purpose.",
    voice: "Ninety seconds on settlement timing, to people who do not care. Good luck.",
    wrap: "Delivered, and it renders as Lottie at the file size we needed, which I had privately assumed was not possible. We put it in front of nine people who do not work in payments and seven of them could explain settlement timing afterwards. Baseline was one. Invoice through the portal — net 30, and it actually pays on day 30, which is the only thing our finance team is good at.",
    site: {
      tagline: "Payments infrastructure, explained",
      navCta: "Dashboard",
      foot: "Founded in Leeds. Still in Leeds.",
      hero: {
        h: "Money does not move when the screen says it moved.",
        p: "We tell you what actually happened, when it actually happened, and what it costs to make it faster.",
        cta: "Get sandbox keys", cta2: "Read the docs",
        foot: "Keys issued instantly. No call from anybody in sales.",
      },
      nav: [["Product", "/"], ["Settlement", "/settlement"], ["Developers", "/developers"], ["Pricing", "/pricing"], ["Company", "/company"]],
      pages: {
        "/": [
          { t: "prose", h: "Settlement, plainly", p: "Every other provider shows you a green tick when the message is accepted. We show you the green tick when the money is in the account, and we show you the message acceptance separately, because they are different events and pretending otherwise is how people get hurt." },
          { t: "stats", items: [
            { n: "T+0", l: "Domestic, if you pay for it" },
            { n: "T+2", l: "Domestic, if you do not" },
            { n: "99.98%", l: "Uptime, twelve-month trailing" },
            { n: "0", l: "Enterprise tiers that exist to start a conversation" },
          ] },
          { t: "gallery", h: "The product", caps: ["Settlement flow", "Dashboard", "API console", "Office, Leeds"] },
        ],
        "/settlement": [
          { t: "table", h: "What actually happens, and when", sub: "The whole product in one table. Everything else on this site is commentary.",
            cols: ["Stage", "What it means", "Typical", "Reversible?"],
            rows: [
              ["Authorised", "The bank agreed it could happen", "< 1 sec", "Yes"],
              ["Accepted", "The message was taken by the scheme", "1–4 sec", "Yes"],
              ["Cleared", "Both banks agree the amount", "2 hr – 1 day", "Rarely"],
              ["Settled", "The money is in the account", "T+0 to T+2", "No"],
              ["Reconciled", "Your ledger and ours agree", "Nightly", "No"],
            ], note: "The word most providers show you at step two is 'Paid'. It is not paid at step two." },
          { t: "spec", h: "What it costs to be faster", rows: [
            ["T+2, batched overnight", "Included. This is the default"],
            ["T+1", "+0.05% of volume"],
            ["T+0, same-day windows", "+0.14% of volume, four windows a day"],
            ["Instant, scheme rails", "£0.22 per transaction, capped at £250"],
            ["Weekend settlement", "Not available on any tier. The rails are shut. We will not pretend otherwise"],
          ] },
          { t: "faq", h: "The questions people are embarrassed to ask", items: [
            { q: "Why did my dashboard say paid and the money is not there?", a: "Because it said accepted and you read paid. That is our fault for how it was worded and it is what this whole page exists to fix." },
            { q: "Can settlement fail after it is cleared?", a: "Almost never, and when it does it is a recall, not a failure. Recalls are shown as their own event with the reason code in plain English." },
            { q: "Why is weekend settlement impossible?", a: "The underlying rails do not run. Anyone who tells you they settle on a Sunday is fronting the money themselves and charging you for it." },
          ] },
        ],
        "/developers": [
          { t: "prose", h: "For developers", p: "One API, versioned honestly, deprecated slowly. Sandbox keys issued instantly with no call from anybody in sales." },
          { t: "table", h: "The API",
            cols: ["Method", "Path", "Does"],
            rows: [
              ["POST", "/v2/payments", "Create a payment"],
              ["GET", "/v2/payments/:id", "Full event history, every stage above, timestamped"],
              ["GET", "/v2/settlements", "What actually landed, by day"],
              ["POST", "/v2/webhooks", "Subscribe to stage transitions"],
              ["GET", "/v2/reconciliation/:date", "Our ledger, as a file, to diff against yours"],
            ] },
          { t: "spec", h: "Our promises about the API", rows: [
            ["Versioning", "Dated versions. v2 is pinned per account, never silently upgraded"],
            ["Deprecation", "Eighteen months' notice, minimum. v1 is still up"],
            ["Breaking changes", "Never inside a version. Not once since 2019"],
            ["Sandbox", "Identical to production, including the failure modes"],
            ["Rate limits", "Published, per endpoint, on this page"],
            ["Status", "status.clearinghouse.co, with incident write-ups that name what we broke"],
          ] },
          { t: "downloads", h: "Libraries", items: [
            { kind: "JSON", name: "OpenAPI 3.1 specification", size: "412 KB" },
            { kind: "LIB", name: "clearinghouse-node", size: "npm" },
            { kind: "LIB", name: "clearinghouse-python", size: "pypi" },
            { kind: "PDF", name: "Settlement timing, the long version", size: "1.8 MB" },
          ] },
        ],
        "/pricing": [
          { t: "notice", h: "Published in full on this page", p: "No enterprise tier that exists only to start a conversation. If your volume is large the percentage below goes down on a published curve, which is also on this page.", stamp: "Last changed 14 months ago" },
          { t: "pricing", h: "Pricing", tiers: [
            { name: "Standard", price: "1.2% + 12p", note: "Everything, from the first transaction", feats: ["T+2 settlement", "Full event API", "Sandbox", "Email support"] },
            { name: "Volume", price: "0.9% + 10p", pick: "Above £100k/mo", note: "Applied automatically", feats: ["Everything in Standard", "T+1 included", "Named support contact", "Reconciliation files"] },
            { name: "Scale", price: "0.6% + 8p", note: "Above £2m/mo", feats: ["Everything in Volume", "T+0 windows included", "Direct scheme reporting", "Quarterly review, optional"] },
          ], note: "Tiers apply automatically on volume. Nobody has to negotiate and nobody gets a better price for being difficult." },
        ],
        "/company": [
          { t: "prose", h: "The company", p: "Payments infrastructure, built in Leeds, by people who mostly came from banks and did not enjoy it." },
          { t: "stats", items: [
            { n: "2016", l: "Founded" },
            { n: "84", l: "People" },
            { n: "1", l: "Office" },
            { n: "18 mo", l: "Minimum deprecation notice" },
          ] },
          { t: "contact", h: "Contact", lines: ["Clearing House", "2 Kirkgate, Leeds"] },
        ],
      },
      gallery: ["Settlement flow", "Dashboard", "API console", "Office, Leeds"],
    },
    refs: ["payment flow diagram", "bank transfer illustration", "settlement timeline", "financial dashboard"],
  },

  /* ── STANDING WAVE ──────────────────────────────────────── */
  "STANDING WAVE": {
    who: "Yuki Tanabe", role: "Composer", co: "Standing Wave Ensemble",
    dom: "standingwave.live", frame: "terminal",
    theme: {
      bg: "#0C0D12", panel: "#14161E", ink: "#DCD9E8", dim: "#7E7A94", line: "#232636",
      brand: "#8B7FE8", brand2: "#57E0FF", link: "#57E0FF", onBrand: "#0C0D12",
      head: "'Instrument Serif', Georgia, serif",
      body: "'Helvetica Neue', Arial, sans-serif",
      mono: "'VT323', monospace",
      mark: "orbit", markFace: "Georgia, serif",
    },
    greet: "Tanabe. Forgive the length of this.",
    voice: "Forty minutes, no cuts, no beat to lock to. It must never visibly loop.",
    wrap: "We ran it in the hall for the full forty minutes on the laptop that will actually be used, which is four years old and has a fan problem. It held sixty frames and it never repeated itself in a way anyone could point to. One of the players cried, which he will deny. Invoice the ensemble — we are a registered association and it takes about three weeks, which I am sorry about.",
    site: {
      tagline: "Long-form drone, performed live",
      foot: "Six players. Three works. One hundred and forty performances.",
      nav: [["Performances", "/"], ["The Ensemble", "/ensemble"], ["Recordings", "/recordings"], ["Book Us", "/book"]],
      pages: {
        "/": [
          { t: "notice", h: "Next performance", p: "A single forty-minute piece for six players and sustained electronics. No interval. Latecomers are not admitted, kindly.", stamp: "Doors 19:30 · Begins 20:00 exactly" },
          { t: "table", h: "This season",
            cols: ["Date", "Venue", "Work", "Tickets"],
            rows: [
              ["14 May", "Kilnmore Assembly Hall", "Standing Wave I", "£18 / £9"],
              ["02 June", "The Maltings", "Standing Wave III", "£18 / £9"],
              ["19 June", "Vellinge Kirke", "Standing Wave I", "Sold out"],
              ["11 July", "Northgate Reservoir", "Standing Wave II", "£22"],
            ] },
          { t: "spec", h: "What to expect", rows: [
            ["Length", "40 minutes, continuous"],
            ["Interval", "None"],
            ["Latecomers", "Not admitted. The piece does not survive a door opening"],
            ["Seating", "Unreserved. Sitting on the floor is permitted and encouraged"],
            ["Volume", "Loud but not painful. Peaks at 96 dB, sustained around 82"],
            ["Lighting", "Very low, with haze. Nothing strobes at any point"],
          ] },
        ],
        "/ensemble": [
          { t: "prose", h: "The ensemble", p: "Six players, formed 2016. We perform three works. We have performed them one hundred and forty times." },
          { t: "stats", items: [
            { n: "6", l: "Players" },
            { n: "3", l: "Works, total" },
            { n: "140", l: "Performances" },
            { n: "40 min", l: "Every time" },
          ] },
          { t: "prose", h: "Why only three", p: "Because a forty-minute sustained piece takes about thirty performances before the ensemble stops playing it and starts inhabiting it. A fourth work would mean playing all four badly." },
        ],
        "/recordings": [
          { t: "prose", h: "Recordings", p: "Available as continuous files only. The pieces do not survive being split into tracks." },
          { t: "downloads", h: "Available", items: [
            { kind: "FLAC", name: "Standing Wave I — Kilnmore, live, single file", size: "1.4 GB" },
            { kind: "FLAC", name: "Standing Wave II — studio, single file", size: "1.2 GB" },
            { kind: "WAV", name: "Standing Wave III — Vellinge Kirke, live", size: "2.1 GB" },
            { kind: "PDF", name: "Score fragment and performance notes", size: "6.8 MB" },
          ], note: "No streaming platform will take a single forty-minute file without splitting it, so we sell them here and nowhere else." },
        ],
        "/book": [
          { t: "prose", h: "Booking us", p: "We will play almost anywhere with a floor and no clock on the wall. The technical requirements are short but they are not negotiable." },
          { t: "spec", h: "Technical rider, in full", rows: [
            ["Room", "Anything with a reverb tail over 1.4 seconds. Reservoirs and churches are ideal"],
            ["Power", "Two independent 16 A circuits"],
            ["Haze", "Required. The projection is not visible without it"],
            ["Projection", "One surface, minimum 4 m wide. Wall is fine, screen is better"],
            ["Machine", "We bring our own. One laptop, running at 60 fps, with a pre-rendered failsafe"],
            ["Get-in", "Four hours. We will not do a two-hour get-in"],
            ["Fee", "£2,400 plus travel for six players. Reduced for anywhere that has never had a concert"],
          ] },
          { t: "contact", h: "Enquiries", lines: ["Standing Wave Ensemble"] },
        ],
      },
      gallery: ["Hall, in haze", "Projection test", "Score fragment", "Six players"],
    },
    refs: ["concert haze projection", "drone performance", "standing wave pattern", "dark concert hall"],
  },

  /* ── COUNTERWEIGHT ──────────────────────────────────────── */
  "COUNTERWEIGHT": {
    who: "Gerald Amis", role: "Editor-in-Chief", co: "The Weekly Counterweight",
    dom: "counterweight.press", frame: "paper",
    theme: {
      bg: "#F6F3EA", panel: "#EAE5D6", ink: "#1A1815", dim: "#6C665A", line: "#BEB6A2",
      brand: "#8A1F1F", brand2: "#1A1815", link: "#8A1F1F", onBrand: "#F6F3EA",
      head: "'Instrument Serif', Georgia, 'Times New Roman', serif",
      body: "Georgia, 'Times New Roman', serif",
      mark: "counter", markText: "C", markFace: "Georgia, serif",
    },
    greet: "Amis, editor. Briefly, since Thursday is Thursday.",
    voice: "Our readers chose paper on purpose. Make it feel inevitable.",
    wrap: "The proof book came and I have read a fourteen-word headline set in one line at 8.4 point on newsprint, which is a sentence I did not expect to write this year. It looks as though the paper has always been set this way. Invoice us. We are small and we pay on the first of the month, without fail, because we have been on the other end of it.",
    site: {
      tagline: "A weekly newspaper, printed",
      mastL: "No. 1,482",
      mastR: "Thursday",
      foot: "We print corrections at the same size as the error.",
      nav: [["This Week", "/"], ["Subscribe", "/subscribe"], ["Archive", "/archive"], ["Letters", "/letters"], ["About", "/about"]],
      pages: {
        "/": [
          { t: "notice", h: "Returning to print", p: "After nine years online we are printing again, weekly, on newsprint, and posting it to people who asked for exactly that.", stamp: "First issue posted 4 September" },
          { t: "feed", h: "In this week's issue", items: [
            { d: "p. 1", h: "The enclosure that never ended", p: "Four thousand words on common land, and who has quietly been fencing it since 1965." },
            { d: "p. 6", h: "What the review did not ask", p: "The transit procurement audit was thorough about contracts and silent about the people who signed them." },
            { d: "p. 11", h: "A letter from the composing room", p: "Our production editor on setting a newspaper by hand for one week, as an experiment, badly." },
            { d: "p. 14", h: "Corrections", p: "Two this week. Both at the size of the original error, as always." },
          ] },
          { t: "prose", h: "Why paper", p: "Because a page has edges. You can finish it, and then it is finished, and nothing else loads underneath." },
        ],
        "/subscribe": [
          { t: "pricing", h: "Subscribe", sub: "Fifty-two issues a year. No app, no push notifications, no autoplaying anything. It arrives on Thursday.", tiers: [
            { name: "Print", price: "£96 / year", pick: "What we would pick", note: "52 issues, posted", feats: ["Posted Wednesday, arrives Thursday", "Full archive access", "No app", "Cancel any week, refunded pro rata"] },
            { name: "Digital", price: "£48 / year", note: "The same paper, as a PDF", feats: ["The printed page, as printed", "Full archive access", "No tracking of what you read", "One email a week, on Thursday"] },
            { name: "Supporting", price: "£240 / year", note: "For those who can", feats: ["Everything in Print", "Funds three concessionary subscriptions", "Named in the annual accounts if you wish", "Nothing else — no tote bag"] },
          ], note: "Concessionary subscriptions are £30 and nobody is asked to prove anything." },
          { t: "spec", h: "The paper itself", rows: [
            ["Format", "Broadsheet, 8 pages, folded once"],
            ["Stock", "Improved newsprint, 52 gsm"],
            ["Printed", "Tuesday night, on a web press 40 miles away"],
            ["Posted", "Wednesday, first class"],
            ["Ink", "Soy-based. It still comes off on your hands and we like that"],
            ["Type", "Set at 8.4 pt on 10.2. This is the whole design problem"],
          ] },
        ],
        "/archive": [
          { t: "prose", h: "Archive", p: "Every issue since 2015, free, unpaywalled, unindexed by any advertising network. Subscribers get the printed page as a PDF; everyone else gets the text." },
          { t: "table", h: "Recent issues",
            cols: ["No.", "Date", "Lead", "Pages"],
            rows: [
              ["1,482", "This week", "The enclosure that never ended", "8"],
              ["1,481", "Last week", "Who owns the riverbed", "8"],
              ["1,480", "—", "The audit nobody commissioned", "12"],
              ["1,479", "—", "A short history of the bus", "8"],
            ] },
        ],
        "/letters": [
          { t: "prose", h: "Letters", p: "We print corrections at the same size as the error. This has cost us a full page twice." },
          { t: "feed", h: "Recent corrections", items: [
            { d: "No. 1,480", h: "A full page", p: "We attributed a quotation to the wrong council member across four columns. The correction ran across four columns." },
            { d: "No. 1,471", h: "A figure transposed", p: "£4.1m printed as £1.4m in a headline. Corrected at headline size on the front page the following week." },
            { d: "No. 1,466", h: "A name misspelled", p: "One line, in the position the name appeared. The reader wrote back to say the response was disproportionate. We disagree." },
          ] },
          { t: "spec", h: "How letters work", rows: [
            ["Length", "Under 250 words gets in. Over 250 gets edited and you see the edit first"],
            ["Anonymity", "Granted on request, with a reason given to us privately"],
            ["Right of reply", "Anyone named critically gets the same column inches"],
            ["Publication", "We print letters that say we were wrong before letters that say we were right"],
          ] },
        ],
        "/about": [
          { t: "prose", h: "About", p: "Founded 2015 as a website. Printed since this year. Eleven people, no owner but the staff, no advertising of any kind." },
          { t: "stats", items: [
            { n: "52", l: "Issues a year" },
            { n: "0", l: "Advertisements" },
            { n: "11", l: "Staff, all owners" },
            { n: "8.4 pt", l: "The size everything hinges on" },
          ] },
        ],
      },
      gallery: ["Front page proof", "Newsprint detail", "Composing room", "Letters column"],
    },
    refs: ["newsprint texture", "broadsheet front page", "hot metal type", "newspaper composing room"],
  },

  /* ── SIGNAL WORK ────────────────────────────────────────── */
  "SIGNAL WORK": {
    who: "Fatima Al-Rashid", role: "Wayfinding Lead", co: "Meridian Airport Authority",
    dom: "meridian-airport.aero", frame: "board",
    theme: {
      bg: "#0E1417", panel: "#171F24", ink: "#E9F1F4", dim: "#87979F", line: "#26323A",
      brand: "#F2C037", brand2: "#4FA3C4", link: "#7FCBE4", onBrand: "#0E1417",
      head: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      body: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      mono: "'VT323', monospace",
      mark: "chevron", markFace: "Arial, sans-serif",
    },
    greet: "Fatima Al-Rashid, wayfinding.",
    voice: "Every glyph gets read by someone exhausted, in a hurry, in their second language.",
    wrap: "Tested where it matters, which is printed at 400 mm and read from 40 metres by staff coming off a night shift. Zero confusions on I, l and 1 across ninety readings. The Arabic pilot sits properly against the Latin, which two previous foundries told us was not achievable at this weight. Invoice the Authority; procurement is thirty days and I will chase it myself at day twenty-five.",
    site: {
      tagline: "Meridian International — open every hour",
      clock: "ALL TERMINALS OPEN · 03:12",
      foot: "Meridian does not close.",
      nav: [["Departures", "/"], ["Terminal Maps", "/maps"], ["Transport", "/transport"], ["Assistance", "/assistance"]],
      pages: {
        "/": [
          { t: "table", h: "Departures", sub: "Updated every 30 seconds. Gate numbers appear 45 minutes before departure and not before.",
            cols: ["Time", "Destination", "Flight", "Gate", "Status"],
            rows: [
              ["03:40", "Vellinge", "MR 812", "B14", "Boarding"],
              ["04:05", "Northgate", "KL 2201", "A7", "Gate open"],
              ["04:20", "Kilnmore", "MR 331", "—", "On time"],
              ["04:55", "Waterhead", "BA 918", "C22", "On time"],
              ["05:10", "Vellinge", "MR 814", "—", "Delayed 40 min"],
              ["05:30", "Ashfield", "LH 447", "—", "On time"],
            ] },
          { t: "notice", h: "Overnight", p: "Meridian does not close. Quiet zones with reclining seats are available airside in all three terminals, unstaffed but lit and monitored.", stamp: "Quiet zones: T1 gate 4, T2 mezzanine, T3 pier north" },
          { t: "stats", items: [
            { n: "3", l: "Terminals" },
            { n: "24", l: "Hours, every day" },
            { n: "2", l: "Scripts on every sign — Latin and Arabic" },
            { n: "18 min", l: "Longest posted walk, T1 to T3" },
          ] },
        ],
        "/maps": [
          { t: "prose", h: "Terminal maps", p: "Three terminals connected landside and airside. Walking times are posted honestly, measured at an unhurried pace with luggage." },
          { t: "table", h: "Walking times", sub: "Measured with a suitcase, at the pace of someone who is not running. Add ten minutes if you are.",
            cols: ["From", "To", "Airside", "Landside"],
            rows: [
              ["T1", "T2", "9 min", "12 min"],
              ["T2", "T3", "11 min", "14 min"],
              ["T1", "T3", "18 min", "22 min"],
              ["Security", "Furthest gate, T3", "16 min", "—"],
              ["Rail station", "T2 check-in", "—", "7 min"],
            ] },
          { t: "downloads", h: "Maps", items: [
            { kind: "PDF", name: "All terminals, airside and landside", size: "6.1 MB" },
            { kind: "PDF", name: "Step-free routes only", size: "2.4 MB" },
            { kind: "PDF", name: "Large print, high contrast", size: "3.8 MB" },
          ] },
        ],
        "/transport": [
          { t: "table", h: "Getting here",
            cols: ["Mode", "To city centre", "Runs", "Fare"],
            rows: [
              ["Rail", "24 min", "Every 15 min, 05:00–00:30", "£11.50"],
              ["Bus, route 88", "51 min", "Every 30 min, 24 hours", "£4.20"],
              ["Night bus, N88", "58 min", "Hourly, 00:30–05:00", "£4.20"],
              ["Taxi rank", "35 min, traffic dependent", "24 hours", "£40–55"],
            ] },
          { t: "spec", h: "Parking", rows: [
            ["Short stay", "£4 first hour, £3 each after, £34 daily maximum"],
            ["Long stay", "£62 per week, shuttle every 10 minutes"],
            ["Drop-off", "Ten minutes free at all three terminals"],
            ["Accessible bays", "Free, no time limit, at every terminal door"],
            ["Electric", "84 chargers, long stay, included in the parking fee"],
          ] },
        ],
        "/assistance": [
          { t: "prose", h: "Assistance", p: "Step-free routes throughout. Assistance can be requested at any information point or in advance through your airline, and it is free, always, at every stage." },
          { t: "spec", h: "What is available", rows: [
            ["Request in advance", "Through your airline, 48 hours ahead, or on arrival with no notice"],
            ["Meeting points", "Every terminal entrance, marked and staffed 24 hours"],
            ["Wheelchair", "Provided free. 140 available across the three terminals"],
            ["Quiet route", "A marked low-stimulus path from entrance to gate in every terminal"],
            ["Sunflower lanyard", "Recognised, and available free at any information point"],
            ["Hearing loops", "Every desk, every gate, every information point"],
            ["Assistance dogs", "Relief areas airside and landside in all terminals"],
          ] },
          { t: "notice", h: "On signage", p: "Every glyph on every sign in this airport is read by somebody exhausted, in a hurry, in their second language. If a sign here has confused you, tell us at any information point — it is logged, and the log is what drives the next replacement round." },
        ],
      },
      gallery: ["Concourse signage", "Departure board", "Gate marker", "Terminal 2 airside"],
    },
    refs: ["airport concourse signage", "departure board", "wayfinding arrow", "terminal at night"],
  },

  /* ── SHOWCARD ───────────────────────────────────────────── */
  "SHOWCARD": {
    who: "Cal Boone", role: "Archivist", co: "Showcard Type Foundry",
    dom: "showcardtype.com", frame: "specimen",
    theme: {
      bg: "#141210", panel: "#1E1B18", ink: "#F2EBDF", dim: "#9A9086", line: "#2E2A25",
      brand: "#E0A93C", brand2: "#C4472E", link: "#E0A93C", onBrand: "#141210",
      head: "'Instrument Serif', Georgia, serif",
      body: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      mark: "press", markText: "S", markFace: "Georgia, serif",
    },
    greet: "Cal Boone, archivist. Sitting on eleven photographs.",
    voice: "Eleven photographs is all we have of him. Keep the hand, lose the accident.",
    wrap: "The face came in with the historical note and every decision cited against a source photograph, which is the part I did not really expect anyone to do properly. I set a word he never painted and it looks like he painted it. Invoice us — small foundry, one bank account, paid inside a week.",
    site: {
      tagline: "Reviving lettering that was never digitised",
      foot: "Perpetual licences. No subscription. No seat auditing.",
      hero: { h: "Wichita, 1954" },
      nav: [["Typefaces", "/"], ["The Archive", "/archive"], ["Licensing", "/licensing"], ["Journal", "/journal"]],
      pages: {
        "/": [
          { t: "specimen", h: "Showcard Wichita", sub: "Display, one weight, forty alternates. Reconstructed from eleven photographs of one sign painter's brushwork.", items: [
            { t: "Handbills & Notices", size: 46, name: "Wichita Display · 46 pt" },
            { t: "Fresh Today", size: 62, name: "Wichita Display · 62 pt" },
            { t: "Closing Down Sale", size: 34, name: "Wichita Display · 34 pt" },
            { t: "No Parking At Any Time", size: 26, name: "Wichita Display · 26 pt" },
          ], note: "Set here in the site's own faces — the real specimen PDF is on the licensing page and shows the actual outlines." },
          { t: "table", h: "The library",
            cols: ["Face", "Weights", "Source", "Price"],
            rows: [
              ["Showcard Wichita", "1 display", "11 photographs, 1954", "£90"],
              ["Showcard Gothic Bold", "2", "Sign shop catalogue, 1938", "£140"],
              ["Marquee Condensed", "3", "Cinema fronts, 1946–1952", "£190"],
              ["Window Script", "1", "Grocery windows, 1961", "£90"],
            ] },
        ],
        "/archive": [
          { t: "prose", h: "The archive", p: "Four thousand photographs of painted signs, show cards and window lettering, most of it made by people whose names we will never recover." },
          { t: "stats", items: [
            { n: "4,081", l: "Photographs held" },
            { n: "11", l: "Of the Wichita painter, in total" },
            { n: "9", l: "Painters we can name" },
            { n: "0", l: "Charged for archive access" },
          ] },
          { t: "spec", h: "How the archive works", rows: [
            ["Access", "Free, to anyone, in person or by request. We scan on demand at no charge"],
            ["Scanning", "1200 dpi, colour-managed, with a ruler in frame"],
            ["Rights", "We claim none over the photographs. They are not ours"],
            ["Attribution", "Every revival names its source photographs and where they came from"],
            ["Contributions", "If you have a photograph of painted lettering, send it. We will scan and return it"],
          ] },
          { t: "gallery", h: "From the archive", caps: ["Photograph 6 of 11", "Brush detail", "Reconstruction", "Specimen card"] },
        ],
        "/licensing": [
          { t: "pricing", h: "Licensing", sub: "Buy it once and it is yours. There is no version of this that expires.", tiers: [
            { name: "Desktop", price: "£90", pick: "What most people need", note: "Perpetual, unlimited machines you own", feats: ["Print and desktop use", "OTF and WOFF2", "No seat auditing", "Free updates forever"] },
            { name: "Web", price: "£90", note: "Perpetual, unlimited pageviews", feats: ["Self-hosted WOFF2", "No tracking script", "No monthly pageview counting", "Free updates forever"] },
            { name: "Everything", price: "£220", note: "The whole library", feats: ["All four faces", "Desktop and web", "App embedding included", "Free updates forever"] },
          ], note: "No subscription. No seat auditing. If your company grows, that is your good fortune and not our invoice." },
          { t: "downloads", h: "Try before", items: [
            { kind: "PDF", name: "Showcard Wichita — full specimen", size: "4.2 MB" },
            { kind: "OTF", name: "Trial font, watermarked, unrestricted glyphs", size: "180 KB" },
            { kind: "PDF", name: "Historical note and source photographs", size: "11.4 MB" },
          ] },
        ],
        "/journal": [
          { t: "feed", h: "Journal", items: [
            { d: "Current", h: "Reconstructing an R from three-quarters of one photograph", p: "Photograph 6 of 11 shows the leg of an R and nothing else. What we did with it, and why the alternate exists." },
            { d: "Earlier", h: "The accidents worth keeping", p: "Two of the Wichita painter's letters have a hesitation in the downstroke. One is a slip. One is a decision. This is how we told them apart, and we may still be wrong." },
            { d: "Earlier", h: "On not smoothing", p: "Every revival we have seen of this kind of lettering optically corrects it into a typeface. That is the thing that kills it. A brush does not have optical correction." },
            { d: "Earlier", h: "Who was he", p: "We do not know. Eleven photographs, one city, an eighteen-month window. If you recognise the hand, write to us." },
          ] },
        ],
      },
      gallery: ["Photograph 6 of 11", "Brush detail", "Reconstruction", "Specimen card"],
    },
    refs: ["sign painter brushwork", "1950s show card lettering", "hand painted sign", "brush lettering detail"],
  },

  /* ── HALF LIFE ──────────────────────────────────────────── */
  "HALF LIFE": {
    who: "Dr. Ingrid Vollmer", role: "Head of Long-Term Communication", co: "Kettleburn Deep Repository",
    dom: "kettleburn-repository.org", frame: "civic",
    theme: {
      bg: "#FAFAF7", panel: "#ECEBE4", ink: "#1C1C18", dim: "#66665C", line: "#D2D1C6",
      brand: "#B8860B", brand2: "#3A3A34", link: "#8A6508", onBrand: "#FAFAF7",
      head: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      body: "Georgia, 'Times New Roman', serif",
      mark: "crest", markText: "K", markFace: "Arial, sans-serif",
    },
    greet: "Dr. Vollmer, long-term communication.",
    voice: "Assume the reader shares no language with you. Assume they are frightened. Proceed.",
    wrap: "The panel has reviewed it, including the two anthropologists who have rejected every previous submission on the grounds that it presumed too much. They did not reject this. The marker system will be built at quarter scale on the surface site in the spring and left there for a year to see what people do with it. Invoice the Authority; we are public money and it takes forty days, which I am not able to change.",
    site: {
      tagline: "Geological disposal · Sealed for 100,000 years",
      crestNote: "A public authority",
      foot: "Every document on this site is also held on paper, on vellum, in four languages.",
      side: [
        { h: "Site status", p: "Vault 1 sealed. Vaults 2 and 3 receiving. Surface works continue until 2061." },
        { h: "Visits", p: "The surface centre is open to the public without appointment. The vault is not open and will not be." },
      ],
      nav: [["The Repository", "/"], ["The Marker Problem", "/markers"], ["Safety Case", "/safety"], ["Records", "/records"]],
      pages: {
        "/": [
          { t: "lede", p: "Eleven thousand cubic metres of intermediate and high-level waste, four hundred and thirty metres down, in salt that has not moved in two hundred million years." },
          { t: "stats", items: [
            { n: "430 m", l: "Depth of the vault floor" },
            { n: "100,000", l: "Years the seal must hold" },
            { n: "3,000", l: "Years of recorded human writing, for comparison" },
            { n: "2061", l: "Year the last vault is sealed" },
          ] },
          { t: "prose", h: "Why here", p: "A salt dome, dry, seismically dead, with no aquifer above it and no mineral anybody would ever want to dig for. The last two qualities matter more than the first two." },
          { t: "notice", h: "Nothing here is secret", p: "The full geological survey, the safety case, the objections raised at every hearing and the transcripts of those hearings are all on this site. We have never withheld a document and we never will.", stamp: "Published under statute" },
        ],
        "/markers": [
          { t: "prose", h: "The problem, stated plainly", p: "We must warn people who will not speak any language now spoken, who may not read, who may have no reason to believe us, and who will arrive at a time we cannot predict. Everything below is an attempt and none of it is solved." },
          { t: "spec", h: "What a marker must survive", rows: [
            ["Time", "100,000 years. Written language is 5,000 years old"],
            ["Language", "None can be assumed. Not English, not any script"],
            ["Literacy", "Cannot be assumed at all"],
            ["Weather", "Two further glaciations are considered likely"],
            ["Salvage", "Anything of value will be taken. The marker must be worthless"],
            ["Curiosity", "A warning that looks like treasure is an invitation. This is the hardest constraint"],
          ] },
          { t: "steps", h: "The layered approach", items: [
            { h: "1 · Earthworks", p: "A field of granite spikes over 2 km², too large to remove and too useless to want. Legible from the air and from the ground." },
            { h: "2 · Pictograms at the perimeter", p: "Narrative sequence, no text. Tested against people with no shared language with the designers." },
            { h: "3 · Buried record rooms", p: "Nine chambers at varying depths, so that whoever digs finds the explanation before they find the waste." },
            { h: "4 · Archive redundancy", p: "Paper, vellum, etched steel and sapphire, in four archives on three continents." },
          ] },
          { t: "faq", h: "The objections we have not answered", items: [
            { q: "Does a marker attract rather than warn?", a: "Possibly. Every civilisation that has found a monumental warning has excavated it. We have no counter-argument, only the layered design." },
            { q: "Why not simply say nothing?", a: "It was seriously proposed and seriously considered for four years. The panel concluded that silence is a decision made on behalf of people who cannot object." },
            { q: "Have you tested any of this?", a: "Only at quarter scale, only with living people, only over months. The honest answer is that none of this can be tested on the timescale it is for." },
          ] },
        ],
        "/safety": [
          { t: "spec", h: "The safety case", rows: [
            ["Host rock", "Bedded halite, 210 Ma, no measured movement"],
            ["Hydrogeology", "No aquifer within 180 m above the vault horizon"],
            ["Seismicity", "No recorded event above M3.1 within 200 km since 1810"],
            ["Backfill", "Crushed salt, self-sealing under lithostatic pressure"],
            ["Retrievability", "100 years after sealing, then no longer possible"],
            ["Peak dose, modelled", "0.008 mSv/yr at 10,000 years, at the boundary"],
          ] },
          { t: "downloads", h: "The full case", items: [
            { kind: "PDF", name: "Safety case, complete, volumes 1–7", size: "184 MB" },
            { kind: "PDF", name: "Geological survey and borehole logs", size: "62 MB" },
            { kind: "PDF", name: "Public hearing transcripts, 1998–present", size: "41 MB" },
            { kind: "PDF", name: "Objections register, with our responses", size: "8.9 MB" },
          ] },
        ],
        "/records": [
          { t: "prose", h: "Keeping the record", p: "An archive that must survive the institution that made it. We assume the Authority will not exist in five hundred years and have designed accordingly." },
          { t: "table", h: "Where the record is held",
            cols: ["Medium", "Location", "Expected life", "Readable by"],
            rows: [
              ["Etched steel plate", "On site, record rooms", "10,000 yr", "Anyone with light"],
              ["Sapphire disc", "Three national archives", "1,000,000 yr", "Optical magnification"],
              ["Vellum, four languages", "Two national archives", "1,500 yr", "A reader of the language"],
              ["Acid-free paper", "Nine libraries", "500 yr", "A reader of the language"],
              ["Digital", "Nowhere, deliberately", "—", "Not relied upon"],
            ], note: "Digital media are excluded from the permanent record. No format we have ever invented has stayed readable for a century." },
          { t: "contact", h: "Enquiries", lines: ["Kettleburn Deep Repository", "Surface Centre, open daily"] },
        ],
      },
      gallery: ["Spike field, quarter scale", "Record room", "Salt face at 430 m", "Pictogram panel"],
    },
    refs: ["granite monolith field", "warning pictogram", "salt mine tunnel", "carved stone marker"],
  },

  /* ── NIGHT SHIFT ────────────────────────────────────────── */
  "NIGHT SHIFT": {
    who: "Bea Nkemdirim", role: "Product Lead", co: "Rota",
    dom: "rota.health", frame: "saas",
    theme: {
      bg: "#FBFCFD", panel: "#EDF2F6", ink: "#141C24", dim: "#5A6874", line: "#D6E0E8",
      brand: "#0F6E8C", brand2: "#0B1A24", link: "#0F6E8C", onBrand: "#FFFFFF",
      head: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      body: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      mark: "grid", markFace: "Arial, sans-serif",
    },
    greet: "Bea, product. Two of us are ex-nurses, which will show.",
    voice: "Four in the morning, one hand, a corridor, someone else's emergency. Design for that or do not bother.",
    wrap: "It shipped to two wards on Monday and I sat in on a night shift to watch it get used, which is the only research that has ever told me anything. Nobody stopped to work out what to tap. One healthcare assistant swapped a shift in eleven seconds while walking. Invoice us — we are venture-funded and boring about paying, so it will be on time.",
    site: {
      tagline: "Shift swapping for people who are already exhausted",
      navCta: "Log in",
      foot: "Built by two ex-nurses and four people who listen to them.",
      hero: {
        h: "Swap a shift in under fifteen seconds",
        p: "One hand, one thumb, in a corridor, at four in the morning, without taking your attention off the thing you were doing.",
        cta: "Book a ward trial", cta2: "See the research",
        foot: "Used on 41 wards across 9 trusts.",
      },
      nav: [["Product", "/"], ["For Wards", "/wards"], ["Research", "/research"], ["Security", "/security"]],
      pages: {
        "/": [
          { t: "prose", h: "The whole product is one screen", p: "Your shifts, the ones going spare, and a way to trade. Everything else we built in the first year has since been deleted." },
          { t: "stats", items: [
            { n: "15 sec", l: "Median time to swap a shift" },
            { n: "1", l: "Hand required" },
            { n: "41", l: "Wards using it" },
            { n: "0", l: "Notifications between 23:00 and 07:00" },
          ] },
          { t: "spec", h: "Designed for the actual conditions", rows: [
            ["Reachable", "Every action inside the bottom third of the screen"],
            ["One-handed", "No gesture requires a second hand or a stretch"],
            ["Gloved", "Minimum target 56 px. Tested with nitrile gloves on"],
            ["Dark", "A true dark mode, not an inverted light one. No white flashes"],
            ["Interrupted", "Every flow survives being abandoned mid-way and resumed an hour later"],
            ["Offline", "Works in a lift and in the basement. Syncs when it can"],
          ] },
        ],
        "/wards": [
          { t: "steps", h: "How a swap works", items: [
            { h: "You post the shift", p: "Two taps from the home screen. No reason field, because a reason field is a barrier and nobody's business." },
            { h: "It goes to people who can actually take it", p: "Filtered by band, skill and working-time rules before anybody is disturbed. Most staff never see most offers." },
            { h: "Someone takes it", p: "One tap. It is theirs, provisionally, immediately." },
            { h: "The ward manager approves in the morning", p: "In a batch, in about ninety seconds, with the rules already checked." },
          ] },
          { t: "table", h: "What it will not let you do", sub: "The rules are enforced at the point of swap rather than caught later by a manager or a payroll query.",
            cols: ["Rule", "Enforced as"],
            rows: [
              ["Under 11 hours between shifts", "Blocked, with the reason shown"],
              ["More than 48 hours averaged over 17 weeks", "Blocked"],
              ["Seven consecutive nights", "Blocked"],
              ["Skill mix below the ward's floor", "Offer never sent"],
              ["Someone on annual leave", "Offer never sent"],
            ] },
          { t: "faq", h: "What ward managers ask", items: [
            { q: "Does this take control away from me?", a: "No. Nothing is final until you approve it. What it takes away is the twenty-two phone calls." },
            { q: "What about staff who do not want a work app on their phone?", a: "There is a web version and a ward tablet mode. Nobody is required to install anything on a personal device, ever." },
            { q: "Will it push extra shifts at people?", a: "Never. Staff opt in per shift type. There is no nudge, no streak, no badge for picking up overtime, and there never will be." },
          ] },
        ],
        "/research": [
          { t: "prose", h: "Where the fifteen seconds came from", p: "We timed 340 swaps on paper and by phone before we built anything. The median was nine minutes and the worst was four days." },
          { t: "feed", h: "What we changed after watching", items: [
            { d: "Study 1", h: "We removed the reason field", p: "Staff were writing apologies. Nobody read them. Removing it cut abandonment by more than half." },
            { d: "Study 2", h: "We moved everything to the bottom", p: "Filmed forty-one interactions in corridors. Every single one was one-handed, thumb only, while walking." },
            { d: "Study 3", h: "We turned off night notifications entirely", p: "A buzz at 3am on a night shift is not a reminder, it is a hazard. Nothing has been worse for having removed it." },
            { d: "Study 4", h: "We stopped showing who declined", p: "It was being used to keep score. It was our idea and it was a bad one." },
          ] },
          { t: "downloads", h: "Published", items: [
            { kind: "PDF", name: "Time-to-swap study, 340 observations", size: "2.1 MB" },
            { kind: "PDF", name: "Corridor interaction study, with video stills", size: "8.4 MB" },
            { kind: "CSV", name: "Anonymised swap timings, all wards", size: "1.2 MB" },
          ] },
        ],
        "/security": [
          { t: "spec", h: "Security and data", rows: [
            ["Data held", "Name, band, skills, shifts. No clinical data of any kind"],
            ["Patient data", "None. The app has no route to it and no integration that could"],
            ["Hosting", "In-country, single region, no replication abroad"],
            ["Access", "Ward-scoped. A manager sees their ward and nothing else"],
            ["Retention", "Shift records 24 months, then deleted, not archived"],
            ["Penetration testing", "Annually, by an external firm. Reports available under NDA"],
          ] },
          { t: "notice", h: "We do not sell anything to anybody", p: "No analytics broker, no advertising identifier, no third-party SDK in the mobile app at all. The dependency list is published and it is short." },
        ],
      },
      gallery: ["Swap screen, dark", "Ward tablet", "Corridor use", "Manager approval"],
    },
    refs: ["hospital corridor at night", "phone in one hand dark", "ward whiteboard", "shift rota sheet"],
  },

  /* ── THE SPECIMEN ───────────────────────────────────────── */
  "THE SPECIMEN": {
    who: "Auberon Selk", role: "Head of Digitisation", co: "Thackray Museum of Natural History",
    dom: "thackraymuseum.org", frame: "studio",
    theme: {
      bg: "#F6F4EF", panel: "#E7E3D8", ink: "#26241E", dim: "#6F6A5C", line: "#D0CABA",
      brand: "#2F5D62", brand2: "#9C6B3C", link: "#2F5D62", onBrand: "#F6F4EF",
      head: "'Instrument Serif', Georgia, serif",
      body: "Georgia, 'Times New Roman', serif",
      mark: "horizon", markFace: "Georgia, serif",
    },
    greet: "Selk here, digitisation.",
    voice: "She is twenty-six metres long and the hall is nineteen. That is the entire commission.",
    wrap: "The model is loaded and she fits, which after four years of being told it was impossible is a strange sentence to type. The vertebral detail holds at the distance a visitor actually stands. Our conservator, who has objected to every digitisation project since 2009, asked for a still to put on her wall. Invoice the museum — charitable trust, thirty days, and it will be paid on day thirty.",
    site: {
      tagline: "Collections held in trust since 1874",
      foot: "Free entry. Always has been.",
      nav: [["Visit", "/"], ["The Whale", "/whale"], ["Digitisation", "/digitisation"], ["Collections", "/collections"]],
      pages: {
        "/": [
          { t: "lede", p: "Four million specimens, of which about nine hundred are on display, in a building that has been too small since 1911." },
          { t: "spec", h: "Visiting", rows: [
            ["Admission", "Free, no ticket, no booking"],
            ["Open", "Daily 10:00–17:00. Closed 24–26 December"],
            ["Access", "Step-free throughout except the 1874 gallery, which has a platform lift"],
            ["Quiet hours", "First Sunday of the month, 10:00–11:30, lights and sound reduced"],
            ["Photography", "Encouraged, including flash, including tripods"],
            ["Cloakroom", "Free, staffed, and it will take a rucksack"],
          ] },
          { t: "gallery", h: "In the halls", caps: ["The main hall, 1874", "Vertebrate store", "Whale, suspended", "Specimen drawer"] },
        ],
        "/whale": [
          { t: "notice", h: "She does not fit", p: "A blue whale skeleton, twenty-six metres, articulated in 1891 for a hall that is nineteen metres long. She has been in three pieces in a store since 1974.", stamp: "Specimen NH.1891.4" },
          { t: "spec", h: "The specimen", rows: [
            ["Species", "Balaenoptera musculus"],
            ["Length", "26.2 m articulated"],
            ["Acquired", "1891, stranded, north-east coast"],
            ["Elements", "168 bones, 11 of them replicas cast in 1931"],
            ["Condition", "Stable. Oil seep ongoing and monitored since 1968"],
            ["On display", "Not since 1974"],
            ["Hall length", "19.1 m"],
          ] },
          { t: "steps", h: "What digitisation is for", items: [
            { h: "She can be seen again", p: "At full length, at true scale, without moving a bone or building a hall we cannot afford." },
            { h: "She can be measured without being touched", p: "Every request from a researcher currently means opening a crate. That has happened forty times since 1974." },
            { h: "The oil seep can be tracked", p: "A scan every two years gives us a record of the damage that photographs never could." },
            { h: "She can go somewhere else", p: "Any museum that wants her can have the file. Free, with no conditions." },
          ] },
        ],
        "/digitisation": [
          { t: "prose", h: "How we scan", p: "Photogrammetry for everything under two metres, laser for anything larger, and a great deal of patience for anything with a hole in it." },
          { t: "spec", h: "Standards we hold to", rows: [
            ["Capture", "Photogrammetry to 0.1 mm, laser to 0.4 mm on large elements"],
            ["Colour", "Photographed against a calibrated chart, in every capture"],
            ["Scale", "A physical scale bar in frame. Always. No exceptions"],
            ["Reconstruction", "Marked in a separate colour on every model. Nothing invented is hidden"],
            ["File format", "OBJ and PLY, uncompressed, plus a glTF for viewing"],
            ["Licence", "CC0. Everything. Including commercial use"],
          ] },
          { t: "downloads", h: "Free to download", items: [
            { kind: "PLY", name: "NH.1891.4 — full articulation, 0.4 mm", size: "4.1 GB" },
            { kind: "GLB", name: "NH.1891.4 — viewing model, decimated", size: "84 MB" },
            { kind: "PDF", name: "Capture methodology and calibration record", size: "3.2 MB" },
            { kind: "CSV", name: "Element register, all 168 bones", size: "42 KB" },
          ], note: "CC0. You do not need to ask, credit or tell us. We would like to know, but you do not have to." },
        ],
        "/collections": [
          { t: "stats", items: [
            { n: "4.1m", l: "Specimens held" },
            { n: "~900", l: "On display" },
            { n: "1874", l: "Founded" },
            { n: "0", l: "Charged for admission, ever" },
          ] },
          { t: "table", h: "The collections",
            cols: ["Collection", "Specimens", "Digitised", "Access"],
            rows: [
              ["Vertebrates", "184,000", "11%", "By appointment"],
              ["Entomology", "2,900,000", "3%", "By appointment"],
              ["Herbarium", "610,000", "38%", "Open, on request"],
              ["Mineralogy", "94,000", "62%", "Open, on request"],
              ["Palaeontology", "340,000", "19%", "By appointment"],
            ], note: "The digitised percentages are low and we publish them anyway. At the current rate the entomology collection completes in 2340." },
          { t: "contact", h: "Research enquiries", lines: ["Thackray Museum of Natural History", "Collections access, second floor"] },
        ],
      },
      gallery: ["The main hall, 1874", "Vertebrate store", "Whale, suspended", "Specimen drawer"],
    },
    refs: ["whale skeleton museum", "natural history specimen drawer", "articulated bones", "museum hall vaulted ceiling"],
  },

  /* ── TIDE TABLES ────────────────────────────────────────── */
  "TIDE TABLES": {
    who: "Morwenna Pike", role: "Editor", co: "The Havenmouth Almanac",
    dom: "havenmouthalmanac.co", frame: "press",
    theme: {
      bg: "#F4F2E9", panel: "#E4E0D2", ink: "#1E2622", dim: "#65706A", line: "#C8C4B2",
      brand: "#1F5C56", brand2: "#A3512C", link: "#1A4D48", onBrand: "#F4F2E9",
      head: "'Instrument Serif', Georgia, serif",
      body: "Georgia, 'Times New Roman', serif",
      mark: "wave", markFace: "Georgia, serif",
    },
    greet: "Morwenna Pike, editor, Havenmouth.",
    voice: "Men take this to sea. It is not a coffee-table book and it must never look like one.",
    wrap: "Proofs came and I have had four skippers look at them on the quay, which is the only review board that matters here. All four could find the tide for the day inside two seconds with the book half-open in a wind. One of them said it looked like it had always been like that. Invoice me directly and I will pay it from the almanac account this week.",
    site: {
      tagline: "Tides, weather and the working year · Published every November since 1901",
      est: "Havenmouth · 124th edition",
      foot: "Printed on the quay, sold on the quay.",
      nav: [["The Almanac", "/"], ["Tides", "/tides"], ["The Illustrations", "/plates"], ["Buy", "/buy"]],
      pages: {
        "/": [
          { t: "lede", p: "One volume a year, 336 pages, sized to fit a wheelhouse shelf and survive being dropped in a bilge." },
          { t: "prose", h: "What is in it", p: "Tide tables for eleven harbours, sunrise and sunset, a moon calendar, the shellfish seasons, the lifeboat roll, the year's obituaries, and forty-one pages of things that are only useful if you live here." },
          { t: "stats", items: [
            { n: "1901", l: "First edition" },
            { n: "124", l: "Editions since, unbroken" },
            { n: "11", l: "Harbours tabulated" },
            { n: "2,900", l: "Copies printed this year" },
          ] },
          { t: "spec", h: "The book itself", rows: [
            ["Trim", "148 × 210 mm — fits the standard wheelhouse shelf"],
            ["Extent", "336 pages"],
            ["Paper", "80 gsm, bulked, uncoated. It takes a pencil in the rain"],
            ["Binding", "Sewn, rounded and backed, so it lies open one-handed"],
            ["Cover", "Board with a wipeable laminate. The one concession to modernity"],
            ["Type size", "8 pt tables, 9.5 pt text. Read in bad light, at an angle"],
          ] },
        ],
        "/tides": [
          { t: "table", h: "Havenmouth — a sample week", sub: "Heights in metres above chart datum. Springs in bold in the printed book.",
            cols: ["Date", "High", "m", "Low", "m"],
            rows: [
              ["Mon 4", "03:41 / 16:08", "5.2 / 5.4", "10:02 / 22:29", "0.9 / 0.7"],
              ["Tue 5", "04:26 / 16:52", "5.4 / 5.6", "10:47 / 23:14", "0.7 / 0.6"],
              ["Wed 6", "05:09 / 17:34", "5.6 / 5.7", "11:30 / 23:58", "0.6 / 0.5"],
              ["Thu 7", "05:51 / 18:15", "5.6 / 5.6", "12:12 / —", "0.6 / —"],
              ["Fri 8", "06:33 / 18:57", "5.5 / 5.4", "00:41 / 12:54", "0.6 / 0.7"],
            ] },
          { t: "spec", h: "How the tables are made", rows: [
            ["Source", "Harmonic constants from the national tidal authority"],
            ["Checked against", "The Havenmouth gauge, daily, by hand, for a fortnight each spring"],
            ["Datum", "Chart datum, stated on every spread. Never sea level"],
            ["Corrections", "Secondary port differences printed on the facing page, not in an appendix"],
            ["Errors", "Two since 1901. Both printed as errata slips and both reprinted the following year"],
          ] },
          { t: "notice", h: "Do not navigate on this website", p: "The web tables are a convenience and they are not corrected in the same way the book is. If you are going out, use the book or the official tables. This is not a disclaimer written by a lawyer — it is the actual advice." },
        ],
        "/plates": [
          { t: "prose", h: "The illustrations", p: "Forty-two plates through the book: knots, shellfish at legal size, the harbour lights, the local rigs. They are working diagrams that happen to be drawn well, in that order." },
          { t: "gallery", h: "From the current edition", caps: ["Shellfish, at legal size", "Harbour light sequences", "Working knots", "The estuary, drawn 1948"] },
          { t: "spec", h: "What a plate has to do", rows: [
            ["Legible", "At arm's length, in a wheelhouse, in poor light"],
            ["Accurate", "Legal minimum sizes drawn at 1:1 so the page can be used as a gauge"],
            ["One colour", "Black. The book has never had a second colour inside"],
            ["Unsentimental", "No weathered fishermen, no sunsets, no gulls"],
            ["Reusable", "A plate that is right does not get redrawn. Eleven date from before 1960"],
          ] },
        ],
        "/buy": [
          { t: "products", h: "The 124th edition", items: [
            { name: "The Almanac, current year", meta: "336 pp · sewn · November", price: "£14", tag: "In stock" },
            { name: "Almanac plus wall tide card", meta: "Card is A2, laminated", price: "£19", tag: "In stock" },
            { name: "Back editions, 1998–2023", meta: "As available, condition varies", price: "£8", tag: "Ask" },
            { name: "The wall card alone", meta: "A2, one harbour", price: "£7", tag: "In stock" },
          ] },
          { t: "spec", h: "Where to get it", rows: [
            ["On the quay", "The chandler, the post office, both harbour cafés"],
            ["By post", "£14 plus £2.50, anywhere in the country"],
            ["Trade", "40% to any shop within the county, firm sale, three copies minimum"],
            ["Published", "The first Thursday in November, every year"],
            ["Sold out", "Usually by February. We do not reprint mid-year"],
          ] },
          { t: "contact", h: "The almanac office", lines: ["The Havenmouth Almanac", "Above the chandler, Quay Street"] },
        ],
      },
      gallery: ["Shellfish, at legal size", "Harbour light sequences", "Working knots", "The estuary, drawn 1948"],
    },
    refs: ["tide table page", "harbour at low water", "shellfish illustration", "wheelhouse interior"],
  },

  /* ── THE INTERPRETER ────────────────────────────────────── */
  "THE INTERPRETER": {
    who: "Rhodri Vance", role: "Head of Access Services", co: "Meridian Broadcasting",
    dom: "meridianbroadcast.tv", frame: "board",
    theme: {
      bg: "#101418", panel: "#192026", ink: "#E8EEF2", dim: "#8494A0", line: "#27313A",
      brand: "#5BD1A6", brand2: "#E0566B", link: "#7FE0BC", onBrand: "#101418",
      head: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      body: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      mono: "'VT323', monospace",
      mark: "disc", markText: "MB", markFace: "Arial, sans-serif",
    },
    greet: "Rhodri Vance, access services.",
    voice: "The hands carry the grammar and the face carries the tense. Get either wrong and it is not a language any more.",
    wrap: "Deaf reviewers have had it for a fortnight — six of them, three of whom are interpreters themselves, and they were briefed to be unkind. The consensus is that the mouth patterns finally read and that the eyebrows are doing the work they are supposed to do. Two asked whether it could be used for the overnight bulletins, which was not in scope and is the best thing anybody has said. Invoice access services directly.",
    site: {
      tagline: "Meridian Broadcasting — Access Services",
      clock: "ON AIR · SUBTITLES 99.4%",
      foot: "Access is not a feature of the schedule. It is the schedule.",
      nav: [["Access Services", "/"], ["Signing", "/signing"], ["Standards", "/standards"], ["Feedback", "/feedback"]],
      pages: {
        "/": [
          { t: "stats", h: "Where we are", items: [
            { n: "99.4%", l: "Of output subtitled" },
            { n: "12.1%", l: "Signed" },
            { n: "41%", l: "Audio described" },
            { n: "24/7", l: "Live subtitling staffed" },
          ], note: "The signing figure is the one we are least proud of and the one this project exists to move." },
          { t: "table", h: "Access by service",
            cols: ["Service", "Subtitled", "Signed", "Described"],
            rows: [
              ["Meridian One", "100%", "18%", "52%"],
              ["Meridian News", "100%", "31%", "—"],
              ["Meridian Two", "99%", "6%", "38%"],
              ["Children's", "100%", "22%", "44%"],
              ["Online catch-up", "98%", "9%", "31%"],
            ] },
          { t: "prose", h: "Why an avatar at all", p: "Because there are not enough interpreters, and there never will be, and the alternative to a signed avatar on the overnight bulletin is nothing at all. It is not a replacement for a human interpreter and we will not present it as one." },
        ],
        "/signing": [
          { t: "notice", h: "The design problem", p: "Sign language is not gesture. The hands carry lexical content, the face carries grammar — tense, negation, question, intensity — and the mouth carries patterns that disambiguate signs the hands render identically.", stamp: "Reviewed by six Deaf consultants" },
          { t: "spec", h: "What the figure must do", rows: [
            ["Handshape", "Legible at 1/6 of frame height, the standard signing window"],
            ["Finger separation", "Readable against the torso at broadcast bitrate"],
            ["Eyebrows", "Carry question and conditional. Must be visible, must not read as mood"],
            ["Mouth patterns", "Distinct from lip-sync. This is the part every previous attempt failed"],
            ["Eye gaze", "Directional — it assigns referents in signing space"],
            ["Torso shift", "Role shift is grammatical. The figure must lean and turn"],
            ["Neutral face", "Must not read as angry, bored or friendly. It must read as nothing"],
          ] },
          { t: "steps", h: "How it is being built", items: [
            { h: "Motion capture from working interpreters", p: "Four interpreters, all Deaf or CODA, paid at full rate, credited, and with a veto over any use of their capture." },
            { h: "A figure designed for the window", p: "Built to be read at signing-window size first and only then checked at full frame." },
            { h: "Reviewed by Deaf consultants at every stage", p: "Six of them, briefed to be unkind, paid for their time, and able to stop the project." },
            { h: "Deployed where there is currently nothing", p: "Overnight bulletins and continuity first. Never in place of a booked human interpreter." },
          ] },
        ],
        "/standards": [
          { t: "spec", h: "Our published standards", rows: [
            ["Signing window", "Minimum 1/6 of frame, bottom right, never overlapped by graphics"],
            ["Subtitle latency", "Under 3 seconds live, under 0.5 seconds pre-recorded"],
            ["Subtitle accuracy", "98% minimum, measured by the NER model, published quarterly"],
            ["Audio description", "Never over dialogue. Never summarising what is audible"],
            ["Human interpreters", "Booked for all live news, all elections, all emergency broadcasts"],
            ["Avatar use", "Overnight and continuity only. Labelled as an avatar, every time"],
          ] },
          { t: "downloads", h: "Documents", items: [
            { kind: "PDF", name: "Access services standards, full", size: "2.8 MB" },
            { kind: "PDF", name: "Signing avatar — Deaf consultation report", size: "5.1 MB" },
            { kind: "CSV", name: "Quarterly accuracy measurements, all services", size: "310 KB" },
          ] },
        ],
        "/feedback": [
          { t: "prose", h: "Tell us when it fails", p: "Every report is read by a person in this department, not routed to a general complaints queue. Subtitle failures are logged against the specific programme and the specific minute." },
          { t: "feed", h: "Recent changes made because someone wrote in", items: [
            { d: "March", h: "Signing window no longer covered by the score bug", p: "Reported during a match. It had been happening for two seasons and nobody internally had noticed." },
            { d: "February", h: "Overnight subtitles restored", p: "They had been dropped between 02:00 and 05:00 to save cost. That decision was reversed nine days after it was noticed." },
            { d: "January", h: "Audio description no longer talks over song lyrics", p: "A standing complaint since 2019. Fixed properly rather than case by case." },
          ] },
          { t: "contact", h: "Access services", lines: ["Meridian Broadcasting", "Access Services, Studio Block C"] },
        ],
      },
      gallery: ["Signing window test", "Handshape sheet", "Motion capture session", "Neutral expression study"],
    },
    refs: ["sign language hands", "broadcast signing window", "motion capture markers", "hand shape study"],
  },

  /* ── BLACK BOX ──────────────────────────────────────────── */
  "BLACK BOX": {
    who: "Ottilie Rance", role: "Principal Inspector", co: "Air Accidents Investigation Branch",
    dom: "aaib-investigations.gov", frame: "civic",
    theme: {
      bg: "#FCFCFC", panel: "#EEF0F2", ink: "#16191C", dim: "#5F676E", line: "#D4D8DC",
      brand: "#1F3D6B", brand2: "#C0392B", link: "#1F3D6B", onBrand: "#FFFFFF",
      head: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      body: "Georgia, 'Times New Roman', serif",
      mark: "chevron", markFace: "Arial, sans-serif",
    },
    greet: "Inspector Rance, AAIB.",
    voice: "The families will watch this. It must explain and it must never once be exciting.",
    wrap: "The reconstruction is approved and it is going into the report as figure 14. I showed it to two of the families before signing it off, which is our practice, and neither had to look away. One asked a question about the final thirty seconds that the animation answered without my saying anything, which is precisely what it is for. Invoice through the Branch; government terms, thirty days, and it does actually pay on time.",
    site: {
      tagline: "Independent investigation of civil aviation accidents",
      crestNote: "No blame · No liability · Safety only",
      foot: "It is not the purpose of an investigation to apportion blame or liability.",
      side: [
        { h: "Report an occurrence", p: "Any person may report. Reports made in good faith are protected and are not passed to any regulator for enforcement." },
        { h: "Open investigations", p: "Fourteen currently open. Each has a page from the day it opens, updated as findings are made." },
      ],
      nav: [["The Branch", "/"], ["Reports", "/reports"], ["Reconstructions", "/reconstructions"], ["Safety Recommendations", "/recommendations"]],
      pages: {
        "/": [
          { t: "notice", h: "The purpose of an investigation", p: "The sole objective is the prevention of accidents. It is not the purpose of an investigation to apportion blame or liability. Nothing in any report may be used in proceedings against any person.", stamp: "Statutory, and absolute" },
          { t: "stats", items: [
            { n: "14", l: "Investigations open" },
            { n: "312", l: "Reports published since 2015" },
            { n: "0", l: "Findings of blame, ever" },
            { n: "12 mo", l: "Target from occurrence to report" },
          ] },
          { t: "prose", h: "How we work", p: "An inspector is on site within hours. The recorders are read in our own laboratory. The draft report goes to every interested party, including the families, before it goes anywhere else." },
        ],
        "/reports": [
          { t: "table", h: "Recently published",
            cols: ["Ref", "Aircraft", "Occurrence", "Published"],
            rows: [
              ["2/2024", "Twin turboprop", "Loss of control on approach", "March"],
              ["1/2024", "Light single", "Fuel starvation, forced landing", "February"],
              ["9/2023", "Rotorcraft", "Tail rotor drive failure", "December"],
              ["8/2023", "Airliner", "Runway excursion, no injuries", "November"],
              ["7/2023", "Light twin", "Controlled flight into terrain", "October"],
            ] },
          { t: "spec", h: "What a report contains", rows: [
            ["Factual information", "Everything established. No inference, no adjectives"],
            ["Analysis", "Clearly separated from fact, and labelled as analysis"],
            ["Conclusions", "Causal and contributory factors. Never a cause on its own"],
            ["Safety recommendations", "Addressed to a named body, with a required response"],
            ["Appendices", "The recorder traces, in full, at readable scale"],
            ["Names", "None. No individual is ever named in a report"],
          ] },
        ],
        "/reconstructions": [
          { t: "prose", h: "Animated reconstructions", p: "Produced for a minority of investigations, where a sequence cannot be explained by a diagram and a paragraph. They are evidence rendered legible, and nothing else." },
          { t: "spec", h: "Rules for a reconstruction", rows: [
            ["Source", "Recorder data only. Nothing between data points is invented"],
            ["Uncertainty", "Where data is absent, the animation shows absence. It does not smooth over it"],
            ["Sound", "None. No engine noise, no cockpit audio, no music of any kind"],
            ["Camera", "Fixed or slow. No dramatic angles, no cuts on impact"],
            ["Impact", "Not depicted. The sequence ends at the last recorded data point"],
            ["People", "Never shown. No figures, no silhouettes, no cockpit occupants"],
            ["Colour", "Neutral. Red reserved exclusively for the parameter under discussion"],
          ] },
          { t: "steps", h: "Who sees it, and when", items: [
            { h: "The investigation team first", p: "To check it against the data. It is a working tool before it is anything else." },
            { h: "The families, privately, before publication", p: "Always. With an inspector present, and with the option not to see it at all." },
            { h: "Interested parties, in draft", p: "Operator, manufacturer, regulator, unions. All may comment on accuracy." },
            { h: "The public, with the report", p: "Embedded in the report at figure scale, and never released to media in advance of it." },
          ] },
          { t: "downloads", h: "Example material", items: [
            { kind: "MP4", name: "Report 7/2023 — figure 14 reconstruction", size: "38 MB" },
            { kind: "PDF", name: "Guidance on animated reconstructions", size: "1.2 MB" },
            { kind: "CSV", name: "Recorder parameter list, standard set", size: "24 KB" },
          ] },
        ],
        "/recommendations": [
          { t: "prose", h: "Safety recommendations", p: "Every recommendation is addressed to a named organisation, which must respond within ninety days. Both the recommendation and the response are published here, including responses we consider inadequate." },
          { t: "table", h: "Open recommendations",
            cols: ["Ref", "Addressed to", "Subject", "Status"],
            rows: [
              ["2024-004", "Regulator", "Fuel gauge calibration intervals", "Response overdue"],
              ["2024-002", "Manufacturer", "Tail rotor inspection schedule", "Accepted, in progress"],
              ["2023-019", "Operator group", "Approach stabilisation criteria", "Accepted, closed"],
              ["2023-011", "Regulator", "Recorder retrofit, light twins", "Partially accepted"],
            ], note: "'Response overdue' stays on this page until it is not overdue. It has occasionally stayed for a year." },
        ],
      },
      gallery: ["Recorder trace", "Wreckage layout diagram", "Flight path plot", "Laboratory readout"],
    },
    refs: ["flight data recorder", "flight path diagram", "aircraft instrument panel", "technical trace chart"],
  },

  /* ── THE PRESCRIPTION ───────────────────────────────────── */
  "THE PRESCRIPTION": {
    who: "Anselm Roux", role: "Technical Director", co: "Carbury Medical Packaging",
    dom: "carburymedical.com", frame: "shop",
    theme: {
      bg: "#FFFFFF", panel: "#F0F4F2", ink: "#15201B", dim: "#5C6A63", line: "#D6E0DA",
      brand: "#00695C", brand2: "#B71C1C", link: "#00695C", onBrand: "#FFFFFF",
      head: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      body: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      mark: "counter", markText: "C", markFace: "Arial, sans-serif",
    },
    greet: "Anselm Roux, technical. One thing before you start:",
    voice: "Somebody will read this at three in the morning, in the dark, without their glasses, and get it right or not.",
    wrap: "The face passed the tests, including the two that have failed every previous submission — the 5.5 pt strength line under blister foil, and the 1/l/I set at reading distance for a low-vision panel. Zero misreadings across two hundred and forty presentations. That number is going in a submission to the regulator. Invoice us; we are on sixty days as standard and I have had you moved to fourteen.",
    site: {
      tagline: "Pharmaceutical packaging · Cartons, labels, blister foil",
      cart: "Enquiry (0)",
      strap: "Braille to EN 15823 · Serialisation ready · Audited annually",
      foot: "A misread carton is a dosing error. That is the whole business.",
      nav: [["Products", "/"], ["Legibility", "/legibility"], ["Compliance", "/compliance"], ["Enquiries", "/enquiries"]],
      pages: {
        "/": [
          { t: "products", h: "What we make", items: [
            { name: "Folding cartons", meta: "GC1 board · braille embossed inline", price: "Quoted", tag: "Lead 4 wk" },
            { name: "Blister lidding foil", meta: "20–25 µm alu · reverse printed", price: "Quoted", tag: "Lead 6 wk" },
            { name: "Self-adhesive labels", meta: "Vial, ampoule, bottle", price: "Quoted", tag: "Lead 3 wk" },
            { name: "Patient leaflets", meta: "Down to 5.5 pt, folded to 12 mm", price: "Quoted", tag: "Lead 4 wk" },
          ], note: "Every quote includes a legibility assessment. It is not an optional extra and it is not charged separately." },
          { t: "stats", items: [
            { n: "5.5 pt", l: "Smallest type we will set" },
            { n: "0", l: "Recalls attributable to our artwork" },
            { n: "240", l: "Readings in a legibility panel" },
            { n: "1963", l: "Founded" },
          ] },
        ],
        "/legibility": [
          { t: "notice", h: "The failure mode is a dosing error", p: "A person takes 50 mg instead of 5.0 mg because a decimal point disappeared into a fold. This has happened, repeatedly, in this industry, and every rule below exists because of a specific case.", stamp: "Internal standard CMP-7" },
          { t: "spec", h: "Our house rules for medicine artwork", rows: [
            ["Trailing zeros", "Never. 5 mg, not 5.0 mg — a lost point becomes a tenfold error"],
            ["Leading zeros", "Always. 0.5 mg, never .5 mg"],
            ["Ambiguous pairs", "1, l and I must be unmistakable at 5.5 pt. Tested, not assumed"],
            ["Strength", "Never on a fold, never in the last 4 mm of a panel"],
            ["Similar names", "Tall Man lettering on any pair flagged by the regulator's list"],
            ["Colour", "Never the only carrier of a difference between strengths"],
            ["Braille", "EN 15823, minimum dot height 0.20 mm, checked on every run"],
          ] },
          { t: "steps", h: "How we test a face or an artwork", items: [
            { h: "Panel of forty readers", p: "Including twelve with corrected-to-normal vision at the low end and eight over seventy-five." },
            { h: "Realistic conditions", p: "Held at reading distance, at 50 lux — a bedside lamp, not a studio. Six seconds per presentation." },
            { h: "Under the actual material", p: "Foil is reflective and board is not. A face that passes on paper can fail on blister." },
            { h: "Two hundred and forty readings", p: "Any single misreading of a strength or a name stops the artwork. Not a threshold — one." },
          ] },
        ],
        "/compliance": [
          { t: "table", h: "Standards we hold",
            cols: ["Standard", "Covers", "Audited"],
            rows: [
              ["EN 15823", "Braille on medicinal packaging", "Annually"],
              ["ISO 15378", "GMP for primary packaging materials", "Annually"],
              ["EU FMD", "Serialisation and tamper evidence", "Annually"],
              ["ISO 9001", "Quality management", "Annually"],
              ["CMP-7", "Our own legibility standard, stricter than any above", "Every job"],
            ] },
          { t: "faq", h: "What customers ask", items: [
            { q: "Can you match our existing brand typeface?", a: "Only if it passes the panel at the smallest size on the pack. If it does not, we will say so in writing and we will not print it. This has cost us accounts." },
            { q: "Can the strength go in the brand colour?", a: "It can, provided colour is not the only thing distinguishing two strengths. It usually is, so usually the answer is no." },
            { q: "Who signs off artwork?", a: "Your regulatory affairs team and our technical director, both. Neither signature alone releases a job." },
          ] },
        ],
        "/enquiries": [
          { t: "contact", h: "Technical enquiries", lines: ["Carbury Medical Packaging", "Unit 9, Halbrook Industrial Estate", "Technical enquiries answered by a technician"],
            note: "We do not have a sales team. Enquiries go to the people who would make the job." },
          { t: "spec", h: "Working with us", rows: [
            ["Minimum run", "20,000 cartons. Below that we will recommend somebody else"],
            ["Artwork", "We will redraw yours free if it fails the panel"],
            ["Proofs", "Printed on the actual substrate. Never a screen proof, never a digital mock"],
            ["Change control", "Any change to a strength or a name restarts the panel. No exceptions"],
            ["Lead time", "Quoted long. We have never missed one"],
          ] },
        ],
      },
      gallery: ["Blister foil, reverse printed", "Carton with braille", "Legibility panel", "Strength line detail"],
    },
    refs: ["blister pack foil", "medicine carton braille", "pharmaceutical label detail", "small print packaging"],
  },
};

// Derived, so the address always matches the person and the domain.
function clientEmail(c){
  const first = c.who.replace(/^Dr\.\s+/, "").split(" ")[0].toLowerCase();
  return first + "@" + c.dom;
}

function clientFor(projectName){
  return CLIENTS[projectName] || null;
}
