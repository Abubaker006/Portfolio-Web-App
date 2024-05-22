const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();
const adminModelSchema = require("./Models/user.js");
const { hashPassword, comparePassword } = require("./Encryption/bycrpt.js");
const jwt = require("jsonwebtoken");
const passport = require("./Authentication/auth.js");
const multer = require("multer");

app.use(
  "*",
  cors({
    origin: process.env.ORIGIN || true,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
const app = express();

app.use(passport.initialize()); // this line should always be after loc 12
const port = process.env.PORT || 3002;
const mongoDbURi = process.env.CONNECTION_STRING;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const ConnectDb = async () => {
  try {
    await mongoose.connect(mongoDbURi, {});
    console.log("CONNECTED TO DATABASE SUCCESSFULLY");
  } catch (error) {
    console.error("COULD NOT CONNECT TO DATABASE:", error.message);
  }
};

// Not Using becuase not as secured as Cookies.
app.get(
  "/admin/dashboard",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    // Route logic here
  }
);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/admin/signin", async (req, res) => {
  const { username, password } = req.body;
  // "pakistan123"
  try {
    const hashedPassword = await hashPassword(password);

    const admin = new adminModelSchema({
      username: "mohammadabubakerpk@gmail.com",
      password: hashedPassword,
      editPersonalInformation: {
        personName: "",
        personDomain: "",
        personDescription: "",
      },
    });

    await admin.save();
    res.status(200).send("User registered successfully");
  } catch (error) {
    console.error(err);
    res.status(500).send(`Saving Document Returned  err : ${err.message}`);
  }
});

app.post("/admin/dashboard/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await adminModelSchema.findOne({ username });

    if (user) {
      const storedHashedPassword = user.password;
      const matchPasswords = await comparePassword(
        password,
        storedHashedPassword
      );
      if (matchPasswords) {
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
          expiresIn: "1h",
        });

        res.json({ message: "Login Successful", token: token });
      } else {
        res.status(401).json({ message: "Invalid Password" });
      }
    } else {
      res.status(401).json({ message: "Invalid Username" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/admin/dashboard/editinfo/editInformation", async (req, res) => {
  const { personName, personDomain, personDescription } = req.body;

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization Token Required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const user = await adminModelSchema.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateFields = {};
    if (personName)
      updateFields["editPersonalInformation.personName"] = personName;
    if (personDomain)
      updateFields["editPersonalInformation.personDomain"] = personDomain;
    if (personDescription)
      updateFields["editPersonalInformation.personDescription"] =
        personDescription;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const updatedUser = await adminModelSchema.findByIdAndUpdate(
      user.id,
      { $set: updateFields },
      { new: true }
    );

    if (updatedUser) {
      res.status(200).json({ message: "Data was updated Successfuly." });
    } else {
      res.status(404).json({ message: "Data wasn't updated Successfuly." });
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post(
  "/admin/dashboard/editinfo/overview",
  upload.single("imageData"),
  async (req, res) => {
    const { overviewDescription, skillsCardName } = req.body;
    const file = req.file;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authorization Token Required" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }

      const user = await adminModelSchema.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const overviewInformationEntry = {
        skillsCardName,
        imageData: file.buffer,
        contenType: file.mimetype,
      };

      user.overviewInformation.push(overviewInformationEntry);

      await user.save();
      const updateOverview = await adminModelSchema.findByIdAndUpdate(
        user.id,
        { $set: { personOverview: overviewDescription } },
        { new: true }
      );

      res.status(200).json({ message: "Overview updated successfully." });
    } catch (e) {
      console.error("Error processing request:", e);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.post(
  "/admin/dashboard/tech",
  upload.single("imageData"),
  async (req, res) => {
    const file = req.file;

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Authorization Token Required" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }

      const user = await adminModelSchema.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const techImageEntry = {
        imageData: file.buffer,
        contentType: file.mimetype,
      };

      user.techSkills.push(techImageEntry);

      await user.save();
      res.status(200).json({ message: "Overview updated successfully." });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.post("/admin/dashboard/projects", async (req, res) => {
  const { projectName, githubLink, projectDescription } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Authorization Token Required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const user = await adminModelSchema.findById(userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
    }

    const projectDataEntry = {
      projectName,
      githubLink,
      projectDescription,
    };

    user.projects.push(projectDataEntry);

    await user.save();

    res.status(200).json({ message: "Project Information added" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/admin/dashboard/experience", async (req, res) => {
  const { startingDate, endingDate, city, country, role, companyName } =
    req.body;
  var finalEndingDate = endingDate;

  if (finalEndingDate == "") {
    finalEndingDate = "Current";
  }

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Authorization Token Required" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const user = await adminModelSchema.findById(userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
    }

    const experienceDataEntry = {
      startingDate,
      finalEndingDate,
      city,
      country,
      role,
      companyName
    };

    user.experience.push(experienceDataEntry);
    await user.save();
    res.status(200).json({ message: "Project Information added" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/admin/dashboard/fetchUser", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization Token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const user = await adminModelSchema
      .findById(userId)
      .select("-password -username");

    if (!user) {
      return res.status(404).json({ message: "User not Found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// delete Routes
app.delete("/admin/dashboard/deleteOverview/:id", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization Token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const updatedAdmin = await adminModelSchema.updateOne(
      { _id: userId },
      { $pull: { overviewInformation: { _id: req.params.id } } }
    );

    if (updatedAdmin.modifiedCount === 0) {
      return res.status(404).json({ message: "Overview not found" });
    }

    res.status(200).json({ message: "Overview deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/admin/dashboard/techDelete/:id", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization Token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const updatedAdmin = await adminModelSchema.updateOne(
      { _id: userId },
      { $pull: { techSkills: { _id: req.params.id } } }
    );

    if (updatedAdmin.modifiedCount === 0) {
      return res.status(404).json({ message: "Overview not found" });
    }

    res.status(200).json({ message: "Overview deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/admin/dashboard/projectDelete/:id", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization Token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const updatedAdmin = await adminModelSchema.updateOne(
      { _id: userId },
      { $pull: { projects: { _id: req.params.id } } }
    );

    if (updatedAdmin.modifiedCount === 0) {
      return res.status(404).json({ message: "Overview not found" });
    }

    res.status(200).json({ message: "Overview deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/admin/dashboard/experienceDelete/:id", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization Token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const updatedAdmin = await adminModelSchema.updateOne(
      { _id: userId },
      { $pull: { experience: { _id: req.params.id } } }
    );

    if (updatedAdmin.modifiedCount === 0) {
      return res.status(404).json({ message: "Overview not found" });
    }

    res.status(200).json({ message: "Overview deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
//delete routes finished

//email route and delete email route
app.post("/email", async (req, res) => {
  const { personName, personEmail, personMessage } = req.body;

  try {
    // Create a new email entry
    const emailEntry = {
      personName,
      personEmail,
      personMessage,
    };

    // Find the admin document and push the new email entry
    const adminDocument = await adminModelSchema.findOne({}); // Assuming there's only one admin document
    adminDocument.emails.push(emailEntry);

    // Save the admin document
    await adminDocument.save();

    res.status(201).json({ message: "Email saved successfully" });
  } catch (error) {
    console.error("Error saving email:", error);
    res.status(500).json({ message: "Failed to save email" });
  }
});

app.get("/admin/dashboard/emails", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ message: "Authorization Token Required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    if (!userId) {
      res.status(404).json({ message: "User not found" });
    }

    const user = await adminModelSchema.findById(userId);

    res.status(200).json(user.emails);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.delete("/admin/dashboard/deleteEmail/:id", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization Token Required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const updatedAdmin = await adminModelSchema.updateOne(
      { _id: userId },
      { $pull: { emails: { _id: req.params.id } } }
    );

    if (updatedAdmin.modifiedCount === 0) {
      return res.status(404).json({ message: "Email not found" });
    }

    res.status(200).json({ message: "Email deleted successfully" });
  } catch (error) {
    console.error("Error deleting email:", error); // Log the error for debugging
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/getUserInformation",async (req,res)=>{
try{
  const userData = await adminModelSchema.find({}, '-_id -username -password');
  if(!userData){
    res.status(404).json({message:"User Not found"});
    
  }
  res.status(200).json(userData);
}catch(error){
  res.status(500).json({message:"Internal Server Error"});
}  
});

app.listen(port, () => {
  console.log(`Server Running at port:${port}`);
});

ConnectDb();
