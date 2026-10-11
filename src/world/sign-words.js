// src/world/sign-words.js: more of the street's standard signs, after the
// designs STREET_SIGNS (src/data/world.js) lists per size. That module is in
// the page's entry chunk, which /recruiters loads too, so it is never
// edited; signs.js hands the faces of each size out over both lists, so a
// street repeats a word only every few dozen signs. Invented and generic
// words only (what the shop sells, what it is), no brand; the icons are new
// pictograms drawn in tube by signs.js.
export const MORE_STREET_SIGNS = {
  bs: [
    { lines: ["湯"], color: "#27dcf2", style: "backlit" },
    { lines: ["宿"], color: "#ffb254", style: "tube" },
    { lines: ["夢"], color: "#ff3fd2", style: "outline" },
    { lines: ["鬼"], color: "#ff2b2b", style: "tube" },
    { lines: ["電"], color: "#2f7bff", style: "backlit" },
    { lines: ["金"], color: "#fcee0a", style: "tube" },
    { lines: ["猫"], color: "#2ee6c8", style: "outline" },
    { lines: ["刺青"], color: "#a24bff", style: "tube" },
    { lines: ["VR"], color: "#27dcf2", style: "led", latin: true },
    { lines: ["麺"], color: "#ff6a2a", style: "backlit" },
  ],
  bm: [
    { lines: ["中華"], color: "#ff2b2b", style: "backlit" },
    { lines: ["寿司"], color: "#eceae4", style: "tube" },
    { lines: ["薬局"], color: "#39ff9a", style: "backlit" },
    { lines: ["整形"], color: "#ff3fd2", style: "tube" },
    { lines: ["銭湯"], color: "#27dcf2", style: "outline" },
    { lines: ["夜食"], color: "#ffb254", style: "tube" },
    { lines: ["雀荘"], color: "#2ee6c8", style: "tube" },
    { lines: ["古着"], color: "#a24bff", style: "backlit" },
    { lines: ["弁当"], color: "#ffd24a", style: "tube" },
    { lines: ["修理"], color: "#2f7bff", style: "outline" },
  ],
  bl: [
    { lines: ["義眼クリニック"], color: "#27dcf2", style: "tube" },
    { lines: ["ネオン横丁"], color: "#ff2e88", style: "outline" },
    { lines: ["電脳カフェ"], color: "#2ee6c8", style: "backlit" },
    { lines: ["深夜営業"], color: "#fcee0a", style: "tube" },
    { lines: ["立ち飲み屋"], color: "#ffb254", style: "tube" },
    { lines: ["回転寿司"], color: "#ff3a2a", style: "backlit" },
    { lines: ["二十四時間"], color: "#39ff9a", style: "outline" },
    { lines: ["闇医者"], color: "#a24bff", style: "tube" },
  ],
  ps: [
    { lines: ["NOODLES"], color: "#ff6a2a", style: "tube" },
    { lines: ["LIQUOR 酒"], color: "#ffd24a", style: "backlit" },
    { lines: ["OPEN LATE"], color: "#ff2e88", style: "led" },
    { lines: ["KARAOKE"], color: "#a24bff", style: "tube" },
    { lines: ["SUSHI 鮨"], color: "#eceae4", style: "backlit" },
    { lines: ["VR ROOMS"], color: "#27dcf2", style: "outline" },
    { lines: ["ARCADE"], color: "#fcee0a", style: "tube" },
    { lines: ["HOSTEL"], color: "#2ee6c8", style: "backlit" },
  ],
  pm: [
    { lines: ["PHARMACY", "薬"], color: "#39ff9a", style: "backlit" },
    { lines: ["HOSTEL", "宿"], color: "#ffb254", style: "tube" },
    { lines: ["LIQUOR STORE"], color: "#ffd24a", style: "outline" },
    { lines: ["VR ARCADE"], color: "#27dcf2", style: "tube" },
    { lines: ["IMPLANTS", "義体"], color: "#ff3fd2", style: "tube" },
    { lines: ["LOVE HOTEL"], color: "#ff2e88", style: "outline" },
    { lines: ["DUMPLINGS 餃子"], color: "#ff6a2a", style: "backlit" },
    { lines: ["REPAIRS", "修理"], color: "#2f7bff", style: "led" },
  ],
  bx: [
    { icon: "pill", color: "#39ff9a", style: "icon" },
    { icon: "chip", color: "#27dcf2", style: "icon" },
    { icon: "star", color: "#fcee0a", style: "icon" },
    { icon: "moon", color: "#a24bff", style: "icon" },
    { icon: "arrow", color: "#ff2e88", style: "icon" },
    { icon: "umbrella", color: "#2ee6c8", style: "icon" },
    { icon: "note", color: "#ff3fd2", style: "icon" },
    { icon: "waves", color: "#2f7bff", style: "icon" },
  ],
};
