// Keep the provisional car off the public path until its replacement passes
// review. Development measurements can still load that real GLB explicitly.
export function garageS6Policy(assetUrl, { development = false, search = "" } = {}) {
  const test = development && new URLSearchParams(search).get("garage-test-s6") === "1";
  return test && assetUrl
    ? { url: assetUrl, unavailable: null }
    : { url: null, unavailable: "The S6 model is being rebuilt. Its bay is empty." };
}
