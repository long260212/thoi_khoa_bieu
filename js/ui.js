/**
 * EduSchedule - UI Renderer & DOM Controller
 * Chịu trách nhiệm hiển thị Dashboard, Danh sách giáo viên, Trang chi tiết và các Buổi học
 */

const UI = {
    currentTeacherId: null,
    currentView: 'dashboard', // 'dashboard' | 'teacher-detail'
    teacherViewMode: 'grid', // 'grid' | 'table'
    activeShiftFilter: 'all', // 'all' | 'Sáng' | 'Chiều'
    searchQuery: '',
    lessonSearchQuery: '',

    init() {
        this.bindGlobalEvents();
    },

    bindGlobalEvents() {
        // Dark mode toggle
        const themeBtn = document.getElementById('btn-toggle-theme');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('eduschedule_theme', newTheme);
                this.updateThemeIcon(newTheme);
            });

            // Khôi phục theme đã lưu
            const savedTheme = localStorage.getItem('eduschedule_theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            this.updateThemeIcon(savedTheme);
        }

        // View Mode toggle (Grid vs Table)
        const btnGridView = document.getElementById('btn-view-grid');
        const btnTableView = document.getElementById('btn-view-table');
        if (btnGridView && btnTableView) {
            btnGridView.addEventListener('click', () => {
                this.teacherViewMode = 'grid';
                btnGridView.classList.add('active');
                btnTableView.classList.remove('active');
                this.renderTeachersList();
            });
            btnTableView.addEventListener('click', () => {
                this.teacherViewMode = 'table';
                btnTableView.classList.add('active');
                btnGridView.classList.remove('active');
                this.renderTeachersList();
            });
        }

        // Search Teachers input
        const teacherSearchInput = document.getElementById('search-teachers-input');
        if (teacherSearchInput) {
            teacherSearchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.renderTeachersList();
            });
        }

        // Search Lessons input
        const lessonSearchInput = document.getElementById('search-lessons-input');
        if (lessonSearchInput) {
            lessonSearchInput.addEventListener('input', (e) => {
                this.lessonSearchQuery = e.target.value.toLowerCase().trim();
                this.renderLessonsList();
            });
        }

        // Shift Filter buttons on Teacher Detail
        const shiftFilterBtns = document.querySelectorAll('.shift-filter-btn');
        shiftFilterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                shiftFilterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeShiftFilter = btn.dataset.shift;
                this.renderLessonsList();
            });
        });
    },

    updateThemeIcon(theme) {
        const themeBtn = document.getElementById('btn-toggle-theme');
        if (!themeBtn) return;
        if (theme === 'dark') {
            themeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
            themeBtn.setAttribute('title', 'Chuyển sang chế độ sáng');
        } else {
            themeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
            themeBtn.setAttribute('title', 'Chuyển sang chế độ tối');
        }
    },

    // --- NAVIGATION ---
    async navigateToDashboard() {
        this.currentView = 'dashboard';
        this.currentTeacherId = null;

        document.getElementById('view-dashboard').classList.add('active');
        document.getElementById('view-teacher-detail').classList.remove('active');

        await this.renderDashboard();
    },

    async navigateToTeacherDetail(teacherId) {
        this.currentView = 'teacher-detail';
        this.currentTeacherId = Number(teacherId);
        this.activeShiftFilter = 'all';
        this.lessonSearchQuery = '';

        // Reset filter UI
        const filterBtns = document.querySelectorAll('.shift-filter-btn');
        filterBtns.forEach(btn => {
            if (btn.dataset.shift === 'all') btn.classList.add('active');
            else btn.classList.remove('active');
        });
        const lSearch = document.getElementById('search-lessons-input');
        if (lSearch) lSearch.value = '';

        document.getElementById('view-dashboard').classList.remove('active');
        document.getElementById('view-teacher-detail').classList.add('active');

        await this.renderTeacherDetail();
    },

    // --- DASHBOARD RENDER ---
    async renderDashboard() {
        await this.renderStats();
        await this.renderTeachersList();
    },

    async renderStats() {
        const stats = await window.eduDB.getSystemStats();

        document.getElementById('stat-total-teachers').innerText = stats.totalTeachers;
        document.getElementById('stat-total-taught').innerText = stats.totalTaughtLessons;
        document.getElementById('stat-total-required').innerText = `/ ${stats.totalRequiredLessons} buổi`;
        document.getElementById('stat-completion-rate').innerText = `${stats.completionRate}%`;
        document.getElementById('stat-total-files').innerText = stats.totalAttachments;
    },

    async renderTeachersList() {
        const container = document.getElementById('teachers-display-container');
        if (!container) return;

        const teachers = await window.eduDB.getAllTeachers();
        const allLessons = await window.eduDB.getAllLessons();

        // Map số buổi đã dạy cho mỗi giáo viên
        const lessonCountMap = {};
        allLessons.forEach(l => {
            lessonCountMap[l.teacherId] = (lessonCountMap[l.teacherId] || 0) + 1;
        });

        // Lọc theo tìm kiếm
        const filteredTeachers = teachers.filter(t => {
            if (!this.searchQuery) return true;
            return t.name.toLowerCase().includes(this.searchQuery) ||
                   (t.subject && t.subject.toLowerCase().includes(this.searchQuery)) ||
                   (t.email && t.email.toLowerCase().includes(this.searchQuery));
        });

        if (filteredTeachers.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                    <h3 class="empty-title">Không tìm thấy giáo viên nào</h3>
                    <p class="empty-desc">${this.searchQuery ? `Không có kết quả cho từ khóa "${this.searchQuery}"` : 'Chưa có giáo viên trong hệ thống. Hãy thêm giáo viên đầu tiên!'}</p>
                    <button class="btn btn-primary" onclick="App.openAddTeacherModal()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Thêm giáo viên mới
                    </button>
                </div>
            `;
            return;
        }

        if (this.teacherViewMode === 'grid') {
            container.className = 'teacher-grid';
            container.innerHTML = filteredTeachers.map(teacher => {
                const taught = lessonCountMap[teacher.id] || 0;
                const required = teacher.totalLessons || 30;
                const percent = Math.min(100, Math.round((taught / required) * 100));
                const isComplete = percent >= 100;
                const initials = this.getInitials(teacher.name);

                return `
                    <div class="teacher-card" style="--card-color: ${teacher.avatarColor || '#4f46e5'}" onclick="UI.navigateToTeacherDetail(${teacher.id})">
                        <div class="teacher-header">
                            <div class="teacher-avatar" style="background-color: ${teacher.avatarColor || '#4f46e5'}">
                                ${initials}
                            </div>
                            <div class="teacher-title-wrap">
                                <div class="teacher-name" title="${this.escapeHtml(teacher.name)}">${this.escapeHtml(teacher.name)}</div>
                                <div class="teacher-subject">${this.escapeHtml(teacher.subject || 'Tổng hợp')}</div>
                            </div>
                        </div>

                        <div class="teacher-progress-section">
                            <div class="progress-labels">
                                <span class="progress-count">Tiến độ: <strong>${taught}</strong> / ${required} buổi</span>
                                <span class="progress-percentage">${percent}%</span>
                            </div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill ${isComplete ? 'complete' : ''}" style="width: ${percent}%"></div>
                            </div>
                        </div>

                        <div class="teacher-card-footer" onclick="event.stopPropagation()">
                            <span class="lesson-badge-info">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                ${taught} buổi đã báo giảng
                            </span>
                            <div class="card-actions">
                                <button class="btn-icon btn-sm" title="Chỉnh sửa giáo viên" onclick="App.openEditTeacherModal(${teacher.id})">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button class="btn-icon btn-sm" title="Xóa giáo viên" onclick="App.confirmDeleteTeacher(${teacher.id}, '${this.escapeHtml(teacher.name)}')">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="#ef4444"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            // Table view
            container.className = 'teacher-table-container';
            container.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Giáo viên</th>
                            <th>Bộ môn</th>
                            <th>Số buổi quy định</th>
                            <th>Đã giảng dạy</th>
                            <th>Tiến độ</th>
                            <th style="text-align: right;">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredTeachers.map(teacher => {
                            const taught = lessonCountMap[teacher.id] || 0;
                            const required = teacher.totalLessons || 30;
                            const percent = Math.min(100, Math.round((taught / required) * 100));
                            const isComplete = percent >= 100;
                            const initials = this.getInitials(teacher.name);

                            return `
                                <tr style="cursor: pointer;" onclick="UI.navigateToTeacherDetail(${teacher.id})">
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <div class="teacher-avatar" style="width: 36px; height: 36px; font-size: 14px; background-color: ${teacher.avatarColor || '#4f46e5'}">
                                                ${initials}
                                            </div>
                                            <div>
                                                <div style="font-weight: 700;">${this.escapeHtml(teacher.name)}</div>
                                                <div style="font-size: 0.75rem; color: var(--text-muted);">${this.escapeHtml(teacher.email || 'Chưa cập nhật email')}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span class="meta-tag">${this.escapeHtml(teacher.subject || 'Tổng hợp')}</span></td>
                                    <td><strong>${required}</strong> buổi</td>
                                    <td><span style="font-weight: 700; color: var(--primary);">${taught}</span> buổi</td>
                                    <td style="min-width: 140px;">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <div class="progress-bar-bg" style="flex: 1;">
                                                <div class="progress-bar-fill ${isComplete ? 'complete' : ''}" style="width: ${percent}%"></div>
                                            </div>
                                            <span style="font-size: 0.8rem; font-weight: 700;">${percent}%</span>
                                        </div>
                                    </td>
                                    <td style="text-align: right;" onclick="event.stopPropagation()">
                                        <div style="display: inline-flex; gap: 6px;">
                                            <button class="btn btn-sm btn-secondary" onclick="UI.navigateToTeacherDetail(${teacher.id})">Xem lịch</button>
                                            <button class="btn-icon btn-sm" onclick="App.openEditTeacherModal(${teacher.id})">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button class="btn-icon btn-sm" onclick="App.confirmDeleteTeacher(${teacher.id}, '${this.escapeHtml(teacher.name)}')">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="#ef4444"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }
    },

    // --- TEACHER DETAIL RENDER ---
    async renderTeacherDetail() {
        if (!this.currentTeacherId) return;

        const teacher = await window.eduDB.getTeacherById(this.currentTeacherId);
        if (!teacher) {
            this.showToast('Không tìm thấy thông tin giáo viên!', 'error');
            this.navigateToDashboard();
            return;
        }

        const lessons = await window.eduDB.getLessonsByTeacherId(this.currentTeacherId);
        const taught = lessons.length;
        const required = teacher.totalLessons || 30;
        const percent = Math.min(100, Math.round((taught / required) * 100));
        const isComplete = percent >= 100;
        const initials = this.getInitials(teacher.name);

        // Update Profile Header
        document.getElementById('teacher-detail-avatar').innerText = initials;
        document.getElementById('teacher-detail-avatar').style.backgroundColor = teacher.avatarColor || '#4f46e5';
        document.getElementById('teacher-detail-name').innerText = teacher.name;
        document.getElementById('teacher-detail-subject').innerText = teacher.subject || 'Tổng hợp';
        document.getElementById('teacher-detail-email').innerText = teacher.email || 'Chưa có email';
        document.getElementById('teacher-detail-phone').innerText = teacher.phone || 'Chưa có số điện thoại';
        
        // Progress Box
        document.getElementById('profile-taught-count').innerText = `${taught} / ${required} buổi`;
        document.getElementById('profile-percent-text').innerText = `${percent}% hoàn thành`;
        const profileProgressBar = document.getElementById('profile-progress-bar');
        profileProgressBar.style.width = `${percent}%`;
        if (isComplete) profileProgressBar.classList.add('complete');
        else profileProgressBar.classList.remove('complete');

        await this.renderLessonsList();
    },

    async renderLessonsList() {
        const container = document.getElementById('lessons-list-container');
        if (!container || !this.currentTeacherId) return;

        const allLessons = await window.eduDB.getLessonsByTeacherId(this.currentTeacherId);

        // Áp dụng bộ lọc ca học & tìm kiếm
        const filteredLessons = allLessons.filter(lesson => {
            // Lọc theo ca học
            if (this.activeShiftFilter !== 'all' && lesson.shift !== this.activeShiftFilter) {
                return false;
            }
            // Lọc theo tìm kiếm từ khóa
            if (this.lessonSearchQuery) {
                const q = this.lessonSearchQuery;
                const matchTopic = lesson.topic && lesson.topic.toLowerCase().includes(q);
                const matchContent = lesson.content && lesson.content.toLowerCase().includes(q);
                const matchClass = lesson.className && lesson.className.toLowerCase().includes(q);
                const matchShift = lesson.shift && lesson.shift.toLowerCase().includes(q);
                if (!matchTopic && !matchContent && !matchClass && !matchShift) return false;
            }
            return true;
        });

        document.getElementById('filter-lesson-count-badge').innerText = `${filteredLessons.length} buổi`;

        if (filteredLessons.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </div>
                    <h3 class="empty-title">Chưa có buổi học nào</h3>
                    <p class="empty-desc">
                        ${this.activeShiftFilter !== 'all' || this.lessonSearchQuery 
                            ? 'Không tìm thấy buổi học nào thỏa mãn bộ lọc hiện tại.' 
                            : 'Giáo viên này chưa có buổi học nào được ghi nhận. Hãy thêm buổi học mới ngay!'}
                    </p>
                    <button class="btn btn-primary" onclick="App.openAddLessonModal()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Thêm buổi học mới
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredLessons.map(lesson => {
            const dateObj = new Date(lesson.dateTime);
            const dateFormatted = this.formatDate(dateObj);
            const weekday = this.getVietnameseWeekday(dateObj);
            const timeFormatted = this.formatTime(dateObj);
            const isMorning = lesson.shift === 'Sáng';

            return `
                <div class="lesson-card">
                    <div class="lesson-time-column">
                        <span class="lesson-weekday">${weekday}</span>
                        <span class="lesson-date">${dateFormatted}</span>
                        <span class="lesson-time">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline; vertical-align: -2px; margin-right: 2px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            ${timeFormatted}
                        </span>
                        <span class="badge-shift ${isMorning ? 'badge-morning' : 'badge-afternoon'}">
                            ${isMorning ? '☀️ Ca Sáng' : '🌙 Ca Chiều'}
                        </span>
                    </div>

                    <div class="lesson-body">
                        <div class="lesson-header-row">
                            <div>
                                <span class="lesson-topic">${this.escapeHtml(lesson.topic || 'Buổi giảng dạy')}</span>
                                ${lesson.className ? `<span class="lesson-class-tag">${this.escapeHtml(lesson.className)}</span>` : ''}
                            </div>
                            <div class="card-actions">
                                <button class="btn-icon btn-sm" title="Chỉnh sửa buổi học" onclick="App.openEditLessonModal(${lesson.id})">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button class="btn-icon btn-sm" title="Xóa buổi học" onclick="App.confirmDeleteLesson(${lesson.id})">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="#ef4444"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </div>

                        <div class="lesson-content-text">
                            ${lesson.content ? lesson.content : '<em style="color: var(--text-subtle);">Chưa nhập nội dung bài giảng</em>'}
                        </div>

                        ${lesson.attachment ? this.renderAttachmentItem(lesson.attachment, lesson.id) : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    renderAttachmentItem(att, lessonId) {
        const fileIcon = this.getFileIcon(att.name, att.type);
        const formattedSize = this.formatFileSize(att.size);

        return `
            <div class="attachment-box">
                <div class="attachment-icon">
                    ${fileIcon}
                </div>
                <div class="attachment-info">
                    <span class="attachment-name" title="${this.escapeHtml(att.name)}">${this.escapeHtml(att.name)}</span>
                    <span class="attachment-size">${formattedSize} • Đính kèm tài liệu</span>
                </div>
                <button class="btn-download" onclick="App.downloadAttachment(${lessonId})">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Tải xuống
                </button>
            </div>
        `;
    },

    // --- REPORT & PRINT VIEW ---
    async showPrintableReport() {
        if (!this.currentTeacherId) return;

        const teacher = await window.eduDB.getTeacherById(this.currentTeacherId);
        const lessons = await window.eduDB.getLessonsByTeacherId(this.currentTeacherId);
        
        const modalContent = document.getElementById('print-modal-body');
        if (!modalContent) return;

        const now = new Date();
        const dateStr = `Ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;

        modalContent.innerHTML = `
            <div class="printable-report" id="print-area">
                <div class="print-header">
                    <div style="font-size: 1rem; font-weight: bold; text-transform: uppercase;">SỞ GIÁO DỤC VÀ ĐÀO TẠO</div>
                    <div style="font-size: 0.95rem; font-style: italic;">TRƯỜNG THPT / TRUNG TÂM GIÁO DỤC</div>
                    <h2>SỔ BÁO GIẢNG VÀ TIẾN ĐỘ GIẢNG DẠY</h2>
                    <div style="margin-top: 4px; font-style: italic;">(Lưu hành nội bộ)</div>
                </div>

                <table class="print-meta-table">
                    <tr>
                        <td width="50%"><strong>Họ và tên giáo viên:</strong> ${this.escapeHtml(teacher.name)}</td>
                        <td width="50%"><strong>Tổ chuyên môn / Bộ môn:</strong> ${this.escapeHtml(teacher.subject || 'Tổng hợp')}</td>
                    </tr>
                    <tr>
                        <td><strong>Tổng số buổi quy định:</strong> ${teacher.totalLessons} buổi</td>
                        <td><strong>Số buổi đã thực hiện:</strong> ${lessons.length} buổi (Đạt ${Math.round((lessons.length / (teacher.totalLessons || 1)) * 100)}%)</td>
                    </tr>
                </table>

                <table class="print-data-table">
                    <thead>
                        <tr>
                            <th width="5%">STT</th>
                            <th width="15%">Ngày & Ca học</th>
                            <th width="12%">Lớp / Phòng</th>
                            <th width="28%">Tên bài dạy / Chuyên đề</th>
                            <th width="25%">Nội dung tóm tắt & Yêu cầu</th>
                            <th width="15%">Tài liệu đính kèm</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lessons.length === 0 ? '<tr><td colspan="6" style="text-align: center; padding: 20px;">Chưa có dữ liệu báo giảng</td></tr>' : 
                          lessons.map((l, index) => {
                              const d = new Date(l.dateTime);
                              const cleanContent = l.content ? l.content.replace(/<[^>]*>?/gm, ' ') : '';
                              return `
                                <tr>
                                    <td style="text-align: center;">${index + 1}</td>
                                    <td style="text-align: center;">
                                        ${this.formatDate(d)}<br>
                                        <strong>Ca ${l.shift}</strong> (${this.formatTime(d)})
                                    </td>
                                    <td style="text-align: center; font-weight: bold;">${this.escapeHtml(l.className || '-')}</td>
                                    <td><strong>${this.escapeHtml(l.topic || '')}</strong></td>
                                    <td>${this.escapeHtml(cleanContent.slice(0, 150))}${cleanContent.length > 150 ? '...' : ''}</td>
                                    <td style="font-size: 0.85rem; font-style: italic;">
                                        ${l.attachment ? `📄 ${this.escapeHtml(l.attachment.name)}` : 'Không có'}
                                    </td>
                                </tr>
                              `;
                          }).join('')
                        }
                    </tbody>
                </table>

                <div class="print-signatures">
                    <div>
                        <strong>NGƯỜI LẬP BÁO CÁO</strong><br>
                        <em>(Ký và ghi rõ họ tên)</em><br><br><br><br>
                        <strong>${this.escapeHtml(teacher.name)}</strong>
                    </div>
                    <div>
                        <em>${dateStr}</em><br>
                        <strong>BAN GIÁM HIỆU DUYỆT</strong><br>
                        <em>(Ký, đóng dấu)</em><br><br><br><br>
                    </div>
                </div>
            </div>
        `;

        App.openModal('modal-print-report');
    },

    // --- HELPER UTILITIES ---
    getInitials(name) {
        if (!name) return 'GV';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    },

    formatDate(d) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    },

    formatTime(d) {
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    },

    getVietnameseWeekday(d) {
        const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        return weekdays[d.getDay()];
    },

    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    getFileIcon(fileName, mimeType) {
        const lower = (fileName || '').toLowerCase();
        if (lower.endsWith('.pdf') || (mimeType && mimeType.includes('pdf'))) {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
        }
        if (lower.endsWith('.doc') || lower.endsWith('.docx') || (mimeType && mimeType.includes('word'))) {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>`;
        }
        if (lower.endsWith('.ppt') || lower.endsWith('.pptx') || (mimeType && mimeType.includes('presentation'))) {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
        }
        if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || (mimeType && mimeType.includes('excel'))) {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="17"></line><line x1="16" y1="13" x2="8" y2="17"></line></svg>`;
        }
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
    },

    escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let iconSvg = '';
        if (type === 'success') {
            iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        } else if (type === 'error') {
            iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        } else {
            iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        }

        toast.innerHTML = `
            ${iconSvg}
            <span style="font-size: 0.9rem; font-weight: 500;">${this.escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
};

window.UI = UI;
