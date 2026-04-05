uniform float uTime;

varying vec3 vPosition;
varying vec3 vNormal;

#define WAVE_COUNT 4

vec3 gerstnerWave(vec3 pos, float steepness, float wavelength, vec2 direction) {
    float k = 2.0 * 3.1415 / wavelength;
    float c = sqrt(9.8 / k);

    vec2 d = normalize(direction);
    float f = k * (dot(d, pos.xz) - c * uTime);
    float a = steepness / k;

    return vec3(
        d.x * (a * cos(f)),
        a * sin(f),
        d.y * (a * cos(f))
    );
}

void main() {
    vec3 pos = position;

    pos += gerstnerWave(pos, 0.3, 8.0, vec2(1.0, 0.5));
    pos += gerstnerWave(pos, 0.2, 5.0, vec2(-0.7, 0.3));
    pos += gerstnerWave(pos, 0.15, 12.0, vec2(0.2, 1.0));
    pos += gerstnerWave(pos, 0.1, 20.0, vec2(-1.0, -0.2));

    vPosition = pos;

    // ⚠️ normal fake temporária (corrigimos depois)
    vNormal = normalize(normalMatrix * normal);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}