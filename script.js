document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 요소 ---
    const timeline = document.getElementById('timeline');
    const timeLabelsContainer = document.querySelector('.time-labels');
    const currentDateEl = document.getElementById('current-date');
    const modal = document.getElementById('popup-modal');
    const typeButtons = modal.querySelectorAll('.type-selector button');
    const memoInput = document.getElementById('log-input');
    const todoInputArea = document.getElementById('todo-input-area');
    const newTodoItemInput = document.getElementById('new-todo-item');
    const addTodoItemBtn = document.getElementById('add-todo-item-btn');
    const todoList = document.getElementById('todo-list');
    const saveButton = document.getElementById('save-log');
    const cancelButton = document.getElementById('cancel-log');
    const deleteButton = document.getElementById('delete-log');

    // --- 상태 및 데이터 변수 ---
    let logs = [];
    let isDrawing = false;
    let currentBlock = null;
    let startY = 0;
    let selectedType = 'memo';
    let currentTodoItems = [];

    // --- 데이터 관리 ---
    function saveLogs() { localStorage.setItem('logCalendarData', JSON.stringify(logs)); }
    function loadLogs() {
        const savedLogs = localStorage.getItem('logCalendarData');
        if (savedLogs) {
            logs = JSON.parse(savedLogs);
            renderAllLogs();
        }
    }
    function renderAllLogs() {
        timeline.innerHTML = '';
        logs.forEach(log => {
            const block = createBlockElement(log);
            timeline.appendChild(block);
        });
    }

    function createBlockElement(log) {
        const block = document.createElement('div');
        block.className = `time-block ${log.type}`;
        block.style.top = log.top;
        block.style.height = log.height;
        block.dataset.id = log.id;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'block-content';
        block.appendChild(contentDiv);

        if (log.type === 'todo' && Array.isArray(log.content)) {
            log.content.forEach((item, index) => {
                const todoItemDiv = document.createElement('div');
                todoItemDiv.className = 'todo-item';
                if (item.completed) todoItemDiv.classList.add('completed');

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = item.completed;
                checkbox.onchange = () => {
                    log.content[index].completed = checkbox.checked;
                    todoItemDiv.classList.toggle('completed', checkbox.checked);
                    saveLogs();
                };
                
                const textSpan = document.createElement('span');
                textSpan.textContent = item.text;

                todoItemDiv.appendChild(checkbox);
                todoItemDiv.appendChild(textSpan);
                contentDiv.appendChild(todoItemDiv);
            });
        } else {
            contentDiv.textContent = log.content;
        }

        block.addEventListener('click', () => {
            currentBlock = block;
            showModal(log);
        });
        
        setTimeout(() => checkAndApplyOverflow(block), 0);

        return block;
    }
    
    function checkAndApplyOverflow(block) {
        const contentDiv = block.querySelector('.block-content');
        if (contentDiv && contentDiv.scrollHeight > block.clientHeight) {
            // 이미 추가된 ellipsis-indicator가 있는지 확인하여 중복 추가 방지
            if (!block.querySelector('.ellipsis-indicator')) {
                const ellipsis = document.createElement('div');
                ellipsis.className = 'ellipsis-indicator';
                ellipsis.textContent = '... ...';
                block.appendChild(ellipsis);
            }
        }
    }

    // --- 초기 설정 ---
    function setup() {
        const today = new Date();
        currentDateEl.textContent = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
        for (let i = 0; i < 24; i++) {
            const label = document.createElement('div');
            label.className = 'time-label';
            label.textContent = `${String(i).padStart(2, '0')}:00`;
            timeLabelsContainer.appendChild(label);
        }
        loadLogs();
    }

    // --- 타임라인 그리기 ---
    timeline.addEventListener('mousedown', (e) => {
        if (e.target.closest('.time-block')) return;
        isDrawing = true;
        startY = e.offsetY;
        currentBlock = document.createElement('div');
        currentBlock.className = 'time-block drawing';
        currentBlock.style.top = `${startY}px`;
        currentBlock.style.height = '0px';
        timeline.appendChild(currentBlock);
    });
    timeline.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const currentY = e.offsetY;
        const height = Math.abs(currentY - startY);
        const top = Math.min(startY, currentY);
        currentBlock.style.top = `${top}px`;
        currentBlock.style.height = `${height}px`;
    });
    timeline.addEventListener('mouseup', () => {
        if (!isDrawing) return;
        isDrawing = false;
        if (currentBlock && parseInt(currentBlock.style.height) < 10) {
            currentBlock.remove();
        } else if (currentBlock) {
            showModal();
        }
    });

    // --- 팝업(모달) 관리 ---
    function showModal(log = null) {
        modal.style.display = 'flex';
        if (log) {
            selectedType = log.type;
            deleteButton.style.display = 'block';
            if (log.type === 'todo') {
                currentTodoItems = JSON.parse(JSON.stringify(log.content));
            } else {
                memoInput.value = log.content;
            }
        } else {
            selectedType = 'memo';
            memoInput.value = '';
            currentTodoItems = [];
        }
        updateTodoInputUI();
        updateInputVisibility();
        typeButtons.forEach(btn => btn.classList.toggle('selected', btn.dataset.type === selectedType));
    }

    function hideModal() {
        modal.style.display = 'none';
        currentBlock = null;
    }

    function updateInputVisibility() {
        if (selectedType === 'todo') {
            memoInput.style.display = 'none';
            todoInputArea.style.display = 'block';
        } else {
            memoInput.style.display = 'block';
            todoInputArea.style.display = 'none';
        }
    }
    
    function updateTodoInputUI() {
        todoList.innerHTML = '';
        currentTodoItems.forEach((item, index) => {
            const li = document.createElement('li');
            li.textContent = item.text;
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-item-btn';
            deleteBtn.textContent = 'X';
            deleteBtn.onclick = () => { currentTodoItems.splice(index, 1); updateTodoInputUI(); };
            li.appendChild(deleteBtn);
            todoList.appendChild(li);
        });
    }
    addTodoItemBtn.addEventListener('click', () => {
        const newItemText = newTodoItemInput.value.trim();
        if (newItemText) {
            currentTodoItems.push({ text: newItemText, completed: false });
            newTodoItemInput.value = '';
            updateTodoInputUI();
            newTodoItemInput.focus();
        }
    });
    newTodoItemInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTodoItemBtn.click(); } });

    // --- 버튼 이벤트 핸들러 ---
    typeButtons.forEach(button => { button.addEventListener('click', () => { selectedType = button.dataset.type; typeButtons.forEach(btn => btn.classList.remove('selected')); button.classList.add('selected'); updateInputVisibility(); }); });
    
    saveButton.addEventListener('click', () => {
        if (!currentBlock) return;
    
        currentBlock.classList.remove('drawing'); // drawing 클래스 제거
    
        const content = selectedType === 'todo' ? currentTodoItems : memoInput.value.trim();
        if (content.length === 0) { alert('내용을 입력해주세요.'); return; }
    
        const logId = currentBlock.dataset.id;
        if (logId) {
            const index = logs.findIndex(log => log.id == logId);
            if (index > -1) { logs[index].type = selectedType; logs[index].content = content; if (logs[index].type !== 'todo') delete logs[index].completed; }
        } else {
            const newLog = { id: Date.now(), type: selectedType, content, top: currentBlock.style.top, height: currentBlock.style.height };
            if (newLog.type === 'todo' && Array.isArray(newLog.content)) {
                newLog.completed = newLog.content.every(item => item.completed);
            }
            logs.push(newLog);
        }
        saveLogs();
        renderAllLogs();
        hideModal();
    });

    cancelButton.addEventListener('click', () => {
        if (currentBlock && !currentBlock.dataset.id) currentBlock.remove();
        hideModal();
    });

    deleteButton.addEventListener('click', () => {
        if (confirm('정말로 이 로그를 삭제하시겠습니까?')) {
            logs = logs.filter(log => log.id != currentBlock.dataset.id);
            saveLogs();
            renderAllLogs();
            hideModal();
        }
    });

    // --- 앱 시작 ---
    setup();
});