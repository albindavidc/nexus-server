import { NextFunction, Request, Response } from "express";
import AppError from "../../shared/errors/AppError";

export class ChatController {
    async uploadAttachment (req: Request, res: Response, next: NextFunction){
        try {
            if(!req.file) throw new AppError("File is required", 400)

                const file = req.file as Express.MulterS3.File;

                return res.status(200).json({
                    status: true,
                    message: "Attachment uploaded successfully",
                    data: {
                        mediaUrl: file.location,
                        mediaMeta: {
                            mimeType: req.file.mimetype,
                            size: req.file.size,
                            filename: req.file.originalname,
                        },                        
                    }
                })
        } catch (error) {
            next(error)
        }
    } 
}