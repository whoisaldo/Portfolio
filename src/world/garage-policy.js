// The independently reviewed S6 ships in the same room as the S4.
export function garageS6Policy(assetUrl) {
  return assetUrl
    ? { url: assetUrl, unavailable: null }
    : { url: null, unavailable: "The S6 model is unavailable." };
}
