document.addEventListener('DOMContentLoaded', function() {
    // --- Local Storage Persistence ---
    function getTasksFromDOM() {
        const columns = ['backlog-column', 'todo-column', 'progress-column', 'done-column'];
        const tasks = {};
        columns.forEach(colId => {
            const col = document.getElementById(colId);
            if (!col) return;
            tasks[colId] = [];
            col.querySelectorAll('.task-card').forEach(card => {
                // Extract info from card
                const title = card.querySelector('h3')?.textContent || '';
                const desc = card.querySelector('p')?.textContent || '';
                let priority = 'low';
                if (card.classList.contains('priority-high')) priority = 'high';
                else if (card.classList.contains('priority-medium')) priority = 'medium';
                // Date
                let date = '';
                const dateSpan = card.querySelector('.fa-calendar-alt')?.nextElementSibling;
                if (dateSpan) {
                    const match = dateSpan.textContent.match(/Due: (.+)/);
                    if (match) date = match[1];
                }
                // Tags
                const tagBadges = Array.from(card.querySelectorAll('.flex.space-x-1 span')).slice(1); // skip priority badge
                const tags = tagBadges.map(b => b.textContent);
                tasks[colId].push({ title, desc, priority, date, tags });
            });
        });
        return tasks;
    }

    function saveTasksToStorage() {
        const tasks = getTasksFromDOM();
        localStorage.setItem('kanbanTasks', JSON.stringify(tasks));
    }

    function restoreTasksFromStorage() {
        const data = localStorage.getItem('kanbanTasks');
        if (!data) return;
        const tasks = JSON.parse(data);
        const columns = ['backlog-column', 'todo-column', 'progress-column', 'done-column'];
        columns.forEach(colId => {
            const col = document.getElementById(colId);
            if (!col) return;
            col.innerHTML = '';
            (tasks[colId] || []).forEach(task => {
                // Priority classes and badge
                let priorityClass = 'priority-low', badge = '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Low</span>';
                if (task.priority === 'medium') {
                    priorityClass = 'priority-medium';
                    badge = '<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Medium</span>';
                } else if (task.priority === 'high') {
                    priorityClass = 'priority-high';
                    badge = '<span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">High</span>';
                }
                // Tag badge colors
                const tagColors = {
                    'Frontend': 'bg-purple-100 text-purple-800',
                    'Backend': 'bg-blue-100 text-blue-800',
                    'Meeting': 'bg-pink-100 text-pink-800',
                    'Discussion': 'bg-gray-100 text-gray-800'
                };
                const tagBadges = (task.tags || []).map(tag => {
                    const color = tagColors[tag] || 'bg-gray-100 text-gray-800';
                    return `<span class="text-xs ${color} px-2 py-1 rounded-full">${tag}</span>`;
                }).join(' ');
                // Date
                const dateStr = task.date;
                const newTask = document.createElement('div');
                newTask.className = `task-card bg-white p-4 rounded-lg shadow-xs border-l-4 ${priorityClass}`;
                newTask.setAttribute('draggable', 'true');
                newTask.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-medium text-gray-800">${task.title}</h3>
                        <div class="flex space-x-1">${badge} ${tagBadges}</div>
                    </div>
                    <p class="text-gray-500 text-sm mb-3">${task.desc}</p>
                    <div class="flex justify-between items-center text-xs text-gray-400">
                        <div class="flex items-center">
                            <i class="far fa-calendar-alt mr-1"></i>
                            <span>Due: ${dateStr}</span>
                        </div>
                        <div class="flex -space-x-1">
                            <img class="w-6 h-6 rounded-full border-2 border-white" src="https://randomuser.me/api/portraits/men/1.jpg" alt="User">
                        </div>
                    </div>
                `;
                addDragEvents(newTask);
                col.appendChild(newTask);
            });
        });
        updateTaskStatusAndCounts();
    }

    // Restore tasks on load
    restoreTasksFromStorage();
    // Drag and drop logic
    function addDragEvents(draggable) {
        draggable.addEventListener('dragstart', () => {
            draggable.classList.add('dragging');
        });
        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
        });
    }

    document.querySelectorAll('.task-card').forEach(addDragEvents);
    const columns = document.querySelectorAll('.kanban-column > div');
    columns.forEach(column => {
        column.addEventListener('dragover', e => {
            e.preventDefault();
            const dragging = document.querySelector('.dragging');
            const afterElement = getDragAfterElement(column, e.clientY);
            if (afterElement == null) {
                column.appendChild(dragging);
            } else {
                column.insertBefore(dragging, afterElement);
            }
        });
        // Detect drop to update status and counts and save
        column.addEventListener('drop', e => {
            setTimeout(() => {
                updateTaskStatusAndCounts();
                saveTasksToStorage();
            }, 10);
        });
    });
    function getDragAfterElement(column, y) {
        const draggableElements = [...column.querySelectorAll('.task-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function updateTaskStatusAndCounts() {
        // Label tasks in Done as complete
        const doneColumn = document.getElementById('done-column');
        if (doneColumn) {
            doneColumn.querySelectorAll('.task-card').forEach(card => {
                if (!card.classList.contains('opacity-70')) {
                    card.classList.add('opacity-70');
                }
                // Add completed badge if not present
                const infoRow = card.querySelector('.flex.justify-between.items-center.text-xs.text-gray-400');
                if (infoRow && !infoRow.querySelector('.text-green-500')) {
                    const badge = document.createElement('span');
                    badge.className = 'text-green-500';
                    badge.textContent = 'Completed';
                    // Add check icon
                    const icon = document.createElement('i');
                    icon.className = 'far fa-calendar-check mr-1 text-green-500';
                    infoRow.insertBefore(icon, infoRow.firstChild);
                    infoRow.appendChild(badge);
                }
            });
        }
        // Remove completed badge and opacity from tasks not in Done
        document.querySelectorAll('.kanban-column').forEach(column => {
            if (column.id !== 'done-column') {
                column.querySelectorAll('.task-card').forEach(card => {
                    card.classList.remove('opacity-70');
                    // Remove completed badge and icon
                    const infoRow = card.querySelector('.flex.justify-between.items-center.text-xs.text-gray-400');
                    if (infoRow) {
                        infoRow.querySelectorAll('.text-green-500, .fa-calendar-check').forEach(el => el.remove());
                    }
                });
            }
        });
        // Update counts
        updateTaskCounts();
        // Save to storage
        saveTasksToStorage();
    }

    function updateTaskCounts() {
        // Per column
        document.querySelectorAll('.kanban-column').forEach(column => {
            const countElement = column.querySelector('span.bg-gray-200');
            const tasks = column.querySelectorAll('.task-card').length;
            countElement.textContent = tasks;
        });
        // Total, In Progress, Completed
        const total = document.querySelectorAll('.task-card').length;
        const completed = document.getElementById('done-column')?.querySelectorAll('.task-card').length || 0;
        const inProgress = document.getElementById('progress-column')?.querySelectorAll('.task-card').length || 0;
        // Update stat boxes
        const statBoxes = document.querySelectorAll('.grid .bg-white');
        if (statBoxes.length >= 4) {
            statBoxes[0].querySelector('h3').textContent = total;
            statBoxes[1].querySelector('h3').textContent = completed;
            statBoxes[2].querySelector('h3').textContent = inProgress;
        }
    }

    // Modal form logic
    const taskForm = document.getElementById('taskForm');
    const modal = document.getElementById('taskModal');
    if (taskForm) {
        taskForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const title = document.getElementById('taskTitle').value.trim();
            const desc = document.getElementById('taskDesc').value.trim();
            const priority = document.getElementById('taskPriority').value;
            const date = document.getElementById('taskDate').value;
            const tagsSelect = document.getElementById('taskTags');
            const selectedTags = Array.from(tagsSelect.selectedOptions).map(opt => opt.value);
            if (!title || !desc || !priority || !date) return;

            // Priority classes and badge
            let priorityClass = 'priority-low', badge = '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Low</span>';
            if (priority === 'medium') {
                priorityClass = 'priority-medium';
                badge = '<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Medium</span>';
            } else if (priority === 'high') {
                priorityClass = 'priority-high';
                badge = '<span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">High</span>';
            }

            // Tag badge colors
            const tagColors = {
                'Frontend': 'bg-purple-100 text-purple-800',
                'Backend': 'bg-blue-100 text-blue-800',
                'Meeting': 'bg-pink-100 text-pink-800',
                'Discussion': 'bg-gray-100 text-gray-800'
            };
            const tagBadges = selectedTags.map(tag => {
                const color = tagColors[tag] || 'bg-gray-100 text-gray-800';
                return `<span class="text-xs ${color} px-2 py-1 rounded-full">${tag}</span>`;
            }).join(' ');

            // Format date
            const dateObj = new Date(date);
            const dateStr = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

            const newTask = document.createElement('div');
            newTask.className = `task-card bg-white p-4 rounded-lg shadow-xs border-l-4 ${priorityClass}`;
            newTask.setAttribute('draggable', 'true');
            newTask.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-medium text-gray-800">${title}</h3>
                    <div class="flex space-x-1">${badge} ${tagBadges}</div>
                </div>
                <p class="text-gray-500 text-sm mb-3">${desc}</p>
                <div class="flex justify-between items-center text-xs text-gray-400">
                    <div class="flex items-center">
                        <i class="far fa-calendar-alt mr-1"></i>
                        <span>Due: ${dateStr}</span>
                    </div>
                    <div class="flex -space-x-1">
                        <img class="w-6 h-6 rounded-full border-2 border-white" src="https://randomuser.me/api/portraits/men/1.jpg" alt="User">
                    </div>
                </div>
            `;
            addDragEvents(newTask);
            document.getElementById('backlog-column').prepend(newTask);
            updateTaskStatusAndCounts();
            modal.classList.add('hidden');
            taskForm.reset();
            saveTasksToStorage();
        });
    }

    // Initial update for counts and done labels
    updateTaskStatusAndCounts();
});
