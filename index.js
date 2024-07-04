const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const cors = require("cors");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const session = require("express-session");
const dotenv = require("dotenv");
const FileStore = require("session-file-store")(session);
const bcrypt = require("bcrypt");

const app = express();
const port = 5000;

dotenv.config();

const corsOptions = {
  origin: "http://localhost:3000", //cors 설정 클라이언트의 주소 사전 허가
  METHODS: ["get", "post"],
  credentials: true, // 쿠키를 포함한 요청을 허용
};

app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(cors(corsOptions));

//비번 암호화

const saltRounds = process.env.SALTROUNDS;
async function hashPassword(password) {
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  } catch (err) {
    console.error("Error hashing password:", err);
  }
}

// session 설정
app.use(
  session({
    store: new FileStore({
      path: path.join(__dirname, "sessions"), // 세션 파일을 저장할 디렉토리 경로
      retries: 0, // 디렉토리를 찾을 수 없을 때 재시도 횟수
    }),
    name: "session ID",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: false,
      secure: false,
    },
  })
);

// DB 연결
const db = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DB,
});
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("MySQL connected...");
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname);
    const uniqueName = `${uniqueSuffix}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: storage });

///////////////////////////////////////////////////////////////////////////////////////
// 홈
///////////////////////////////////////////////////////////////////////////////////////
app.get("/", (req, res) => {
  const filePath = path.join(__dirname, "./src/img", "backimg.jpg");
  res.sendFile(filePath, (err) => {
    if (err) {
      console.log(err);
      res.status(500).send("File not found", err);
    }
  });
});

///////////////////////////////////////////////////////////////////////////////////////
// 회원 가입
///////////////////////////////////////////////////////////////////////////////////////
app.post("/signup", (req, res) => {
  async function regist() {
    const { email, password, name, nickname } = req.body;
    const enc_password = await hashPassword(password);
    const sql =
      "INSERT INTO TB_users (user_email, user_password, user_name, nick_name, special_code) VALUES (?, ?, ?, ?, ?)";
    db.query(
      sql,
      [email, enc_password, name, nickname, "00"],
      (err, result) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.status(200).send({
          message: "사용자 등록 성공",
          userId: result.insertId,
        });
      }
    );
  }
  regist();
});

///////////////////////////////////////////////////////////////////////////////////////
// 로그인
///////////////////////////////////////////////////////////////////////////////////////
app.post("/login", (req, res) => {
  if (req.session.user) {
    return res.status(400).send("Already logged in");
  }
  const { email, password } = req.body;

  const sql = "SELECT * FROM TB_users WHERE user_email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }

    if (results.length === 0) {
      return res.status(401).send("Invalid email or password");
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.user_password);
    if (!isMatch) {
      return res.status(401).send("password not matched");
    }
    req.session.save(() => {
      req.session.user = {
        email: user.user_email,
        nickName: user.nick_name,
      };
      const data = req.session;
      res.status(200).send(data);
    });
  });
});

///////////////////////////////////////////////////////////////////////////////////////
// 로그 아웃
///////////////////////////////////////////////////////////////////////////////////////
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.clearCookie("connect.sid");
    res.status(200).send("Logout successful");
  });
});

///////////////////////////////////////////////////////////////////////////////////////
// 세션 확인
///////////////////////////////////////////////////////////////////////////////////////
app.get("/checkSession", (req, res) => {
  if (req.session) {
    res.status(200).send(req.session);
  } else {
    res.status(401).send("Not authenticated");
  }
});

///////////////////////////////////////////////////////////////////////////////////////
// 사진 올리기
///////////////////////////////////////////////////////////////////////////////////////
app.post("/uploadPhotos", upload.array("photos", 100), (req, res) => {
  const files = req.files;
  const fileNames = req.body.fileNames.split(",");

  if (!files || !fileNames) {
    return res.status(400).send("파일이 업로드되지 않았습니다.");
  }

  if (files.length !== fileNames.length) {
    return res.status(400).send("파일 수와 파일명 수가 일치하지 않습니다.");
  }

  const sql =
    "INSERT INTO TB_photos (file_name, photo_likes, original_name) VALUES ?";
  const values = files.map((file, index) => [
    file.filename,
    0,
    fileNames[index],
  ]);

  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).send(err);
    }
    res.status(200).send({
      message: "파일 업로드 성공",
      files: files.map((file) => file.filename),
    });
  });
});

///////////////////////////////////////////////////////////////////////////////////////
// 인기 사진조회
///////////////////////////////////////////////////////////////////////////////////////
app.get("/popularPhotos", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const offset = (page - 1) * limit;

  const sql = `SELECT * FROM TB_photos ORDER BY photo_likes DESC LIMIT ${limit} OFFSET ${offset}`;
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }

    const totalSql = "SELECT COUNT(*) as count FROM TB_photos";
    db.query(totalSql, (err, totalResults) => {
      if (err) {
        return res.status(500).send(err);
      }

      const photosWithUrls = results.map((photo) => ({
        ...photo,
        url: `http://localhost:5000/uploads/${photo.file_name}`,
      }));

      res.status(200).json({
        photos: photosWithUrls,
        total: totalResults[0].count,
      });
    });
  });
});

///////////////////////////////////////////////////////////////////////////////////////
// 최근 사진조회
///////////////////////////////////////////////////////////////////////////////////////
app.get("/recentPhotos", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const offset = (page - 1) * limit;

  const sql = `SELECT * FROM TB_photos ORDER BY update_date DESC LIMIT ${limit} OFFSET ${offset}`;
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }

    const totalSql = "SELECT COUNT(*) as count FROM TB_photos";
    db.query(totalSql, (err, totalResults) => {
      if (err) {
        return res.status(500).send(err);
      }

      const photosWithUrls = results.map((photo) => ({
        ...photo,
        url: `http://localhost:5000/uploads/${photo.file_name}`,
      }));

      res.status(200).json({
        photos: photosWithUrls,
        total: totalResults[0].count,
      });
    });
  });
});

///////////////////////////////////////////////////////////////////////////////////////
// 사진 1장 가져오기
///////////////////////////////////////////////////////////////////////////////////////
app.post("/photo/:id", (req, res) => {
  const { id } = req.params;
  const { email } = req.body;

  const sql1 = "SELECT * FROM TB_photos WHERE file_name = ?";
  db.query(sql1, [id], (err, result1) => {
    if (err) {
      return res.status(500).send(err);
    }
    if (result1.length === 0) {
      return res.status(404).send("사진을 찾을 수 없습니다.");
    }

    // 로그인시 좋아요 정보 가져오기
    if (email) {
      const sql2 =
        "SELECT * FROM TB_likesdetail WHERE (user_email = ? && file_name = ?)";
      db.query(sql2, [email, id], (err, result2) => {
        if (err) {
          return res.status(500).send(err);
        }
        let heart = false;

        if (result2.length === 0) {
          heart = false;
        } else {
          heart = result2[0].user_likes;
        }
        result1[0].user_likes = heart;
        const photo = {
          ...result1[0],
          url: `http://localhost:5000/uploads/${result1[0].file_name}`,
        };
        res.status(200).json(photo);
      });
      // 비 로그인이면
    } else {
      const photo = {
        ...result1[0],
        url: `http://localhost:5000/uploads/${result1[0].file_name}`,
      };
      res.status(200).json(photo);
    }
  });
});

///////////////////////////////////////////////////////////////////////////////////////
// 좋아요 업데이트
///////////////////////////////////////////////////////////////////////////////////////
app.post("/photo/:id/like", (req, res) => {
  const { id } = req.params;
  const { email, heart } = req.body;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // 월은 0부터 시작하므로 +1 필요
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  // 사진 좋아요 총 갯수 업데이트
  let cnt_heart = heart === true ? 1 : -1;
  const updateLikeSql =
    "UPDATE TB_photos SET photo_likes = photo_likes + ? WHERE file_name = ?";
  db.query(updateLikeSql, [cnt_heart, id], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }

    // 업데이트된 photo_likes 가져오기
    const selectPhotoSql =
      "SELECT photo_likes FROM TB_photos WHERE file_name = ?";
    db.query(selectPhotoSql, [id], (err, Result) => {
      if (err) {
        return res.status(500).send(err);
      }
      const PhotoLikes = Result[0].photo_likes;

      // 개인+사진 좋아요 여부에 따른 INSERT 또는 UPDATE (참고하기 위해 DELETE 미사용)
      const selectLikeSql =
        "SELECT * FROM TB_likesDetail WHERE (user_email = ? AND file_name = ?)";
      db.query(selectLikeSql, [email, id], (err, result) => {
        if (err) {
          return res.status(500).send(err);
        }

        // INSERT
        if (result.length === 0) {
          const insertSql =
            "INSERT INTO TB_likesDetail (user_email, file_name, user_likes) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE user_likes = VALUES(user_likes)";
          db.query(insertSql, [email, id, heart], (err, result) => {
            if (err) {
              return res.status(500).send(err);
            }
            // 업데이트된 photo_likes와 user_likes를 응답으로 보냄
            res.status(200).json({
              photo_likes: PhotoLikes,
              user_likes: heart,
            });
          });
        }

        // UPDATE
        else {
          const updateSql =
            "UPDATE TB_likesDetail SET user_likes = ?, update_date = ? WHERE (user_email = ? AND file_name = ?)";
          db.query(
            updateSql,
            [heart, formattedDate, email, id],
            (err, result) => {
              if (err) {
                return res.status(500).send(err);
              }
              // 업데이트된 photo_likes와 user_likes를 응답으로 보냄
              res.status(200).json({
                photo_likes: PhotoLikes,
                user_likes: heart,
              });
            }
          );
        }
      });
    });
  });
});

app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
});
