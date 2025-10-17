const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a simple default avatar
const size = 200;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Draw background
ctx.fillStyle = '#6FCF97';  // Primary color
ctx.beginPath();
ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2, true);
ctx.closePath();
ctx.fill();

// Draw text
ctx.fillStyle = '#FFFFFF';
ctx.font = 'bold 100px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('?', size/2, size/2);

// Save as PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('./assets/default-avatar.png', buffer);
console.log('Default avatar created: ./assets/default-avatar.png');
