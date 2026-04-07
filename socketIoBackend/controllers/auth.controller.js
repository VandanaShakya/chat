import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../config/jwt.js";

export const signup = async (req, res) => {
  try {
    const { userName, email, password } = req.body;

    // validation
    if ( !userName || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    } 

    // check existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { userName }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const newUser = await User.create({
      userName,
      email,
      password: hashedPassword
    });

    // generate token & store in cookie
    generateToken(newUser._id, res);
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
         email: newUser.email,
        userName: newUser.userName
      }
    });

  } catch (error) {
    res.status(500).json({
      message: "Signup error",
      error: error.message
    });
  }
};




export const login = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // validation
      if (!email || !password) {
        return res.status(400).json({
          message: "All fields are required"
        }); 
      }
  
      // find user
      const user = await User.findOne({ email });
  
      if (!user) {
        return res.status(400).json({
          message: "Invalid credentials"
        });           
      }
  
      // compare password
      const isMatch = await bcrypt.compare(password, user.password);
  
      if (!isMatch) {
        return res.status(400).json({
          message: "Invalid credentials"
        });
      }
  
      // generate token & store in cookie
      generateToken(user._id, res);
  
      res.status(200).json({
        message: "Login successful",
        user: {
          id: user._id,
          email: user.email,
          userName: user.userName
        }
      });
  
    } catch (error) {
      res.status(500).json({
        message: "Login error",
        error: error.message
      });
    }
  };


  export const logout = (req, res) => {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 0
    });
  
    res.status(200).json({
      message: "Logged out successfully"
    });
  };