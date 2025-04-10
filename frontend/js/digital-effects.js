/**
 * Aikira Terminal - Digital Effects
 * Manages all visual effects for the digital world background
 */

class DigitalWorld {
    constructor() {
        this.canvas = document.getElementById('background-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width = this.canvas.offsetWidth;
        this.height = this.canvas.height = this.canvas.offsetHeight;
        
        // Colors
        this.colors = {
            pink: '#FFD6EC',
            purple: '#D8B5FF',
            turquoise: '#A9EEE6',
            background: '#12151a'
        };
        
        // Particles
        this.dataParticles = [];
        this.particleCount = 50;
        
        // Grid
        this.gridSize = 30;
        this.gridOpacity = 0.15;
        
        // Neural network
        this.nodes = [];
        this.connections = [];
        this.nodeCount = 15;
        
        // Initialize
        this.init();
        
        // Event listeners
        window.addEventListener('resize', this.resize.bind(this));
    }
    
    init() {
        // Create data particles
        for (let i = 0; i < this.particleCount; i++) {
            this.dataParticles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 3 + 1,
                color: this.getRandomColor(),
                speedX: (Math.random() - 0.5) * 0.8,
                speedY: (Math.random() - 0.5) * 0.8,
                pulse: Math.random() * 5
            });
        }
        
        // Create neural network nodes
        for (let i = 0; i < this.nodeCount; i++) {
            this.nodes.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 4 + 2,
                color: this.getRandomColor(0.5),
                speedX: (Math.random() - 0.5) * 0.4,
                speedY: (Math.random() - 0.5) * 0.4
            });
        }
        
        // Create connections between nodes
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                if (Math.random() > 0.65) {
                    this.connections.push({
                        from: i,
                        to: j,
                        active: false,
                        activationTime: 0,
                        duration: Math.random() * 1000 + 500
                    });
                }
            }
        }
        
        // Start animation
        this.animate();
    }
    
    resize() {
        this.width = this.canvas.width = this.canvas.offsetWidth;
        this.height = this.canvas.height = this.canvas.offsetHeight;
    }
    
    getRandomColor(opacity = 1) {
        const colors = [
            `rgba(255, 214, 236, ${opacity})`, // Pink
            `rgba(216, 181, 255, ${opacity})`, // Purple
            `rgba(169, 238, 230, ${opacity})` // Turquoise
        ];
        
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    drawGrid() {
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${this.gridOpacity})`;
        this.ctx.lineWidth = 0.5;
        
        // Vertical lines
        for (let x = 0; x <= this.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= this.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }
    
    drawDataParticles() {
        this.dataParticles.forEach(particle => {
            // Update position
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Wrap around screen
            if (particle.x < 0) particle.x = this.width;
            if (particle.x > this.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.height;
            if (particle.y > this.height) particle.y = 0;
            
            // Pulse effect
            particle.pulse += 0.05;
            const size = particle.size + Math.sin(particle.pulse) * 0.5;
            
            // Draw particle
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawNeuralNetwork() {
        const now = Date.now();
        
        // Update and draw nodes
        this.nodes.forEach((node, index) => {
            // Update position
            node.x += node.speedX;
            node.y += node.speedY;
            
            // Bounce off edges
            if (node.x < node.size || node.x > this.width - node.size) {
                node.speedX *= -1;
            }
            if (node.y < node.size || node.y > this.height - node.size) {
                node.speedY *= -1;
            }
            
            // Draw node
            this.ctx.fillStyle = node.color;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Randomly activate connections
        if (Math.random() > 0.97) {
            const connection = this.connections[Math.floor(Math.random() * this.connections.length)];
            connection.active = true;
            connection.activationTime = now;
        }
        
        // Draw connections
        this.connections.forEach(connection => {
            const fromNode = this.nodes[connection.from];
            const toNode = this.nodes[connection.to];
            
            // Calculate opacity based on activation state
            let opacity = 0.15;
            
            if (connection.active) {
                const elapsed = now - connection.activationTime;
                if (elapsed > connection.duration) {
                    connection.active = false;
                } else {
                    const progress = elapsed / connection.duration;
                    opacity = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
                    opacity = Math.max(0.15, opacity);
                }
            }
            
            // Draw connection line
            this.ctx.strokeStyle = `rgba(216, 181, 255, ${opacity})`;
            this.ctx.lineWidth = opacity * 2;
            this.ctx.beginPath();
            this.ctx.moveTo(fromNode.x, fromNode.y);
            this.ctx.lineTo(toNode.x, toNode.y);
            this.ctx.stroke();
            
            // Draw data flow along connection if active
            if (connection.active) {
                const elapsed = now - connection.activationTime;
                const progress = (elapsed / connection.duration) % 1;
                
                const x = fromNode.x + (toNode.x - fromNode.x) * progress;
                const y = fromNode.y + (toNode.y - fromNode.y) * progress;
                
                this.ctx.fillStyle = `rgba(169, 238, 230, ${opacity * 2})`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }
    
    animate() {
        // Clear canvas
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw elements
        this.drawGrid();
        this.drawNeuralNetwork();
        this.drawDataParticles();
        
        // Continue animation
        requestAnimationFrame(this.animate.bind(this));
    }
}

// Sound visualization for voice input
class SoundVisualizer {
    constructor() {
        this.canvas = document.getElementById('voice-waveform');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width = this.canvas.offsetWidth;
        this.height = this.canvas.height = this.canvas.offsetHeight;
        
        this.analyser = null;
        this.dataArray = null;
        this.isActive = false;
        this.bufferLength = 0;
        
        // Colors
        this.primaryColor = '#FFD6EC'; // Pink
        this.secondaryColor = '#A9EEE6'; // Turquoise
        
        // Initialize
        this.init();
        
        // Event listeners
        window.addEventListener('resize', this.resize.bind(this));
    }
    
    init() {
        // Draw initial state
        this.drawInactiveState();
    }
    
    resize() {
        this.width = this.canvas.width = this.canvas.offsetWidth;
        this.height = this.canvas.height = this.canvas.offsetHeight;
        
        if (!this.isActive) {
            this.drawInactiveState();
        }
    }
    
    connectToAudio(analyser, bufferLength) {
        this.analyser = analyser;
        this.bufferLength = bufferLength;
        this.dataArray = new Uint8Array(bufferLength);
        this.isActive = true;
        this.visualize();
    }
    
    disconnect() {
        this.isActive = false;
        this.drawInactiveState();
    }
    
    drawInactiveState() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw center line
        this.ctx.strokeStyle = 'rgba(216, 181, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height / 2);
        this.ctx.lineTo(this.width, this.height / 2);
        this.ctx.stroke();
        
        // Draw small oscillation to indicate standby
        this.ctx.strokeStyle = 'rgba(169, 238, 230, 0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        for (let x = 0; x < this.width; x++) {
            const y = this.height / 2 + Math.sin(x * 0.05) * 5;
            
            if (x === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.stroke();
    }
    
    visualize() {
        if (!this.isActive) return;
        
        this.analyser.getByteTimeDomainData(this.dataArray);
        
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw waveform
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = this.primaryColor;
        this.ctx.beginPath();
        
        const sliceWidth = this.width / this.bufferLength;
        let x = 0;
        
        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = v * this.height / 2;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.stroke();
        
        // Add glow effect
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = `rgba(255, 214, 236, 0.3)`;
        this.ctx.stroke();
        
        // Draw frequency data as complementary wave
        this.analyser.getByteFrequencyData(this.dataArray);
        
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = this.secondaryColor;
        this.ctx.beginPath();
        
        x = 0;
        
        for (let i = 0; i < this.bufferLength; i++) {
            const percent = this.dataArray[i] / 255;
            const y = (percent * this.height / 4) + this.height / 2;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.stroke();
        
        // Continue animation
        requestAnimationFrame(this.visualize.bind(this));
    }
}

// Initialize effects when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create digital world
    window.digitalWorld = new DigitalWorld();
    
    // Create sound visualizer
    window.soundVisualizer = new SoundVisualizer();
});