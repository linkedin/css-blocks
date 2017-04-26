var cssBlocks = require("css-blocks");
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
          cssBlocks(postcss)({})
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


