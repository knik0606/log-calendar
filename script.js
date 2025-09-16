document.addEventListener('DOMContentLoaded', () => {
    // --- 데이터 및 설정 ---
    const domains = {
        work: { name: "Work", color: "#4A90E2" },
        personal: { name: "Personal", color: "#7ED321" },
        health: { name: "Health", color: "#F5A623" },
    };
    const NUM_HOURS = 24; const NUM_MINUTES_INTERVALS = 6;

    // --- DOM 요소 ---
    const appContainer = document.querySelector('.app-container');
    const timelineGrid = document.getElementById('timeline-grid');
    
    // --- 상태 및 데이터 변수 ---
    let logs = [];
    let isDrawing = false;
    let drawingMode = 'cell';
    let selectedDomain = null;
    let startCell = null;
    let rubberBand = null;
    let currentlyEditingLogId = null;

    // --- 초기 설정 ---
    function setup() {
        // ... (이전과 동일한 헤더, 시간/분/그리드 셀 생성 로직) ...
        const currentDateEl = document.getElementById('current-date');
        const today = new Date();
        currentDateEl.textContent = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
        const sidebar = document.getElementById('activity-sidebar');
        Object.keys(domains).forEach(key => {
            const item = document.createElement('div');
            item.className = 'domain-item';
            item.textContent = domains[key].name;
            item.dataset.domainKey = key;
            item.style.borderLeftColor = domains[key].color;
            item.onclick = (e) => { e.stopPropagation(); selectDomain(key, item); };
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
        loadLogs();
    }

    // --- 데이터 관리 ---
    function saveLogs() { localStorage.setItem('logCalendarData', JSON.stringify(logs)); }
    function loadLogs() {
        const savedLogs = localStorage.getItem('logCalendarData');
        if (savedLogs) { logs = JSON.parse(savedLogs); }
        renderAllLogs();
    }
    
    // ★★★ 핵심: '개별 칸'을 그리는 방식으로 완벽하게 복원된 렌더링 함수 ★★★
    function renderAllLogs() {
        document.querySelectorAll('.grid-cell').forEach(c => {
            c.className = 'grid-cell';
            c.style.border = '';
            c.onclick = null;
            // 기존 콘텐츠 표시 엘리먼트가 있다면 제거
            const contentDisplay = c.querySelector('.log-content-display');
            if (contentDisplay) contentDisplay.remove();
        });

        logs.forEach(log => {
            const cellSet = new Set(log.cells);
            if (log.type === 'domain') {
                drawDomainBorder(cellSet, log.color);
            } else { // type === 'cell'
                cellSet.forEach(id => document.getElementById(id)?.classList.add('selected'));
            }

            const firstCell = document.getElementById(log.cells[0]);
            if (firstCell && log.content) {
                const contentDisplay = document.createElement('div');
                contentDisplay.className = 'log-content-display';
                contentDisplay.textContent = log.content;
                firstCell.appendChild(contentDisplay);
            }
            
            cellSet.forEach(id => {
                const cell = document.getElementById(id);
                if (cell) cell.onclick = (e) => {
                    e.stopPropagation();
                    showMiniPalette(log.id, e);
                };
            });
        });
    }

    function drawDomainBorder(cellSet, color) {
        cellSet.forEach(id => {
            const cell = document.getElementById(id);
            if (!cell) return;
            const { r, c } = getCoordsFromCell(cell);
            cell.classList.add('domain-fill');
            if (!cellSet.has(`cell-${r-1}-${c}`)) { cell.style.borderTop = `3px solid ${color}`; }
            if (!cellSet.has(`cell-${r+1}-${c}`)) { cell.style.borderBottom = `3px solid ${color}`; }
            if (!cellSet.has(`cell-${r}-${c-1}`)) { cell.style.borderLeft = `3px solid ${color}`; }
            if (!cellSet.has(`cell-${r}-${c+1}`)) { cell.style.borderRight = `3px solid ${color}`; }
        });
    }

    // --- 그리기 로직 (안정화) ---
    timelineGrid.addEventListener('mousedown', (e) => {
        let clickedOnExistingLog = false;
        if(e.target.classList.contains('grid-cell')){
            // 클릭된 셀이 이미 로그의 일부인지 확인
            logs.forEach(log => {
                if(log.cells.includes(e.target.id)){
                    clickedOnExistingLog = true;
                }
            });
        }
        if(clickedOnExistingLog) return;
        
        removeMiniPalette();
        isDrawing = true;
        
        startCell = getCellFromCoords(e.clientX, e.clientY);
        rubberBand = document.createElement('div');
        rubberBand.className = 'cell-selection-rubberband';
        timelineGrid.appendChild(rubberBand);
        updateRubberBand(startCell, startCell);
    });
    // ... (mousemove, mouseup, finalizeSelection 등은 이전 버전과 동일하게 유지)
    function getCellFromCoords(x, y) {
        const gridRect = timelineGrid.getBoundingClientRect();
        const minuteWidth = timelineGrid.clientWidth / NUM_MINUTES_INTERVALS;
        const hourHeight = timelineGrid.clientHeight / NUM_HOURS;
        const localX = x - gridRect.left, localY = y - gridRect.top;
        const c = Math.floor(localX / minuteWidth), r = Math.floor(localY / hourHeight);
        if (r >= 0 && r < NUM_HOURS && c >= 0 && c < NUM_MINUTES_INTERVALS) {
            return document.getElementById(`cell-${r}-${c}`);
        }
        return null;
    }
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
        if (drawingMode === 'domain') { setCellMode(); }
    });
    function updateRubberBand(start, end) {
        if (!start || !end) return;
        const startCoords = getCoordsFromCell(start), endCoords = getCoordsFromCell(end);
        const minR = Math.min(startCoords.r, endCoords.r), maxR = Math.max(startCoords.r, endCoords.r);
        const minC = Math.min(startCoords.c, endCoords.c), maxC = Math.max(startCoords.c, endCoords.c);
        const firstCell = document.getElementById(`cell-${minR}-${minC}`), lastCell = document.getElementById(`cell-${maxR}-${maxC}`);
        if (!firstCell || !lastCell) return;
        const gridRect = timelineGrid.getBoundingClientRect(), firstRect = firstCell.getBoundingClientRect(), lastRect = lastCell.getBoundingClientRect();
        const left = firstRect.left - gridRect.left, top = firstRect.top - gridRect.top;
        const width = lastRect.right - firstRect.left, height = lastRect.bottom - firstRect.top;
        rubberBand.style.left = `${left}px`; rubberBand.style.top = `${top}px`;
        rubberBand.style.width = `${width}px`; rubberBand.style.height = `${height}px`;
    }
    function getCoordsFromCell(cell) {
        const [r, c] = cell.id.replace('cell-', '').split('-').map(Number);
        return { r, c };
    }
    function finalizeSelection(start, end) {
        const finalCells = new Set();
        let startCoords = getCoordsFromCell(start), endCoords = getCoordsFromCell(end);
        if (startCoords.r > endCoords.r) { [startCoords, endCoords] = [endCoords, startCoords]; }
        if (startCoords.r === endCoords.r) {
            const minC = Math.min(startCoords.c, endCoords.c);
            const maxC = Math.max(startCoords.c, endCoords.c);
            for (let c = minC; c <= maxC; c++) { finalCells.add(`cell-${startCoords.r}-${c}`); }
        } else {
            for (let c = startCoords.c; c < NUM_MINUTES_INTERVALS; c++) { finalCells.add(`cell-${startCoords.r}-${c}`); }
            for (let r = startCoords.r + 1; r < endCoords.r; r++) {
                for (let c = 0; c < NUM_MINUTES_INTERVALS; c++) { finalCells.add(`cell-${r}-${c}`); }
            }
            for (let c = 0; c <= endCoords.c; c++) { finalCells.add(`cell-${endCoords.r}-${c}`); }
        }
        const newLog = {
            id: Date.now(), type: drawingMode,
            cells: Array.from(finalCells),
            color: drawingMode === 'domain' ? selectedDomain.color : null,
            content: ''
        };
        logs.push(newLog);
        saveLogs();
        renderAllLogs();
    }
    
    // --- 인라인 편집 & 팔레트 ---
    function showMiniPalette(logId, event) {
        removeMiniPalette();
        const palette = document.createElement('div');
        palette.className = 'mini-palette';
        const editBtn = document.createElement('button');
        editBtn.textContent = '편집';
        editBtn.onclick = () => { enableInlineEditor(logId); removeMiniPalette(); };
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '삭제';
        deleteBtn.onclick = () => {
            if(confirm('정말로 이 로그를 삭제하시겠습니까?')) {
                logs = logs.filter(l => l.id !== logId);
                saveLogs();
                renderAllLogs();
            }
            removeMiniPalette();
        };
        palette.appendChild(editBtn);
        palette.appendChild(deleteBtn);
        palette.style.left = `${event.clientX - appContainer.getBoundingClientRect().left}px`;
        palette.style.top = `${event.clientY - appContainer.getBoundingClientRect().top}px`;
        appContainer.appendChild(palette);
    }
    function removeMiniPalette() {
        const existingPalette = appContainer.querySelector('.mini-palette');
        if (existingPalette) existingPalette.remove();
    }
    function enableInlineEditor(logId) {
        const log = logs.find(l => l.id === logId);
        const targetCell = document.getElementById(log.cells[0]); // 첫 번째 셀에 편집기 표시
        if(!targetCell) return;

        const editor = document.createElement('textarea');
        editor.className = 'inline-editor';
        editor.value = log.content || '';
        
        // 기존 콘텐츠가 있다면 숨김
        const contentDisplay = targetCell.querySelector('.log-content-display');
        if(contentDisplay) contentDisplay.style.display = 'none';
        
        targetCell.appendChild(editor);
        editor.focus();
        editor.select();

        editor.addEventListener('blur', () => {
            const logIndex = logs.findIndex(l => l.id === logId);
            if(logIndex > -1) {
                logs[logIndex].content = editor.value;
                saveLogs();
                renderAllLogs(); // 변경사항 반영
            }
        });
    }

    // --- 앱 시작 ---
    setup();
});