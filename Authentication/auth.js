const passport=require("passport");
const JwtStrategy=require("passport-jwt").Strategy;
const ExtractJwt=require("passport-jwt").ExtractJwt;
require('dotenv').config();
const opts={
    jwtFromRequest:ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey:process.env.JWT_SECRET,
};


passport.use(new JwtStrategy(opts,(jwt_payload,done)=>{
    User.findByID(jwt_payload,(err,user)=>{
        if(err){
            return done(err,false);
        }
        if(user){
            return done(null,user);
        }else{
            return done(null,false);
        }
    });
}));

module.exports=passport;