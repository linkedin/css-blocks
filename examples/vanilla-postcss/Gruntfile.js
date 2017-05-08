var cssBlocks = require("css-blocks").default;
var postcss = require("postcss");

console.log(cssBlocks);

module.exports = function(grunt) {
  grunt.initConfig({
    copy: {
      files: {
        src: 'blocks/**/*',     // copy all files and subfolders
        dest: 'dist/',    // destination folder
      }
    },
    postcss: {
      options: {
        processors: [
          cssBlocks(postcss)({interoperableCSS: true})
        ]
      },
      dist: {
        src: 'dist/blocks/*.css',
      }
    }
  }); 
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-postcss');

  grunt.registerTask("default", ["copy", "postcss"]);
};


