"use strict";
/* Brand marks.
 *
 * One drawn logo per client, as vector rather than as a generated texture —
 * a mark is the one image on a site that has to look like somebody was paid
 * for it. Each is built on a 64-unit square, flat, two colours, and designed
 * to still read at 24 px in a masthead.
 *
 * %B% is the client's brand colour, %C% their second, %G% the page ground.
 * They are substituted at render time from the theme in clients.js, so a mark
 * cannot drift out of step with the palette around it.
 *
 * These are mirrored as an editable Figma file — see README. Imagery.mark()
 * remains the fallback for any client without a drawn mark here.
 */

const BRANDMARKS = {

  // Marrow & Co. — an M struck into a plate, slightly out of register.
  "marrowandco.com":
    '<rect x="5" y="5" width="54" height="54" fill="%C%"/>' +
    '<rect x="8" y="8" width="54" height="54" fill="%B%" opacity=".25"/>' +
    '<path d="M15 47V17h6l11 15 11-15h6v30h-7V30L32 45 22 30v17z" fill="%B%"/>',

  // Metropolitan Transit — a chevron with a route bar cut through it.
  "ride-mta.gov":
    '<path d="M8 14h17l19 18-19 18H8l19-18z" fill="%B%"/>' +
    '<rect x="8" y="28" width="30" height="8" fill="%C%"/>',

  // The Blue Hour Diner — a neon ring over the curve of the counter.
  "bluehourdiner.com":
    '<circle cx="32" cy="30" r="20" fill="none" stroke="%B%" stroke-width="5"/>' +
    '<path d="M14 34a18 18 0 0 0 36 0" fill="none" stroke="%C%" stroke-width="5" stroke-linecap="round"/>' +
    '<rect x="29" y="52" width="6" height="8" rx="2" fill="%C%"/>',

  // Glasshouse Labs — the gable of a glasshouse, holding one drop.
  "glasshouse.io":
    '<path d="M32 7 57 25v31H7V25z" fill="none" stroke="%C%" stroke-width="5" stroke-linejoin="round"/>' +
    '<path d="M32 25c6 9 10 13 10 18a10 10 0 0 1-20 0c0-5 4-9 10-18z" fill="%B%"/>',

  // Fairwater Cooperative — a shield with the water it is named for.
  "fairwater.coop":
    '<path d="M32 5l23 8v17c0 16-11 25-23 29C20 55 9 46 9 30V13z" fill="%B%"/>' +
    '<path d="M16 29c5-5 11-5 16 0s11 5 16 0" fill="none" stroke="%C%" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M16 40c5-5 11-5 16 0s11 5 16 0" fill="none" stroke="%C%" stroke-width="4" stroke-linecap="round" opacity=".6"/>',

  // Repeater Audio — the loop, and the point you keep returning to.
  "repeater.audio":
    '<path d="M45 21H25a11 11 0 0 0 0 22h3" fill="none" stroke="%B%" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M38 13l9 8-9 8" fill="none" stroke="%B%" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="44" cy="43" r="6" fill="%C%"/>',

  // Ninth Bell Games — the bell, ninth of the shift.
  "ninthbell.games":
    '<path d="M32 11c8 0 13 6 13 14v11l5 8H14l5-8V25c0-8 5-14 13-14z" fill="%B%"/>' +
    '<rect x="26" y="46" width="12" height="7" rx="3.5" fill="%C%"/>' +
    '<rect x="29" y="4" width="6" height="7" rx="3" fill="%C%"/>',

  // Soft Service — a cushion and the frame under it.
  "softservice.furniture":
    '<rect x="13" y="17" width="38" height="17" rx="8.5" fill="%C%"/>' +
    '<rect x="7" y="30" width="50" height="19" rx="6" fill="%B%"/>' +
    '<rect x="12" y="49" width="5" height="9" rx="1" fill="%C%"/>' +
    '<rect x="47" y="49" width="5" height="9" rx="1" fill="%C%"/>',

  // Cold Orbit Pictures — a body, and the track it is being met on.
  "coldorbit.film":
    '<circle cx="32" cy="32" r="12" fill="%B%"/>' +
    '<ellipse cx="32" cy="32" rx="27" ry="10" fill="none" stroke="%C%" stroke-width="4" transform="rotate(-24 32 32)"/>',

  // Vacant Lot Press — something coming up through the slab.
  "vacantlotpress.org":
    '<rect x="5" y="45" width="54" height="7" fill="%C%"/>' +
    '<path d="M32 47V20" stroke="%B%" stroke-width="4" stroke-linecap="round" fill="none"/>' +
    '<path d="M32 34c-9 0-13-6-13-12 8 0 13 5 13 12z" fill="%B%"/>' +
    '<path d="M32 27c8 0 12-5 12-11-7 0-12 4-12 11z" fill="%B%" opacity=".65"/>',

  // Longform Records — a record, and the horizon of the winter it came from.
  "longform.rec":
    '<circle cx="32" cy="32" r="23" fill="none" stroke="%C%" stroke-width="3"/>' +
    '<circle cx="32" cy="32" r="14" fill="none" stroke="%C%" stroke-width="3" opacity=".55"/>' +
    '<rect x="4" y="30" width="56" height="4" fill="%B%"/>' +
    '<circle cx="32" cy="32" r="5" fill="%B%"/>',

  // Aldworth Academic — an A, with the crossbar as a shelf.
  "aldworth.press":
    '<path d="M32 10 12 54h9l3-9h16l3 9h9z" fill="%B%"/>' +
    '<rect x="25" y="31" width="14" height="6" fill="%C%"/>',

  // Paper Lantern Animation — the lantern, lit from inside.
  "paperlantern.studio":
    '<rect x="24" y="5" width="16" height="4" rx="2" fill="%C%"/>' +
    '<path d="M32 11c10 0 17 8 17 19s-7 19-17 19-17-8-17-19S22 11 32 11z" fill="%B%"/>' +
    '<path d="M32 11v38" stroke="%C%" stroke-width="2" opacity=".45"/>' +
    '<rect x="22" y="53" width="20" height="4" rx="2" fill="%C%"/>',

  // Deadlight Interactive — one lamp, four of you underneath it.
  "deadlight.games":
    '<path d="M32 7l19 39H13z" fill="%B%" opacity=".8"/>' +
    '<circle cx="32" cy="14" r="5" fill="%C%"/>' +
    '<circle cx="20" cy="54" r="4.5" fill="%C%"/>' +
    '<circle cx="32" cy="54" r="4.5" fill="%C%"/>' +
    '<circle cx="44" cy="54" r="4.5" fill="%C%"/>',

  // Tallgrass Children's — grass, taller than you are.
  "tallgrass.tv":
    '<path d="M19 55c0-17 3-27 9-33" stroke="%B%" stroke-width="5" stroke-linecap="round" fill="none"/>' +
    '<path d="M32 55c0-21 5-33 13-39" stroke="%C%" stroke-width="5" stroke-linecap="round" fill="none"/>' +
    '<path d="M45 55c0-12 2-21 6-26" stroke="%B%" stroke-width="5" stroke-linecap="round" fill="none" opacity=".6"/>',

  // Northlight Documentary — a light, and how far it is claimed to reach.
  "northlight.doc":
    '<path d="M6 45a26 26 0 0 1 52 0" fill="none" stroke="%C%" stroke-width="4" opacity=".45"/>' +
    '<path d="M15 45a17 17 0 0 1 34 0" fill="none" stroke="%C%" stroke-width="4"/>' +
    '<rect x="29" y="7" width="6" height="15" rx="3" fill="%B%"/>' +
    '<circle cx="32" cy="45" r="7" fill="%B%"/>',

  // Clearing House — three stages, and they do not line up.
  "clearinghouse.co":
    '<rect x="7" y="15" width="40" height="9" rx="4.5" fill="%B%"/>' +
    '<rect x="17" y="28" width="40" height="9" rx="4.5" fill="%C%"/>' +
    '<rect x="7" y="41" width="29" height="9" rx="4.5" fill="%B%" opacity=".55"/>',

  // Standing Wave Ensemble — the wave, and the two fixed ends of it.
  "standingwave.live":
    '<path d="M6 32c6-19 12-19 18 0s12 19 18 0 12-19 16 0" fill="none" stroke="%B%" stroke-width="4"/>' +
    '<circle cx="6" cy="32" r="4.5" fill="%C%"/>' +
    '<circle cx="58" cy="32" r="4.5" fill="%C%"/>',

  // The Weekly Counterweight — the mass on the other end of the beam.
  "counterweight.press":
    '<circle cx="18" cy="21" r="10" fill="%B%"/>' +
    '<rect x="38" y="33" width="19" height="19" fill="%C%"/>' +
    '<rect x="5" y="29" width="54" height="5" rx="2" fill="%C%"/>',

  // Meridian Airport — a wing, and the line it is measured from.
  "meridian-airport.aero":
    '<path d="M32 7l21 36-21-10-21 10z" fill="%B%"/>' +
    '<rect x="9" y="50" width="46" height="5" rx="2.5" fill="%C%"/>',

  // Kettleburn Deep Repository — the spike field, and the ground it stands on.
  "kettleburn-repository.org":
    '<path d="M16 46 20 14l4 32z" fill="%B%"/>' +
    '<path d="M29 46 32 8l3 38z" fill="%B%"/>' +
    '<path d="M42 46 45 18l3 28z" fill="%B%" opacity=".7"/>' +
    '<rect x="5" y="46" width="54" height="6" fill="%C%"/>' +
    '<rect x="5" y="55" width="54" height="3" fill="%C%" opacity=".45"/>',

  // Rota — two shifts changing places.
  "rota.health":
    '<path d="M18 24h20a10 10 0 0 1 0 20" fill="none" stroke="%B%" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M24 17l-7 7 7 7" fill="none" stroke="%B%" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M46 40H26a10 10 0 0 1 0-20" fill="none" stroke="%C%" stroke-width="5" stroke-linecap="round" opacity=".75"/>' +
    '<path d="M40 47l7-7-7-7" fill="none" stroke="%C%" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>',

  // Thackray Museum — the ribs, and the line they hang from.
  "thackraymuseum.org":
    '<rect x="6" y="12" width="52" height="4" rx="2" fill="%C%"/>' +
    '<path d="M14 16c0 14 4 24 10 30" fill="none" stroke="%B%" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M25 16c0 16 4 28 10 34" fill="none" stroke="%B%" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M36 16c0 14 3 24 8 30" fill="none" stroke="%B%" stroke-width="4" stroke-linecap="round" opacity=".75"/>' +
    '<path d="M47 16c0 11 2 19 6 24" fill="none" stroke="%B%" stroke-width="4" stroke-linecap="round" opacity=".5"/>',

  // The Havenmouth Almanac — high water, low water, and the mark between.
  "havenmouthalmanac.co":
    '<path d="M5 26c7-7 14-7 21 0s14 7 21 0 7-5 12-2" fill="none" stroke="%B%" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M5 40c7-7 14-7 21 0s14 7 21 0 7-5 12-2" fill="none" stroke="%B%" stroke-width="4" stroke-linecap="round" opacity=".5"/>' +
    '<rect x="28" y="8" width="6" height="48" rx="1" fill="%C%"/>' +
    '<rect x="22" y="20" width="18" height="4" fill="%C%"/>' +
    '<rect x="22" y="44" width="18" height="4" fill="%C%" opacity=".6"/>',

  // Meridian Broadcasting — a hand, holding a shape that means something.
  "meridianbroadcast.tv":
    '<rect x="24" y="10" width="7" height="22" rx="3.5" fill="%B%"/>' +
    '<rect x="33" y="14" width="7" height="18" rx="3.5" fill="%B%"/>' +
    '<rect x="42" y="20" width="7" height="14" rx="3.5" fill="%B%" opacity=".7"/>' +
    '<path d="M20 30c0-4 4-6 6-3l3 5V30h22v9a15 15 0 0 1-15 15h-4a13 13 0 0 1-9-4l-9-11c-2-3 2-6 4-4z" fill="%C%"/>',

  // Air Accidents Investigation Branch — the trace, and where it stops.
  "aaib-investigations.gov":
    '<path d="M6 44h52" stroke="%C%" stroke-width="3" opacity=".4" fill="none"/>' +
    '<path d="M6 20c10 0 14 4 20 10s10 12 18 14" fill="none" stroke="%B%" stroke-width="4" stroke-linecap="round"/>' +
    '<circle cx="44" cy="44" r="6" fill="%C%"/>' +
    '<rect x="42" y="50" width="4" height="8" fill="%C%" opacity=".5"/>',

  // Carbury Medical Packaging — a capsule, and the blister it sits in.
  "carburymedical.com":
    '<rect x="8" y="8" width="48" height="48" rx="6" fill="none" stroke="%C%" stroke-width="4"/>' +
    '<rect x="18" y="18" width="28" height="14" rx="7" fill="%B%"/>' +
    '<rect x="32" y="18" width="14" height="14" rx="7" fill="%C%"/>' +
    '<circle cx="22" cy="44" r="4" fill="%C%" opacity=".55"/>' +
    '<circle cx="32" cy="44" r="4" fill="%C%" opacity=".55"/>' +
    '<circle cx="42" cy="44" r="4" fill="%C%" opacity=".55"/>',

  // Showcard Type Foundry — one brushed S, inside the corners of a card.
  "showcardtype.com":
    '<path d="M46 18c-4-5-22-6-22 4 0 8 20 4 20 12 0 10-18 10-22 5" fill="none" stroke="%B%" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M7 17V7h10" fill="none" stroke="%C%" stroke-width="4"/>' +
    '<path d="M57 47v10H47" fill="none" stroke="%C%" stroke-width="4"/>',
};

/* Returns an inline <svg> for a client, coloured from their theme.
 * Inline rather than a data URI so it stays sharp at any size and inherits
 * nothing it should not. */
function brandmarkSVG(c, t, size){
  const body = BRANDMARKS[c.dom];
  if (!body) return null;
  const painted = body
    .replace(/%B%/g, t.brand)
    .replace(/%C%/g, t.brand2)
    .replace(/%G%/g, t.bg);
  return '<svg class="brandmark" width="' + size + '" height="' + size + '" viewBox="0 0 64 64" ' +
    'role="img" aria-label="' + String(c.co).replace(/[&<>"]/g, "") + ' mark" ' +
    'xmlns="http://www.w3.org/2000/svg">' + painted + "</svg>";
}
