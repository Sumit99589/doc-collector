import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const clientName = req.params.clientName;
    const uploadDir = path.join("uploads", clientName);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage: storage });


export function uploadFiles(req, res) {
  res.json({
    status: "success",
    files: req.files.map(file => ({
      filename: file.filename,
      path: file.path
    }))
  });
}

export const uploadMiddleware = upload.array("documents", 10); 
