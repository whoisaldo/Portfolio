// The S6 asset can be exercised before its confirming review without
// changing the visitor room. Production always keeps the declared-empty
// bay, including URLs copied from a development measurement session.
export function garageS6Policy(assetUrl, { development = false, search = "" } = {}) {
  const test = development && new URLSearchParams(search).get("garage-test-s6") === "1";
  return test && assetUrl
    ? { url: assetUrl, unavailable: null }
    : { url: null, unavailable: "The S6 model is awaiting review. Its bay is empty." };
}
