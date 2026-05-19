const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      min: [3, "First name must be at least 3 characters long"],
      max: [50, "First name must be at most 50 characters long"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      min: [3, "Last name must be at least 3 characters long"],
      max: [50, "Last name must be at most 50 characters long"],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      unique: true,
      min: [3, "Username must be at least 3 characters long"],
      max: [50, "Username must be at most 50 characters long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      trim: true,
      min: [6, "Password must be at least 6 characters long"],
      max: [20, "Password must be at most 20 characters long"],
      select: false,
    },
    avatar: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "inactive"],
    },
    refreshToken: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

userSchema.index({ username: 1, unique: true });
userSchema.index({ email: 1, unique: true });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.toJson = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
