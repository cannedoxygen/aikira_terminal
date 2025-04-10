// Data Flow Fragment Shader for Aikira Terminal
// Creates flowing data stream effects in the background

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
const vec3 DARK_BG = vec3(0.07, 0.08, 0.1);        // #12151a

// Random function for noise generation
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// 2D Noise function
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    // Smooth interpolation
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + 
           (c - a) * u.y * (1.0 - u.x) + 
           (d - b) * u.x * u.y;
}

// Function to create pulsing lines
float dataLine(vec2 uv, float offset, float speed, float thickness) {
    // Moving the line with time
    float pos = mod(u_time * speed + offset, 2.0) - 1.0;
    
    // Calculate distance to the line
    float line = smoothstep(thickness, 0.0, abs(uv.y - pos));
    
    // Add some variation based on x-position
    line *= smoothstep(0.0, 0.1, noise(vec2(uv.x * 10.0, u_time * 0.5)));
    
    return line;
}

// Function to create a digital grid
float grid(vec2 uv, float size) {
    vec2 grid = fract(uv * size);
    float gridLines = smoothstep(0.95, 1.0, grid.x) + smoothstep(0.95, 1.0, grid.y);
    return gridLines * 0.3;
}

// Function to create vertical data streams
float dataStream(vec2 uv, float offset, float speed, float density) {
    // Calculate stream position
    float xPos = fract(uv.x * density + offset);
    
    // Only render streams at certain x positions
    float streamMask = step(0.5, random(vec2(floor(uv.x * density + offset), 1.0)));
    
    // Moving downward with time
    float yOffset = mod(u_time * speed + random(vec2(floor(uv.x * density + offset), 0.0)) * 10.0, 1.0);
    
    // Generate data particles in the stream
    float stream = 0.0;
    for (int i = 0; i < 5; i++) {
        float particlePos = float(i) / 5.0;
        float particleOffset = mod(yOffset + particlePos, 1.0);
        
        // Create a particle at this position
        float particle = smoothstep(0.03, 0.02, length(vec2(xPos - 0.5, uv.y - particleOffset) * vec2(4.0, 1.0)));
        
        // Fade particles as they move
        float fade = sin(particleOffset * 3.14159);
        
        stream += particle * fade;
    }
    
    return stream * streamMask;
}

// Function to create a hexagonal pattern
float hexPattern(vec2 p, float scale) {
    p *= scale;
    
    // Hex grid coordinates
    vec2 r = vec2(1.0, 1.73);
    vec2 h = r * 0.5;
    vec2 a = mod(p, r) - h;
    vec2 b = mod(p + h, r) - h;
    
    // Distance to nearest hexagon center
    float hexDist = length(a) < length(b) ? length(a) : length(b);
    
    // Create a hexagonal grid pattern
    float hex = smoothstep(0.4, 0.38, hexDist);
    float hexEdge = smoothstep(0.4, 0.36, hexDist) - smoothstep(0.35, 0.34, hexDist);
    
    return hex * 0.1 + hexEdge * 0.2;
}

void main() {
    // Normalize coordinates
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    // Create a coordinate system centered at the middle
    vec2 centered = uv - 0.5;
    centered.x *= u_resolution.x / u_resolution.y; // Adjust for aspect ratio
    
    // Background color
    vec3 color = DARK_BG;
    
    // Add subtle digital grid
    float gridEffect = grid(uv, 20.0);
    color += vec3(gridEffect) * 0.1;
    
    // Add hex pattern
    float hex = hexPattern(centered, 10.0);
    color += hex * vec3(0.1, 0.1, 0.15);
    
    // Create multiple horizontal data lines
    float lines = 0.0;
    for (int i = 0; i < 5; i++) {
        float offset = float(i) / 5.0;
        float speed = 0.2 + random(vec2(offset, 0.0)) * 0.3;
        float thickness = 0.01 + random(vec2(0.0, offset)) * 0.01;
        lines += dataLine(uv, offset, speed, thickness) * 0.15;
    }
    
    // Choose line colors
    vec3 lineColor = mix(PASTEL_TURQUOISE, LAVENDER_PURPLE, sin(u_time * 0.3) * 0.5 + 0.5);
    color += lines * lineColor;
    
    // Create vertical data streams
    float streams = 0.0;
    for (int i = 0; i < 3; i++) {
        float offset = float(i) * 1.37;
        float speed = 0.3 + random(vec2(offset, 1.0)) * 0.3;
        float density = 5.0 + random(vec2(1.0, offset)) * 10.0;
        streams += dataStream(uv, offset, speed, density) * 0.3;
    }
    
    // Choose stream colors
    vec3 streamColor = mix(SOFT_PINK, LAVENDER_PURPLE, sin(u_time * 0.2) * 0.5 + 0.5);
    color += streams * streamColor;
    
    // Add subtle noise to break up the pattern
    float noise = random(uv * u_time * 0.01) * 0.03;
    color += noise;
    
    // Create subtle pulsing glow
    float pulse = sin(u_time * 0.5) * 0.5 + 0.5;
    float radialGradient = 1.0 - length(centered) * 1.5;
    float glow = max(0.0, radialGradient * pulse * 0.1);
    color += glow * LAVENDER_PURPLE;
    
    // Mouse interaction - add subtle glow around mouse position
    vec2 mousePos = u_mouse.xy / u_resolution.xy;
    mousePos.x *= u_resolution.x / u_resolution.y;
    float mouseDist = length(centered - vec2(mousePos.x - 0.5, mousePos.y - 0.5));
    float mouseGlow = smoothstep(0.3, 0.0, mouseDist) * 0.3;
    color += mouseGlow * PASTEL_TURQUOISE;
    
    // Apply vignette effect
    float vignette = smoothstep(1.0, 0.3, length(centered * 1.5));
    color *= vignette;
    
    // Add subtle pulsing to the whole scene
    color *= 0.9 + sin(u_time * 0.2) * 0.1;
    
    // Output final color with full opacity
    gl_FragColor = vec4(color, 1.0);
}