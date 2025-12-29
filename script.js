// --- KHỞI TẠO VÀ CÁC BIẾN TOÀN CỤC ---
const vizContainer = document.getElementById('visualization-container');
const heapContainer = document.getElementById('heap-container'); // Container mới cho cây
const speedInput = document.getElementById('speed');
const speedValueSpan = document.getElementById('speed-value');
const statusLog = document.getElementById('status-log');
const startBtn = document.getElementById('start-btn');
const manualInput = document.getElementById('manual-array-input');

let array = [];
let arrayElements = []; // DOM elements cho Mảng (Thanh chữ nhật)
let heapNodes = [];     // DOM elements cho Cây (Hình tròn)
let isSorting = false;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const algorithmSelect = document.getElementById('algorithm-select');
const heapTitle = document.getElementById('heap-title');
let drawTimeout;

speedInput.addEventListener('input', () => {
    speedValueSpan.textContent = speedInput.value;
});

function toggleAuxView() {
    // Nếu chưa có mảng, luôn ẩn tất cả
    if (array.length === 0) {
        heapTitle.style.display = 'none';
        heapContainer.style.display = 'none';
        return;
    }

    const algo = algorithmSelect.value;

    // Xóa nội dung cũ trong container
    heapContainer.innerHTML = '';

    // --- TẠO SVG VÀ ĐỊNH NGHĨA MŨI TÊN (MARKER) ---
    // Chỉ tạo cho Merge và Quick Sort
    if (algo === 'merge' || algo === 'quick') {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.classList.add("tree-lines"); // Dùng chung class với Heap
        svg.id = "tree-svg-layer";       // ID để dễ truy xuất

        // Định nghĩa hình mũi tên (marker)
        const defs = document.createElementNS(svgNS, "defs");
        const marker = document.createElementNS(svgNS, "marker");
        marker.setAttribute("id", "arrowhead");
        marker.setAttribute("markerWidth", "10");
        marker.setAttribute("markerHeight", "7");
        marker.setAttribute("refX", "10"); // Vị trí gắn vào đầu dây
        marker.setAttribute("refY", "3.5");
        marker.setAttribute("orient", "auto");

        const polygon = document.createElementNS(svgNS, "polygon");
        polygon.setAttribute("points", "0 0, 10 3.5, 0 7"); // Hình tam giác
        polygon.setAttribute("fill", "#555");

        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
        heapContainer.appendChild(svg);
    }

    if (algo === 'heap') {
        // Cấu hình cho Heap Sort
        heapTitle.textContent = "Cây vun đống";
        heapTitle.style.display = 'block';
        heapContainer.style.display = 'flex';

        clearTimeout(drawTimeout);
        drawTimeout = setTimeout(drawHeap, 100);
    }
    else if (algo === 'merge') {
        // Cấu hình cho Merge Sort
        heapTitle.textContent = "Cây Đệ Quy";
        heapTitle.style.display = 'block';
        heapContainer.style.display = 'flex';

        // Vẽ node gốc ban đầu (Visual tĩnh)
        drawMergeNode(array, 0, array.length - 1, 0, false);
    }
    else if (algo === 'quick') {
        heapTitle.textContent = "Cây Đệ Quy";
        heapTitle.style.display = 'block';
        heapContainer.style.display = 'flex';
        // Vẽ node gốc ban đầu
        drawQuickNode(array, 0, array.length - 1, -1, 0);
    }
    else {
        // Các thuật toán khác: Ẩn
        heapTitle.style.display = 'none';
        heapContainer.style.display = 'none';
    }
}

// Hàm vẽ mũi tên từ Node Cha -> Node Con
function connectTwoNodes(parentId, childId) {
    const parent = document.getElementById(parentId);
    const child = document.getElementById(childId);
    const svg = document.getElementById("tree-svg-layer");

    if (parent && child && svg) {
        // Lấy tọa độ từ style (vì ta đã set left/top bằng JS)
        // Lưu ý: left là tọa độ tâm (do transform translate -50%)
        const x1 = parseFloat(parent.style.left);
        const y1 = parseFloat(parent.style.top) + parent.offsetHeight; // Đáy của cha

        const x2 = parseFloat(child.style.left);
        const y2 = parseFloat(child.style.top); // Đỉnh của con

        const svgNS = "http://www.w3.org/2000/svg";
        const line = document.createElementNS(svgNS, "line");

        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2 - 5); // Cách đỉnh con một chút để mũi tên hiển thị đẹp

        line.classList.add("tree-arrow");
        // Gắn marker mũi tên vào cuối đường
        line.setAttribute("marker-end", "url(#arrowhead)");

        svg.appendChild(line);
    }
}

// --- HỆ THỐNG ĐỒNG BỘ: CẬP NHẬT CẢ MẢNG VÀ CÂY ---

// Hàm helper để thao tác class trên cả 2 giao diện
function setClasses(indices, className, action = 'add') {
    indices.forEach(idx => {
        if (arrayElements[idx]) {
            action === 'add' ? arrayElements[idx].classList.add(className) : arrayElements[idx].classList.remove(className);
        }
        if (heapNodes[idx]) {
            action === 'add' ? heapNodes[idx].classList.add(className) : heapNodes[idx].classList.remove(className);
        }
    });
}

// Lắng nghe khi người dùng chọn thuật toán
algorithmSelect.addEventListener('change', () => {
    const selectedAlgo = algorithmSelect.value;

    if (selectedAlgo === 'heap') {
        // Nếu chọn Heap Sort: Hiện khung và vẽ cây ngay lập tức
        heapContainer.style.display = 'flex';
        drawHeap();
    } else {
        // Nếu chọn khác: Ẩn khung đi
        heapContainer.style.display = 'none';
    }
});

// 1. Hoán đổi (Swap) - Đồng bộ nội dung số và màu sắc
async function swap(i, j) {
    const speed = parseInt(speedInput.value);

    // Highlight swapping (Hồng)
    setClasses([i, j], 'swapping', 'add');
    await sleep(speed);

    // Logic đổi giá trị trong bộ nhớ
    [array[i], array[j]] = [array[j], array[i]];

    // Cập nhật DOM MẢNG
    arrayElements[i].textContent = array[i];
    arrayElements[j].textContent = array[j];

    // Cập nhật DOM CÂY (Chỉ đổi số, vị trí node giữ nguyên)
    if (heapNodes[i]) heapNodes[i].textContent = array[i];
    if (heapNodes[j]) heapNodes[j].textContent = array[j];

    // Bỏ highlight
    await sleep(speed);
    setClasses([i, j], 'swapping', 'remove');
}

// 2. So sánh (Compare) - Đồng bộ màu vàng
async function compare(i, j) {
    const speed = parseInt(speedInput.value);
    setClasses([i, j], 'comparing', 'add');
    await sleep(speed);
    setClasses([i, j], 'comparing', 'remove');
}

// 3. Cập nhật giá trị (Update Value - dùng cho Merge Sort)
async function updateValue(index, value, color) {
    const speed = parseInt(speedInput.value);
    array[index] = value;

    // Mảng
    arrayElements[index].textContent = value;
    arrayElements[index].classList.add(color);

    // Cây
    if (heapNodes[index]) {
        heapNodes[index].textContent = value;
        heapNodes[index].classList.add(color);
    }

    await sleep(speed);

    arrayElements[index].classList.remove(color);
    if (heapNodes[index]) heapNodes[index].classList.remove(color);
}

// 4. Đánh dấu đã sắp xếp (Sorted) - Đồng bộ màu xanh
function markSorted(index) {
    if (arrayElements[index]) arrayElements[index].classList.add('sorted');
    if (heapNodes[index]) heapNodes[index].classList.add('sorted');
}

// --- LOGIC VẼ CÂY NHỊ PHÂN (BINARY HEAP) ---
function drawHeap() {
    heapContainer.innerHTML = '';
    heapNodes = new Array(array.length).fill(null);

    if (array.length === 0) return;

    // Tạo SVG để vẽ đường nối
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.classList.add("tree-lines");
    heapContainer.appendChild(svg);

    // Tính toán vị trí
    const levels = Math.floor(Math.log2(array.length)) + 1;
    const containerWidth = heapContainer.clientWidth || 800; // Fallback width
    const startY = 30;    // Tọa độ Y nút gốc
    const levelHeight = 70; // Khoảng cách giữa các tầng

    // Mảng lưu tọa độ để vẽ đường nối: coordinates[index] = {x, y}
    const coordinates = [];

    for (let i = 0; i < array.length; i++) {
        const node = document.createElement('div');
        node.classList.add('tree-node');
        node.textContent = array[i];

        // Tính toán vị trí (x, y)
        const level = Math.floor(Math.log2(i + 1));

        // Số node tối đa ở tầng này
        const maxNodesInLevel = Math.pow(2, level);

        // Index của node trong tầng hiện tại (0, 1, 2...)
        const positionInLevel = i - (Math.pow(2, level) - 1);

        // Chia chiều rộng container thành các phần bằng nhau
        // Công thức giúp căn giữa các node
        const x = (containerWidth / (maxNodesInLevel + 1)) * (positionInLevel + 1);
        const y = startY + level * levelHeight;

        coordinates.push({ x, y });

        // Set vị trí CSS (trừ đi nửa chiều rộng node để tâm node nằm đúng tọa độ)
        node.style.left = `${x - 20}px`;
        node.style.top = `${y - 20}px`;

        heapContainer.appendChild(node);
        heapNodes[i] = node;

        // Vẽ đường nối tới cha (nếu không phải gốc)
        if (i > 0) {
            const parentIndex = Math.floor((i - 1) / 2);
            const parentCoord = coordinates[parentIndex];

            const line = document.createElementNS(svgNS, "line");
            line.setAttribute("x1", parentCoord.x);
            line.setAttribute("y1", parentCoord.y + 20); // Nối từ đáy cha
            line.setAttribute("x2", x);
            line.setAttribute("y2", y - 20); // Tới đỉnh con
            line.classList.add("edge");
            svg.appendChild(line);
        }
    }
}

algorithmSelect.addEventListener('change', toggleAuxView);

// --- LOGIC NHẬP/HIỂN THỊ DỮ LIỆU ---

function displayArray(newArray) {
    array = newArray;
    vizContainer.innerHTML = '';
    arrayElements = [];

    // Reset hiển thị cây
    heapContainer.innerHTML = '';
    heapNodes = [];

    if (array.length === 0) {
        vizContainer.innerHTML = '<p id="initial-message"> Mảng rỗng. Vui lòng nhập dữ liệu.</p>';
        toggleAuxView();
        startBtn.disabled = true;
        return;
    }

    // 1. Vẽ Mảng (Bar chart)
    const size = array.length;
    for (let i = 0; i < size; i++) {
        const value = array[i];
        const bar = document.createElement('div');
        bar.classList.add('bar');
        bar.textContent = value;
        bar.style.order = i;
        vizContainer.appendChild(bar);
        arrayElements.push(bar);
    }

    // 2. Vẽ Cây (Binary Heap Tree)
    // Chỉ vẽ nếu người dùng chọn Heap sort
    if (algorithmSelect.value === 'heap') {
        heapTitle.style.display = 'block';
        heapContainer.style.display = 'flex';
        setTimeout(() => {
            drawHeap();
        }, 100);
    } else {
        heapTitle.style.display = 'none';
        heapContainer.style.display = 'none'; // Đảm bảo ẩn nếu load lại mảng
    }
    toggleAuxView();
    startBtn.disabled = false;
}

function loadManualArray() {
    if (isSorting) return;
    const inputString = manualInput.value.trim();

    if (!inputString) {
        statusLog.textContent = '❌ Lỗi: Vui lòng nhập các giá trị mảng.';
        return;
    }

    const newArray = inputString
        .split(/\s+/)
        .map(str => parseInt(str))
        .filter(num => !isNaN(num) && num > 0);

    if (newArray.length < 2) {
        statusLog.textContent = '❌ Lỗi: Cần ít nhất 2 phần tử.';
        return;
    }

    displayArray(newArray);
    statusLog.textContent = `✅ Tải mảng thành công. N = ${newArray.length}.`;
}

// --- CÁC THUẬT TOÁN SẮP XẾP (ĐÃ CẬP NHẬT ĐỂ DÙNG HÀM SWAP/COMPARE MỚI) ---

// 1. Heap Sort (Giữ nguyên logic, chỉ gọi hàm swap/compare đã update)
async function heapSort() {
    const n = array.length;

    async function heapify(n, i) {
        let largest = i;
        let l = 2 * i + 1;
        let r = 2 * i + 2;

        if (l < n) {
            await compare(l, largest);
            if (array[l] > array[largest]) largest = l;
        }

        if (r < n) {
            await compare(r, largest);
            if (array[r] > array[largest]) largest = r;
        }

        if (largest !== i) {
            await swap(i, largest);
            await heapify(n, largest);
        }
    }

    // Build Heap
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
        await heapify(n, i);
    }

    // Extract elements
    for (let i = n - 1; i > 0; i--) {
        await swap(0, i);
        markSorted(i); // Nút i đã về đúng vị trí cuối cùng, tô xanh lá
        await heapify(i, 0);
    }
    markSorted(0);
}

// Các thuật toán khác giữ nguyên logic, chỉ đảm bảo dùng swap/compare ở trên
async function bubbleSort() {
    const n = array.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - 1 - i; j++) {
            await compare(j, j + 1);
            if (array[j] > array[j + 1]) {
                await swap(j, j + 1);
            }
        }
        markSorted(n - 1 - i);
    }
    markSorted(0);
}

async function selectionSort() {
    const n = array.length;
    for (let i = 0; i < n - 1; i++) {
        let minIndex = i;
        setClasses([i], 'swapping', 'add'); // Highlight nút đang tìm min
        for (let j = i + 1; j < n; j++) {
            await compare(minIndex, j);
            if (array[j] < array[minIndex]) {
                minIndex = j;
            }
        }
        setClasses([i], 'swapping', 'remove');
        if (minIndex !== i) {
            await swap(i, minIndex);
        }
        markSorted(i);
    }
    markSorted(n - 1);
}

async function insertionSort() {
    const n = array.length;
    markSorted(0);
    for (let i = 1; i < n; i++) {
        let key = array[i];
        let j = i - 1;

        setClasses([i], 'swapping', 'add');
        await sleep(parseInt(speedInput.value));

        while (j >= 0 && array[j] > key) {
            await compare(j, j + 1);

            array[j + 1] = array[j];

            // Cập nhật DOM thủ công cho insertion vì nó là shift chứ không phải swap thuần
            arrayElements[j + 1].textContent = array[j + 1];
            if (heapNodes[j + 1]) heapNodes[j + 1].textContent = array[j + 1];

            // Hiệu ứng shift
            setClasses([j, j + 1], 'swapping', 'add');
            await sleep(parseInt(speedInput.value));
            setClasses([j], 'swapping', 'remove');

            // Tạm thời coi j+1 là đã sắp xếp (thuộc vùng sorted)
            markSorted(j + 1);

            j = j - 1;
        }
        array[j + 1] = key;

        arrayElements[j + 1].textContent = key;
        if (heapNodes[j + 1]) heapNodes[j + 1].textContent = key;

        setClasses([i, j + 1], 'swapping', 'remove');
        markSorted(j + 1);

        // Refresh vùng sorted
        for (let k = 0; k <= i; k++) markSorted(k);
        await sleep(parseInt(speedInput.value));
    }
}

// Vẽ một node (hộp chứa mảng con) tại toạ độ tính toán
function drawMergeNode(subArray, l, r, depth, isSorted = false, parentId = null) {
    if (algorithmSelect.value !== 'merge') return;

    const node = document.createElement('div');
    node.classList.add('merge-node-container');

    // TÍNH TOÁN VỊ TRÍ
    const containerWidth = heapContainer.clientWidth || 800;
    const totalElements = array.length;
    const centerIndex = (l + r) / 2;
    const x = (containerWidth / totalElements) * (centerIndex + 0.5);
    const y = 20 + depth * 70;

    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.style.transform = "translateX(-50%)";

    // Vẽ item
    subArray.forEach(val => {
        const item = document.createElement('div');
        item.classList.add('merge-node-item');
        item.textContent = val;
        if (isSorted) item.classList.add('sorted');
        node.appendChild(item);
    });

    // ID của node hiện tại
    const currentId = `merge-node-${l}-${r}`;
    node.id = currentId;
    heapContainer.appendChild(node);

    // VẼ MŨI TÊN (NẾU CÓ CHA)
    if (parentId) {
        setTimeout(() => connectTwoNodes(parentId, currentId), 0);
    }
}

// Cập nhật nội dung node (thành màu xanh) sau khi đã merge
function updateMergeNode(l, r, newSortedArray) {
    const node = document.getElementById(`merge-node-${l}-${r}`);
    if (node) {
        node.innerHTML = ''; // Xóa nội dung cũ
        newSortedArray.forEach(val => {
            const item = document.createElement('div');
            item.classList.add('merge-node-item', 'sorted'); // Thêm class sorted (xanh)
            item.textContent = val;
            node.appendChild(item);
        });
        // Hiệu ứng scale nhẹ để báo hiệu vừa update
        node.style.transition = "transform 0.2s";
        node.style.transform = "translateX(-50%) scale(1.1)";
        setTimeout(() => node.style.transform = "translateX(-50%) scale(1)", 200);
    }
}

async function mergeSort() {
    const speed = parseInt(speedInput.value);

    // Reset khung cây nếu đang ở chế độ Merge
    if (algorithmSelect.value === 'merge') {
        heapContainer.innerHTML = '';
    }

    async function merge(arr, l, m, r) {
        let n1 = m - l + 1;
        let n2 = r - m;
        let L = new Array(n1);
        let R = new Array(n2);

        for (let i = 0; i < n1; i++) L[i] = arr[l + i];
        for (let j = 0; j < n2; j++) R[j] = arr[m + 1 + j];

        let i = 0, j = 0, k = l;
        let mergedSubArray = []; // Mảng tạm để vẽ lên cây

        while (i < n1 && j < n2) {
            // Visual trên thanh Bar chính
            arrayElements[k].classList.add('comparing');
            await sleep(speed / 2);

            if (L[i] <= R[j]) {
                arr[k] = L[i];
                mergedSubArray.push(L[i]);
                i++;
            } else {
                arr[k] = R[j];
                mergedSubArray.push(R[j]);
                j++;
            }
            // Update Bar chính
            arrayElements[k].textContent = arr[k];
            arrayElements[k].classList.remove('comparing');
            arrayElements[k].classList.add('sorted');
            k++;
        }

        while (i < n1) {
            arr[k] = L[i];
            mergedSubArray.push(L[i]);
            arrayElements[k].textContent = arr[k];
            arrayElements[k].classList.add('sorted');
            i++; k++;
        }
        while (j < n2) {
            arr[k] = R[j];
            mergedSubArray.push(R[j]);
            arrayElements[k].textContent = arr[k];
            arrayElements[k].classList.add('sorted');
            j++; k++;
        }

        await sleep(speed);

        // VISUAL TREE: Cập nhật node cha (đã sắp xếp)
        // Đây là bước "Trị" (Conquer) - hiển thị kết quả gộp
        updateMergeNode(l, r, mergedSubArray);
    }

    // Thêm tham số parentId
    async function mergeSortRecursive(arr, l, r, depth, parentId = null) {
        if (l >= r) {
            if (algorithmSelect.value === 'merge') {
                // Base case: Vẽ và truyền parentId xuống
                drawMergeNode([arr[l]], l, r, depth, false, parentId);
                await sleep(speed);
            }
            return;
        }

        // Vẽ node hiện tại
        let currentSub = arr.slice(l, r + 1);
        // Xác định ID của node này (để lát nữa truyền xuống cho con)
        const currentId = `merge-node-${l}-${r}`;

        if (algorithmSelect.value === 'merge') {
            // Vẽ node này, nối với parentId (nếu có)
            drawMergeNode(currentSub, l, r, depth, false, parentId);
            await sleep(speed);
        }

        let m = l + parseInt((r - l) / 2);

        // ĐỆ QUY: Truyền currentId làm parentId cho cấp dưới
        await mergeSortRecursive(arr, l, m, depth + 1, currentId);     // Con trái
        await mergeSortRecursive(arr, m + 1, r, depth + 1, currentId); // Con phải

        await merge(arr, l, m, r);
    }

    // Gọi lần đầu: parentId = null
    await mergeSortRecursive(array, 0, array.length - 1, 0, null);

    // Đảm bảo tô xanh hết khi xong
    for (let k = 0; k < array.length; k++) markSorted(k);
}

function drawQuickNode(currentArr, l, r, pivotIndex, depth, parentId = null) {
    if (algorithmSelect.value !== 'quick') return;

    const node = document.createElement('div');
    node.classList.add('merge-node-container');

    const containerWidth = heapContainer.clientWidth || 800;
    const totalElements = array.length;
    const centerIndex = (l + r) / 2;
    const x = (containerWidth / totalElements) * (centerIndex + 0.5);
    const y = 20 + depth * 70;

    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.style.transform = "translateX(-50%)";

    const currentId = `quick-node-${l}-${r}`;
    node.id = currentId;

    for (let i = 0; i < currentArr.length; i++) {
        const item = document.createElement('div');
        item.classList.add('merge-node-item', 'qs-normal');
        item.textContent = currentArr[i];

        const actualIndex = l + i;
        if (actualIndex === pivotIndex) {
            item.classList.add('pivot-tree');
            item.classList.remove('qs-normal');
        }
        node.appendChild(item);
    }

    heapContainer.appendChild(node);

    // VẼ MŨI TÊN
    if (parentId) {
        setTimeout(() => connectTwoNodes(parentId, currentId), 0);
    }
}

// Hàm cập nhật Node (dùng để tô màu Pivot sau khi Partition xong)
function updateQuickNodePivot(l, r, pivotIndex) {
    const node = document.getElementById(`quick-node-${l}-${r}`);
    if (node) {
        // Duyệt qua các con của node DOM này để tìm ô chứa Pivot
        const children = node.children;
        const relativePivotIndex = pivotIndex - l; // Vị trí pivot tương đối trong node

        if (children[relativePivotIndex]) {
            children[relativePivotIndex].classList.remove('qs-normal');
            children[relativePivotIndex].classList.add('pivot-tree');
        }
    }
}

async function quickSort() {
    const speed = parseInt(speedInput.value);

    // Reset tree nếu đang ở chế độ Quick
    if (algorithmSelect.value === 'quick') {
        heapContainer.innerHTML = '';
    }

    async function partition(arr, low, high) {
        let pivotValue = arr[high];

        // Visual trên Bar: Pivot màu cam
        setClasses([high], 'pivot', 'add');
        await sleep(speed);

        let i = (low - 1);

        for (let j = low; j <= high - 1; j++) {
            // Visual Bar: So sánh
            await compare(j, high);

            if (arr[j] < pivotValue) {
                i++;
                await swap(i, j);
            }
        }

        setClasses([high], 'pivot', 'remove');
        await swap(i + 1, high);

        // Pivot về đúng chỗ -> Tô xanh trên Bar
        markSorted(i + 1);

        return (i + 1); // Trả về chỉ số Pivot
    }

    async function quickSortRecursive(arr, low, high, depth) {
        if (low > high) return;

        // --- BƯỚC 1: VẼ NODE CÂY (TRẠNG THÁI HIỆN TẠI) ---
        // Lúc này chưa biết Pivot ở đâu, vẽ mảng bình thường
        if (algorithmSelect.value === 'quick') {
            // Lấy lát cắt mảng hiện tại để vẽ
            const currentSlice = arr.slice(low, high + 1);
            drawQuickNode(currentSlice, low, high, -1, depth);
            await sleep(speed);
        }

        // --- BƯỚC 2: PHÂN HOẠCH (PARTITION) ---
        // Pivot thật sự (pi) được xác định sau bước này
        let pi = 0;
        if (low < high) {
            pi = await partition(arr, low, high);
        } else {
            // Trường hợp chỉ còn 1 phần tử
            pi = low;
            markSorted(low);
        }

        // --- BƯỚC 3: CẬP NHẬT CÂY (TÔ MÀU PIVOT) ---
        // Sau khi partition, phần tử tại vị trí pi chính là Pivot
        if (algorithmSelect.value === 'quick') {
            updateQuickNodePivot(low, high, pi);

            // Cập nhật lại nội dung các số trong node trên cây 
            // (vì hàm partition đã swap các phần tử lung tung)
            const node = document.getElementById(`quick-node-${low}-${high}`);
            if (node) {
                const currentSliceAfterPartition = arr.slice(low, high + 1);
                const children = node.children;
                for (let k = 0; k < currentSliceAfterPartition.length; k++) {
                    children[k].textContent = currentSliceAfterPartition[k];
                }
            }
            await sleep(speed);
        }

        // --- BƯỚC 4: ĐỆ QUY ---
        // Chỉ đệ quy nếu khoảng index hợp lệ
        if (low < pi) {
            await quickSortRecursive(arr, low, pi - 1, depth + 1);
        }
        if (pi < high) {
            await quickSortRecursive(arr, pi + 1, high, depth + 1);
        }
    }

    // Bắt đầu
    await quickSortRecursive(array, 0, array.length - 1, 0);

    // Đảm bảo tô xanh hết khi xong
    for (let k = 0; k < array.length; k++) markSorted(k);
}

// --- MAIN CONTROL ---
function startSorting() {
    if (isSorting || array.length === 0) return;
    isSorting = true;
    startBtn.disabled = true;

    // Reset màu
    document.querySelectorAll('.bar, .tree-node').forEach(el =>
        el.classList.remove('sorted', 'comparing', 'swapping', 'pivot')
    );

    const algorithm = document.getElementById('algorithm-select').value;
    statusLog.textContent = `Đang chạy: ${document.getElementById('algorithm-select').options[document.getElementById('algorithm-select').selectedIndex].text}`;

    let sortFunction;
    switch (algorithm) {
        case 'bubble': sortFunction = bubbleSort; break;
        case 'selection': sortFunction = selectionSort; break;
        case 'insertion': sortFunction = insertionSort; break;
        case 'merge': sortFunction = mergeSort; break;
        case 'quick': sortFunction = quickSort; break;
        case 'heap': sortFunction = heapSort; break;
    }

    sortFunction().then(() => {
        isSorting = false;
        startBtn.disabled = false;
        statusLog.textContent = `✅ Hoàn tất!`;
        // Tô xanh tất cả khi xong
        for (let k = 0; k < array.length; k++) markSorted(k);
    });
}