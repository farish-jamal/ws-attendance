const { z } = require('zod');

exports.signupSchema = z.object({
    name: z.string(),
    email: z.string(),
    password: z.string().min(6),
    role: z.enum(['student', 'teacher'])
});

exports.loginSchema = z.object({
    email: z.string(),
    password: z.string()
});

exports.validClass = z.object({
    className: z.string(),
});

exports.validAddStudent = z.object({
    studentId: z.string()
});