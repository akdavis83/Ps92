const regl = createREGL();

let mousePosition = [0.5, 0.5];

const palmsImageTexture = regl.texture(document.getElementById('palms-at-night'));
const palmsImageMapsTexture = regl.texture(document.getElementById('palms-at-night-maps'));

const drawBackground = regl({
  /**
   * Depth settings
   */
  depth: {
    enable: false },


  /**
   * The vertex shader
   */
  vert: `
    precision mediump float;

    attribute vec2 a_position;
    varying vec2 v_position;

    void main() {
      v_position = (a_position + 1.0) * 0.5;
      v_position.y = 1.0 - v_position.y;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `,

  /**
   * The fragment shader
   */
  frag: `
    precision mediump float;

    varying vec2 v_position;

    void main() {
      vec2 position = v_position.xy;

      vec3 vColor = vec3(0.035, 0.07, 0.098) * (position.y + 0.4) * 1.2;
      gl_FragColor = vec4(vColor, 1.0);
    }
  `,

  attributes: {
    a_position: [
    [-1, -1], [1, -1], [-1, 1],
    [-1, 1], [1, -1], [1, 1]] },



  count: 6 });


const NUM_POINTS = 700;
const VERT_SIZE = 4 * (2 * 1);
const pointBuffer = regl.buffer(Array(NUM_POINTS).fill().map(() => {
  return [
  2 * Math.random() - 1,
  2 * Math.random() - 1,
  Math.random()];

}));
const blendWithBackground = {
  enable: true,
  func: {
    srcRGB: 'src alpha',
    srcAlpha: 1,
    dstRGB: 'one minus src alpha',
    dstAlpha: 1 },

  equation: {
    rgb: 'add',
    alpha: 'add' } };



const drawStars = regl({
  /**
   * Blend settings
   */
  blend: blendWithBackground,

  /**
   * Depth settings
   */
  depth: {
    enable: false },


  /**
   * The vertex shader
   */
  vert: `
    precision mediump float;

    attribute vec4 a_position;
    attribute vec4 a_size;

    uniform float u_dpi;
    uniform float u_tick;
    uniform float u_image_clip_x;
    uniform float u_image_clip_y;
    uniform vec2 u_mouse;

    vec2 clip(vec2 position) {
      position.x = position.x * (2.0 - (2.0 * u_image_clip_x)) + u_image_clip_x - 1.0;
      position.y = position.y * (2.0 - (2.0 * u_image_clip_y)) + u_image_clip_y - 1.0;
      return position;
    }

    vec2 depth(vec2 position) {
      vec2 intensity = vec2(0.01, 0.002);
      return position + (intensity * u_mouse);
    }

    vec2 movement(vec2 position) {
      float xRate = -0.0002;
      float yRate = 0.00007;
      return position + vec2(xRate * u_tick, yRate * u_tick) * u_dpi;
    }

    vec2 repeat(vec2 position) {
      position = (position + 1.0) / 2.0;
      position = fract(position);
      position = (position * 2.0) - 1.0;
      return position;
    }

    void main() {
      vec2 position = a_position.xy;
      position = depth(clip(position));
      position = movement(position);
      position = repeat(position);

      gl_PointSize = 1.0 + (a_size.x * 2.0);
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `,

  frag: `
    precision mediump float;

    void main() {
      if (length(gl_PointCoord.xy - 0.5) > 0.5) {
        discard;
      }

      gl_FragColor = vec4(1.0, 1.0, 1.0, 0.7);
    }
  `,

  attributes: {
    a_position: {
      buffer: pointBuffer,
      stride: VERT_SIZE,
      offset: 0 },

    a_size: {
      buffer: pointBuffer,
      stride: VERT_SIZE,
      offset: 8 } },



  uniforms: {
    u_dpi: window.devicePixelRatio || 1,
    u_image_clip_x: regl.prop('imageClipX'),
    u_image_clip_y: regl.prop('imageClipY'),
    u_tick: regl.context('tick'),
    u_mouse: regl.prop('mousePosition') },


  count: NUM_POINTS,

  primitive: 'points' });


const drawPalms = regl({
  /**
   * Blend settings
   */
  blend: blendWithBackground,

  /**
   * Depth settings
   */
  depth: {
    enable: false },


  /**
   * The vertex shader
   */
  vert: `
    precision mediump float;

    attribute vec2 a_position;
    varying vec2 v_position;

    void main() {
      v_position = (a_position + 1.0) * 0.5;
      v_position.y = 1.0 - v_position.y;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `,

  /**
   * The fragment shader
   */
  frag: `
    precision mediump float;

    #define PI 3.14159265359

    varying vec2 v_position;
    uniform float u_tick;
    uniform sampler2D u_image;
    uniform sampler2D u_maps;
    uniform float u_image_clip_x;
    uniform float u_image_clip_y;
    uniform float u_dpi;
    uniform vec2 u_resolution;

    vec2 clip(vec2 position) {
      position.x = position.x * (1.0 - (2.0 * u_image_clip_x)) + u_image_clip_x;
      position.y = position.y * (1.0 - (2.0 * u_image_clip_y)) + u_image_clip_y;
      return position;
    }

    vec2 pixel() {
      return vec2(1.0 * u_dpi) / u_resolution;
    }

    float wave(float x, float freq, float speed){
      return sin(x * freq + ((u_tick * (PI / 2.0)) * speed));
    }

    vec2 waves(vec2 position) {
      float mask = texture2D(u_maps, position).b;

      vec2 intensity = vec2(0.7, 0.4) * pixel();

      vec2 waves = vec2(
        wave(position.y, 19.0, 0.035),
        wave(position.x, 10.0, 0.05)
      );

      return position + (waves * intensity * mask);
    }

    void main() {
      vec2 position = clip(v_position.xy);

      float mask = 1.0 - texture2D(u_maps, position).r;
      vec2 turbulence = waves(position);
      vec4 color = texture2D(u_image, turbulence) * mask;

      gl_FragColor = vec4(color.rgb, mask);
    }
  `,

  attributes: {
    a_position: [
    [-1, -1], [1, -1], [-1, 1],
    [-1, 1], [1, -1], [1, 1]] },



  uniforms: {
    u_image: palmsImageTexture,
    u_maps: palmsImageMapsTexture,
    u_image_clip_x: regl.prop('imageClipX'),
    u_image_clip_y: regl.prop('imageClipY'),
    u_dpi: window.devicePixelRatio || 1,
    u_tick: regl.context('tick'),
    u_resolution: ({ viewportWidth, viewportHeight }) =>
    [viewportWidth, viewportHeight] },


  count: 6 });


regl.frame(({ viewportWidth, viewportHeight }) => {
  regl.clear({
    color: [0, 0, 0, 1],
    depth: 1 });


  const clips = getClips(
  palmsImageTexture.width, palmsImageTexture.height,
  viewportWidth, viewportHeight);


  drawBackground();

  drawStars({
    imageClipX: clips.x,
    imageClipY: clips.y,
    mousePosition });


  drawPalms({
    imageClipX: clips.x,
    imageClipY: clips.y });

});

const curve = (v, p = 0.8) => v == 0 ?
0 :
Math.pow(Math.abs(v), p) * (v / Math.abs(v));

const smooth = (n = 6) => {
  let samples = [];
  return v => {
    samples = samples.concat(v);
    if (samples.length > n) {
      samples = samples.slice(samples.length - n, samples.length);
    }

    return samples.reduce((l, cur) => l + cur) / samples.length;
  };
};

const isTouchDevice = ('ontouchstart' in document.documentElement);
const smoothX = smooth();
const smoothY = smooth();

/**
 * Listen to the mouse or device motion events
 */
if (!isTouchDevice) {
  window.addEventListener('mousemove', function (event) {
    mousePosition = [
    -curve(-1 + event.pageX / window.innerWidth * 2),
    -curve(-1 + event.pageY / window.innerHeight * 2)];

  });
}

if (isTouchDevice) {
  window.addEventListener('devicemotion', function (event) {
    mousePosition = [
    curve(smoothX(-event.accelerationIncludingGravity.x)) * 2,
    curve(smoothY(-event.accelerationIncludingGravity.y))];

  });
}

function getClips(
imageWidth, imageHeight,
containerWidth, containerHeight)
{
  const clips = {
    x: 0,
    y: 0 };


  const imageRatio = imageWidth / imageHeight;
  const containerRatio = containerWidth / containerHeight;

  if (imageRatio > containerRatio) {
    const scale = containerHeight / imageHeight;
    const width = imageWidth * scale;
    clips.x = Math.abs((containerWidth - width) / width / 2);
  } else {
    const scale = containerWidth / imageWidth;
    const height = imageHeight * scale;
    clips.y = Math.abs((containerHeight - height) / height / 2);
  }

  return clips;
}