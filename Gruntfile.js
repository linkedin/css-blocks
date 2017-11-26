const shell = require("shelljs");
module.exports = function(grunt) {
  grunt.initConfig({
    release: {
      options: {
        npm: false,
        afterRelease: ['publish']
      }
    },
  });
  grunt.loadNpmTasks('grunt-release');
  grunt.registerTask('publish', "Publish to NPM", function() {
    shell.exec('li-npm-publish --tag next');
  });
};
