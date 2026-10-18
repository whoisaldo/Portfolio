// src/world/pictures.js: a picture for a texture, decoded as it lands.
//
// THREE.TextureLoader hands back an <img>, and Chrome decodes an <img> on the
// page's own thread the first time it is uploaded: the adverts' atlas took
// 95 to 230 ms there, a 2048 pixel atlas of logos 25 to 60, while the city's
// first frame waited. ImageBitmapLoader decodes it off that thread as it
// arrives. A bitmap cannot be turned over at upload, so it is decoded the
// way round it is drawn: `flip` for a picture drawn as TextureLoader's was
// (flipY true), not for one whose texture sets flipY false. Same pixels:
// premultiplyAlpha none, and the city's pictures carry no colour profile.
import * as THREE from "three";

export function bitmapTexture(url, flip) {
  const loader = new THREE.ImageBitmapLoader().setOptions({ imageOrientation: flip ? "flipY" : "from-image", premultiplyAlpha: "none" });
  return loader.loadAsync(url).then((image) => {
    const texture = new THREE.Texture(image);
    texture.flipY = false;
    texture.needsUpdate = true;
    return texture;
  });
}
