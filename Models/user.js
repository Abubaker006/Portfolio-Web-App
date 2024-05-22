const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const overviewInformationSchema = new Schema({
  skillsCardName: String,
  imageData: Buffer,
  contenType: String,
});
const techSkillImageSchema = new Schema({
  imageData: Buffer,
  contentType: String,
});
const ProjectsSchema = new Schema({
  projectName: String,
  githubLink: String,
  projectDescription: String,
});

const experienceSchema = new Schema({
  startingDate: String,
  finalEndingDate: String,
  city: String,
  country: String,
  role: String,
  companyName: String,
});
const emailsSchema = new Schema({
  personEmail: { type: String, required: true },
  personName: { type: String, required: true },
  personMessage: { type: String, required: true },
});

const adminLoginSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  editPersonalInformation: {
    personName: String,
    personDomain: String,
    personDescription: String,
  },
  personOverview: String,
  overviewInformation: [overviewInformationSchema],
  techSkills: [techSkillImageSchema],
  projects: [ProjectsSchema],
  experience: [experienceSchema],
  emails: [emailsSchema],
});

const AdminLogin = mongoose.model("AdminLogin", adminLoginSchema);

module.exports = AdminLogin;
