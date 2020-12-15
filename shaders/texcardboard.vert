attribute vec2 a_position;
attribute vec2 a_texture;
varying vec2 v_position;
varying vec2 v_texture;

void main() {
  gl_Position = vec4(a_position, 0, 1);
  v_position = a_position;
  v_texture = a_texture;
}