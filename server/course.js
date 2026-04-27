const fs = require("fs");
const path = require("path");
const express = require("express");
const cert = require("./certification");
const authMiddleware = require("./auth");
const {
    getUsers,
    saveUsers,
    getUserById
} = require("./userManagement");

const router = express.Router();
const COURSES_FILE = path.join(__dirname, "../data/essm_courses.json");

function readCourses() {
    try {
        const data = fs.readFileSync(COURSES_FILE, "utf-8");
        const parsed = data ? JSON.parse(data) : {};
        const rawCourses = Array.isArray(parsed.courses) ? parsed.courses : [];
        return rawCourses.map(normalizeCourse).filter((course) => typeof course.id === "string");
    } catch {
        return [];
    }
}

function collectValidModules(modules) {
    if (!Array.isArray(modules)) {
        return [];
    }

    const normalized = [];

    modules.forEach((module) => {
        const hasLessons = typeof module?.id === "string" && Array.isArray(module.lessons);

        if (hasLessons) {
            normalized.push({
                id: module.id,
                title: module.title || "",
                lessons: module.lessons
            });
            return;
        }

        // Some files contain a nested course-like object under modules; flatten it.
        if (Array.isArray(module?.modules)) {
            normalized.push(...collectValidModules(module.modules));
        }
    });

    return normalized;
}

function normalizeCourse(course) {
    return {
        ...course,
        modules: collectValidModules(course?.modules)
    };
}

function findUserById(userId) {
    return getUserById(userId);
}

function findCourseById(courseId) {
    return readCourses().find((course) => course.id === courseId);
}

function getCourseProgress(user, course) {
    const userProgress = user.progress || {};
    const courseProgress = userProgress[course.id] || {};

    const moduleProgress = (course.modules || []).map((module) => {
        const modState = courseProgress[module.id] || {};
        const completedLessons = Array.isArray(modState.completedLessons)
            ? modState.completedLessons
            : [];
        const moduleLessonIds = (module.lessons || []).map((lesson) => lesson.id);
        const completedCount = moduleLessonIds.filter((id) => completedLessons.includes(id)).length;
        const completed = moduleLessonIds.length > 0 && completedCount === moduleLessonIds.length;

        return {
            moduleId: module.id,
            completedLessons,
            completedLessonsCount: completedCount,
            totalLessons: moduleLessonIds.length,
            completed
        };
    });

    const totalLessons = moduleProgress.reduce((sum, module) => sum + module.totalLessons, 0);
    const completedLessons = moduleProgress.reduce((sum, module) => sum + module.completedLessonsCount, 0);
    const completedModules = moduleProgress.filter((module) => module.completed).length;
    const totalModules = moduleProgress.length;
    const completionPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    const completed = totalModules > 0 && completedModules === totalModules;

    return {
        courseId: course.id,
        totalModules,
        completedModules,
        totalLessons,
        completedLessons,
        completionPercent,
        completed,
        modules: moduleProgress
    };
}

function ensureProgressStructure(user, courseId, moduleId) {
    user.progress = user.progress || {};
    user.progress[courseId] = user.progress[courseId] || {};
    user.progress[courseId][moduleId] = user.progress[courseId][moduleId] || {
        completedLessons: [],
        completed: false
    };
}

router.use(authMiddleware);

router.get("/courses", (req, res) => {
    const user = findUserById(req.user.id);
    if (!user) {
        return res.status(404).json({ message: "Utilizatorul nu a fost găsit" });
    }

    const courses = readCourses().map((course) => ({
        ...course,
        progress: getCourseProgress(user, course)
    }));

    return res.json({ courses });
});

router.get("/courses/:courseId", (req, res) => {
    const user = findUserById(req.user.id);
    if (!user) {
        return res.status(404).json({ message: "Utilizatorul nu a fost găsit" });
    }

    const course = findCourseById(req.params.courseId);
    if (!course) {
        return res.status(404).json({ message: "Cursul nu a fost găsit" });
    }

    return res.json({
        course,
        progress: getCourseProgress(user, course)
    });
});

router.post("/courses/:courseId/progress", (req, res) => {
    const { courseId } = req.params;
    const { moduleId, lessonId } = req.body;

    if (!moduleId || !lessonId) {
        return res.status(400).json({ message: "moduleId și lessonId sunt obligatorii" });
    }

    const courses = readCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course) {
        return res.status(404).json({ message: "Cursul nu a fost găsit" });
    }

    const module = (course.modules || []).find((m) => m.id === moduleId);
    if (!module) {
        return res.status(404).json({ message: "Modulul nu a fost găsit" });
    }

    const lessonExists = (module.lessons || []).some((lesson) => lesson.id === lessonId);
    if (!lessonExists) {
        return res.status(404).json({ message: "Lecția nu a fost găsită" });
    }

    const users = getUsers();
    const userIndex = users.findIndex((u) => Number(u.id) === Number(req.user.id));
    if (userIndex === -1) {
        return res.status(404).json({ message: "Utilizatorul nu a fost găsit" });
    }

    const user = users[userIndex];
    ensureProgressStructure(user, courseId, moduleId);

    const moduleProgress = user.progress[courseId][moduleId];
    if (!Array.isArray(moduleProgress.completedLessons)) {
        moduleProgress.completedLessons = [];
    }

    if (!moduleProgress.completedLessons.includes(lessonId)) {
        moduleProgress.completedLessons.push(lessonId);
    }

    const lessonIds = (module.lessons || []).map((lesson) => lesson.id);
    moduleProgress.completed = lessonIds.length > 0 && lessonIds.every((id) => moduleProgress.completedLessons.includes(id));

    users[userIndex] = user;
    saveUsers(users);

    const latestProgress = getCourseProgress(user, course);

    if (latestProgress.completed) {
        cert.generateCertificate(course, user);
    }

    return res.json({
        message: "Progres actualizat",
        progress: latestProgress
    });
});

router.post("/courses/:courseId/modules/:moduleId/reset-progress", (req, res) => {
    const { courseId, moduleId } = req.params;

    const courses = readCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course) {
        return res.status(404).json({ message: "Cursul nu a fost găsit" });
    }

    const module = (course.modules || []).find((m) => m.id === moduleId);
    if (!module) {
        return res.status(404).json({ message: "Modulul nu a fost găsit" });
    }

    const users = getUsers();
    const userIndex = users.findIndex((u) => Number(u.id) === Number(req.user.id));
    if (userIndex === -1) {
        return res.status(404).json({ message: "Utilizatorul nu a fost găsit" });
    }

    const user = users[userIndex];
    ensureProgressStructure(user, courseId, moduleId);

    user.progress[courseId][moduleId] = {
        completedLessons: [],
        completed: false
    };

    users[userIndex] = user;
    saveUsers(users);

    const latestProgress = getCourseProgress(user, course);
    return res.json({
        message: "Progresul modulului a fost resetat",
        progress: latestProgress
    });
});

router.get("/courses/:courseId/completion", (req, res) => {
    const user = findUserById(req.user.id);
    if (!user) {
        return res.status(404).json({ message: "Utilizatorul nu a fost găsit" });
    }

    const course = findCourseById(req.params.courseId);
    if (!course) {
        return res.status(404).json({ message: "Cursul nu a fost găsit" });
    }

    const progress = getCourseProgress(user, course);
    return res.json({
        courseId: course.id,
        completed: progress.completed,
        completionPercent: progress.completionPercent,
        completedLessons: progress.completedLessons,
        totalLessons: progress.totalLessons,
        completedModules: progress.completedModules,
        totalModules: progress.totalModules
    });
});

router.get("/courses/:courseId/certificate", (req, res) => {
    const user = findUserById(req.user.id);
    if (!user) {
        return res.status(404).json({ message: "Utilizatorul nu a fost găsit" });
    }

    const course = findCourseById(req.params.courseId);
    if (!course) {
        return res.status(404).json({ message: "Cursul nu a fost găsit" });
    }

    const progress = getCourseProgress(user, course);

    if (!progress.completed) {
        return res.status(403).json({ message: "Cursul nu este finalizat" });
    }

    const buffer = cert.generateCertificate(course, user);
    if (!buffer) {
        return res.status(500).json({ message: "Eroare la generarea certificatului" });
    }

    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    res.setHeader(
        "Content-Disposition",
        `attachment; filename=${user.username}-${course.id}.docx`
    );

    res.send(buffer);
});

module.exports = {
    courseRouter: router
};


