var cssBlocks = require("css-blocks").default;
var postcss = require("postcss");

module.exports = function(grunt) {
  grunt.initConfig({
    postcss: {
      options: {
        processors: [
          cssBlocks(postcss)({interoperableCSS: true})
        ]
      },
      dist: {
        expand: true,
        src: [ "blocks/**/*.css" ],
        dest: "dist"
      }
    }
  }); 
  grunt.loadNpmTasks('grunt-postcss');

  grunt.registerTask("default", ["postcss"]);
};


