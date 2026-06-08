//  this file is checking here if user is a admin ro normal user

//  utils import 
import {logger} from "#utils/logger"

const adminMiddleware =  (req, res, next) => {
    try {
        //  first check if user is there or not 
        if(!req.user){
            return res.status(401).json({ success: false, message: "Not authorized" })
        }

        //  check user role if admin or not
        if(req.user.role !== "admin"){
            return res.status(403).json({ success: false, message: "Only admin can change" })
        }

        next()

    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}


export default adminMiddleware