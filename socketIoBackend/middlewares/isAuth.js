import jwt from "jsonwebtoken";

export const isAuth = (req, res, next) => {
  try {
    const token = req.cookies.token;
    // console.log(token);

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }
    else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
   
    req.userId = decoded.id;
    console.log("DECODED:", decoded);
     next();

  } catch (error) {
    res.status(401).json({
      message: "Invalid token"
    });
  }
};