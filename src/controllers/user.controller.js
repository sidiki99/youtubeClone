import {asyncHandler} from "../utils/asyncHandler.js"
import{ApiError} from "../utils/ApiError.js"
import {user,} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
// import{generateRefreshToken,generateAccessToken} from "../models/user.model.js"


const registerUser= asyncHandler(async (req,res)=>{
   const {
     fullname,username,email,password
   }= req.body;
   console.log("email",email)

   if(
     [fullname,email,username,password].some((field)=>
      field?.trim() === "")    
   ){
     throw new ApiError(400,"All fields are required")
   }

   const existedUser =await  user.findOne({
     $or:[{username}, {email}]
   })

   if(existedUser){
      throw new ApiError(409,"User with email or username already exist")
   }
   
   const avatarLocalPath= req.files?.avatar[0]?.path;
   console.log(avatarLocalPath)
   const coverImageLocalPath= req.files?.coverImage[0]?.path;
   console.log(coverImageLocalPath)

   if(!avatarLocalPath){
     throw new ApiError(400,"Avatar is required")
   }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    console.log("Cloudinary avatar response:", avatar);


     if(!avatar){
     throw new ApiError(400,"Avatar upload failed")
   }
    const newUser = await user.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
   })

    const createdUser= await user.findById(newUser._id).select(
       "-password -refreshToken"
    )

    if(!createdUser){
          throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
      new ApiResponse(200,"createdUser","User registered successfully")
    )
    



})

const generateAccessAndRefreshTokens = async(userId)=>{
  try{
     const USER = await user.findById(userId)
    const refreshToken= USER.generateRefreshToken()
     const accessToken = USER.generateAccessToken()

     USER.refreshToken = refreshToken
     await  USER.save({validateBeforeSave:false});

     return {accessToken,refreshToken}
     
  }catch(error){
     console.error("Token generation error:", error);

    if (error instanceof ApiError) {
      throw error;
    }

     throw new ApiError(500,"Something went wrong while generating refresh and access tokens")
  }

}

 const userLogin = asyncHandler(async (req,res)=>{
     const { email,password,username}= req.body ;

     if(!(username || email)){
       throw new ApiError(400,"username or email is required")
     }

     const filteredUser = await user.findOne({
       $or:[{username},{email}]
     })

     if(!filteredUser){
       throw new ApiError(404,"User does not exist")
     }

     const isPasswordValid =await filteredUser.isPasswordCorrect(password)
      if(!isPasswordValid){
       throw new ApiError(401,"Password is not valid ")
     }

    const {accessToken,refreshToken}= await
     generateAccessAndRefreshTokens(filteredUser._id)

    const loggedUser=  await user.findById(filteredUser._id).
    select("-password -refreshToken")

    // const options ={
    //    httpOnly :true,
    //    secure:true
    // }
    // return res
    // .status(200)
    // .cookie("accessToken",accessToken,options))
    // .cookie("refreshToken",refreshToken,options)
    // .json(
    //   new ApiResponse(
    //     200,
    //      {
    //        user:loggedUser,accessToken,refreshToken
    //      },
    //      "User logged In Successfully"
    //   )
    // )

   
      const options = {
        httpOnly: true,
        secure: true,
      };

      return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
          new ApiResponse(
            200,
            {
              user: loggedUser,
              accessToken,
              refreshToken,
            },
            "User logged In Successfully"
          )
        );

  })

  const logoutUser=asyncHandler(async (req,res)=>{
     await  user.findByIdAndUpdate( req.user._id,
         {
            $unset:{
               refreshToken:1
            }
         }
      ) 
          const options ={
              httpOnly :true,
              secure:true
            }    

            return res
            .status(200)
            .clearCookie("accessToken".options)
            .clearCookie("refreshToken".options)
            .json( new ApiResponse(200,{},"User logged Out"))
  })

  const refreshAccessToken = asyncHandler(async (req,res)=>{
    const incomingAccessToken = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingAccessToken){
       throw new ApiError(401,"unauthorized request")
    }

     try{
        const decodedToken = jwt.verify(incomingAccessToken,process.env.REFRESH_TOKEN_SECRET)
   const USER = await  user.findById(decodedToken?._id)

   if(!USER){
    throw new ApiError(401,"Invalid Refresh Token")
   }
   if(incomingAccessToken !== USER?.refreshToken){
       throw new ApiError(401,"Refresh token is expired or used")
   }

    const options = {
        httpOnly: true,
        secure: true,
      };

      const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(USER?._id)

      return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
          new ApiResponse(
            200,
            {
              user: loggedUser,
              accessToken,
              newRefreshToken,
            },
            "Access token refreshed  Successfully"
          )
        );

     }catch(error){
        throw new ApiError(401,error?.message||"Invalid Refresh Token")       
     }
  })

  const changeUserPassword = asyncHandler(async(req,res)=>{
       const {oldPassword,newPassword}= req.body;

       const USER = await  user.findById(req.user?._id)
       const isPasswordCorrect= await  USER.isPasswordCorrect(oldPassword)

       if(!isPasswordCorrect){
          throw new ApiError(400,"Invalid password")
       }

        USER.password = newPassword
        await  USER.save({ validateBeforeSave : false })

        return res.status(200)
        .json(new ApiResponse(
           200,{},"password changed successfully"
        ))

  })

  const getCurrentUser = asyncHandler(async(req,res)=>{
        return res.status(200)
        .json(new ApiResponse(
           200,req.user,"Current user fetched  successfully"
        ))
  })


  const updateAccountDetails = asyncHandler(async(req,res)=>{
        const {fullname,email}=req.body
        if(!fullname && !email){
           throw new ApiError(400,"All fields are required")
        }
         
        const updatedUser= user.findByIdAndUpdate(
           req.user?._id,
           {
             $set: {
               fullname,
               email
             }
           },
           {new:true}
        ).select("-password")

        return res.status(200)
        .json(new ApiResponse(
           200,updatedUser,"Account Details Updated Successfully"
        ))
  })

  const updateUserAvatar = asyncHandler(async(req,res)=>{
      const avatarLocalPath = req.file?.path

      if(!avatarLocalPath){
         throw new ApiError(400,"Avatar is missing ")
      }

     const avatar= await uploadOnCloudinary(avatarLocalPath)

       if(!avatar.url){
         throw new ApiError(400,"Error while updating ")
      }

      const updatedUser= await user.findByIdAndUpdate(
        req.user?._id,
        {
           $set:{
           avatar:avatar.url
        }
        },
        {new:true}
      ).select("-password")

      return res.status(200)
        .json(new ApiResponse(
           200,updatedUser,"Avatar Updated Successfully"
        ))
  })

    const updateUserCoverImage = asyncHandler(async(req,res)=>{
      const coverImageLocalPath = req.file?.path

      if(!coverImageLocalPath){
         throw new ApiError(400,"Cover Image  is missing ")
      }

     const coverImage= await uploadOnCloudinary(coverImageLocalPath)

       if(!coverImageLocalPath.url){
         throw new ApiError(400,"Error while updating cover image ")
      }

      const updatedUser= await user.findByIdAndUpdate(
        req.user?._id,
        {
           $set:{
           coverImage:coverImage.url
        }
        },
        {new:true}
      ).select("-password")

      return res.status(200)
        .json(new ApiResponse(
           200,updatedUser,"Cover Image Updated Successfully"
        ))
  })

  const getUserChannelProfile = asyncHandler(async(req,res)=>{
     const {username} = req.params
     if(!username.trim()){
       throw new ApiError(400,"username missing")
     }

      const channel = await user.aggregate([
       {
         $match:{
          username : username?.toLowerCase()
         }
       },
       {
         $lookup: {

            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as : "subscribers"

         },
         
       },
        {
         $lookup: {

            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as : "subscribedTo"

         },
         
       },
       {
         $addFields:{
           subscribersCount:{
             size:"$subscribers"
           },
            channelSubscribedToCount:{
             size:"$subscribedTo"
           },
           isSubscribed:{
             $cond:{
               if:{$in : [req.user?._id,"$subscribers.subscriber"]},
               then:true,
               else:false
             }
           }
         }
       },
       {
         $project:{

            fullname:1,
            username:1,
            avatar:1,
            subscribersCount:1,
            channelSubscribedToCount:1,
            coverImage:1,
            email:1

         }
       }
     ])

     if(!channel.length){
       throw new ApiError(400,"channel does not exist")
     }

     return res 
     .status(200)
     .json(
       new ApiResponse(
         200,channel[0],"User Channel Fetched Successfully"
       )
     )
  })

  const getUserWatchHistory = asyncHandler( async (req,res) =>{
       const User = await user.aggregate([
         {
           $match:{
             _id: new mongoose.Types.ObjectId(req.user._id)
           }
         },
         {
         $lookup: {

            from:"videos",
            localField:"watchHistory",
            foreignField:"_id",
            as : "watchHistory",
            pipeline:[
              {
                $lookup: {

                    from:"users",
                    localField:"owner",
                    foreignField:"_id",
                    as : "owner",
                    pipeline:[
                       {
                         $project:{
                            fullname:1,
                            avatar:1,
                            username:1
                         }
                       },
                       {
                          $addFields:{
                            owner:{
                              $first:"$owner"
                            }                         
                          }
                        }
                    ],
                    

                },
                
              },
            ]

         },
         
       },
       ])
       return res.status(200)
        .json(new ApiResponse(
           200,
           User[0].watchHistory,
           "Watch History Fetched Successfully"
        ))
  })

  export{
     registerUser,
     userLogin,
     logoutUser,
     refreshAccessToken,
     getCurrentUser,
     changeUserPassword,
     updateAccountDetails,
     updateUserAvatar,
     updateUserCoverImage,
     getUserChannelProfile,
     getUserWatchHistory
  }