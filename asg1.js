const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    uniform float u_Size;
    void main() {
     gl_Position = a_Position;
     gl_PointSize = u_Size;
    }`

var FSHADER_SOURCE = `
    precision mediump float;
    uniform vec4 u_FragColor;
    void main() {
      gl_FragColor = u_FragColor;
    } `

var gl;
var canvas;
var a_Position;
var u_FragColor;
var u_Size;

var g_shapesList = [];
var g_selectedColor = [0.5, 0.5, 0.5, 1.0];
var g_selectedSize = 5;
var g_selectedType = POINT;
var g_selectedsCount = 12;
var g_outline = 0;
var drag = false;

// First, add these new global variables at the top with your other globals
var g_showStitch = false;
var g_stitchVertices = [];
var g_stitchIndices = [];

// Add these to your global variables
var g_showLilo = false;
var g_liloVertices = [];
var g_liloIndices = [];

var g_showFlower = false;
var g_flowerVertices = [];
var g_flowerIndices = [];

function setupWebGL(){
   canvas = document.getElementById('asg1');
   if (!canvas) {
       console.log('Failed to retrieve the <canvas> element');
       return;
   }
   gl = getWebGLContext(canvas);
   if(!gl){
       console.log('Failed to get the rendering context for WebGL');
       return;
   }
}

function connectVariablesToGLSL(){
   if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
       console.log('Failed to intialize shaders.');
       return;
   }

   a_Position = gl.getAttribLocation(gl.program, 'a_Position');
   if (a_Position < 0) {
       console.log('Failed to get the storage location of a_Position');
       return;
   }

   u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
   if (!u_FragColor) {
       console.log('Failed to get u_FragColor');
       return;
   }

   u_Size = gl.getUniformLocation(gl.program, 'u_Size');
   if (!u_Size) {
       console.log('Failed to get u_Size');
       return;
   }

}

function addActionsForHtmlUI(){
   document.getElementById('clear').onclick     = function() { g_shapesList = []; renderAllShapes(); };
   document.getElementById('square').onclick    = function() { g_selectedType = POINT;    g_outline = 0;};
   document.getElementById('triangle').onclick  = function() { g_selectedType = TRIANGLE; g_outline = 0;};
   document.getElementById('circle').onclick    = function() { g_selectedType = CIRCLE;   g_outline = 0;};

   document.getElementById('red').addEventListener('mouseup',     function() { g_selectedColor[0] = this.value*0.1; });
   document.getElementById('green').addEventListener('mouseup',   function() { g_selectedColor[1] = this.value*0.1; });
   document.getElementById('blue').addEventListener('mouseup',    function() { g_selectedColor[2] = this.value*0.1; });

   document.getElementById('size').addEventListener('mouseup',    function() { g_selectedSize = this.value });
   document.getElementById('sCount').addEventListener('mouseup',  function() { g_selectedsCount = this.value; });

   document.getElementById('showStitch').onclick = function() { 
      g_showStitch = !g_showStitch;
      renderAllShapes();
  };
  // Add new button for Lilo
  document.getElementById('showLilo').onclick = function() { 
   g_showLilo = !g_showLilo;
   renderAllShapes();
};

document.getElementById('showFlower').onclick = function() { 
   g_showFlower = !g_showFlower;
   renderAllShapes();
};

}

function initStitchShape() {
   // These coordinates define a simple outline of Stitch
   g_stitchVertices = [
       // Head
       -0.3, 0.3,    // 0
       0.3, 0.3,     // 1
       0.3, -0.1,    // 2
       -0.3, -0.1,   // 3
       
       // Left ear
       -0.4, 0.5,    // 4
       -0.2, 0.5,    // 5
       
       // Right ear
       0.2, 0.5,     // 6
       0.4, 0.5,     // 7
       
       // Eyes (circles will be drawn separately)
       -0.15, 0.1,   // 8 - left eye center
       0.15, 0.1,    // 9 - right eye center
       
       // Nose
       0.0, 0.0,     // 10
       
       // Body points
       -0.2, -0.1,   // 11 - top left body
       0.2, -0.1,    // 12 - top right body
       -0.2, -0.4,   // 13 - bottom left body
       0.2, -0.4,    // 14 - bottom right body
       
       // Arms
       -0.4, 0.0,    // 15 - left arm start
       -0.5, -0.2,   // 16 - left arm end
       0.4, 0.0,     // 17 - right arm start
       0.5, -0.2,    // 18 - right arm end
       
       // Legs
       -0.15, -0.4,  // 19 - left leg start
       -0.2, -0.6,   // 20 - left leg end
       0.15, -0.4,   // 21 - right leg start
       0.2, -0.6,    // 22 - right leg end
       
       // Ukulele points
       0.5, -0.2,    // 23 - ukulele top
       0.7, -0.3,    // 24 - ukulele right
       0.6, -0.4,    // 25 - ukulele bottom
       0.4, -0.3     // 26 - ukulele left
   ];

   g_stitchIndices = [
       // Head outline
       0, 1,
       1, 2,
       2, 3,
       3, 0,
       
       // Ears
       0, 4,
       4, 5,
       5, 0,
       1, 6,
       6, 7,
       7, 1,
       
       // Body
       11, 12,
       12, 14,
       14, 13,
       13, 11,
       
       // Arms
       15, 16,  // left arm
       17, 18,  // right arm
       
       // Legs
       19, 20,  // left leg
       21, 22,  // right leg
       
       // Ukulele
       23, 24,
       24, 25,
       25, 26,
       26, 23,
       // Ukulele strings
       23, 25,  // vertical string
       24, 26   // vertical string
   ];
}

function initLiloShape() {
   g_liloVertices = [
       // Head
       -0.1, 0.2,    // 0 - top of head
       0.1, 0.2,     // 1
       0.15, 0.1,    // 2 - right side of face
       0.15, -0.1,   // 3
       0.1, -0.15,   // 4 - chin
       -0.1, -0.15,  // 5
       -0.15, -0.1,  // 6 - left side of face
       -0.15, 0.1,   // 7

       // Hair details (multiple segments for wavy hair)
       -0.15, 0.15,  // 8
       -0.2, 0.18,   // 9
       -0.1, 0.22,   // 10
       0.0, 0.25,    // 11
       0.1, 0.22,    // 12
       0.2, 0.18,    // 13
       0.15, 0.15,   // 14

       // Body
       0.0, -0.15,   // 15 - neck
       -0.2, -0.2,   // 16 - left shoulder
       0.2, -0.2,    // 17 - right shoulder
       -0.25, -0.5,  // 18 - left hip (dress)
       0.25, -0.5,   // 19 - right hip (dress)

       // Arms
       -0.3, -0.35,  // 20 - left hand
       0.3, -0.35,   // 21 - right hand

       // Legs
       -0.15, -0.7,  // 22 - left foot
       0.15, -0.7    // 23 - right foot
   ];

   g_liloIndices = [
       // Face outline
       0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 0,

       // Hair
       8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14,

       // Dress
       15, 16, 16, 18, // left side of dress
       15, 17, 17, 19, // right side of dress
       18, 19,         // bottom of dress

       // Arms
       16, 20, // left arm
       17, 21, // right arm

       // Legs
       18, 22, // left leg
       19, 23  // right leg
   ];
}

function initFlowerShape() {
   // Background square vertices (for white background)
   g_flowerVertices = [
       // Background square (white)
       -1.0, 1.0,    // 0: top-left
       1.0, 1.0,     // 1: top-right
       1.0, -1.0,    // 2: bottom-right
       -1.0, -1.0,   // 3: bottom-left
       
       // Stem triangles
       -0.05, -0.5,  // 4
       0.05, -0.5,   // 5
       0.0, 0.0,     // 6
       
       // Center of flower
       0.0, 0.0,     // 7
       
       // Petal points (clockwise from top)
       0.0, 0.4,     // 8: top
       0.3, 0.3,     // 9: top-right
       0.4, 0.0,     // 10: right
       0.3, -0.3,    // 11: bottom-right
       0.0, -0.4,    // 12: bottom
       -0.3, -0.3,   // 13: bottom-left
       -0.4, 0.0,    // 14: left
       -0.3, 0.3     // 15: top-left
   ];

   // Define triangle indices
   g_flowerIndices = [
       // Background square
       0, 1, 2,  // First triangle
       0, 2, 3,  // Second triangle
       
       // Stem
       4, 5, 6,
       
       // Petals (8 triangles)
       7, 8, 9,    // top-right petal
       7, 9, 10,   // right-top petal
       7, 10, 11,  // right-bottom petal
       7, 11, 12,  // bottom-right petal
       7, 12, 13,  // bottom-left petal
       7, 13, 14,  // left-bottom petal
       7, 14, 15,  // left-top petal
       7, 15, 8,   // top-left petal
       7, 16, 7
   ];
}

function main() {
   setupWebGL();
   connectVariablesToGLSL();
   addActionsForHtmlUI();
   initStitchShape();
   initLiloShape();  // Add this line
   initFlowerShape();

   canvas.onmousedown = function(ev){
   click(ev);
   drag = true;
   };
   canvas.onmouseup = function(ev){
   drag = false;
   };
   canvas.onmousemove = function(ev){
   if(drag){
      click(ev);
   }
   };

   gl.clearColor(0.0, 0.0, 0.0, 1.0);
   gl.clear(gl.COLOR_BUFFER_BIT);
} 


function convertCoordinatesEventToGL(ev){
   var x = ev.clientX;
   var y = ev.clientY; 
   var rect = ev.target.getBoundingClientRect() ;

   x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
   y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

 

   return [x,y];
}

function click(ev) {
   var [x,y] = convertCoordinatesEventToGL(ev);
   var point;
   if(g_selectedType==POINT){
      point = new Point();
   } else if (g_selectedType==TRIANGLE){
      point = new Triangle();
   } else if (g_selectedType==CIRCLE){
      point = new Circle();
      point.sCount = g_selectedsCount;
   } else if (g_selectedType==FLOWER){
   point = new Flower();
}

   point.position = [x,y];
   point.color = g_selectedColor.slice();
   point.size = g_selectedSize;
   point.outline = g_outline;
   g_shapesList.push(point);

   renderAllShapes();
}

function renderAllShapes(){
   gl.clear(gl.COLOR_BUFFER_BIT);

   // Draw Flower if enabled
   if (g_showFlower) {
       drawFlower();
   }

   // Draw Stitch if enabled
   if (g_showStitch) {
       drawStitch();
   }

   // Draw Lilo if enabled
   if (g_showLilo) {
       drawLilo();
   }

   // Draw all user shapes
   var len = g_shapesList.length;
   for(var i = 0; i < len; i++) {
       g_shapesList[i].render();
   }
}
function drawStitch() {
   // Set Stitch's outline color (white)
   gl.uniform4f(u_FragColor, 1.0, 1.0, 1.0, 1.0);
   gl.uniform1f(u_Size, 2.0);  // Line width

   // Draw the outline
   for (let i = 0; i < g_stitchIndices.length; i += 2) {
       let idx1 = g_stitchIndices[i];
       let idx2 = g_stitchIndices[i + 1];
       
       let vertices = new Float32Array([
           g_stitchVertices[idx1 * 2], g_stitchVertices[idx1 * 2 + 1],
           g_stitchVertices[idx2 * 2], g_stitchVertices[idx2 * 2 + 1]
       ]);
       
       let vertexBuffer = gl.createBuffer();
       gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
       gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
       
       gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
       gl.enableVertexAttribArray(a_Position);
       
       gl.drawArrays(gl.LINES, 0, 2);
   }

   // Draw eyes (as circles)
   drawEye(-0.15, 0.1);  // Left eye
   drawEye(0.15, 0.1);   // Right eye
}

// Helper function to draw eyes
function drawEye(x, y) {
   const segments = 20;
   const radius = 0.05;
   let vertices = [];
   
   // Generate circle points
   for (let i = 0; i <= segments; i++) {
       let angle = (i / segments) * Math.PI * 2;
       vertices.push(
           x + radius * Math.cos(angle),
           y + radius * Math.sin(angle)
       );
   }
   
   let vertexBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
   
   gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(a_Position);
   
   gl.drawArrays(gl.LINE_LOOP, 0, segments + 1);
}

// Add new function to draw Lilo
function drawLilo() {
   // Set Lilo's outline color (white)
   gl.uniform4f(u_FragColor, 1.0, 1.0, 1.0, 1.0);
   gl.uniform1f(u_Size, 2.0);  // Line width

   // Draw the outline
   for (let i = 0; i < g_liloIndices.length; i += 2) {
       let idx1 = g_liloIndices[i];
       let idx2 = g_liloIndices[i + 1];
       
       let vertices = new Float32Array([
           g_liloVertices[idx1 * 2], g_liloVertices[idx1 * 2 + 1],
           g_liloVertices[idx2 * 2], g_liloVertices[idx2 * 2 + 1]
       ]);
       
       let vertexBuffer = gl.createBuffer();
       gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
       gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
       
       gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
       gl.enableVertexAttribArray(a_Position);
       
       gl.drawArrays(gl.LINES, 0, 2);
   }

   // Draw eyes (as small circles)
   drawEye(-0.05, 0.0, 0.02);  // Left eye (smaller radius)
   drawEye(0.05, 0.0, 0.02);   // Right eye (smaller radius)
}

// Modify your drawEye function to accept a radius parameter
function drawEye(x, y, radius = 0.05) {
   const segments = 20;
   let vertices = [];
   
   for (let i = 0; i <= segments; i++) {
       let angle = (i / segments) * Math.PI * 2;
       vertices.push(
           x + radius * Math.cos(angle),
           y + radius * Math.sin(angle)
       );
   }
   
   let vertexBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
   
   gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(a_Position);
   
   gl.drawArrays(gl.LINE_LOOP, 0, segments + 1);
}

function drawFlower() {
   const centerX = 0;
   const centerY = 0;
   const petalSize = 0.3;
   const numPetals = 8;
   
   // Draw petals
   for (let i = 0; i < numPetals; i++) {
       const angle = (i / numPetals) * Math.PI * 2;
       const nextAngle = ((i + 1) / numPetals) * Math.PI * 2;
       
       // Calculate petal points
       const x1 = centerX;
       const y1 = centerY;
       const x2 = centerX + petalSize * Math.cos(angle);
       const y2 = centerY + petalSize * Math.sin(angle);
       const x3 = centerX + petalSize * Math.cos(nextAngle);
       const y3 = centerY + petalSize * Math.sin(nextAngle);
       
       // Draw filled petal
       gl.uniform4f(u_FragColor, 0.9, 0.4, 0.6, 1.0);
       drawTriangle([x1, y1, x2, y2, x3, y3], 0);
       
       // Draw dark pink border
       gl.uniform4f(u_FragColor, 0.7, 0.2, 0.4, 1.0);
       drawTriangle([x1, y1, x2, y2, x3, y3], 1);
       
       // Inner petal
       const innerSize = petalSize * 0.7;
       const x2Inner = centerX + innerSize * Math.cos(angle);
       const y2Inner = centerY + innerSize * Math.sin(angle);
       const x3Inner = centerX + innerSize * Math.cos(nextAngle);
       const y3Inner = centerY + innerSize * Math.sin(nextAngle);
       
       // Draw filled inner petal
       gl.uniform4f(u_FragColor, 1.0, 0.6, 0.8, 1.0);
       drawTriangle([x1, y1, x2Inner, y2Inner, x3Inner, y3Inner], 0);
       
       // Draw dark pink border for inner petal
       gl.uniform4f(u_FragColor, 0.8, 0.3, 0.5, 1.0);
       drawTriangle([x1, y1, x2Inner, y2Inner, x3Inner, y3Inner], 1);
   }
   
   // Draw longer curved stem
   const stemSegments = 10;
   const stemLength = 1.2; // Doubled length
   const stemWidth = 0.08;
   const curveAmount = 0.15;
   
   for (let i = 0; i < stemSegments; i++) {
       const t = i / stemSegments;
       const nextT = (i + 1) / stemSegments;
       
       const xOffset = Math.sin(t * Math.PI) * curveAmount;
       const nextXOffset = Math.sin(nextT * Math.PI) * curveAmount;
       
       gl.uniform4f(u_FragColor, 0.2, 0.8, 0.2, 1.0);
       
       const x1 = centerX + xOffset - stemWidth/2;
       const y1 = centerY - stemLength * t;
       const x2 = centerX + xOffset + stemWidth/2;
       const y2 = centerY - stemLength * t;
       const x3 = centerX + nextXOffset;
       const y3 = centerY - stemLength * nextT;
       
       drawTriangle([x1, y1, x2, y2, x3, y3], 0);
   }
   

   const leafSize = 0.50; // Increased leaf size
   const leafPositions = [
       {t: 0.4, side: -1, angle: -0.3}, // Left leaf
       {t: 0.7, side: 1, angle: 0.3}    // Right leaf
   ];
   
   leafPositions.forEach(leaf => {
       const leafY = centerY - stemLength * leaf.t;
       const leafX = centerX + Math.sin(leaf.t * Math.PI) * curveAmount;
       
       // Draw filled leaf
       gl.uniform4f(u_FragColor, 0.3, 0.9, 0.3, 1.0);
       
       const leafAngle = leaf.angle;
       const leafTipX = leafX + (leafSize * Math.cos(leafAngle) * leaf.side);
       const leafTipY = leafY + (leafSize * Math.sin(leafAngle));
       
       drawTriangle([
           leafX - stemWidth/3, leafY,
           leafX + stemWidth/3, leafY,
           leafTipX, leafTipY
       ], 0);
       
       gl.uniform4f(u_FragColor, 0.1, 0.6, 0.1, 1.0);
       drawTriangle([
           leafX - stemWidth/3, leafY,
           leafX + stemWidth/3, leafY,
           leafTipX, leafTipY
       ], 1);
   });
}