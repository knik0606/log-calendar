document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 요소 ---
    const timelineHours = document.querySelector('.timeline-hours');
    const timelineMinutes = document.querySelector('.timeline-minutes');
    const timelineGrid = document.getElementById('timeline-grid');
    const currentDateEl = document.getElementById('current-date');

    // --- 상수 및 설정 ---
    const NUM_HOURS = 24;
    const NUM_MINUTES_INTERVALS = 6; // 10분 간격

    // --- 상태 변수 ---
    let isDrawing = false;
    const selectedCells = new Set(); // 선택된 셀들의 ID (e.g., "cell-R-C")를 저장
    let lastHoveredCell = null;

    // --- 초기 설정 ---
    function setup() {
        // 날짜 표시
        const today = new Date();
        // ★★★ 바로 이 부분의 오타를 수정했습니다! ★★★
        currentDateEl.textContent = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

        // 왼쪽 시간 라벨 (0시 ~ 23시)
        for (let i = 0; i < NUM_HOURS; i++) {
            const label = document.createElement('div');
            label.className = 'hour-label';
            label.textContent = `${String(i).padStart(2, '0')}:00`;
            timelineHours.appendChild(label);
        }

        // 상단 분 라벨 (0분 ~ 50분)
        for (let i = 0; i < NUM_MINUTES_INTERVALS; i++) {
            const label = document.createElement('div');
            label.className = 'minute-label';
            label.textContent = `${i * 10}분`;
            timelineMinutes.appendChild(label);
        }

        // 메인 그리드에 144개의 셀 생성
        for (let r = 0; r < NUM_HOURS; r++) {
            for (let c = 0; c < NUM_MINUTES_INTERVALS; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.id = `cell-${r}-${c}`; // 고유 ID 부여
                timelineGrid.appendChild(cell);
            }
        }
    }

    // --- 자유 선택 그리기 로직 ---

    function getCellFromEvent(e) {
        // document.elementFromPoint는 현재 마우스 위치에 있는 가장 상위 요소를 반환
        return document.elementFromPoint(e.clientX, e.clientY);
    }

    // 두 셀 사이의 모든 셀을 선택하는 함수 (직선 경로)
    function selectCellsBetween(startId, endId) {
        const [startR, startC] = startId.replace('cell-', '').split('-').map(Number);
        const [endR, endC] = endId.replace('cell-', '').split('-').map(Number);

        const r_min = Math.min(startR, endR);
        const r_max = Math.max(startR, endR);
        const c_min = Math.min(startC, endC);
        const c_max = Math.max(startC, endC);

        for (let r = r_min; r <= r_max; r++) {
            for (let c = c_min; c <= c_max; c++) {
                const cellId = `cell-${r}-${c}`;
                if (!selectedCells.has(cellId)) {
                    selectedCells.add(cellId);
                    document.getElementById(cellId).classList.add('selected');
                }
            }
        }
    }

    timelineGrid.addEventListener('mousedown', (e) => {
        isDrawing = true;
        // 기존 선택 지우기
        selectedCells.forEach(id => document.getElementById(id)?.classList.remove('selected'));
        selectedCells.clear();

        const cell = getCellFromEvent(e);
        if (cell && cell.classList.contains('grid-cell')) {
            cell.classList.add('selected');
            selectedCells.add(cell.id);
            lastHoveredCell = cell;
        }
    });

    timelineGrid.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;

        const cell = getCellFromEvent(e);
        if (cell && cell.classList.contains('grid-cell') && cell.id !== lastHoveredCell?.id) {
            selectCellsBetween(lastHoveredCell.id, cell.id);
            lastHoveredCell = cell;
        }
    });

    window.addEventListener('mouseup', () => {
        if (!isDrawing) return;
        isDrawing = false;
        lastHoveredCell = null;

        if (selectedCells.size > 0) {
            console.log(`${selectedCells.size}개의 셀이 선택되었습니다.`, selectedCells);
            // 다음 단계: 여기서 [입력] 버튼을 띄우는 로직 추가
        }
    });

    // --- 앱 시작 ---
    setup();
});