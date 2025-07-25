const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const emailService = require('../services/email.service');

// Helper function to get consistent cookie options
function getCookieOptions() {
  const options = {
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
    options.sameSite = 'lax';
  } else {
    // For development on localhost with different ports
    options.secure = true;
    options.sameSite = 'none';
  }
  return options;
}

async function register(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password } = req.body;
    const existingUser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    const newUser = await prisma.user.create({
      data: {
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: hashedPassword,
        verificationToken: verificationToken,
        verificationTokenExpires: expiresAt,
      },
    });

    // call the function sending the verification email
    await emailService.sendVerificationEmail(email, verificationToken);

    // Remove all sensitive fields before sending the response
    const {
      password: _,
      verificationToken: __,
      verificationTokenExpires: ___,
      ...user
    } = newUser;

    res.status(201).json(user);
  } catch (error) {
    console.error('Registration error:', error);

    // If a user was created before the error happened, delete them.
    if (newUser) {
      await prisma.user.delete({ where: { id: newUser.id } });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
}

async function verifyEmail(req, res) {
  const token = req.query.token;
  try {
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpires: {
          gte: new Date(), // token should not be expired yet
        },
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

    res.status(200).json({
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Email verification error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function login(req, res) {
  try {
    const userPayload = {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
    };

    const secret = process.env.JWT_SECRET;
    const token = jwt.sign(userPayload, secret, { expiresIn: '1h' });

    const cookieOptions = {
      ...getCookieOptions(),
      maxAge: 60 * 60 * 1000, // 1 hour
    };

    res.cookie('token', token, cookieOptions);

    res.status(200).json(req.user);
  } catch (error) {
    console.error('Login error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function logout(req, res) {
  try {
    res.clearCookie('token', getCookieOptions());
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function profile(req, res) {
  try {
    // req.user do not have the sensitive data since they were removed in passport.js
    res.status(200).json(req.user);
  } catch (error) {
    console.error('Profile access error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = { register, verifyEmail, login, logout, profile };
