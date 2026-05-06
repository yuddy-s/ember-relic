precision mediump float;

varying vec4 v_Position;
uniform vec4 u_Color;
uniform vec2 u_Size;

float linear_laser(vec4 position){
    float safeWidth = max(u_Size.x, 0.0001);
    float safeHeight = max(u_Size.y, 0.0001);

    // Convert local quad coordinates into normalized beam-space coordinates
    // so the vertical falloff stays consistent at any aspect ratio.
    float halfX = 0.5;
    float halfY = 0.5 * min(1.0, safeHeight / safeWidth);
    float yNorm = abs(position.y) / max(halfY, 0.0001);
    float xNorm = abs(position.x) / halfX;

    float core = 1.0 - smoothstep(0.00, 0.24, yNorm);
    float edge = 1.0 - smoothstep(0.24, 1.00, yNorm);
    float centerline = max(core, edge * 0.60);

    // Softly fade beam intensity near ends while keeping center strong.
    float endFade = 1.0 - smoothstep(0.72, 1.00, xNorm);
    float tipFeather = 1.0 - smoothstep(0.90, 1.00, xNorm);

    return centerline * endFade * tipFeather;
}

void main(){
    gl_FragColor = u_Color;
    gl_FragColor.a = u_Color.a * linear_laser(v_Position);
}
