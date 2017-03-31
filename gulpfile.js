"use strict";

var gulp = require("gulp"),
    path = require("path"),
    connect = require("gulp-connect"),
    vulcanize = require("gulp-vulcanize"),
    crisper = require("gulp-crisper");

gulp.task("serve", function () {
    connect.server({
        root: "./",
        livereload: false
    });
});


gulp.task("bundle", function () {
    return gulp.src("src/imports/index.html")
        .pipe(vulcanize({
            abspath: "",
            excludes: [],
            stripExcludes: false,
            inlineScripts: false
        }))
        .pipe(crisper({
            scriptInHead: false,
            onlySplit: false
        }))
        .pipe(gulp.dest("src/bundle"));
});

gulp.task("default", ["serve"]);