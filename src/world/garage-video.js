// The monitor uploads only when its decoded picture changes. Keep Three's
// native video uploader, with invalidation owned by the decoded callbacks.
// Media time matters as well as the frame counter: a paused seek can change
// the picture without advancing the presented-frame count. Browsers without
// decoded callbacks use their frame counter and explicit seek events.
import * as THREE from "three";

export function createGarageVideoTexture(video, bind) {
  let texture = null, callback = 0, disposed = false;
  let frame = null, time = NaN;
  const hasCallback = typeof video.requestVideoFrameCallback === "function";
  const refresh = (nextFrame, nextTime) => {
    if (disposed || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    const size = `${video.videoWidth}x${video.videoHeight}`;
    if (texture?.userData.frameSize !== size) {
      video.width = video.videoWidth;
      video.height = video.videoHeight;
      texture?.dispose();
      texture = new THREE.Texture(video);
      texture.isVideoTexture = true;
      texture.update = update;
      texture.name = "garage moon video frames";
      texture.minFilter = texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.internalFormat = "RGBA8";
      texture.userData.frameSize = size;
      frame = null; time = NaN;
      bind(texture);
    }
    if (nextFrame !== frame || nextTime !== time) {
      frame = nextFrame; time = nextTime;
      texture.needsUpdate = true;
    }
  };
  const update = () => {
    if (hasCallback) return;
    const frames = video.getVideoPlaybackQuality?.().totalVideoFrames;
    refresh(frames ?? null, frames == null ? video.currentTime : time);
  };
  const seeked = () => refresh(video.getVideoPlaybackQuality?.().totalVideoFrames ?? null, video.currentTime);
  const decoded = (_now, metadata) => {
    if (disposed) return;
    refresh(metadata.presentedFrames ?? null, metadata.mediaTime);
    callback = video.requestVideoFrameCallback(decoded);
  };
  refresh(video.getVideoPlaybackQuality?.().totalVideoFrames ?? null, video.currentTime);
  if (hasCallback) callback = video.requestVideoFrameCallback(decoded);
  else video.addEventListener?.("seeked", seeked);
  return {
    update,
    dispose() {
      disposed = true;
      if (callback) video.cancelVideoFrameCallback(callback);
      video.removeEventListener?.("seeked", seeked);
      callback = 0;
      texture?.dispose();
    },
  };
}
