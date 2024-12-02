// Variables
let scene, camera, renderer, controls;
let arrayCubes = [];
let arrayLabels = []; // Store labels for array cubes
let heapNodes = [];
let heapEdges = [];
let steps = [];
let currentStep = 0;
let font;

let array = [];
let kValue;

const arrowHelpers = [];

const maxArraySize = 30; // Limit array size for performance

// Predefined set of popular colors
const colorPalette = [
  0xff0000, // Red
  0x0000ff, // Blue
  0xffff00, // Yellow
  0xffa500, // Orange
  0x800080, // Purple
  0x00ffff, // Cyan
  0x008000, // Green
  0x00ff00, // Lime
  0xff00ff, // Magenta
  0x000080, // Navy
];

// Map to store number-color associations
let numberColors = {};

// Cursor indicator
let arrayCursor;

// Load font for labels
const loader = new THREE.FontLoader();
loader.load(
  'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
  function (loadedFont) {
    font = loadedFont;
    // Enable the Start button after the font is loaded
    document.getElementById('startBtn').disabled = false;
  },
  undefined,
  function (error) {
    console.error('An error occurred during font loading:', error);
    // Proceed without font
    font = null;
    document.getElementById('startBtn').disabled = false;
  }
);

// Disable the Start button until the font is loaded
document.getElementById('startBtn').disabled = true;

// Start the animation loop once
animate();

// Event listener for the start button
document.getElementById('startBtn').addEventListener('click', () => {
  const arraySizeInput = document.getElementById('arraySize').value;
  const kValueInput = document.getElementById('kValue').value;

  const arraySize = parseInt(arraySizeInput);
  kValue = parseInt(kValueInput);

  if (isNaN(arraySize) || arraySize < 1 || arraySize > maxArraySize) {
    alert(`Please enter a valid array size between 1 and ${maxArraySize}.`);
    return;
  }

  if (isNaN(kValue) || kValue < 1 || kValue > arraySize) {
    alert('Please enter a valid k value between 1 and the array size.');
    return;
  }

  // Initialize the visualization with the provided inputs
  initVisualization(arraySize, kValue);
});

function initVisualization(arraySize, kValue) {
  // Clear previous scene if it exists
  if (scene) {
    // Remove existing objects from the scene
    while (scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }

    // Dispose of renderer
    renderer.dispose();

    // Remove existing canvas
    const container = document.getElementById('threejs-container');
    container.innerHTML = '';
  }

  // Initialize variables
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const container = document.getElementById('threejs-container');
  const width = container.clientWidth;
  const height = container.clientHeight;

  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 10, 10);
  scene.add(directionalLight);

  // Build the array and start the visualization
  buildArrayAndStart(arraySize, kValue);
}

function buildArrayAndStart(arraySize, kValue) {
  // Generate random array
  array = [];
  for (let i = 0; i < arraySize; i++) {
    array.push(Math.floor(Math.random() * 100) + 1); // Random numbers between 1 and 100
  }

  // Initialize variables
  arrayCubes = [];
  arrayLabels = [];
  heapNodes = [];
  heapEdges = [];
  steps = [];
  currentStep = 0;
  numberColors = {}; // Reset numberColors

  // Assign colors to numbers
  let colorIndex = 0;
  array.forEach((value) => {
    if (!(value in numberColors)) {
      numberColors[value] = colorPalette[colorIndex % colorPalette.length];
      colorIndex++;
    }
  });

  // Adjust camera position
  camera.position.set(0, 20, 50);
  camera.lookAt(0, 0, 0);

  // Create cubes (array visualization)
  const cubeGeometry = new THREE.BoxGeometry(2.5, 1.5, 1.5); // Increased size

  const spacing = 4;
  const totalWidth = array.length * spacing;
  const startX = -totalWidth / 2 + spacing / 2;

  array.forEach((value, index) => {
    const material = new THREE.MeshLambertMaterial({ color: numberColors[value] });
    const cube = new THREE.Mesh(cubeGeometry, material);
    cube.position.x = startX + index * spacing;
    cube.position.y = 10; // Move up to make room for the heap
    cube.userData = { value };
    scene.add(cube);
    arrayCubes.push(cube);

    // Add labels inside cubes
    if (font) {
      const textGeometry = new THREE.TextGeometry(value.toString(), {
        font: font,
        size: 0.7, // Increased size
        height: 0.02,
      });
      const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(
        cube.position.x - 0.3,
        cube.position.y - 0.3,
        cube.position.z + 0.8
      );
      scene.add(textMesh);
      arrayLabels.push(textMesh); // Store label for removal
    }
  });

  // Create cursor indicator
  const cursorGeometry = new THREE.ConeGeometry(0.5, 1, 16);
  const cursorMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  arrayCursor = new THREE.Mesh(cursorGeometry, cursorMaterial);
  arrayCursor.rotation.x = Math.PI;
  scene.add(arrayCursor);

  // Simulate the algorithm and record steps
  simulateAlgorithm(array, kValue);
  updateVisualization();

  // Handle window resize
  window.addEventListener('resize', onWindowResize, false);
}

function simulateAlgorithm(array, k) {
  const minHeap = [];
  steps = []; // Clear previous steps
  let nodeIdCounter = 0; // To assign unique IDs to nodes

  // Include initial empty heap state
  steps.push({
    index: -1, // Indicates before processing any element
    heap: [],
    action: 'start',
    codeLine: 4, // Line where the heap is created
  });

  for (let i = 0; i < array.length; i++) {
    const num = array[i];
    const swaps = []; // Record swaps during heapify

    // Step 1: Add the element to the heap
    const addedNodeId = nodeIdCounter++;
    minHeap.push({ value: num, id: addedNodeId });
    heapifyUp(minHeap, minHeap.length - 1, swaps);

    steps.push({
      index: i,
      heap: deepCopyHeap(minHeap),
      action: 'add',
      added: num,
      addedNodeId,
      swaps: [...swaps],
      codeLine: 8,
    });

    // Step 2: If heap size exceeds k, remove the smallest element
    if (minHeap.length > k) {
      const removedNode = minHeap.shift(); // Remove the smallest element
      heapifyDown(minHeap, 0, swaps);

      steps.push({
        index: i,
        heap: deepCopyHeap(minHeap),
        action: 'remove',
        removed: removedNode.value,
        removedNodeId: removedNode.id,
        swaps: [...swaps],
        codeLine: 11,
      });
    }
  }

  // Final step to show the kth largest element
  steps.push({
    index: array.length,
    heap: deepCopyHeap(minHeap),
    found: true,
    kthLargest: minHeap[0].value,
    codeLine: 15,
  });

  currentStep = 0; // Initialize currentStep to 0
}

function heapifyUp(heap, index, swaps) {
  if (index === 0) return;
  const parentIndex = Math.floor((index - 1) / 2);
  if (heap[parentIndex].value > heap[index].value) {
    swaps.push({ from: index, to: parentIndex });
    [heap[parentIndex], heap[index]] = [heap[index], heap[parentIndex]];
    heapifyUp(heap, parentIndex, swaps);
  }
}

function heapifyDown(heap, index, swaps) {
  const leftIndex = 2 * index + 1;
  const rightIndex = 2 * index + 2;
  let smallest = index;

  if (leftIndex < heap.length && heap[leftIndex].value < heap[smallest].value) {
    smallest = leftIndex;
  }

  if (rightIndex < heap.length && heap[rightIndex].value < heap[smallest].value) {
    smallest = rightIndex;
  }

  if (smallest !== index) {
    swaps.push({ from: index, to: smallest });
    [heap[smallest], heap[index]] = [heap[index], heap[smallest]];
    heapifyDown(heap, smallest, swaps);
  }
}

function deepCopyHeap(heap) {
  return heap.map((node) => ({ ...node }));
}

function updateVisualization() {
  // Reset all cubes to default color and scale
  arrayCubes.forEach((cube) => {
    const value = cube.userData.value;
    cube.material.color.set(numberColors[value]);
    cube.scale.set(1, 1, 1);
  });

  // Remove previous labels from array cubes
  arrayLabels.forEach((label) => {
    scene.remove(label);
  });
  arrayLabels = [];

  // Add labels inside cubes again
  arrayCubes.forEach((cube) => {
    const value = cube.userData.value;
    if (font) {
      const textGeometry = new THREE.TextGeometry(value.toString(), {
        font: font,
        size: 0.7,
        height: 0.02,
      });
      const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(
        cube.position.x - 0.3,
        cube.position.y - 0.3,
        cube.position.z + 0.8
      );
      scene.add(textMesh);
      arrayLabels.push(textMesh);
    }
  });

  // Remove previous heap nodes and edges
  heapNodes.forEach((node) => {
    scene.remove(node.mesh);
    if (node.label) {
      scene.remove(node.label);
    }
    if (node.cross) {
      scene.remove(node.cross);
    }
    if (node.highlight) {
      scene.remove(node.highlight);
    }
  });
  heapNodes = [];

  heapEdges.forEach((edge) => {
    scene.remove(edge);
  });
  heapEdges = [];

  // Remove previous arrows
  arrowHelpers.forEach((arrow) => {
    scene.remove(arrow);
  });
  arrowHelpers.length = 0;

  document.getElementById('info').innerHTML = '';

  // Reset code editor highlight
  resetCodeHighlight();

  if (currentStep >= 0 && currentStep < steps.length) {
    const step = steps[currentStep];
    const { index, heap, action, added, removed, found, kthLargest, addedNodeId, removedNodeId, codeLine, swaps } = step;

    // Highlight the current line in the code editor
    highlightCodeLine(codeLine);

    if (index >= 0 && index < arrayCubes.length) {
      // Update cursor position
      const currentCube = arrayCubes[index];
      arrayCursor.visible = true;
      arrayCursor.position.set(
        currentCube.position.x,
        currentCube.position.y + 1.5,
        currentCube.position.z
      );
    } else {
      arrayCursor.visible = false;
    }

    // Visualize the heap as a binary tree
    const heapRoot = buildHeapTree(heap);
    renderHeap(heapRoot);

    // Show swaps if any
    if (swaps && swaps.length > 0) {
      swaps.forEach((swap) => {
        const fromNode = heapNodes.find((node) => node.index === swap.from);
        const toNode = heapNodes.find((node) => node.index === swap.to);

        if (fromNode && toNode) {
          // Draw curved line indicating swap
          const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(fromNode.position.x, fromNode.position.y, 0),
            new THREE.Vector3(
              (fromNode.position.x + toNode.position.x) / 2,
              (fromNode.position.y + toNode.position.y + 5) / 2,
              0
            ),
            new THREE.Vector3(toNode.position.x, toNode.position.y, 0)
          );

          const points = curve.getPoints(50);
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({ color: 0x000000 });
          const curveObject = new THREE.Line(geometry, material);
          scene.add(curveObject);
          heapEdges.push(curveObject);

          // Add directional arrow to the curve (reverse direction)
          const arrowDirection = new THREE.Vector3().subVectors(fromNode.position, toNode.position).normalize();
          const arrowPosition = curve.getPoint(0.5);
          const arrowHelper = new THREE.ArrowHelper(
            arrowDirection,
            arrowPosition,
            0.001, // Length is minimal since we're using it as a pointer
            0x000000,
            0.5,
            0.3
          );
          scene.add(arrowHelper);
          heapEdges.push(arrowHelper);

          // Add label explaining the swap
          const midPoint = curve.getPoint(0.5);
          if (font) {
            const textGeometry = new THREE.TextGeometry(
              `${heap[swap.from].value} pushed by ${heap[swap.to].value} down`,
              {
                font: font,
                size: 0.4,
                height: 0.02,
              }
            );
            const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            textMesh.position.set(midPoint.x - 4.5, midPoint.y - 5.5, midPoint.z + 3);
            scene.add(textMesh);
            heapEdges.push(textMesh);
          }
        }
      });
    }

    if (action === 'add') {
      // Find the node where the element was added
      const addedNode = heapNodes.find((node) => node.id === addedNodeId);
      if (addedNode) {
        // Draw arrow from current array element to the added node
        const from = new THREE.Vector3(
          arrayCubes[index].position.x,
          arrayCubes[index].position.y - 0.5,
          arrayCubes[index].position.z
        );
        const to = new THREE.Vector3(addedNode.position.x, addedNode.position.y + 1.0, addedNode.position.z);
        const direction = new THREE.Vector3().subVectors(to, from).normalize();
        const length = from.distanceTo(to);
        const arrowHelper = new THREE.ArrowHelper(
          direction,
          from,
          length,
          0x0000ff,
          0.5,
          0.3
        );
        scene.add(arrowHelper);
        arrowHelpers.push(arrowHelper);
      }

      // Add label explaining the addition
      document.getElementById('info').innerHTML = `Step ${currentStep + 1}: Added ${added} to the heap.`;
    }

    if (action === 'remove') {
      // Find the node with the removed value
      const removedNode = heapNodes.find(
        (node) => node.id === removedNodeId
      );
      if (removedNode) {
        // Show cross on the removed node
        const crossMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
        const cross1 = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-0.7, -0.7, 0),
            new THREE.Vector3(0.7, 0.7, 0),
          ]),
          crossMaterial
        );
        const cross2 = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-0.7, 0.7, 0),
            new THREE.Vector3(0.7, -0.7, 0),
          ]),
          crossMaterial
        );
        const crossGroup = new THREE.Group();
        crossGroup.add(cross1);
        crossGroup.add(cross2);
        crossGroup.position.set(
          removedNode.position.x,
          removedNode.position.y,
          removedNode.position.z + 0.8
        );
        scene.add(crossGroup);
        removedNode.cross = crossGroup;

        // Draw arrow from heap node to outside (removal)
        const from = new THREE.Vector3(
          removedNode.position.x,
          removedNode.position.y,
          removedNode.position.z
        );
        const to = new THREE.Vector3(
          removedNode.position.x,
          removedNode.position.y - 5,
          removedNode.position.z
        );
        const direction = new THREE.Vector3().subVectors(to, from).normalize();
        const length = from.distanceTo(to);
        const arrowHelper = new THREE.ArrowHelper(
          direction,
          from,
          length,
          0xff0000,
          0.5,
          0.3
        );
        scene.add(arrowHelper);
        arrowHelpers.push(arrowHelper);

        // Add label explaining the removal
        document.getElementById('info').innerHTML = `Step ${currentStep + 1}: Removed ${removed} from the heap because it exceeds size ${kValue}.`;
      } else {
        // If the node was already removed, still display the removal message
        document.getElementById('info').innerHTML = `Step ${currentStep + 1}: Removed ${removed} from the heap because it exceeds size ${kValue}.`;
      }
    }

    if (found) {
      // Highlight the root node with a green circle
      const rootNode = heapNodes.find((node) => node.index === 0);
      if (rootNode) {
        const circleGeometry = new THREE.RingGeometry(0.8, 0.9, 34);
        const circleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        const circle = new THREE.Mesh(circleGeometry, circleMaterial);
        circle.position.set(rootNode.position.x, rootNode.position.y, rootNode.position.z + 0.81);
        circle.rotation.z = Math.PI / 2;
        scene.add(circle);
        rootNode.highlight = circle;
      }

      document.getElementById('info').innerHTML = `The ${kValue}th largest element is ${kthLargest}.`;
    }
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function buildHeapTree(heap) {
  if (heap.length === 0) return null;

  const nodes = [];
  for (let i = 0; i < heap.length; i++) {
    const node = {
      value: heap[i].value,
      id: heap[i].id,
      index: i,
      position: { x: 0, y: 0, z: 0 },
      left: null,
      right: null,
      mesh: null,
      label: null,
      highlight: null,
    };
    nodes.push(node);
  }

  // Assign children
  for (let i = 0; i < nodes.length; i++) {
    const leftIndex = 2 * i + 1;
    const rightIndex = 2 * i + 2;
    if (leftIndex < nodes.length) {
      nodes[i].left = nodes[leftIndex];
    }
    if (rightIndex < nodes.length) {
      nodes[i].right = nodes[rightIndex];
    }
  }

  // Position nodes
  positionHeapNodes(nodes[0], 0, 0, 8); // Increased offset

  return nodes[0];
}

function positionHeapNodes(node, x, y, offset) {
  if (!node) return;

  node.position.x = x;
  node.position.y = y;

  if (node.left) {
    positionHeapNodes(node.left, x - offset, y - 4, offset / 1.5);
  }
  if (node.right) {
    positionHeapNodes(node.right, x + offset, y - 4, offset / 1.5);
  }
}

function renderHeap(node) {
  if (!node) return;

  // Create sphere for heap node
  const geometry = new THREE.SphereGeometry(1.0, 16, 16); // Increased size
  const material = new THREE.MeshLambertMaterial({ color: numberColors[node.value] });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(node.position.x, node.position.y, node.position.z);
  scene.add(sphere);
  node.mesh = sphere;

  // Add label inside the sphere
  if (font) {
    const textGeometry = new THREE.TextGeometry(node.value.toString(), {
      font: font,
      size: 0.7,
      height: 0.02,
    });
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(
      node.position.x - 0.3,
      node.position.y - 0.3,
      node.position.z + 1.1 // Move slightly in front of the sphere
    );
    scene.add(textMesh);
    node.label = textMesh;
  }

  heapNodes.push(node);

  // Render left child and edge
  if (node.left) {
    renderHeap(node.left);

    // Draw edge to left child
    const material = new THREE.LineBasicMaterial({ color: 0x000000 });
    const points = [];
    points.push(new THREE.Vector3(node.position.x, node.position.y, 0));
    points.push(
      new THREE.Vector3(node.left.position.x, node.left.position.y, 0)
    );

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    heapEdges.push(line);
  }

  // Render right child and edge
  if (node.right) {
    renderHeap(node.right);

    // Draw edge to right child
    const material = new THREE.LineBasicMaterial({ color: 0x000000 });
    const points = [];
    points.push(new THREE.Vector3(node.position.x, node.position.y, 0));
    points.push(
      new THREE.Vector3(node.right.position.x, node.right.position.y, 0)
    );

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    heapEdges.push(line);
  }
}

// Event listeners for navigation buttons
document.getElementById('nextBtn').addEventListener('click', () => {
  if (currentStep < steps.length - 1) {
    currentStep++;
    updateVisualization();
  }
});

document.getElementById('prevBtn').addEventListener('click', () => {
  if (currentStep > 0) {
    currentStep--;
    updateVisualization();
  }
});

function onWindowResize() {
  if (camera && renderer) {
    const container = document.getElementById('threejs-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  if (renderer && scene && camera) {
    controls.update();
    renderer.render(scene, camera);
  }
}

// Code editor functions
function resetCodeHighlight() {
  for (let i = 1; i <= 17; i++) {
    document.getElementById('line' + i).classList.remove('highlight');
  }
}

function highlightCodeLine(lineNumber) {
  resetCodeHighlight();
  if (lineNumber) {
    document.getElementById('line' + lineNumber).classList.add('highlight');
  }
}
