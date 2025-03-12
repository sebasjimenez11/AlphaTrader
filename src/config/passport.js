import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import dotenv from "dotenv";
import userRepository from "../repositories/userRepository.js";
import UserDto from "../dto/userDto.js";
import { getId } from "../utils/uuid.js";
import { loginValidator } from "../middlewares/authValidator.js";

dotenv.config();
// Estrategia JWT para proteger rutas
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (jwtPayload, done) => {
      try {
        const user = await userRepository.findByEmail(jwtPayload.email);
        return user ? done(null, user) : done(null, false);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Estrategia Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log(profile);
        
        let user = await userRepository.findByEmail(profile.emails[0].value);
        if (!user) {
          const newUser = new UserDto({
            ID: getId(),
            Email: profile.emails[0].value,
            FullName: profile.displayName,
            Status: false,
            googleId: profile.id,
          });
          user = await userRepository.create(newUser.toJSON());
        }
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Estrategia Facebook OAuth
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: "/auth/facebook/callback",
      profileFields: ["id", "emails", "name"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails ? profile.emails[0].value : null;
        if (!email) return done(null, false);
        let user = await userRepository.findByEmail(email);        
        if (!user) {
          const newUser = new UserDto({
            ID: getId(),
            Email: email,
            FullName: `${profile.name.givenName} ${profile.name.familyName}`,
            Status: false,
            facfacebookId : profile.id,
          });
          user = await userRepository.create(newUser.toJSON());
          console.log(user);
        }
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Serialización y deserialización para sesiones (si las usas)
passport.serializeUser((user, done) => {
  done(null, user.ID);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userRepository.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
