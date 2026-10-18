// The reviewed S6 is available to every visitor. Missing assets still fail
// explicitly rather than enabling a development proxy.
export function garageS6Policy(assetUrl) {
  return assetUrl
    ? { url: assetUrl, unavailable: null }
    : { url: null, unavailable: "The S6 model is unavailable." };
}
