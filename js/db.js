/**
 * EduSchedule - IndexedDB Database Layer
 * Quản lý cơ sở dữ liệu Bảng Teacher và Bảng Lesson (kèm file Binary Blob)
 */

const DB_NAME = 'EduScheduleDB';
const DB_VERSION = 1;

class ScheduleDB {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Object store: Teachers
                if (!db.objectStoreNames.contains('teachers')) {
                    const teacherStore = db.createObjectStore('teachers', { keyPath: 'id', autoIncrement: true });
                    teacherStore.createIndex('name', 'name', { unique: false });
                    teacherStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Object store: Lessons
                if (!db.objectStoreNames.contains('lessons')) {
                    const lessonStore = db.createObjectStore('lessons', { keyPath: 'id', autoIncrement: true });
                    lessonStore.createIndex('teacherId', 'teacherId', { unique: false });
                    lessonStore.createIndex('dateTime', 'dateTime', { unique: false });
                    lessonStore.createIndex('shift', 'shift', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // --- TEACHER OPERATIONS ---

    async getAllTeachers() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('teachers', 'readonly');
            const store = tx.objectStore('teachers');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(tx.error);
        });
    }

    async getTeacherById(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('teachers', 'readonly');
            const store = tx.objectStore('teachers');
            const request = store.get(Number(id));

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(tx.error);
        });
    }

    async addTeacher(teacherData) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('teachers', 'readwrite');
            const store = tx.objectStore('teachers');
            
            const teacher = {
                name: teacherData.name.trim(),
                subject: teacherData.subject ? teacherData.subject.trim() : 'Tổng hợp',
                totalLessons: Number(teacherData.totalLessons) || 30,
                email: teacherData.email ? teacherData.email.trim() : '',
                phone: teacherData.phone ? teacherData.phone.trim() : '',
                avatarColor: teacherData.avatarColor || this.getRandomColor(),
                notes: teacherData.notes ? teacherData.notes.trim() : '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const request = store.add(teacher);
            request.onsuccess = () => resolve({ id: request.result, ...teacher });
            request.onerror = () => reject(tx.error);
        });
    }

    async updateTeacher(id, teacherData) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('teachers', 'readwrite');
            const store = tx.objectStore('teachers');
            const numId = Number(id);

            const getReq = store.get(numId);
            getReq.onsuccess = () => {
                if (!getReq.result) {
                    reject(new Error('Không tìm thấy giáo viên với ID: ' + id));
                    return;
                }
                const updated = {
                    ...getReq.result,
                    name: teacherData.name.trim(),
                    subject: teacherData.subject ? teacherData.subject.trim() : getReq.result.subject,
                    totalLessons: Number(teacherData.totalLessons) || getReq.result.totalLessons,
                    email: teacherData.email !== undefined ? teacherData.email.trim() : getReq.result.email,
                    phone: teacherData.phone !== undefined ? teacherData.phone.trim() : getReq.result.phone,
                    notes: teacherData.notes !== undefined ? teacherData.notes.trim() : getReq.result.notes,
                    updatedAt: new Date().toISOString()
                };

                const putReq = store.put(updated);
                putReq.onsuccess = () => resolve(updated);
                putReq.onerror = () => reject(tx.error);
            };
            getReq.onerror = () => reject(tx.error);
        });
    }

    async deleteTeacher(id) {
        const numId = Number(id);
        // Xóa giáo viên và tất cả các buổi học liên quan
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['teachers', 'lessons'], 'readwrite');
            const teacherStore = tx.objectStore('teachers');
            const lessonStore = tx.objectStore('lessons');
            const lessonIndex = lessonStore.index('teacherId');

            // Xóa giáo viên
            teacherStore.delete(numId);

            // Xóa các buổi học
            const lessonReq = lessonIndex.getAll(numId);
            lessonReq.onsuccess = () => {
                const lessons = lessonReq.result || [];
                lessons.forEach(lesson => {
                    lessonStore.delete(lesson.id);
                });
            };

            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    }

    // --- LESSON OPERATIONS ---

    async getLessonsByTeacherId(teacherId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('lessons', 'readonly');
            const store = tx.objectStore('lessons');
            const index = store.index('teacherId');
            const request = index.getAll(Number(teacherId));

            request.onsuccess = () => {
                const lessons = request.result || [];
                // Sắp xếp theo ngày giờ giảm dần (mới nhất lên đầu)
                lessons.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
                resolve(lessons);
            };
            request.onerror = () => reject(tx.error);
        });
    }

    async getAllLessons() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('lessons', 'readonly');
            const store = tx.objectStore('lessons');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(tx.error);
        });
    }

    async getLessonById(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('lessons', 'readonly');
            const store = tx.objectStore('lessons');
            const request = store.get(Number(id));

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(tx.error);
        });
    }

    async addLesson(lessonData) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('lessons', 'readwrite');
            const store = tx.objectStore('lessons');

            const lesson = {
                teacherId: Number(lessonData.teacherId),
                dateTime: lessonData.dateTime, // ISO String e.g. "2026-08-30T08:00"
                shift: lessonData.shift, // "Sáng" | "Chiều"
                className: lessonData.className ? lessonData.className.trim() : '',
                topic: lessonData.topic ? lessonData.topic.trim() : 'Bài học',
                content: lessonData.content || '',
                attachment: lessonData.attachment || null, // { name, size, type, data, isBlob }
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const request = store.add(lesson);
            request.onsuccess = () => resolve({ id: request.result, ...lesson });
            request.onerror = () => reject(tx.error);
        });
    }

    async updateLesson(id, lessonData) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('lessons', 'readwrite');
            const store = tx.objectStore('lessons');
            const numId = Number(id);

            const getReq = store.get(numId);
            getReq.onsuccess = () => {
                if (!getReq.result) {
                    reject(new Error('Không tìm thấy buổi học với ID: ' + id));
                    return;
                }
                const updated = {
                    ...getReq.result,
                    dateTime: lessonData.dateTime || getReq.result.dateTime,
                    shift: lessonData.shift || getReq.result.shift,
                    className: lessonData.className !== undefined ? lessonData.className.trim() : getReq.result.className,
                    topic: lessonData.topic !== undefined ? lessonData.topic.trim() : getReq.result.topic,
                    content: lessonData.content !== undefined ? lessonData.content : getReq.result.content,
                    attachment: lessonData.attachment !== undefined ? lessonData.attachment : getReq.result.attachment,
                    updatedAt: new Date().toISOString()
                };

                const putReq = store.put(updated);
                putReq.onsuccess = () => resolve(updated);
                putReq.onerror = () => reject(tx.error);
            };
            getReq.onerror = () => reject(tx.error);
        });
    }

    async deleteLesson(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('lessons', 'readwrite');
            const store = tx.objectStore('lessons');
            const request = store.delete(Number(id));

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(tx.error);
        });
    }

    // --- STATS & HELPERS ---

    async getSystemStats() {
        const teachers = await this.getAllTeachers();
        const lessons = await this.getAllLessons();

        const totalTeachers = teachers.length;
        const totalRequiredLessons = teachers.reduce((acc, t) => acc + (Number(t.totalLessons) || 0), 0);
        const totalTaughtLessons = lessons.length;
        const totalAttachments = lessons.filter(l => l.attachment).length;

        const morningLessons = lessons.filter(l => l.shift === 'Sáng').length;
        const afternoonLessons = lessons.filter(l => l.shift === 'Chiều').length;

        const completionRate = totalRequiredLessons > 0 
            ? Math.min(100, Math.round((totalTaughtLessons / totalRequiredLessons) * 100)) 
            : 0;

        return {
            totalTeachers,
            totalRequiredLessons,
            totalTaughtLessons,
            totalAttachments,
            morningLessons,
            afternoonLessons,
            completionRate
        };
    }

    async clearAllData() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['teachers', 'lessons'], 'readwrite');
            tx.objectStore('teachers').clear();
            tx.objectStore('lessons').clear();
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    }

    getRandomColor() {
        const colors = [
            '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', 
            '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', 
            '#f97316', '#6366f1'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

window.eduDB = new ScheduleDB();
