export const AVATAR_SIZE = 320;
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 0.01;
export const AVATAR_CROP_DIAMETER = 280;
export const AVATAR_EXPORT_SIZE = 512;

export type AvatarCropperState = {
  fileName: string;
  imageUrl: string;
  zoom: number;
  position: {
    x: number;
    y: number;
  };
};

export type AvatarImageSize = {
  width: number;
  height: number;
};

export type AvatarRenderLayout = {
  width: number;
  height: number;
  left: number;
  top: number;
};

export function createAvatarCropperState(fileName: string, imageUrl: string): AvatarCropperState {
  return {
    fileName,
    imageUrl,
    zoom: MIN_ZOOM,
    position: defaultAvatarPosition(),
  };
}

export function defaultAvatarPosition() {
  return {
    x: AVATAR_SIZE / 2,
    y: AVATAR_SIZE / 2,
  };
}

export function getAvatarBaseScale(image: AvatarImageSize) {
  return Math.max(AVATAR_SIZE / image.width, AVATAR_SIZE / image.height);
}

export function getAvatarContainZoom(image: AvatarImageSize) {
  const containScale = Math.min(AVATAR_SIZE / image.width, AVATAR_SIZE / image.height);
  return containScale / getAvatarBaseScale(image);
}

export function getAvatarScaledSize(image: AvatarImageSize, zoom: number) {
  const scale = getAvatarBaseScale(image) * zoom;
  return {
    width: image.width * scale,
    height: image.height * scale,
  };
}

export function clampAvatarPosition(position: { x: number; y: number }, scaled: { width: number; height: number }) {
  const edgeX1 = AVATAR_SIZE - scaled.width / 2;
  const edgeX2 = scaled.width / 2;
  const edgeY1 = AVATAR_SIZE - scaled.height / 2;
  const edgeY2 = scaled.height / 2;

  const minX = Math.min(edgeX1, edgeX2);
  const maxX = Math.max(edgeX1, edgeX2);
  const minY = Math.min(edgeY1, edgeY2);
  const maxY = Math.max(edgeY1, edgeY2);

  return {
    x: clamp(position.x, minX, maxX),
    y: clamp(position.y, minY, maxY),
  };
}

export function getAvatarRenderLayout(image: AvatarImageSize, zoom: number, position: { x: number; y: number }): AvatarRenderLayout {
  const scaled = getAvatarScaledSize(image, zoom);
  const clamped = clampAvatarPosition(position, scaled);

  return {
    width: scaled.width,
    height: scaled.height,
    left: clamped.x - scaled.width / 2,
    top: clamped.y - scaled.height / 2,
  };
}

export function normalizeAvatarState(state: AvatarCropperState, image: AvatarImageSize): AvatarCropperState {
  const scaled = getAvatarScaledSize(image, state.zoom);
  return {
    ...state,
    position: clampAvatarPosition(state.position, scaled),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
