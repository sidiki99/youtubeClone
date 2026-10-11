import { user } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"

export const verifyJWT= asyncHandler(async(req,res,next)=>{
  try{
      const token =  req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")

  if(!token){
    throw new ApiError(401,"Unauthorized request")
  }

  const decoded = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)

   const User=  await user.findById(decoded?._id).select(
    "-password -refreshToken"
  )

  if(!User){
    throw new ApiError(401,"Invalid Access Token")
  }
  
  req.user= User;
  next()

  }catch(err){
       if (err instanceof ApiError) {
          throw err;
        }
     throw new ApiError(401,err?.message || "Invalid Access Token ")
  }
})