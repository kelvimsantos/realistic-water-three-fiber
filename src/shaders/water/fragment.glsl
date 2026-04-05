precision highp float;

uniform vec3 uDepthColor;
uniform vec3 uSurfaceColor;
uniform vec3 uCameraPosition;

varying vec3 vPosition;
varying vec3 vNormal;

void main() {
    // usa normal do vertex (seguro)
    vec3 normal = normalize(vNormal);

    vec3 viewDir = normalize(uCameraPosition - vPosition);

    // fresnel
    float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);

    // profundidade fake
    float depth = clamp((vPosition.y + 1.0) * 0.5, 0.0, 1.0);

    vec3 color = mix(uDepthColor, uSurfaceColor, depth);

    // reflexão fake
    color = mix(color, vec3(1.0), fresnel * 0.4);

    gl_FragColor = vec4(color, 0.85);
}