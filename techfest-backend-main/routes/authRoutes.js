
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// Validation error handler
const checkValidation = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: "Invalid input",
            errors: errors.array()
        });
    }

    next();
};

// Registration
router.post(
    "/register",
    [
        body("name")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Name is required"),

        body("email")
            .isString()
            .isEmail()
            .withMessage("Valid email is required")
            .bail()
            .normalizeEmail(),

        body("password")
            .isString()
            .isLength({ min: 6 })
            .withMessage("Password must have at least 6 characters")
    ],
    checkValidation,
    async (req, res) => {
        try {
            const { name, email, password } = req.body;

            const existingUser = await User.findOne({ email });

            if (existingUser) {
                return res.status(400).json({
                    message: "User already exists"
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = new User({
                name,
                email,
                password: hashedPassword
            });

            await user.save();

            res.status(201).json({
                message: "Registered successfully"
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({
                message: "Internal server error"
            });
        }
    }
);

// Login
router.post(
    "/login",
    [
        body("email")
            .isString()
            .isEmail()
            .withMessage("Valid email is required")
            .bail()
            .normalizeEmail(),

        body("password")
            .isString()
            .notEmpty()
            .withMessage("Password is required")
    ],
    checkValidation,
    async (req, res) => {
        try {
            const { email, password } = req.body;

            const user = await User.findOne({ email });

            if (!user) {
                return res.status(400).json({
                    message: "Invalid email or password"
                });
            }

            const isMatch = await bcrypt.compare(
                password,
                user.password
            );

            if (!isMatch) {
                return res.status(400).json({
                    message: "Invalid email or password"
                });
            }

            const token = jwt.sign(
                {
                    id: user._id,
                    role: user.role
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "1h"
                }
            );

            
res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 1000
});

res.json({
    message: "Login successful",
    name: user.name,
    role: user.role
});


        } catch (err) {
            console.error(err);
            res.status(500).json({
                message: "Internal server error"
            });
        }
    }
);

// Protected route
router.get("/protected", authMiddleware, (req, res) => {
    res.json({
        message: "You accessed a protected route",
        user: req.user
    });
});

// Admin route
router.get(
    "/admin",
    authMiddleware,
    adminMiddleware,
    (req, res) => {
        res.json({
            message: "Welcome Admin"
        });
    }
);

module.exports = router;
