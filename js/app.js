// ==========================================================================
// Passcode Authentication Controller
// ==========================================================================
const Auth = {
    PASSCODE: '26022012',
    STORAGE_KEY: 'eduschedule_auth_session',
    isUnlocked: false,

    init() {
        const lockOverlay = document.getElementById('app-lock-screen');
        const passInput = document.getElementById('input-passcode');
        const passForm = document.getElementById('form-passcode');
        const togglePinBtn = document.getElementById('btn-toggle-pin-view');
        const errorMsg = document.getElementById('lock-error-msg');
        const btnLockApp = document.getElementById('btn-lock-app');

        // Kiểm tra trạng thái đã mở khóa trong session hiện tại hay chưa
        if (sessionStorage.getItem(this.STORAGE_KEY) === 'unlocked') {
            this.isUnlocked = true;
            if (lockOverlay) lockOverlay.classList.remove('active');
        } else {
            this.isUnlocked = false;
            if (lockOverlay) {
                lockOverlay.classList.add('active');
                setTimeout(() => passInput?.focus(), 150);
            }
        }

        // Nút ẩn/hiện mật khẩu
        if (togglePinBtn && passInput) {
            togglePinBtn.addEventListener('click', () => {
                const isPassword = passInput.type === 'password';
                passInput.type = isPassword ? 'text' : 'password';
                const eyeIcon = togglePinBtn.querySelector('.icon-eye');
                const eyeOffIcon = togglePinBtn.querySelector('.icon-eye-off');
                if (eyeIcon && eyeOffIcon) {
                    eyeIcon.style.display = isPassword ? 'none' : 'block';
                    eyeOffIcon.style.display = isPassword ? 'block' : 'none';
                }
            });
        }

        // Sự kiện gõ mật mã trên bàn phím
        if (passInput) {
            passInput.addEventListener('input', () => {
                this.updateDots(passInput.value.length);
                if (errorMsg) {
                    errorMsg.textContent = '';
                    errorMsg.classList.remove('active');
                }
                // Tự động kiểm tra khi đủ 8 ký tự
                if (passInput.value.length === 8) {
                    this.attemptUnlock(passInput.value);
                }
            });

            passInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.attemptUnlock(passInput.value);
                }
            });
        }

        // Bàn phím số trên màn hình
        document.querySelectorAll('.key-btn[data-key]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!passInput) return;
                if (passInput.value.length < 16) {
                    passInput.value += btn.dataset.key;
                    this.updateDots(passInput.value.length);
                    if (errorMsg) {
                        errorMsg.textContent = '';
                        errorMsg.classList.remove('active');
                    }
                    if (passInput.value.length === 8) {
                        this.attemptUnlock(passInput.value);
                    }
                }
            });
        });

        // Nút xóa 1 ký tự (Backspace)
        const btnClear = document.getElementById('btn-key-clear');
        if (btnClear && passInput) {
            btnClear.addEventListener('click', () => {
                passInput.value = passInput.value.slice(0, -1);
                this.updateDots(passInput.value.length);
                if (errorMsg) {
                    errorMsg.textContent = '';
                    errorMsg.classList.remove('active');
                }
            });
        }

        // Nút xóa toàn bộ (Reset)
        const btnReset = document.getElementById('btn-key-reset');
        if (btnReset && passInput) {
            btnReset.addEventListener('click', () => {
                passInput.value = '';
                this.updateDots(0);
                if (errorMsg) {
                    errorMsg.textContent = '';
                    errorMsg.classList.remove('active');
                }
            });
        }

        // Xử lý submit form / nút Mở khóa
        if (passForm) {
            passForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.attemptUnlock(passInput?.value || '');
            });
        }

        // Nút Khóa app trên thanh điều hướng
        if (btnLockApp) {
            btnLockApp.addEventListener('click', () => {
                this.lock();
            });
        }
    },

    updateDots(count) {
        const dots = document.querySelectorAll('#passcode-dots .dot');
        dots.forEach((dot, index) => {
            if (index < count) {
                dot.classList.add('filled');
            } else {
                dot.classList.remove('filled');
            }
        });
    },

    attemptUnlock(enteredCode) {
        const lockOverlay = document.getElementById('app-lock-screen');
        const passInput = document.getElementById('input-passcode');
        const errorMsg = document.getElementById('lock-error-msg');
        const lockCard = document.getElementById('lock-card');
        const lockBadge = document.getElementById('lock-badge');

        if (enteredCode === this.PASSCODE) {
            // Mật mã chính xác
            this.isUnlocked = true;
            sessionStorage.setItem(this.STORAGE_KEY, 'unlocked');
            
            if (lockBadge) {
                lockBadge.classList.add('unlocked');
                lockBadge.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
            }

            if (errorMsg) {
                errorMsg.textContent = '';
                errorMsg.classList.remove('active');
            }

            setTimeout(() => {
                if (lockOverlay) {
                    lockOverlay.classList.remove('active');
                }
                if (window.UI?.showToast) {
                    window.UI.showToast('Chào mừng bạn! Đã mở khóa EduSchedule.', 'success');
                }
                if (passInput) passInput.value = '';
                this.updateDots(0);
            }, 300);
        } else {
            // Mật mã sai -> Rung lắc và báo lỗi
            if (lockCard) {
                lockCard.classList.remove('shake');
                void lockCard.offsetWidth; // Force reflow
                lockCard.classList.add('shake');
            }
            if (errorMsg) {
                errorMsg.textContent = 'Mật mã không đúng! Vui lòng thử lại.';
                errorMsg.classList.add('active');
            }
            if (passInput) {
                passInput.value = '';
                this.updateDots(0);
                passInput.focus();
            }
        }
    },

    lock() {
        this.isUnlocked = false;
        sessionStorage.removeItem(this.STORAGE_KEY);
        const lockOverlay = document.getElementById('app-lock-screen');
        const passInput = document.getElementById('input-passcode');
        const errorMsg = document.getElementById('lock-error-msg');
        const lockBadge = document.getElementById('lock-badge');

        if (lockBadge) {
            lockBadge.classList.remove('unlocked');
            lockBadge.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
        }
        if (errorMsg) {
            errorMsg.textContent = '';
            errorMsg.classList.remove('active');
        }
        if (passInput) {
            passInput.value = '';
            this.updateDots(0);
        }
        if (lockOverlay) {
            lockOverlay.classList.add('active');
            setTimeout(() => passInput?.focus(), 150);
        }
        if (window.UI?.showToast) {
            window.UI.showToast('Đã khóa màn hình ứng dụng an toàn.', 'info');
        }
    }
};

const App = {
    selectedFile: null, // Lưu file đính kèm hiện tại khi tạo/sửa lesson { name, size, type, data, isBlob }
    editingTeacherId: null,
    editingLessonId: null,
    itemToDelete: null, // { type: 'teacher' | 'lesson', id, name }

    async init() {
        try {
            // 0. Khởi tạo xác thực mật mã bảo vệ
            Auth.init();

            // 1. Khởi tạo cơ sở dữ liệu IndexedDB
            await window.eduDB.init();

            // 2. Nạp dữ liệu mẫu ban đầu nếu trống
            await window.seedInitialDataIfEmpty();

            // 3. Khởi tạo UI events
            window.UI.init();

            // 4. Bind các Form và Modal events
            this.bindEvents();

            // 5. Hiển thị Dashboard ban đầu
            await window.UI.navigateToDashboard();

            console.log('EduSchedule đã khởi chạy thành công!');
        } catch (err) {
            console.error('Khởi chạy ứng dụng thất bại:', err);
            window.UI.showToast('Có lỗi khi khởi tạo cơ sở dữ liệu!', 'error');
        }
    },

    bindEvents() {
        // --- TEACHER FORM ---
        const teacherForm = document.getElementById('form-teacher');
        if (teacherForm) {
            teacherForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSaveTeacher();
            });
        }

        // --- LESSON FORM ---
        const lessonForm = document.getElementById('form-lesson');
        if (lessonForm) {
            lessonForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSaveLesson();
            });
        }

        // --- FILE UPLOAD DROP ZONE ---
        const dropZone = document.getElementById('lesson-file-dropzone');
        const fileInput = document.getElementById('lesson-file-input');

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    this.processSelectedFile(e.dataTransfer.files[0]);
                }
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    this.processSelectedFile(e.target.files[0]);
                }
            });
        }

        // --- RICH TEXT TOOLBAR ---
        const toolbarBtns = document.querySelectorAll('.toolbar-btn');
        const contentTextarea = document.getElementById('lesson-content');
        toolbarBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.applyFormat(action, contentTextarea);
            });
        });

        // --- CLOSE MODAL ON BACKDROP CLICK ---
        document.querySelectorAll('.modal-backdrop').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });

        // --- EXPORT / IMPORT DATA ---
        const btnExport = document.getElementById('btn-export-data');
        if (btnExport) {
            btnExport.addEventListener('click', () => this.exportDataAsJSON());
        }

        const fileImportInput = document.getElementById('input-import-data');
        if (fileImportInput) {
            fileImportInput.addEventListener('change', (e) => this.importDataFromJSON(e));
        }

        const btnReset = document.getElementById('btn-reset-data');
        if (btnReset) {
            btnReset.addEventListener('click', () => this.resetSampleData());
        }
    },

    // --- MODAL UTILS ---
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    closeAllModals() {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
        document.body.style.overflow = '';
    },

    // --- TEACHER MODAL ACTIONS ---
    openAddTeacherModal() {
        this.editingTeacherId = null;
        document.getElementById('modal-teacher-title').innerText = 'Thêm Giáo Viên Mới';
        document.getElementById('form-teacher').reset();
        document.getElementById('teacher-total-lessons').value = 35;
        this.openModal('modal-teacher');
    },

    async openEditTeacherModal(id) {
        try {
            const teacher = await window.eduDB.getTeacherById(id);
            if (!teacher) return;

            this.editingTeacherId = Number(id);
            document.getElementById('modal-teacher-title').innerText = 'Chỉnh Sửa Thông Tin Giáo Viên';
            document.getElementById('teacher-name').value = teacher.name;
            document.getElementById('teacher-subject').value = teacher.subject || 'Tổng hợp';
            document.getElementById('teacher-total-lessons').value = teacher.totalLessons || 30;
            document.getElementById('teacher-email').value = teacher.email || '';
            document.getElementById('teacher-phone').value = teacher.phone || '';
            document.getElementById('teacher-notes').value = teacher.notes || '';

            this.openModal('modal-teacher');
        } catch (err) {
            console.error('Lỗi khi mở sửa giáo viên:', err);
        }
    },

    async handleSaveTeacher() {
        const name = document.getElementById('teacher-name').value.trim();
        const subject = document.getElementById('teacher-subject').value.trim();
        const totalLessons = parseInt(document.getElementById('teacher-total-lessons').value, 10);
        const email = document.getElementById('teacher-email').value.trim();
        const phone = document.getElementById('teacher-phone').value.trim();
        const notes = document.getElementById('teacher-notes').value.trim();

        if (!name) {
            window.UI.showToast('Vui lòng nhập tên giáo viên!', 'error');
            return;
        }

        if (isNaN(totalLessons) || totalLessons <= 0) {
            window.UI.showToast('Tổng số buổi học quy định phải lớn hơn 0!', 'error');
            return;
        }

        try {
            const teacherData = { name, subject, totalLessons, email, phone, notes };

            if (this.editingTeacherId) {
                await window.eduDB.updateTeacher(this.editingTeacherId, teacherData);
                window.UI.showToast('Đã cập nhật thông tin giáo viên thành công!', 'success');
            } else {
                await window.eduDB.addTeacher(teacherData);
                window.UI.showToast('Đã thêm giáo viên mới thành công!', 'success');
            }

            this.closeModal('modal-teacher');

            if (window.UI.currentView === 'dashboard') {
                await window.UI.renderDashboard();
            } else {
                await window.UI.renderTeacherDetail();
            }
        } catch (err) {
            console.error('Lỗi lưu giáo viên:', err);
            window.UI.showToast('Lỗi khi lưu giáo viên: ' + err.message, 'error');
        }
    },

    // --- LESSON MODAL ACTIONS ---
    openAddLessonModal() {
        if (!window.UI.currentTeacherId) return;

        this.editingLessonId = null;
        this.selectedFile = null;
        document.getElementById('modal-lesson-title').innerText = 'Thêm Buổi Học Mới';
        document.getElementById('form-lesson').reset();

        // Mặc định ngày giờ hiện tại
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('lesson-datetime').value = now.toISOString().slice(0, 16);

        // Mặc định ca sáng / chiều theo giờ
        const currentHour = new Date().getHours();
        document.getElementById('lesson-shift').value = currentHour < 12 ? 'Sáng' : 'Chiều';

        this.updateSelectedFileUI();
        this.openModal('modal-lesson');
    },

    async openEditLessonModal(id) {
        try {
            const lesson = await window.eduDB.getLessonById(id);
            if (!lesson) return;

            this.editingLessonId = Number(id);
            this.selectedFile = lesson.attachment || null;

            document.getElementById('modal-lesson-title').innerText = 'Chỉnh Sửa Buổi Học';
            document.getElementById('lesson-datetime').value = lesson.dateTime ? lesson.dateTime.slice(0, 16) : '';
            document.getElementById('lesson-shift').value = lesson.shift || 'Sáng';
            document.getElementById('lesson-class').value = lesson.className || '';
            document.getElementById('lesson-topic').value = lesson.topic || '';
            document.getElementById('lesson-content').value = lesson.content || '';

            this.updateSelectedFileUI();
            this.openModal('modal-lesson');
        } catch (err) {
            console.error('Lỗi khi mở sửa buổi học:', err);
        }
    },

    async handleSaveLesson() {
        const dateTime = document.getElementById('lesson-datetime').value;
        const shift = document.getElementById('lesson-shift').value;
        const className = document.getElementById('lesson-class').value.trim();
        const topic = document.getElementById('lesson-topic').value.trim();
        const content = document.getElementById('lesson-content').value.trim();

        if (!dateTime) {
            window.UI.showToast('Vui lòng chọn thời gian cụ thể của buổi học!', 'error');
            return;
        }

        if (!topic) {
            window.UI.showToast('Vui lòng nhập tên bài dạy / chuyên đề!', 'error');
            return;
        }

        try {
            const lessonData = {
                teacherId: window.UI.currentTeacherId,
                dateTime,
                shift,
                className,
                topic,
                content,
                attachment: this.selectedFile
            };

            if (this.editingLessonId) {
                await window.eduDB.updateLesson(this.editingLessonId, lessonData);
                window.UI.showToast('Đã cập nhật buổi học thành công!', 'success');
            } else {
                await window.eduDB.addLesson(lessonData);
                window.UI.showToast('Đã thêm buổi học mới vào sổ báo giảng!', 'success');
            }

            this.closeModal('modal-lesson');
            await window.UI.renderTeacherDetail();
        } catch (err) {
            console.error('Lỗi khi lưu buổi học:', err);
            window.UI.showToast('Lỗi khi lưu buổi học: ' + err.message, 'error');
        }
    },

    // --- FILE UPLOAD HANDLING ---
    processSelectedFile(file) {
        if (!file) return;

        // Giới hạn kích thước file (tối đa 50MB)
        const MAX_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            window.UI.showToast('Dung lượng file quá lớn (tối đa 50MB)!', 'error');
            return;
        }

        this.selectedFile = {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            blob: file, // Lưu thẳng Blob vào IndexedDB
            uploadedAt: new Date().toISOString()
        };

        this.updateSelectedFileUI();
        window.UI.showToast(`Đã đính kèm tệp: ${file.name}`, 'info');
    },

    removeSelectedFile() {
        this.selectedFile = null;
        const fileInput = document.getElementById('lesson-file-input');
        if (fileInput) fileInput.value = '';
        this.updateSelectedFileUI();
    },

    updateSelectedFileUI() {
        const previewContainer = document.getElementById('selected-file-preview-area');
        if (!previewContainer) return;

        if (!this.selectedFile) {
            previewContainer.innerHTML = '';
            previewContainer.style.display = 'none';
            return;
        }

        const formattedSize = window.UI.formatFileSize(this.selectedFile.size);
        const iconSvg = window.UI.getFileIcon(this.selectedFile.name, this.selectedFile.type);

        previewContainer.style.display = 'block';
        previewContainer.innerHTML = `
            <div class="selected-file-preview">
                <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                    <div class="attachment-icon" style="width: 30px; height: 30px;">
                        ${iconSvg}
                    </div>
                    <div style="overflow: hidden;">
                        <div style="font-weight: 600; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">
                            ${window.UI.escapeHtml(this.selectedFile.name)}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${formattedSize}</div>
                    </div>
                </div>
                <button type="button" class="btn-icon btn-sm" title="Gỡ file đính kèm" onclick="App.removeSelectedFile()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        `;
    },

    // --- DIRECT FILE DOWNLOAD HANDLER ---
    async downloadAttachment(lessonId) {
        try {
            const lesson = await window.eduDB.getLessonById(lessonId);
            if (!lesson || !lesson.attachment) {
                window.UI.showToast('Không tìm thấy tệp đính kèm của buổi học này!', 'error');
                return;
            }

            const att = lesson.attachment;
            let downloadUrl;

            if (att.blob instanceof Blob) {
                downloadUrl = URL.createObjectURL(att.blob);
            } else if (att.dataUrl) {
                downloadUrl = att.dataUrl;
            } else if (att.data) {
                // Base64 string fallback
                const blob = this.base64ToBlob(att.data, att.type);
                downloadUrl = URL.createObjectURL(blob);
            } else {
                // Fallback tạo file text với tên
                const dummyBlob = new Blob([`Tài liệu đính kèm: ${att.name}\nĐược tải từ hệ thống EduSchedule`], { type: att.type || 'text/plain' });
                downloadUrl = URL.createObjectURL(dummyBlob);
            }

            const downloadLink = document.createElement('a');
            downloadLink.href = downloadUrl;
            downloadLink.download = att.name || 'tai-lieu-eduschedule';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            // Thu hồi object URL sau khi tải
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

            window.UI.showToast(`Đang tải xuống: ${att.name}`, 'success');
        } catch (err) {
            console.error('Lỗi khi tải file:', err);
            window.UI.showToast('Có lỗi xảy ra khi tải tài liệu!', 'error');
        }
    },

    base64ToBlob(base64, mimeType = '') {
        const byteCharacters = atob(base64.split(',')[1] || base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    },

    // --- RICH TEXT FORMATTING ---
    applyFormat(action, textarea) {
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        let replacement = '';

        switch (action) {
            case 'bold':
                replacement = `<strong>${selectedText || 'Văn bản in đậm'}</strong>`;
                break;
            case 'italic':
                replacement = `<em>${selectedText || 'Văn bản in nghiêng'}</em>`;
                break;
            case 'h3':
                replacement = `\n<h3>${selectedText || 'Tiêu đề mục'}</h3>\n`;
                break;
            case 'ul':
                replacement = `\n<ul>\n  <li>${selectedText || 'Mục 1'}</li>\n  <li>Mục 2</li>\n</ul>\n`;
                break;
            case 'ol':
                replacement = `\n<ol>\n  <li>${selectedText || 'Bước 1'}</li>\n  <li>Bước 2</li>\n</ol>\n`;
                break;
            default:
                return;
        }

        textarea.setRangeText(replacement, start, end, 'end');
        textarea.focus();
    },

    // --- DELETE CONFIRMATION ---
    confirmDeleteTeacher(id, name) {
        this.itemToDelete = { type: 'teacher', id, name };
        document.getElementById('confirm-modal-title').innerText = 'Xác nhận xóa giáo viên';
        document.getElementById('confirm-modal-message').innerHTML = `
            Bạn có chắc chắn muốn xóa giáo viên <strong>"${window.UI.escapeHtml(name)}"</strong> không?<br>
            <span style="color: var(--danger); font-size: 0.85rem;">⚠️ Toàn bộ danh sách buổi học và tài liệu liên quan của giáo viên này cũng sẽ bị xóa vĩnh viễn!</span>
        `;
        this.openModal('modal-confirm-delete');
    },

    confirmDeleteLesson(id) {
        this.itemToDelete = { type: 'lesson', id };
        document.getElementById('confirm-modal-title').innerText = 'Xác nhận xóa buổi học';
        document.getElementById('confirm-modal-message').innerHTML = `
            Bạn có chắc chắn muốn xóa buổi học này khỏi sổ báo giảng không? Thao tác này không thể hoàn tác.
        `;
        this.openModal('modal-confirm-delete');
    },

    async executeDelete() {
        if (!this.itemToDelete) return;

        try {
            if (this.itemToDelete.type === 'teacher') {
                await window.eduDB.deleteTeacher(this.itemToDelete.id);
                window.UI.showToast('Đã xóa giáo viên thành công!', 'success');
                this.closeModal('modal-confirm-delete');
                await window.UI.renderDashboard();
            } else if (this.itemToDelete.type === 'lesson') {
                await window.eduDB.deleteLesson(this.itemToDelete.id);
                window.UI.showToast('Đã xóa buổi học khỏi sổ báo giảng!', 'success');
                this.closeModal('modal-confirm-delete');
                await window.UI.renderTeacherDetail();
            }
        } catch (err) {
            console.error('Lỗi khi xóa:', err);
            window.UI.showToast('Có lỗi xảy ra khi xóa dữ liệu!', 'error');
        } finally {
            this.itemToDelete = null;
        }
    },

    // --- DATA BACKUP & RESTORE ---
    async exportDataAsJSON() {
        try {
            const teachers = await window.eduDB.getAllTeachers();
            const lessons = await window.eduDB.getAllLessons();

            const exportObj = {
                version: "1.0",
                exportedAt: new Date().toISOString(),
                teachers,
                lessons: lessons.map(l => ({
                    ...l,
                    // Nếu có blob, tạo snapshot thông tin
                    attachment: l.attachment ? {
                        name: l.attachment.name,
                        size: l.attachment.size,
                        type: l.attachment.type,
                        uploadedAt: l.attachment.uploadedAt
                    } : null
                }))
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `EduSchedule_Backup_${new Date().toISOString().slice(0, 10)}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();

            window.UI.showToast('Đã xuất file sao lưu dữ liệu thành công!', 'success');
        } catch (err) {
            console.error('Lỗi xuất dữ liệu:', err);
            window.UI.showToast('Lỗi khi xuất dữ liệu!', 'error');
        }
    },

    async importDataFromJSON(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (!parsed.teachers || !Array.isArray(parsed.teachers)) {
                    throw new Error('Định dạng file sao lưu không hợp lệ!');
                }

                await window.eduDB.clearAllData();

                for (const t of parsed.teachers) {
                    await window.eduDB.addTeacher(t);
                }

                if (parsed.lessons && Array.isArray(parsed.lessons)) {
                    for (const l of parsed.lessons) {
                        await window.eduDB.addLesson(l);
                    }
                }

                window.UI.showToast('Đã khôi phục dữ liệu từ file sao lưu!', 'success');
                await window.UI.renderDashboard();
            } catch (err) {
                console.error('Lỗi nhập dữ liệu:', err);
                window.UI.showToast('Lỗi nhập file: ' + err.message, 'error');
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    },

    async resetSampleData() {
        if (!confirm('Bạn có chắc muốn đặt lại toàn bộ về dữ liệu mẫu ban đầu không? Mọi thay đổi của bạn sẽ được thiết lập lại.')) {
            return;
        }

        try {
            await window.eduDB.clearAllData();
            await window.seedInitialDataIfEmpty();
            window.UI.showToast('Đã đặt lại dữ liệu mẫu thành công!', 'success');
            await window.UI.navigateToDashboard();
        } catch (err) {
            console.error('Lỗi đặt lại dữ liệu:', err);
            window.UI.showToast('Có lỗi xảy ra khi đặt lại dữ liệu!', 'error');
        }
    }
};

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    window.Auth = Auth;
    window.App = App;
    App.init();
});
