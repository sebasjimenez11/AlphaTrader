import express from "express";
import session from "express-session";
import dotenv from "dotenv";
dotenv.config();

import passport from "./config/passport.js";
import authRouter from "./routers/authRouter.js";
import sequelize from "./database/db.js"; // Conexión a la BD

const app = express();
app.use(express.json());

// Configuración de sesiones (si usas sesiones con Passport)
app.use(
  session({
    secret: process.env.JWT_SECRET || "secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Rutas de autenticación y usuario
app.use("/auth", authRouter);


// Sincroniza la BD y levanta el servidor
sequelize.sync({ alter: true }).then(() => {
  app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor corriendo en puerto ${process.env.PORT || 3000}`);
  });
});
