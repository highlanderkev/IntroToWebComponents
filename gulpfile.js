"use strict";

var gulp = require("gulp"),
    connect = require("gulp-connect");
    
    
gulp.task("serve", function(){
    connect.server({
        root:"./",
        livereload: false
    });
});

gulp.task("default", ["serve"]);