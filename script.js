document.addEventListener('DOMContentLoaded', () => {
    // --- 데이터 및 설정 ---
    const domains = {
        work: { name: "Work", color: "#4A90E2" },
        personal: { name: "Personal", color: "#7ED321" },
        health: { name: "Health", color: "#F5A623" },
    };
    const NUM_HOURS = 24;
    const NUM_MINUTES_INTERVALS = 6;

    // --- DOM 요소 ---
    const sidebar = document.getElementById('activity-sidebar');
    const timelineGrid = document.getElementById('timeline-grid');
    
    // --- 상태 변수 ---
    let isDrawing = false;
    let drawingMode = 'cell';
    let selectedDomain = null;
    let startCell = null;
    let rubberBand = null;

    // --- 초기 설정 ---
    function setup() {
        // ... (이전과 동일하게 헤더, 시간/분 라벨, 그리드 셀 생성) ...
        const currentDateEl = document.getElementById('current-date');
        const today = new Date();
        currentDateEl.textContent = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
        
        Object.keys(domains).forEach(key => {
            const item = document.createElement('div');
            item.className = 'domain-item';
            item.textContent = domains[key].name;
            item.dataset.domainKey = key;
            item.style.borderLeftColor = domains[key].color;
            item.onclick = () => selectDomain(key, item);
            sidebar.appendChild(item);
        });
        const timelineHours = document.querySelector('.timeline-hours');
        for (let i = 0; i < NUM_HOURS; i++) {
            const label = document.createElement('div');
            label.className = 'hour-label';
            label.textContent = `${String(i).padStart(2, '0')}:00`;
            timelineHours.appendChild(label);
        }
        const timelineMinutes = document.querySelector('.timeline-minutes');
        for (let i = 0; i < NUM_MINUTES_INTERVALS; i++) {
            const label = document.createElement('div');
            label.className = 'minute-label';
            label.textContent = `${i * 10}`;
            timelineMinutes.appendChild(label);
        }
        for (let r = 0; r < NUM_HOURS; r++) {
            for (let c = 0; c < NUM_MINUTES_INTERVALS; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.id = `cell-${r}-${c}`;
                timelineGrid.appendChild(cell);
            }
        }
    }

    // --- 유틸리티 함수 ---
    function getCellFromCoords(x, y) {
        const gridRect = timelineGrid.getBoundingClientRect();
        const minuteWidth = timelineGrid.clientWidth / NUM_MINUTES_INTERVALS;
        const hourHeight = timelineGrid.clientHeight / NUM_HOURS;
        const localX = x - gridRect.left;
        const localY = y - gridRect.top;
        const c = Math.floor(localX / minuteWidth);
        const r = Math.floor(localY / hourHeight);
        if (r >= 0 && r < NUM_HOURS && c >= 0 && c < NUM_MINUTES_INTERVALS) {
            return document.getElementById(`cell-${r}-${c}`);
        }
        return null;
    }

    // --- 모드 선택 로직 ---
    function selectDomain(key, element) {
        document.querySelectorAll('.domain-item').forEach(el => el.classList.remove('selected'));
        selectedDomain = { key, ...domains[key] };
        element.classList.add('selected');
        drawingMode = 'domain';
    }

    function setCellMode() {
        drawingMode = 'cell';
        if (selectedDomain) {
            selectedDomain = null;
            document.querySelectorAll('.domain-item').forEach(el => el.classList.remove('selected'));
        }
    }

    // --- 그리기 로직 ---
    timelineGrid.addEventListener('mousedown', (e) => {
        isDrawing = true;
        // 기존 선택과 테두리를 모두 깨끗하게 지움
        document.querySelectorAll('.grid-cell').forEach(c => {
            c.classList.remove('selected', 'domain-fill');
            c.style.border = ''; // 개별 테두리 스타일 초기화
        });

        startCell = getCellFromCoords(e.clientX, e.clientY);
        
        rubberBand = document.createElement('div');
        rubberBand.className = 'cell-selection-rubberband';
        timelineGrid.appendChild(rubberBand);
        updateRubberBand(startCell, startCell);
    });

    timelineGrid.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const currentCell = getCellFromCoords(e.clientX, e.clientY);
        if (currentCell) {
            updateRubberBand(startCell, currentCell);
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (!isDrawing) return;
        isDrawing = false;
        
        const endCell = getCellFromCoords(e.clientX, e.clientY);
        if (startCell && endCell) {
            finalizeSelection(startCell, endCell);
        }

        if (rubberBand) {
            rubberBand.remove();
            rubberBand = null;
        }
        startCell = null;
        
        if (drawingMode === 'domain') {
            setCellMode(); // 사용 후 기본 모드로 복귀
        }
    });
    
    // --- 시각화 함수 ---
    function updateRubberBand(start, end) {
        if (!start || !end) return;
        const startCoords = getCoordsFromCell(start);
        const endCoords = getCoordsFromCell(end);

        const minR = Math.min(startCoords.r, endCoords.r);
        const maxR = Math.max(startCoords.r, endCoords.r);
        const minC = Math.min(startCoords.c, endCoords.c);
        const maxC = Math.max(startCoords.c, endCoords.c);

        const firstCell = document.getElementById(`cell-${minR}-${minC}`);
        const lastCell = document.getElementById(`cell-${maxR}-${maxC}`);
        
        if (!firstCell || !lastCell) return;

        const gridRect = timelineGrid.getBoundingClientRect();
        const firstRect = firstCell.getBoundingClientRect();
        const lastRect = lastCell.getBoundingClientRect();

        const left = firstRect.left - gridRect.left;
        const top = firstRect.top - gridRect.top;
        const width = lastRect.right - firstRect.left;
        const height = lastRect.bottom - firstRect.top;

        rubberBand.style.left = `${left}px`;
        rubberBand.style.top = `${top}px`;
        rubberBand.style.width = `${width}px`;
        rubberBand.style.height = `${height}px`;
    }

    function getCoordsFromCell(cell) {
        const [r, c] = cell.id.replace('cell-', '').split('-').map(Number);
        return { r, c };
    }

    // ★★★ 엑셀 로직 + 외곽선 그리기를 완벽하게 구현한 최종 함수 ★★★
    function finalizeSelection(start, end) {
        const finalCells = new Set();
        let startCoords = getCoordsFromCell(start);
        let endCoords = getCoordsFromCell(end);

        if (startCoords.r > endCoords.r) {
            [startCoords, endCoords] = [endCoords, startCoords];
        }

        if (startCoords.r === endCoords.r) {
            const minC = Math.min(startCoords.c, endCoords.c);
            const maxC = Math.max(startCoords.c, endCoords.c);
            for (let c = minC; c <= maxC; c++) {
                finalCells.add(`cell-${startCoords.r}-${c}`);
            }
        } else {
            for (let c = startCoords.c; c < NUM_MINUTES_INTERVALS; c++) { finalCells.add(`cell-${startCoords.r}-${c}`); }
            for (let r = startCoords.r + 1; r < endCoords.r; r++) {
                for (let c = 0; c < NUM_MINUTES_INTERVALS; c++) { finalCells.add(`cell-${r}-${c}`); }
            }
            for (let c = 0; c <= endCoords.c; c++) { finalCells.add(`cell-${endCoords.r}-${c}`); }
        }

        // --- 계산된 결과를 화면에 그리는 로직 ---
        if (drawingMode === 'cell') {
            finalCells.forEach(id => document.getElementById(id).classList.add('selected'));
        } 
        else if (drawingMode === 'domain') {
            finalCells.forEach(id => {
                const cell = document.getElementById(id);
                const { r, c } = getCoordsFromCell(cell);

                cell.classList.add('domain-fill');

                // 이웃 셀이 선택 영역에 없는 경우에만 해당 방향의 테두리를 그림
                if (!finalCells.has(`cell-${r-1}-${c}`)) { cell.style.borderTop = `3px solid ${selectedDomain.color}`; }
                if (!finalCells.has(`cell-${r+1}-${c}`)) { cell.style.borderBottom = `3px solid ${selectedDomain.color}`; }
                if (!finalCells.has(`cell-${r}-${c-1}`)) { cell.style.borderLeft = `3px solid ${selectedDomain.color}`; }
                if (!finalCells.has(`cell-${r}-${c+1}`)) { cell.style.borderRight = `3px solid ${selectedDomain.color}`; }
            });
        }
    }
    
    // --- 앱 시작 ---
    setup();
});