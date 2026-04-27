const fs = require("fs");
const path = require("path");
const docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");

function getCertificateTemplate(courseId) {
    if (courseId === "curs-prim-ajutor") {
        return path.join(__dirname, "../cert/PA-Certificate.docx");
    }

    if (courseId === "curs-nivel-1") {
        return path.join(__dirname, "../cert/SSM-I Certificate.docx");
    }

    if (courseId === "curs-nivel-2") {
        return path.join(__dirname, "../cert/SSM-II Certificate.docx");
    }

    return null;
}

function generateCertificate(course, user) {
    const templatePath = getCertificateTemplate(course?.id);
    if (!templatePath) {
        return;
    }

    const doc = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(doc);
    const docx = new docxtemplater(zip);

    docx.setData({
        NAME: user.username,
        DATE: new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }),
        DATE3yr: new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }),
        DATE5yr: new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }),
        COMPANY: "Example Company",
        JOB: "Example Job Title"
    });

    docx.render();
    return docx.getZip().generate({
        type: "nodebuffer"
    });
}

module.exports = {
    generateCertificate
};