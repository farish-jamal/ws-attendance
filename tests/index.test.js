import { describe, it, expect } from "vitest";

const BASE_URL = 'http://localhost:8080';

function uniqueEmail(name = 'user') {
    return `${name}${Date.now()}@example.com`;
};

async function request(method, path, body, token = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    }

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();
    return { status: response.status, data };
};

// ============================================
// AUTH TESTS - POST /auth/signup
// ============================================
    
describe('POST /auth/signup', () => {
    it('should create a new student with correct response format', async () => {
        const email = uniqueEmail();
        const { status, data } = await request('POST', '/auth/signup', {
            name: 'Test Student',
            email: email,
            password: 'password123',
            role: 'student'
        });

        expect(status).toBe(201);
        expect(data.success).toBe(true);
    });

    it('should create a new teacher with correct response format', async () => {
        const email = uniqueEmail();
        const { status, data } = await request('POST', '/auth/signup', {
            name: 'Test Teacher',
            email: email,
            password: 'password123',
            role: 'teacher'
        });
        expect(status).toBe(201);
        expect(data.success).toBe(true);
    });

    it('should return 400 for duplicate email', async () => {
        const email = uniqueEmail();
        await request('POST', '/auth/signup', {
            name: 'Test User',
            email: email,
            password: 'password123',
            role: 'student'
        });
        const { status, data } = await request('POST', '/auth/signup', {
            name: 'Test User 2',
            email: email,
            password: 'password123',
            role: 'teacher'
        });
        expect(status).toBe(400);
        expect(data.success).toBe(false);
        expect(data).toHaveProperty('error', 'User with this email already exists');
    });

    it('should return 400 for invalid role', async () => {
        const email = uniqueEmail();
        const { status, data } = await request('POST', '/auth/signup', {
            name: 'Test User',
            email: email,
            password: 'password123',
            role: 'admin'
        });
        expect(status).toBe(400);
        expect(data.success).toBe(false);
        expect(data).toHaveProperty('error');
    });

    it('should return 400 for short password', async () => {
        const email = uniqueEmail();
        const { status, data } = await request('POST', '/auth/signup', {
            name: 'Test User',
            email: email,
            password: '123',
            role: 'student'
        });
        expect(status).toBe(400);
        expect(data.success).toBe(false);
        expect(data).toHaveProperty('error');
    });

    it ('should return 400 for missing fields', async () => {
        const { status, data } = await request('POST', '/auth/signup', {
            email: uniqueEmail(),
            password: 'password123',
            role: 'student'
        });
        expect(status).toBe(400);
        expect(data.success).toBe(false);
        expect(data).toHaveProperty('error');
    });

    it ('should return 400 for invalid email format', async () => {
        const { status, data } = await request('POST', '/auth/signup', {
            name: 'Test User',
            email: 'invalid-email',
            password: 'password123',
            role: 'student'
        });
        expect(status).toBe(400);
        expect(data.success).toBe(false);
        expect(data).toHaveProperty('error');
    });
})

// ============================================
// AUTH TESTS - POST /auth/login
// ============================================

describe('POST /auth/login', () => {
    it('should login an existing user with correct response format', async () => {
        const email = uniqueEmail();
        const password = 'password123';
        await request('POST', '/auth/signup', {
            name: 'Login User',
            email: email,
            password: password,
            role: 'student'
        });
        const { status, data } = await request('POST', '/auth/login', {
            email: email,
            password: password
        });
        expect(status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('token');
    });

    it('should return 400 for incorrect password', async () => {
        const email = uniqueEmail();
        const password = 'password123';
        await request('POST', '/auth/signup', {
            name: 'Login User',
            email: email,
            password: password,
            role: 'student'
        });
        const { status, data } = await request('POST', '/auth/login', {
            email: email,
            password: 'wrongpassword'
        });
        expect(status).toBe(400);
        expect(data.success).toBe(false);
        expect(data).toHaveProperty('error');
    });

    it('should return 400 for non-existing email', async () => {
        const { status, data } = await request('POST', '/auth/login', {
            email: uniqueEmail(),
            password: 'password123'
        });
        expect(status).toBe(400);
        expect(data.success).toBe(false);
        expect(data).toHaveProperty('error');
    });

    it('should return 400 for missing fields', async () => {
        const { status, data } = await request('POST', '/auth/login', {
            email: uniqueEmail()
        });
        expect(status).toBe(400);
        expect(data.success).toBe(false);
        expect(data).toHaveProperty('error');
    });
});

// ============================================
// AUTH TESTS - GET /auth/me
// ============================================

describe('GET /auth/me', () => {
    it('should return user details for authenticated user', async () => {
        const email = uniqueEmail();
        const password = 'password123';
        await request('POST', '/auth/signup', {
            name: 'Me User',
            email: email,
            password: password,
            role: 'teacher'
        });
        const loginRes = await request('POST', '/auth/login', {
            email: email,
            password: password
        });
        const token = loginRes.data.data.token;
        const { status, data } = await request('GET', '/auth/me', null, token);
        expect(status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('email', email);
        expect(data.data).toHaveProperty('name', 'Me User');
        expect(data.data).toHaveProperty('role', 'teacher');
        expect(data.data).not.toHaveProperty('password');
    });

    it('should return 401 for missing token', async () => {
        const { status, data } = await request('GET', '/auth/me');
        expect(status).toBe(401);
        expect(data.success).toBe(false);
        expect(data).toHaveProperty('error', 'Unauthorized, token missing');
    });

    it('should return 401 for invalid token', async () => {
        const { status, data } = await request('GET', '/auth/me', null, 'invalidtoken');
        expect(status).toBe(401);
        expect(data.success).toBe(false);
        expect(data).toHaveProperty('error', 'Unauthorized, token missing or invalid');
    });
});