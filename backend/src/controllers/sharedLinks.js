
import SharedLink from "#models/sharedLinksModel";
import uploadModel from "#models/uploadModel";

import { logger } from "#utils/logger";
import { getFolderContentsRecursive } from "#utils/index"

import { Validator } from "node-input-validator";

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
            password: "min:8",
            expire_date: "date"
        });

        const matched = await validations.check();
        if (!matched) {
            const errors = Object.fromEntries(
                Object.entries(validations.errors).map(([field, error]) => [field, error.message])
            );
            return res.status(400).json({ success: false, errors });
        }

        // Extract token from each link and build documents
        const sharedLinksData = links.map(({ link, type, item_id }) => {
            const url = new URL(link);
            const token = url.searchParams.get("token");

            return {
                user_id: userID,
                token,
                type,
                link,
                item_id,                        // file_id or folder_id
                password: password || null,
                is_public,
                permissions_users: user_ids || [],
                expire_date: expire_date || null,
            };
        });

        const savedLinks = await SharedLink.insertMany(sharedLinksData);

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
            return res.status(404).json({ success: false, message: "Link not found" });
        }

        if (sharedLink.is_expired) {
            return res.status(410).json({ success: false, message: "Link has expired" });
        }

        if (sharedLink.expire_date && new Date() > new Date(sharedLink.expire_date)) {
            await SharedLink.findByIdAndUpdate(sharedLink._id, { is_expired: true });
            return res.status(410).json({ success: false, message: "Link has expired" });
        }

        if (!sharedLink.is_public) {

            if (!req.user) {
                return res.status(401).json({ success: false, message: "Login required to access this link" });
            }
            
            const hasAccess = sharedLink.permissions_users.some(
                (id) => id.toString() === req.user.toString()
            );
            if (!hasAccess) {
                return res.status(403).json({ success: false, message: "You don't have access to this link" });
            }
        }

        // Password protected — tell frontend to show password prompt
        if (sharedLink.password) {
            7
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
        const isMatch = await bcrypt.compare(password, sharedLink.password);
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
            });
        }

    } catch (error) {
        logger.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};