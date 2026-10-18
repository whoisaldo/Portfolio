// Keep Three's decoded-frame notifications and native video upload path.
// Browsers without those callbacks can still avoid repeated uploads when
// their decoded-frame counter has not advanced.
import * as THREE from "three";

export function createGarageVideoTexture(video, bind) {
  let texture = null, disposed = false, frame = null, width = 0, height = 0;
  const hasCallback = typeof video.requestVideoFrameCallback === "function";
  const picture = () => video.getVideoPlaybackQuality?.().totalVideoFrames ?? video.currentTime;
  const updateFrame = () => {
    if (disposed || hasCallback || video.readyState < 2 || !texture) return;
    const next = picture();
    if (next !== frame) {
      frame = next;
      texture.needsUpdate = true;
    }
  };
  const update = () => {
    if (disposed || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    if (!texture || width !== video.videoWidth || height !== video.videoHeight) {
      width = video.videoWidth; height = video.videoHeight;
      video.width = width;
      video.height = height;
      texture?.dispose();
      texture = new THREE.VideoTexture(video);
      texture.update = updateFrame;
      texture.name = "garage moon video frames";
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.internalFormat = "RGBA8";
      texture.userData.frameSize = `${width}x${height}`;
      frame = picture();
      texture.needsUpdate = true;
      bind(texture);
    }
    updateFrame();
  };
  const seeked = () => {
    update();
    if (!disposed && texture && video.readyState >= 2) texture.needsUpdate = true;
  };
  update();
  video.addEventListener?.("seeked", seeked);
  return {
    update,
    dispose() {
      disposed = true;
      video.removeEventListener?.("seeked", seeked);
      texture?.dispose();
    },
  };
}
