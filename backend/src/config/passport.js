const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcryptjs');
const prisma = require('./prisma');

// Strategy for logging in
passport.use(
  new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: {
            email: email,
          },
        });

        if (!user) {
          return done(null, false, {
            message: 'Incorrect email or password.',
          });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return done(null, false, {
            message: 'Incorrect email or password.',
          });
        }

        if (!user.isVerified) {
          return done(null, false, {
            message: 'Please verify your email to log in.',
          });
        }

        // Create a clean user object with all sensitive fields removed
        const {
          password: _,
          verificationToken: __,
          verificationTokenExpires: ___,
          ...sanitizedUser
        } = user;

        return done(null, sanitizedUser); // send the user back to passport.authenticate()
      } catch (error) {
        console.error('Local strategy error:', error);
        return done(error);
      }
    }
  )
);

// Extract the JWT from the request
const cookieExtractor = function (req) {
  const token = null;
  if (req && req.cookies) {
    return req.cookies['token'];
  }
  return token;
};

// JWT strategy options
const jwtOptions = {
  // Tell the strategy where to find the JWT
  jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
  // Provide the same secret key to verify the token's signature
  secretOrKey: process.env.JWT_SECRET,
};

// Strategy for verifying the JWT received on each subsequent requests
passport.use(
  new JwtStrategy(jwtOptions, async (userPayload, done) => {
    try {
      // Use userPayload.id to find the user in the db
      const user = await prisma.user.findUnique({
        where: {
          id: userPayload.id,
        },
      });

      if (user) {
        // Create a clean user object with all sensitive fields removed
        const {
          password: _,
          verificationToken: __,
          verificationTokenExpires: ___,
          ...sanitizedUser
        } = user;

        return done(null, sanitizedUser); // send the user back to passport.authenticate()
      } else {
        return done(null, false, {
          message: 'Your session is invalid. Please log in again.',
        });
      }
    } catch (error) {
      console.error('JWT strategy error:', error);
      return done(error);
    }
  })
);
