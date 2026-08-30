/**
 * EduSchedule - Dữ liệu mẫu khởi tạo (Mock Data)
 * Cung cấp danh sách giáo viên và các buổi học mẫu phong phú kèm tài liệu
 */

const SAMPLE_TEACHERS = [
    {
        name: "Thầy Nguyễn Văn An",
        subject: "Toán Học",
        totalLessons: 45,
        email: "nguyenvanan.toan@eduschedule.vn",
        phone: "0912 345 678",
        avatarColor: "#4f46e5",
        notes: "Tổ trưởng chuyên môn Toán - Tin. Phụ trách bồi dưỡng học sinh giỏi khối 12."
    },
    {
        name: "Cô Trần Thị Mai",
        subject: "Ngữ Văn",
        totalLessons: 40,
        email: "tranmai.van@eduschedule.vn",
        phone: "0988 765 432",
        avatarColor: "#ec4899",
        notes: "Giáo viên chủ nhiệm lớp 11A2. Chuyên đề Văn học hiện đại và nghị luận xã hội."
    },
    {
        name: "Thầy Lê Hoàng Nam",
        subject: "Vật Lý",
        totalLessons: 35,
        email: "lehoangnam.ly@eduschedule.vn",
        phone: "0905 123 789",
        avatarColor: "#0ea5e9",
        notes: "Phụ trách phòng thực hành thí nghiệm Vật lý và CLB STEM sáng tạo."
    },
    {
        name: "Cô Phạm Thu Hà",
        subject: "Tiếng Anh",
        totalLessons: 42,
        email: "phamha.english@eduschedule.vn",
        phone: "0973 888 999",
        avatarColor: "#10b981",
        notes: "Luyện thi IELTS và chuẩn bị đội tuyển Hùng biện tiếng Anh cấp tỉnh."
    },
    {
        name: "Thầy Đỗ Minh Tuấn",
        subject: "Hóa Học",
        totalLessons: 30,
        email: "dotuan.hoa@eduschedule.vn",
        phone: "0934 567 890",
        avatarColor: "#f59e0b",
        notes: "Giảng dạy Hóa học hữu cơ và phụ trách an toàn phòng thí nghiệm."
    }
];

// Tạo các file tài liệu mẫu dưới dạng text/dataURL để tải về được ngay
function createSampleAttachment(fileName, textContent, mimeType = "text/plain") {
    const blob = new Blob([textContent], { type: mimeType });
    return {
        name: fileName,
        size: blob.size,
        type: mimeType,
        blob: blob,
        dataUrl: URL.createObjectURL(blob),
        uploadedAt: new Date().toISOString()
    };
}

const SAMPLE_LESSONS_GENERATOR = (teacherIds) => {
    const today = new Date();
    const formatDate = (offsetDays, hours, minutes) => {
        const d = new Date(today);
        d.setDate(d.getDate() + offsetDays);
        d.setHours(hours, minutes, 0, 0);
        return d.toISOString().slice(0, 16);
    };

    const lessons = [];

    // Giáo viên 1: Thầy An (Toán)
    if (teacherIds[0]) {
        const tId = teacherIds[0];
        lessons.push(
            {
                teacherId: tId,
                dateTime: formatDate(-5, 7, 30),
                shift: "Sáng",
                className: "Lớp 12A1",
                topic: "Chuyên đề: Ứng dụng đạo hàm khảo sát hàm số bậc ba",
                content: `<h3>Nội dung trọng tâm:</h3>
<ul>
  <li>Khảo sát sự biến thiên và vẽ đồ thị hàm số $y = ax^3 + bx^2 + cx + d$ ($a \\neq 0$).</li>
  <li>Các bài toán liên quan đến cực trị và tiếp tuyến tại điểm uốn.</li>
  <li>Luyện tập 15 câu trắc nghiệm vận dụng cao trích đề thi THPT Quốc gia.</li>
</ul>
<p><strong>Dặn dò:</strong> Học sinh hoàn thành phiếu bài tập số 04 trước thứ 6.</p>`,
                attachment: createSampleAttachment(
                    "De-cuong-Khao-sat-Ham-so-12A1.pdf",
                    "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nPHIẾU HỌC TẬP: KHẢO SÁT VÀ VẼ ĐỒ THỊ HÀM SỐ\nGiáo viên: Thầy Nguyễn Văn An - Môn Toán\nLớp: 12A1\n\nPhần 1: Lý thuyết đạo hàm và cực trị\nPhần 2: 20 Bài toán trắc nghiệm vận dụng cao\n...",
                    "application/pdf"
                )
            },
            {
                teacherId: tId,
                dateTime: formatDate(-3, 8, 30),
                shift: "Sáng",
                className: "Lớp 12A2",
                topic: "Nguyên hàm và Các phương pháp tính nguyên hàm cơ bản",
                content: `<p>1. Định nghĩa nguyên hàm, các tính chất cơ bản.</p>
<p>2. Bảng nguyên hàm của các hàm số thường gặp.</p>
<p>3. Phương pháp đổi biến số loại 1 và đổi biến số loại 2.</p>
<p><em>Ghi chú: Lớp tiếp thu tốt, đã hoàn thành 80% ví dụ minh họa trên lớp.</em></p>`,
                attachment: createSampleAttachment(
                    "Bang-cong-thuc-Nguyen-ham-Co-ban.docx",
                    "TỔNG HỢP CÔNG THỨC NGUYÊN HÀM VÀ TÍCH PHÂN - MÔN TOÁN 12\nBiên soạn: Thầy Nguyễn Văn An\n\n1. Bảng nguyên hàm mở rộng\n2. Phương pháp tích phân từng phần (u.dv)\n3. Các dạng lượng giác đặc biệt.",
                    "application/msword"
                )
            },
            {
                teacherId: tId,
                dateTime: formatDate(-1, 14, 0),
                shift: "Chiều",
                className: "Lớp 10A1",
                topic: "Hàm số bậc hai và Ứng dụng giải bài toán thực tế",
                content: `<p>- Ôn tập tọa độ đỉnh parabol, trục đối xứng.</p>
<p>- Lập bảng biến thiên và vẽ đồ thị.</p>
<p>- Bài toán thực tế tìm giá trị lớn nhất / nhỏ nhất của diện tích và quỹ đạo chuyển động.</p>`,
                attachment: createSampleAttachment(
                    "Bai-tap-Ham-so-bac-hai-10A1.pdf",
                    "BÀI TẬP VỀ NHÀ: HÀM SỐ BẬC HAI - LỚP 10A1\nThời hạn nộp: 23:59 Chủ Nhật\nSố lượng bài: 5 bài tự luận và 10 câu trắc nghiệm.",
                    "application/pdf"
                )
            },
            {
                teacherId: tId,
                dateTime: formatDate(1, 7, 30),
                shift: "Sáng",
                className: "Lớp 12A1",
                topic: "Hình học không gian Oxyz: Phương trình mặt cầu và mặt phẳng",
                content: `<p>- Viết phương trình mặt cầu biết tâm và bán kính.</p>
<p>- Vị trí tương đối giữa mặt phẳng và mặt cầu.</p>
<p>- Thực hành giải nhanh bằng máy tính cầm tay Casio FX-580VNX.</p>`,
                attachment: null
            },
            {
                teacherId: tId,
                dateTime: formatDate(3, 13, 30),
                shift: "Chiều",
                className: "Đội tuyển HSG",
                topic: "Bất đẳng thức Cauchy-Schwarz và kỹ thuật chọn điểm rơi",
                content: `<p>Bồi dưỡng chuyên đề nâng cao dành cho học sinh giỏi tỉnh môn Toán:</p>
<ul>
  <li>Bất đẳng thức Bunhiacopxki dạng phân thức (BĐT Schwarz).</li>
  <li>Kỹ thuật ghép đối xứng và chuẩn hóa biến số.</li>
</ul>`,
                attachment: createSampleAttachment(
                    "Chuyen-de-Bat-dang-thuc-HSG.pdf",
                    "CHUYÊN ĐỀ BẤT ĐẲNG THỨC VÀ CỰC TRỊ ĐẠI SỐ\nBồi dưỡng học sinh giỏi Toán THPT\nThầy Nguyễn Văn An - THPT Chuyên",
                    "application/pdf"
                )
            }
        );
    }

    // Giáo viên 2: Cô Mai (Ngữ Văn)
    if (teacherIds[1]) {
        const tId = teacherIds[1];
        lessons.push(
            {
                teacherId: tId,
                dateTime: formatDate(-4, 9, 30),
                shift: "Sáng",
                className: "Lớp 11A2",
                topic: "Phân tích vẻ đẹp hình tượng Sông Đà trong tùy bút 'Người lái đò Sông Đà'",
                content: `<h3>Mục tiêu bài học:</h3>
<p>- Cảm nhận vẻ đẹp hùng vĩ, hung bạo và trữ tình, thơ mộng của dòng sông Đà.</p>
<p>- Phong cách nghệ thuật độc đáo, uyên bác và tài hoa của nhà văn Nguyễn Tuân.</p>
<p><strong>Phương pháp:</strong> Thảo luận nhóm 4 học sinh, trình chiếu video tư liệu sông Đà.</p>`,
                attachment: createSampleAttachment(
                    "Giao-an-Nguoi-lai-do-Song-Da.docx",
                    "GIÁO ÁN ĐIỆN TỬ NGỮ VĂN 11\nBài: Người lái đò Sông Đà (Nguyễn Tuân)\nGiáo viên: Cô Trần Thị Mai\nThời lượng: 2 tiết\nTrang bị: Máy chiếu, phiếu học tập nhóm.",
                    "application/msword"
                )
            },
            {
                teacherId: tId,
                dateTime: formatDate(-2, 13, 30),
                shift: "Chiều",
                className: "Lớp 11A5",
                topic: "Rèn luyện kỹ năng viết đoạn văn Nghị luận Xã hội 200 chữ",
                content: `<p>- Cấu trúc chuẩn đoạn văn NLXH: Mở đoạn, Giải thích, Bàn luận/Chứng minh, Phản biện, Bài học nhận thức & hành động.</p>
<p>- Chủ đề: Ý chí vượt khó và tinh thần tương thân tương ái trong kỷ nguyên số.</p>`,
                attachment: createSampleAttachment(
                    "So-tay-Nghi-luan-xa-hoi-200-chu.pdf",
                    "SỔ TAY NGHỊ LUẬN XÃ HỘI 200 CHỮ\nCác dạng đề thường gặp và dẫn chứng thực tế tiêu biểu năm 2026\nCô Trần Thị Mai biên soạn.",
                    "application/pdf"
                )
            },
            {
                teacherId: tId,
                dateTime: formatDate(2, 7, 30),
                shift: "Sáng",
                className: "Lớp 11A2",
                topic: "Thơ ca trung đại: Đọc hiểu 'Tự tình II' của Hồ Xuân Hương",
                content: `<p>- Tâm trạng cô đơn, buồn tủi và khát vọng hạnh phúc của người phụ nữ.</p>
<p>- Nghệ thuật sử dụng từ ngữ gợi cảm, động từ mạnh, phép đảo ngữ độc đáo.</p>`,
                attachment: null
            }
        );
    }

    // Giáo viên 3: Thầy Nam (Vật Lý)
    if (teacherIds[2]) {
        const tId = teacherIds[2];
        lessons.push(
            {
                teacherId: tId,
                dateTime: formatDate(-3, 14, 0),
                shift: "Chiều",
                className: "Lớp 12A1",
                topic: "Thực hành thí nghiệm: Hiện tượng Cộng hưởng Cơ học và Con lắc đơn",
                content: `<p>Địa điểm: Phòng thí nghiệm Vật lý số 2.</p>
<p>- Đo chu kỳ dao động của con lắc đơn phụ thuộc vào chiều dài dây treo.</p>
<p>- Khảo sát biên độ dao động cưỡng bức khi tần số ngoại lực xấp xỉ tần số riêng.</p>
<p><em>Yêu cầu an toàn: Học sinh tuân thủ nội quy phòng thí nghiệm.</em></p>`,
                attachment: createSampleAttachment(
                    "Huong-dan-Thi-nghiem-Vat-Ly-12.pdf",
                    "HƯỚNG DẪN THÍ NGHIỆM VẬT LÝ 12\nBài: Khảo sát dao động con lắc đơn và hiện tượng cộng hưởng\nThầy Lê Hoàng Nam - Bộ môn Vật lý",
                    "application/pdf"
                )
            },
            {
                teacherId: tId,
                dateTime: formatDate(0, 8, 30),
                shift: "Sáng",
                className: "Lớp 10A3",
                topic: "Định luật Vạn vật Hấp dẫn và Chuyển động của Vệ tinh nhân tạo",
                content: `<p>- Khái niệm lực hấp dẫn giữa hai chất điểm, hằng số hấp dẫn G.</p>
<p>- Gia tốc trọng trường ở độ cao h so với mặt đất.</p>
<p>- Vận tốc vũ trụ cấp 1 và quỹ đạo vệ tinh địa tĩnh.</p>`,
                attachment: createSampleAttachment(
                    "Slide-Vat-Ly-Hap-Dan-Ve-Tinh.pptx",
                    "BÀI GIẢNG ĐIỆN TỬ: ĐỊNH LUẬT VẠN VẬT HẤP DẪN\nTrình bày: Thầy Lê Hoàng Nam\nKhối 10 - Năm học 2025-2026",
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                )
            }
        );
    }

    // Giáo viên 4: Cô Hà (Tiếng Anh)
    if (teacherIds[3]) {
        const tId = teacherIds[3];
        lessons.push(
            {
                teacherId: tId,
                dateTime: formatDate(-4, 7, 30),
                shift: "Sáng",
                className: "Lớp 11A1",
                topic: "Unit 6: Global Warming - Reading Comprehension & Vocabulary",
                content: `<h3>Lesson Outline:</h3>
<ul>
  <li>Warm-up: Discussion on climate change phenomena in Vietnam.</li>
  <li>Vocabulary: Greenhouse effect, carbon footprint, renewable energy, deforestation.</li>
  <li>Reading Strategy: Skimming and scanning for specific details.</li>
</ul>`,
                attachment: createSampleAttachment(
                    "Unit6-Global-Warming-Worksheet.pdf",
                    "ENGLISH 11 - GLOBAL SUCCESS\nUNIT 6: PRESERVING OUR ENVIRONMENT\nWorksheet & Vocabulary Builder\nTeacher: Ms. Pham Thu Ha",
                    "application/pdf"
                )
            },
            {
                teacherId: tId,
                dateTime: formatDate(-1, 15, 0),
                shift: "Chiều",
                className: "CLB IELTS",
                topic: "IELTS Speaking Part 2 & 3: Technology and Artificial Intelligence",
                content: `<p>- Framework: Describe an AI tool you use regularly (Antigravity/ChatGPT).</p>
<p>- Collocations & Idioms for Band 7.5+.</p>
<p>- Mock speaking session with peer feedback.</p>`,
                attachment: createSampleAttachment(
                    "IELTS-Speaking-Technology-Topic.docx",
                    "IELTS SPEAKING MASTERCLASS\nTopic: Technology, Artificial Intelligence and Education\nHigh-scoring vocabulary and sample answers\nTeacher: Pham Thu Ha, MA TESOL",
                    "application/msword"
                )
            }
        );
    }

    return lessons;
};

/**
 * Khởi tạo dữ liệu mẫu nếu Database chưa có dữ liệu
 */
async function seedInitialDataIfEmpty() {
    try {
        const teachers = await window.eduDB.getAllTeachers();
        if (teachers.length === 0) {
            console.log('Khởi tạo dữ liệu giáo viên mẫu vào IndexedDB...');
            const teacherIds = [];
            for (const t of SAMPLE_TEACHERS) {
                const added = await window.eduDB.addTeacher(t);
                teacherIds.push(added.id);
            }

            console.log('Khởi tạo danh sách các buổi học mẫu...');
            const lessons = SAMPLE_LESSONS_GENERATOR(teacherIds);
            for (const l of lessons) {
                await window.eduDB.addLesson(l);
            }
            console.log('Đã nạp xong toàn bộ dữ liệu mẫu!');
            return true;
        }
        return false;
    } catch (err) {
        console.error('Lỗi khi nạp dữ liệu mẫu:', err);
        return false;
    }
}

window.seedInitialDataIfEmpty = seedInitialDataIfEmpty;
