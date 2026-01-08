require('dotenv').config();
const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
const bycrpt = require('bcrypt');
const { connectToDB } = require('./config/db');
const { signupSchema, loginSchema, validClass } = require('./utils/zod');

// Models
const { User, Class } = require('./model');
const { authenticate, authenticateTeacher } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 3000;

(async () => {
  await connectToDB();
})();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get('/health', (req, res) => {
   return res.send('Welcome to the Attendance Management System API');
});


app.post('/auth/signup', async (req, res) => {
    try {
        const result = signupSchema.safeParse(req.body);

        console.log(result);
    
        if(!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error.message,
            });
        }
    
        const { name, email, password, role } = result.data;
        const checkExistance = await User.findOne({ email });
    
        if(checkExistance) {
            return res.status(400).json({
                success: false,
                error: "User with this email already exists"
            });
        }
    
        const hashedPassword = await bycrpt.hash(password, 10);
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role
        });
        await newUser.save();
    
        return res.status(201).json({
            success: true,
            message: "User registered successfully"
        });
    } catch (error) {
        console.error('Error during signup:', error);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    }
});

app.post('/auth/login', async (req, res) => {
    try {

        const result = loginSchema.safeParse(req.body);
        if(!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error.message,
            });
        }
    
        const { email, password } = result.data;
        const user = await User.findOne({ email });
    
        if(!user) {
            return res.status(400).json({
                success: false,
                error: "Invalid email or password"
            });
        }
    
        const isPasswordValid = await bycrpt.compare(password, user.password);
        if(!isPasswordValid) {
            return res.status(400).json({
                success: false,
                error: "Invalid email or password"
            });
        }
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET
        );
        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token
            }
        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    }
});

app.get('/auth/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if(!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }
        return res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error during fetching profile:', error);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    }
});

app.post('/class', authenticateTeacher, async (req, res) => {
    try {
        const response = validClass.safeParse(req.body);
        if(!response.success) {
            return res.status(400).json({
                success: false,
                errors: response.error.errors
            });
        }
        const checkTeacherExistence = await User.findById(req.user.id);
        if(!checkTeacherExistence) {
            return res.status(400).json({
                success: false,
                error: "Teacher not found"
            });
        }
    
        if(checkTeacherExistence.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                error: "Only teachers can create classes"
            });
        }
    
        const { className } = response.data;
        const checkIfClassExists = await Class.findOne({ className, teacher: req.user.id });
        if(checkIfClassExists) {
            return res.status(400).json({
                success: false,
                error: "Class with this name already exists for this teacher"
            });
        }
    
        const newClass = new Class({
            className,
            teacher: req.user.id
        });
        await newClass.save();
        return res.status(201).json({
            success: true,
            message: "Class created successfully",
            data: newClass
        });
    } catch (error) {
        console.error('Error during class creation:', error);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    };
});

app.post('/class/:id/add-student', authenticateTeacher, async (req, res) => {
    try {
        const response = validAddStudent.safeParse(req.body);
        if(!response.success) {
            return res.status(400).json({
                success: false,
                errors: response.error.errors
            });
        }
        const checkTeacherExistence = await User.findById(req.user.id);
        if(!checkTeacherExistence) {
            return res.status(400).json({
                success: false,
                error: "Teacher not found"
            });
        }
        if(checkTeacherExistence.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                error: "Only teachers can add students to classes"
            });
        }

        const checkClassExistance = await Class.findOne({ _id: req.params.id, teacher: req.user.id });
        if(!checkClassExistance) {
            return res.status(404).json({
                success: false,
                error: "Class not found"
            });
        }

        const { studentId } = response.data;
        const checkStudentExistence = await User.findById(studentId);
        if(!checkStudentExistence) {
            return res.status(400).json({
                success: false,
                error: "Student not found"
            });
        };

        if(checkStudentExistence.role !== 'student') {
            return res.status(403).json({
                success: false,
                error: "Only students can be added to classes"
            });
        }

        if(checkClassExistance.studentsId.includes(studentId)) {
            return res.status(400).json({
                success: false,
                error: "Student is already added to this class"
            });
        }

        checkClassExistance.studentsId.push(studentId);
        await checkClassExistance.save();
        return res.status(200).json({
            success: true,
            message: "Student added to class successfully",
            data: checkClassExistance
        });
    } catch (error) {
        console.error('Error during adding student to class:', error);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    };
});

app.get('/class/:id', authenticateTeacher, async (req, res) => {
    try {
        const checkTeacherExistence = await User.findById(req.user.id);
        if(!checkTeacherExistence) {
            return res.status(400).json({
                success: false,
                error: "Teacher not found"
            });
        }
        if(checkTeacherExistence.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                error: "Only teachers can view class details"
            });
        }
        const classDetails = await Class.findOne({ _id: req.params.id, teacher: req.user.id })
            .populate('studentsId', 'name email');
        if(!classDetails) {
            return res.status(404).json({
                success: false,
                error: "Class not found"
            });
        }
        return res.status(200).json({
            success: true,
            data: classDetails
        });
    } catch (error) {
        console.error('Error during fetching class details:', error);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    };
});

app.get('/students', authenticateTeacher, async (req, res) => {
    try {
        const checkTeacherExistence = await User.findById(req.user.id);
        if(!checkTeacherExistence) {
            return res.status(400).json({
                success: false,
                error: "Teacher not found"
            });
        }
        if(checkTeacherExistence.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                error: "Only teachers can view students list"
            });
        }
        const studentsList = await User.find({ role: 'student' }).select('-password -role');
        return res.status(200).json({
            success: true,
            data: studentsList
        });
    } catch (error) {
        console.error('Error during fetching students list:', error);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    };
});



app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});