
import bcrypt from "bcryptjs"

import SharedLink from "#models/sharedLinksModel";
import uploadModel from "#models/uploadModel";

import { logger } from "#utils/logger";
import { getFolderContentsRecursive } from "#utils/index"

import { Validator } from "node-input-validator";



//  this fucntion will run when use will open the sahre user model if any existing link there for the item then shwo this 
export const getLinkInfo = async (req, res) => {
    try {
        const { item_id } = req.query;
        if (!item_id) {
            return res.status(400).json({ success: false, message: "item_id is required" });
        }

        //  find the item is ther ein the share link or not
        const sharedLink = await SharedLink.findOne({ item_id });
        if (!sharedLink) {
            return res.status(200).json({ success: true, exists: false, data: null });
        }

        //  if link found then calculate the expiry date here 
        const isExpired = sharedLink.is_expired || (sharedLink.expire_date && new Date() > new Date(sharedLink.expire_date))

        if (isExpired) {
            //  if link is dead so deelte this so modla can do new link here
            await sharedLink.deleteOne()
            return res.status(200).json({ success: true, exists: false, data: null });
        }

        return res.status(200).json({
            success: true,
            exists: true,
            data: {
                _id: sharedLink._id,
                item_id: sharedLink.item_id,
                token: sharedLink.token,
                link: sharedLink.link,
                type: sharedLink.type,
                is_public: sharedLink.is_public,
                has_password: Boolean(sharedLink.password),
                password: sharedLink.password || "",
                expire_date: sharedLink.expire_date,
                is_expired: sharedLink.is_expired,
            }
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
}


export const storeLinks = async (req, res) => {
    try {
        const { links, user_ids, is_public, expire_date, password } = req.body;
        const userID = req.user._id;

        const validations = new Validator(req.body, {
            links: "required|array",
            "links.*.link": "required|string",
            "links.*.type": "required|in:file,folder",
            "links.*.item_id": "required|string",
            user_ids: "array",
            is_public: "required|boolean",
            password: "string",
            expire_date: "string"
        });

        const matched = await validations.check();
        if (!matched) {
            const errors = Object.fromEntries(
                Object.entries(validations.errors).map(([field, error]) => [field, error.message])
            );
            return res.status(400).json({ success: false, errors });
        }


        // so here now when user modify the existing link here so update all field here
        // if password send is not defined so remove the password else modfiy the password
        const passwordFieldSent = Object.prototype.hasOwnProperty.call(req.body, "password");

        const savedLinks = await Promise.all(
            links.map(async ({ link, type, item_id }) => {
                let existingLink = await SharedLink.findOne({ item_id })

                let token;
                let finalLink;

                if (existingLink) {
                    // reuse the existing link so url naver changes
                    token = existingLink.token
                    finalLink = existingLink.link
                } else {
                    const url = new URL(link)
                    token = url.searchParams.get("token")
                    finalLink = link
                }

                //  ----------------------------------------------------
                //  password modify
                //  ---------------------------------------------------
                const oldPassword = existingLink ? existingLink.password : null
                let savedPassword =oldPassword


                if (!is_public) {
                    //  privte link passwrod will be null
                    savedPassword = null
                } else if (passwordFieldSent) {
                    // if no passwrod sent so null
                    if (password === null || password === "") {
                        savedPassword = null
                    } else {
                        savedPassword = password
                    }
                }

                //  here check the is passwrod actually changed
                const passwordChanged = oldPassword !== savedPassword
                const updateDoc = {
                    user_id: userID,
                    token,
                    type,
                    link: finalLink,
                    item_id,
                    password: savedPassword,
                    is_public,
                    permissions_users: user_ids || [],
                    expire_date: expire_date || null,
                    is_expired: false,
                };

                const saved = await SharedLink.findOneAndUpdate(
                    { item_id },
                    { $set: updateDoc },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                )

                if (req.io) {
                    req.io.to(saved.token).emit("shared_link_updated", {
                        item_id,
                        token: saved.token,
                        is_public: saved.is_public,
                        has_password: Boolean(saved.password),
                        password_changed: passwordChanged,
                        is_expired: saved.is_expired
                    });
                }

                return saved

            })
        )

        return res.status(201).json({
            success: true,
            message: "Links stored successfully",
            data: savedLinks
        });



    } catch (error) {
        logger.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// controllers/sharedLinks.js
export const accessLink = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ success: false, message: "Token is required" });
        }

        const sharedLink = await SharedLink.findOne({ token });
        if (!sharedLink) {
            return res.status(404).json({ success: false, is_not_found: true, message: "Link not found" });
        }

        if (sharedLink.is_expired) {
            return res.status(410).json({ success: false, is_expired: true, message: "Link has expired" });
        }

        if (sharedLink.expire_date && new Date() > new Date(sharedLink.expire_date)) {
            await SharedLink.findByIdAndUpdate(sharedLink._id, { is_expired: true });
            return res.status(410).json({ success: false, is_expired: true, message: "Link has expired" });
        }

        if (!sharedLink.is_public) {

            if (!req.user) {
                return res.status(401).json({ success: false, is_login_required: true, message: "Login required to access this link" });
            }

            const currentUserId = req.user?._id?.toString() || req.user?.toString();
            const isOwner = String(sharedLink.user_id) === currentUserId;
            const hasAccess = isOwner || sharedLink.permissions_users.some(
                (id) => id.toString() === currentUserId
            );
            if (!hasAccess) {
                return res.status(403).json({ success: false, is_access_denied: true, message: "You don't have access to this link" });
            }
        }

        // Password protected — tell frontend to show password prompt
        if (sharedLink.password) {
            return res.status(200).json({
                success: true,
                password_required: true,        //frontend checks this
                token: token,                   //frontend sends this back with password
                message: "This link is password protected",
            });
        }

        if (sharedLink.type === "file") {
            const file = await uploadModel.findById(sharedLink.item_id);
            if (!file) {
                return res.status(404).json({ success: false, message: "File not found" });
            }

            return res.status(200).json({
                success: true,
                type: "file",
                data: file,
                is_public: sharedLink.is_public,
                redirect_url: `${process.env.APP_URL}/${file.storagePath}`
            });
        }

        if (sharedLink.type === "folder") {
            const folderData = await uploadModel.findById(sharedLink.item_id);
            if (!folderData) {
                return res.status(404).json({ success: false, message: "Folder not found" });
            }

            const folderContents = await getFolderContentsRecursive(sharedLink.item_id);

            return res.status(200).json({
                success: true,
                type: "folder",
                data: folderData,
                folder_data: folderContents,
                is_public: sharedLink.is_public
            });
        }

    } catch (error) {
        logger.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const verifyLinkPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ success: false, message: "Token and password are required" });
        }

        const sharedLink = await SharedLink.findOne({ token });
        if (!sharedLink) {
            return res.status(404).json({ success: false, message: "Link not found" });
        }

        // Check expired
        if (sharedLink.is_expired) {
            return res.status(410).json({ success: false, message: "Link has expired" });
        }

        if (sharedLink.expire_date && new Date() > new Date(sharedLink.expire_date)) {
            await SharedLink.findByIdAndUpdate(sharedLink._id, { is_expired: true });
            return res.status(410).json({ success: false, message: "Link has expired" });
        }

        // Verify password
        const isMatch = password === sharedLink.password;
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Incorrect password" });
        }

        // Password correct — return file or folder data
        if (sharedLink.type === "file") {
            const file = await uploadModel.findById(sharedLink.item_id);
            if (!file) {
                return res.status(404).json({ success: false, message: "File not found" });
            }

            return res.status(200).json({
                success: true,
                type: "file",
                data: file,
                redirect_url: `${process.env.APP_URL}/${file.storagePath}`
            });
        }

        if (sharedLink.type === "folder") {
            const folderData = await uploadModel.findById(sharedLink.item_id);
            if (!folderData) {
                return res.status(404).json({ success: false, message: "Folder not found" });
            }

            const folderContents = await getFolderContentsRecursive(sharedLink.item_id);

            return res.status(200).json({
                success: true,
                type: "folder",
                data: folderData,
                folder_data: folderContents,
                is_public: sharedLink.is_public
            });
        }

    } catch (error) {
        logger.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};