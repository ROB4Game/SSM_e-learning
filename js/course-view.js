let currentCourse = null;
let currentModule = null;
let currentLesson = null;
let userProgress = {};
let allLessons = [];
let openModuleIds = new Set();
let shouldResetModuleOnQuizFail = false;

const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'login.html';
}

// Get courseId from URL parameter
const params = new URLSearchParams(window.location.search);
const courseId = params.get('courseId');

function getOpenModulesStorageKey() {
    return `openModules:${courseId}`;
}

function loadOpenModules() {
    try {
        const stored = localStorage.getItem(getOpenModulesStorageKey());
        const parsed = stored ? JSON.parse(stored) : [];
        return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
        return new Set();
    }
}

function saveOpenModules() {
    localStorage.setItem(getOpenModulesStorageKey(), JSON.stringify(Array.from(openModuleIds)));
}

function getLessonTypeLabel(type) {
    if (type === 'text') return 'Lecție';
    if (type === 'quiz') return 'Test';
    return type;
}

if (!courseId) {
    document.getElementById('loading').innerHTML = '<p> Niciun curs selectat</p>';
    document.getElementById('loading').style.display = 'block';
}

async function loadCourseData() {
    try {
        const [courseRes, progressRes] = await Promise.all([
            fetch(`http://localhost:4000/courses/${courseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('http://localhost:4000/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        if (!courseRes.ok) {
            throw new Error('Încărcarea cursului a eșuat');
        }

        const courseData = await courseRes.json();
        currentCourse = courseData.course;
        const profileData = await progressRes.json();
        userProgress = profileData.user?.progress || profileData.progress || {};
        openModuleIds = loadOpenModules();

        // Flatten all lessons for easy tracking
        allLessons = [];
        currentCourse.modules.forEach(module => {
            module.lessons.forEach(lesson => {
                allLessons.push({
                    moduleId: module.id,
                    lessonId: lesson.id,
                    lesson: lesson
                });
            });
        });

        renderCourse();
        document.getElementById('loading').style.display = 'none';
    } catch (error) {
        console.error('Eroare la încărcarea cursului:', error);
        document.getElementById('loading').innerHTML = `<p>❌ ${error.message}</p>`;
        showError('Încărcarea cursului a eșuat. Încearcă din nou.');
    }
}

function renderCourse() {
    // Render course header
    document.getElementById('courseHeader').style.display = 'block';
    document.getElementById('courseTitle').textContent = currentCourse.title;
    document.getElementById('courseDescription').textContent = currentCourse.description;
    updateProgressBar();
    updateCertificateButton();

    // Render modules
    const modulesSection = document.getElementById('modulesSection');
    modulesSection.innerHTML = '';

    const hasSavedOpenModules = openModuleIds.size > 0;

    currentCourse.modules.forEach((module, index) => {
        const moduleUnlocked = isModuleUnlocked(index);
        const moduleProgress = getUserModuleProgress(module.id);
        const completedInModule = moduleProgress.completedLessons.length;
        const totalInModule = module.lessons.length;

        const moduleEl = document.createElement('div');
        moduleEl.className = 'module';

        const headerEl = document.createElement('div');
        headerEl.className = 'module-header';
        if (moduleUnlocked) {
            headerEl.onclick = (e) => {
                if (!e.target.classList.contains('lock-icon')) {
                    toggleModule(module.id, headerEl, lessonsContainer);
                }
            };
        } else {
            headerEl.style.cursor = 'not-allowed';
            headerEl.style.opacity = '0.7';
            headerEl.title = 'Finalizează modulul precedent pentru a-l debloca pe acesta.';
        }

        const titleEl = document.createElement('div');
        titleEl.innerHTML = `
            <p class="module-title">${module.title}</p>
            <p class="module-progress">${completedInModule} / ${totalInModule} lecții finalizate</p>
        `;

        const toggleEl = document.createElement('div');
        toggleEl.className = 'module-toggle';
        toggleEl.textContent = moduleUnlocked ? '▼' : '🔒';

        headerEl.appendChild(titleEl);
        headerEl.appendChild(toggleEl);

        const lessonsContainer = document.createElement('div');
        lessonsContainer.className = 'lessons';
        const shouldOpen = moduleUnlocked && (hasSavedOpenModules
            ? openModuleIds.has(module.id)
            : index === 0);

        if (shouldOpen) {
            lessonsContainer.classList.add('active');
            toggleEl.textContent = '▲';
            openModuleIds.add(module.id);
        } else if (!moduleUnlocked) {
            openModuleIds.delete(module.id);
        }

        // Render lessons
        module.lessons.forEach((lesson, lessonIndex) => {
            const isCompleted = moduleProgress.completedLessons.includes(lesson.id);
            const isLocked = !moduleUnlocked || (!isCompleted && lessonIndex > 0 && !moduleProgress.completedLessons.includes(module.lessons[lessonIndex - 1].id));
            const isCurrent = lessonIndex === moduleProgress.completedLessons.length;

            const lessonEl = document.createElement('div');
            lessonEl.className = 'lesson';
            if (isCompleted) lessonEl.classList.add('completed');
            if (isLocked) lessonEl.classList.add('locked');
            if (isCurrent && !isCompleted) lessonEl.classList.add('active');

            let statusBadge = '';
            if (isCompleted) {
                statusBadge = '<div class="status-badge status-completed">✓ Finalizat</div>';
            } else if (isLocked) {
                const lockText = moduleUnlocked ? 'Blocat' : 'Finalizează modulul precedent';
                statusBadge = `<div class="status-badge status-locked"><span class="lock-icon">🔒</span> ${lockText}</div>`;
            } else if (isCurrent) {
                statusBadge = '<div class="status-badge status-current">Curent</div>';
            }

            lessonEl.innerHTML = `
                <div class="lesson-info">
                    <p class="lesson-title">${lesson.title}</p>
                    <div class="lesson-type">${getLessonTypeLabel(lesson.type)}</div>
                </div>
                <div class="lesson-status">
                    ${statusBadge}
                </div>
            `;

            if (!isLocked) {
                lessonEl.onclick = () => viewLesson(module.id, lesson);
                lessonEl.style.cursor = 'pointer';
            }

            lessonsContainer.appendChild(lessonEl);
        });

        moduleEl.appendChild(headerEl);
        moduleEl.appendChild(lessonsContainer);
        modulesSection.appendChild(moduleEl);
    });

    saveOpenModules();
}
function updateCertificateButton() {
    const btn = document.getElementById('downloadCertBtn');
    if (!btn) return;

    let totalLessons = 0;
    let completedLessons = 0;

    currentCourse.modules.forEach(module => {
        totalLessons += module.lessons.length;
        const progress = getUserModuleProgress(module.id);
        completedLessons += progress.completedLessons.length;
    });

    const isCompleted = totalLessons > 0 && completedLessons === totalLessons;

    // ✅ THIS is what you were missing
    btn.style.display = isCompleted ? 'inline-block' : 'none';
}
function toggleModule(moduleId, header, lessonsContainer) {
    lessonsContainer.classList.toggle('active');
    const toggle = header.querySelector('.module-toggle');
    const isOpen = lessonsContainer.classList.contains('active');
    toggle.textContent = isOpen ? '▲' : '▼';

    if (isOpen) {
        openModuleIds.add(moduleId);
    } else {
        openModuleIds.delete(moduleId);
    }

    saveOpenModules();
}

function getUserModuleProgress(moduleId) {
    const courseProgress = userProgress[courseId] || {};
    return courseProgress[moduleId] || { completedLessons: [], completed: false };
}

function isModuleCompleted(module) {
    const moduleProgress = getUserModuleProgress(module.id);
    const totalLessons = Array.isArray(module.lessons) ? module.lessons.length : 0;
    const completedLessons = Array.isArray(moduleProgress.completedLessons)? moduleProgress.completedLessons.length : 0;

    return totalLessons > 0 && completedLessons >= totalLessons;
}

function isModuleUnlocked(moduleIndex) {
    if (moduleIndex === 0) {
        return true;
    }

    const previousModule = currentCourse.modules[moduleIndex - 1];
    return isModuleCompleted(previousModule);
}

function updateProgressBar() {
    let totalCompleted = 0;
    let totalLessons = 0;

    currentCourse.modules.forEach(module => {
        const progress = getUserModuleProgress(module.id);
        totalCompleted += progress.completedLessons.length;
        totalLessons += module.lessons.length;
    });

    const percentage = totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0;
    document.getElementById('progressFill').style.width = percentage + '%';
    document.getElementById('progressText').textContent = `${totalCompleted} / ${totalLessons} lecții finalizate`;
}

function viewLesson(moduleId, lesson) {
    currentModule = moduleId;
    currentLesson = lesson;

    document.getElementById('modulesSection').style.display = 'none';
    document.getElementById('contentView').style.display = 'block';

    document.getElementById('contentTitle').textContent = lesson.title;
    document.getElementById('contentType').textContent = getLessonTypeLabel(lesson.type);

    const contentBody = document.getElementById('contentBody');
    contentBody.innerHTML = '';

    if (lesson.type === 'text') {
        contentBody.innerHTML = `<div class="lesson-content">${lesson.content}</div>`;
    } else if (lesson.type === 'quiz') {
        renderQuiz(lesson, contentBody);
    }

    resetLessonActionState();

    // Scroll to top
    window.scrollTo(0, 0);
}

function resetLessonActionState() {
    const completeBtn = document.getElementById('completeBtn');
    const backBtn = document.getElementById('backToModulesBtn');
    const retakeNotice = document.getElementById('retakeNotice');

    if (completeBtn) {
        completeBtn.style.display = '';
        completeBtn.disabled = currentLesson?.type === 'quiz';
        completeBtn.textContent = 'Marchează ca finalizat';
    }

    if (backBtn) {
        backBtn.textContent = 'Înapoi la module';
        backBtn.classList.remove('btn-primary');
        backBtn.classList.add('btn-secondary');
    }

    if (retakeNotice) {
        retakeNotice.remove();
    }
}

function showRetakeNotice(message) {
    const contentBody = document.getElementById('contentBody');
    const completeBtn = document.getElementById('completeBtn');

    let retakeNotice = document.getElementById('retakeNotice');
    if (!retakeNotice) {
        retakeNotice = document.createElement('div');
        retakeNotice.id = 'retakeNotice';
        retakeNotice.className = 'retake-notice';
        contentBody.appendChild(retakeNotice);
    }

    retakeNotice.innerHTML = `
        <div>${message}</div>
        
    `;


    if (completeBtn) {
        completeBtn.style.display = 'none';
    }
}

function renderQuiz(lesson, container) {
    const quizHtml = `
        <div class="quiz-section">
            ${lesson.questions.map((question, idx) => `
                <div class="question">
                    <div class="question-text">${idx + 1}. ${question.text}</div>
                    <div class="options">
                        ${question.options.map((option, optIdx) => `
                            <label class="option">
                                <input type="radio" name="q${idx}" value="${optIdx}" onchange="updateQuizState()">
                                ${option}
                            </label>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    container.innerHTML = quizHtml;
}

function updateQuizState() {
    // Check if all questions are answered
    const answers = getQuizAnswers();
    const completeBtn = document.getElementById('completeBtn');
    completeBtn.disabled = answers.length < currentLesson.questions.length;
}

function getQuizAnswers() {
    const answers = [];
    currentLesson.questions.forEach((question, idx) => {
        const selected = document.querySelector(`input[name="q${idx}"]:checked`);
        if (selected) {
            const selectedOption = Number(selected.value);
            const correctOption = Number(question.correct);
            answers.push({
                questionId: question.id,
                selectedOption,
                correctOption,
                isCorrect: Number.isFinite(selectedOption) && selectedOption === correctOption
            });
        }
    });
    return answers;
}

function evaluateQuizAttempt() {
    const questions = Array.isArray(currentLesson?.questions) ? currentLesson.questions : [];
    const answers = getQuizAnswers();
    const allAnswered = answers.length === questions.length;
    const allCorrect = allAnswered && answers.every((a) => a.isCorrect);

    return {
        questions,
        answers,
        allAnswered,
        allCorrect
    };
}

function validateQuiz() {
    if (currentLesson.type !== 'quiz') return true;

    const evaluation = evaluateQuizAttempt();

    if (!evaluation.allAnswered) {
        showError('Te rugăm să răspunzi la toate întrebările înainte de finalizare.');
        return false;
    }

    if (!evaluation.allCorrect) {
        highlightQuizErrors(evaluation);
        showError('Unele răspunsuri sunt greșite. Revizuiește și încearcă din nou.');
        return false;
    }

    return true;
}

function highlightQuizErrors(evaluation) {
    evaluation.questions.forEach((question, idx) => {
        const selected = document.querySelector(`input[name="q${idx}"]:checked`);
        if (!selected) return;

        const selectedLabel = selected.closest('.option');
        const selectedValue = parseInt(selected.value);

        if (selectedValue !== Number(question.correct)) {
            selectedLabel.classList.add('incorrect');
        } else {
            selectedLabel.classList.add('correct');
        }
    });
}
async function resetCurrentModuleProgress() {
    if (!currentModule) {
        throw new Error('Nu există un modul activ selectat pentru resetare');
    }

    const response = await fetch(`http://localhost:4000/courses/${courseId}/modules/${currentModule}/reset-progress`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        let backendMessage = 'Resetarea progresului modulului a eșuat';
        try {
            const errorData = await response.json();
            if (errorData && errorData.message) {
                backendMessage = errorData.message;
            }
        } catch {
            // Keep default message when response body is not JSON.
        }

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        throw new Error(backendMessage);
    }

    // Refresh from profile so local state keeps the full nested progress shape.
    const profileRes = await fetch('http://localhost:4000/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (profileRes.ok) {
        const profileData = await profileRes.json();
        userProgress = profileData.user?.progress || profileData.progress || {};
    }
}

async function completeLesson() {
    // Validate quiz if it's a quiz type
    const isQuiz = currentLesson.type === 'quiz';
    if (isQuiz && !validateQuiz()) {
        showRetakeNotice('Răspunsuri greșite. Revizuiește materialul și încearcă din nou.');
        lockQuizInputs();
        return;
    }


    try {
        const completeBtn = document.getElementById('completeBtn');
        completeBtn.disabled = true;
        completeBtn.textContent = 'Se salvează...';

        const response = await fetch(`http://localhost:4000/courses/${courseId}/progress`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                moduleId: currentModule,
                lessonId: currentLesson.id
            })
        });

        if (!response.ok) {
            throw new Error('Salvarea progresului a eșuat');
        }

        const result = await response.json();

        // Refresh from profile so local state keeps the full nested progress shape.
        const profileRes = await fetch('http://localhost:4000/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profileRes.ok) {
            const profileData = await profileRes.json();
            userProgress = profileData.user?.progress || profileData.progress || {};
            // Check if course just became completed
            updateCertificateButton();
            if (result.progress && result.progress.completed) {
                showSuccess("Curs finalizat! Se descarcă certificatul...");
                setTimeout(() => downloadCertificate(), 800);
            }
        }

        showSuccess(`"${currentLesson.title}" a fost finalizată! ✓`);
        lockQuizInputs();

        const doneCompleteBtn = document.getElementById('completeBtn');
        const doneBackBtn = document.getElementById('backToModulesBtn');
        if (doneCompleteBtn) {
            doneCompleteBtn.style.display = 'none';
        }
        if (doneBackBtn) {
            doneBackBtn.textContent = 'Înapoi la module';
            doneBackBtn.classList.remove('btn-secondary');
            doneBackBtn.classList.add('btn-primary');
        }
    } catch (error) {
        console.error('Eroare la finalizarea lecției:', error);
        showError('Salvarea progresului a eșuat. Încearcă din nou.');
        document.getElementById('completeBtn').disabled = false;
        document.getElementById('completeBtn').textContent = 'Marchează ca finalizat';
    }
}
function lockQuizInputs() {
    const inputs = document.querySelectorAll('.quiz-section input[type="radio"]');
    inputs.forEach(input => {
        input.disabled = true;
    });

    const options = document.querySelectorAll('.option');
    options.forEach(opt => {
        opt.style.cursor = 'not-allowed';
        opt.style.opacity = '0.7';
    });
}
function goBackToModules(event) {
    if (!event || !event.isTrusted) {
        return;
    }

    document.getElementById('modulesSection').style.display = 'flex';
    document.getElementById('contentView').style.display = 'none';
    currentModule = null;
    currentLesson = null;
    renderCourse();
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = '❌ ' + message;
    errorEl.style.display = 'block';
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    successEl.textContent = '✓ ' + message;
    successEl.classList.add('show');
    setTimeout(() => {
        successEl.classList.remove('show');
    }, 3000);
}
async function downloadCertificate() {
    const res = await fetch(`http://localhost:4000/courses/${courseId}/certificate`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) { 
        return; // silently ignore if not ready
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${courseId}-certificate.docx`;
    a.click();

    window.URL.revokeObjectURL(url);
}

// Load course on page load
loadCourseData();
