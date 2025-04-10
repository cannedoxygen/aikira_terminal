// Constitutional Glow Fragment Shader for Aikira Terminal
// Provides a glowing effect for the constitutional core display

#ifdef GL_ES
precision mediump float;
#endif

// Uniforms passed from JavaScript
uniform vec2 u_resolution; // Canvas size (width, height)
uniform float u_time;      // Time in seconds since load
uniform vec2 u_mouse;      // Mouse position in normalized coordinates

// Constants for the color palette
const vec3 SOFT_PINK = vec3(1.0, 0.84, 0.93);      // #FFD6EC
const vec3 LAVENDER_PURPLE = vec3(0.85, 0.71, 1.0); // #D8B5FF
const vec3 PASTEL_TURQUOISE = vec3(0.66, 0.93, 0.9); // #A9EEE6

// Function to create a soft glow effect
float softGlow(vec2 position, vec2 center, float radius, float intensity) {
    float dist = distance(position, center);
    return intensity * smoothstep(radius, 0.0, dist);
}

// Function to blend between colors based on a parameter t
vec3 blendColors(vec3 colorA, vec3 colorB, float t) {
    return mix(colorA, colorB, t);
}

// Main function
void main() {
    // Normalize coordinates
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    st.x *= u_resolution.x / u_resolution.y; // Adjust for aspect ratio
    
    // Center position
    vec2 center = vec2(0.5 * u_resolution.x / u_resolution.y, 0.5);
    
    // Time-based oscillation values
    float oscillation1 = sin(u_time * 0.3) * 0.5 + 0.5;
    float oscillation2 = sin(u_time * 0.2 + 1.5) * 0.5 + 0.5;
    float oscillation3 = sin(u_time * 0.1 + 3.0) * 0.5 + 0.5;
    
    // Create multiple glowing orbs that move slightly with time
    float glow1 = softGlow(st, center + vec2(sin(u_time * 0.2) * 0.1, cos(u_time * 0.3) * 0.1), 0.4, 0.8 * oscillation1);
    float glow2 = softGlow(st, center + vec2(cos(u_time * 0.25) * 0.15, sin(u_time * 0.15) * 0.12), 0.3, 0.7 * oscillation2);
    float glow3 = softGlow(st, center + vec2(sin(u_time * 0.15 + 2.0) * 0.08, cos(u_time * 0.2 + 1.0) * 0.08), 0.35, 0.6 * oscillation3);
    
    // Combine glows
    float finalGlow = glow1 + glow2 + glow3;
    finalGlow = min(finalGlow, 1.0); // Clamp to maximum of 1.0
    
    // Blend the three colors based on oscillations
    vec3 color1 = blendColors(SOFT_PINK, LAVENDER_PURPLE, oscillation1);
    vec3 color2 = blendColors(LAVENDER_PURPLE, PASTEL_TURQUOISE, oscillation2);
    vec3 finalColor = blendColors(color1, color2, oscillation3);
    
    // Create a subtle hexagonal pattern
    vec2 hexCoord = st * 10.0; // Scale for more hexagons
    hexCoord.y *= 0.866; // Scale y for proper hexagon aspect ratio
    
    vec2 gridPos = mod(hexCoord, 2.0) - 1.0;
    float hexDist = length(gridPos);
    
    // Add subtle hexagonal grid to the glow
    float hexPattern = smoothstep(1.1, 1.0, hexDist) * 0.1;
    
    // Add a slight pulsing effect to the whole shader
    float pulse = sin(u_time * 0.5) * 0.05 + 0.95;
    
    // Calculate final color with alpha for the glow
    vec4 fragColor = vec4(finalColor, finalGlow * pulse + hexPattern);
    
    // Apply a subtle vignette effect
    float vignette = 1.0 - length(st - center) * 0.7;
    vignette = smoothstep(0.0, 0.5, vignette);
    
    // Add mouse interaction for subtle brightness increase near cursor
    vec2 mousePos = u_mouse / u_resolution.xy;
    mousePos.x *= u_resolution.x / u_resolution.y; // Adjust for aspect ratio
    float mouseDist = distance(st, mousePos);
    float mouseGlow = smoothstep(0.2, 0.0, mouseDist) * 0.2;
    
    // Add the vignette and mouse interaction to the final color
    fragColor.rgb *= vignette + mouseGlow;
    fragColor.a *= vignette;
    
    // Output the final color
    gl_FragColor = fragColor;
}